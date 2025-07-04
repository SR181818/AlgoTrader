
import { Router } from 'express';
import { z } from 'zod';
import algosdk from 'algosdk';
import { db } from './db';
import { users, algorandPayments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';

const router = Router();

// Algorand configuration
const ALGORAND_SERVER = 'https://testnet-api.algonode.cloud';
const ALGORAND_INDEXER = 'https://testnet-idx.algonode.cloud';
const AI_PLAN_PRICE = 5000000; // 5 ALGO in microAlgos
const RECEIVER_ADDRESS = 'ZZAF5ARA4MEC5PVDOP64JM5O5MQST63Q2KOY2FLYFLXXD3PFSNJJBYAFZM';

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', ALGORAND_SERVER, '');
const indexerClient = new algosdk.Indexer('', ALGORAND_INDEXER, '');

// Zod schemas
const checkoutSchema = z.object({
  planType: z.enum(['ai']),
  algorandAddress: z.string().min(1)
});

const confirmSchema = z.object({
  transactionId: z.string().min(1)
});

// POST /api/paywall/checkout - Create payment transaction
router.post('/checkout', authenticateToken, async (req: any, res) => {
  try {
    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid checkout data', 
        details: validation.error.errors 
      });
    }

    const { planType, algorandAddress } = validation.data;

    // Get suggested transaction parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create payment transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: algorandAddress,
      to: RECEIVER_ADDRESS,
      amount: AI_PLAN_PRICE,
      suggestedParams,
      note: new Uint8Array(Buffer.from(`AI_PLAN_${req.user.userId}_${Date.now()}`))
    });

    // Convert transaction to base64 for frontend signing
    const txnB64 = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');

    // Store pending payment record
    const [payment] = await db
      .insert(algorandPayments)
      .values({
        userId: req.user.userId,
        transactionId: txn.txID(),
        algorandAddress,
        amount: (AI_PLAN_PRICE / 1000000).toString(), // Convert to ALGO
        planType,
        status: 'pending'
      })
      .returning();

    res.json({
      success: true,
      transaction: {
        txnB64,
        txId: txn.txID(),
        amount: AI_PLAN_PRICE / 1000000,
        receiver: RECEIVER_ADDRESS
      },
      paymentId: payment.id
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create payment transaction' });
  }
});

// POST /api/paywall/confirm - Verify and confirm payment
router.post('/confirm', authenticateToken, async (req: any, res) => {
  try {
    const validation = confirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid confirmation data', 
        details: validation.error.errors 
      });
    }

    const { transactionId } = validation.data;

    // Get payment record
    const payment = await db
      .select()
      .from(algorandPayments)
      .where(eq(algorandPayments.transactionId, transactionId))
      .limit(1);

    if (!payment.length || payment[0].userId !== req.user.userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment[0].status === 'confirmed') {
      return res.status(400).json({ error: 'Payment already confirmed' });
    }

    // Verify transaction on Algorand
    try {
      const txnInfo = await indexerClient.lookupTransactionByID(transactionId).do();
      const txn = txnInfo.transaction;

      // Verify transaction details
      if (
        txn['payment-transaction']['receiver'] === RECEIVER_ADDRESS &&
        txn['payment-transaction']['amount'] >= AI_PLAN_PRICE &&
        txn['confirmed-round']
      ) {
        // Update payment status
        await db
          .update(algorandPayments)
          .set({
            status: 'confirmed',
            blockHeight: txn['confirmed-round'],
            confirmedAt: new Date()
          })
          .where(eq(algorandPayments.transactionId, transactionId));

        // Enable AI features for user
        await db
          .update(users)
          .set({ aiEnabled: true })
          .where(eq(users.id, req.user.userId));

        res.json({
          success: true,
          message: 'Payment confirmed! AI features are now enabled.',
          transaction: {
            id: transactionId,
            blockHeight: txn['confirmed-round'],
            amount: txn['payment-transaction']['amount'] / 1000000
          }
        });
      } else {
        // Mark payment as failed
        await db
          .update(algorandPayments)
          .set({ status: 'failed' })
          .where(eq(algorandPayments.transactionId, transactionId));

        res.status(400).json({ error: 'Transaction verification failed' });
      }
    } catch (indexerError) {
      // Transaction not found on chain yet
      res.status(202).json({ 
        success: false, 
        message: 'Transaction not yet confirmed on chain. Please try again in a few moments.' 
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// GET /api/paywall/status - Check user's AI status
router.get('/status', authenticateToken, async (req: any, res) => {
  try {
    const user = await db
      .select({ aiEnabled: users.aiEnabled })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      aiEnabled: user[0].aiEnabled
    });
  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

export default router;
