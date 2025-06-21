// TEAL (Transaction Execution Approval Language) code for Algorand smart contract
// This would be compiled and deployed to the Algorand blockchain

/**
 * This file contains the TEAL code for the subscription smart contract
 * and utility functions to interact with it.
 */

import algosdk from 'algosdk';
import { AlgodClient } from 'algosdk';
import { AlgorandConfig, SubscriptionTier, SUBSCRIPTION_PRICES } from './AlgorandPaywall';

/**
 * TEAL approval program for subscription smart contract
 * This is the code that would be compiled and deployed to Algorand
 */
export const APPROVAL_PROGRAM = `#pragma version 6
// Subscription Smart Contract

// Check transaction type
txn TypeEnum
int appl // ApplicationCall
==
bnz handle_app_call

// Handle payment transaction
txn TypeEnum
int pay // Payment
==
bnz handle_payment

// Reject all other transaction types
err

handle_app_call:
  // Handle different application calls
  txn OnCompletion
  int NoOp
  ==
  bnz handle_noop
  
  txn OnCompletion
  int OptIn
  ==
  bnz handle_optin
  
  txn OnCompletion
  int CloseOut
  ==
  bnz handle_closeout
  
  txn OnCompletion
  int UpdateApplication
  ==
  txn Sender
  global CreatorAddress
  ==
  bnz handle_update
  
  txn OnCompletion
  int DeleteApplication
  ==
  txn Sender
  global CreatorAddress
  ==
  bnz handle_delete
  
  // Reject all other application calls
  err

handle_noop:
  // Check if first argument is "subscribe"
  txna ApplicationArgs 0
  byte "subscribe"
  ==
  bnz handle_subscribe
  
  // Check if first argument is "check_subscription"
  txna ApplicationArgs 0
  byte "check_subscription"
  ==
  bnz handle_check_subscription
  
  // Reject all other NoOp calls
  err

handle_subscribe:
  // Verify payment transaction is in the same group
  global GroupSize
  int 2
  ==
  assert
  
  // Get payment transaction
  gtxn 0 TypeEnum
  int pay
  ==
  assert
  
  // Verify payment is to the correct address
  gtxn 0 Receiver
  global CreatorAddress
  ==
  assert
  
  // Get subscription tier from payment amount
  gtxn 0 Amount
  callsub get_tier
  
  // Store subscription info in local state
  int 0 // Account index (0 for sender)
  byte "tier"
  gtxn 0 Amount
  callsub get_tier
  app_local_put
  
  int 0
  byte "start_date"
  global LatestTimestamp
  app_local_put
  
  int 0
  byte "end_date"
  global LatestTimestamp
  gtxn 0 Amount
  callsub get_duration
  +
  app_local_put
  
  int 1
  return

handle_check_subscription:
  // Load subscription end date
  int 0
  byte "end_date"
  app_local_get
  
  // Check if subscription is still active
  global LatestTimestamp
  <=
  
  return

handle_optin:
  // Initialize local state for user
  int 0
  byte "tier"
  int 0 // Free tier
  app_local_put
  
  int 0
  byte "start_date"
  global LatestTimestamp
  app_local_put
  
  int 0
  byte "end_date"
  global LatestTimestamp
  app_local_put
  
  int 1
  return

handle_closeout:
  // Allow users to close out their local state
  int 1
  return

handle_update:
  // Only creator can update the application
  int 1
  return

handle_delete:
  // Only creator can delete the application
  int 1
  return

handle_payment:
  // This should be handled as part of a group transaction
  // with an application call
  int 0
  return

// Subroutine to determine tier from payment amount
get_tier:
  // amount is on the stack
  int 100000000 // 100 Algos (Enterprise tier)
  >=
  bnz return_enterprise
  
  dup
  int 20000000 // 20 Algos (Pro tier)
  >=
  bnz return_pro
  
  dup
  int 5000000 // 5 Algos (Basic tier)
  >=
  bnz return_basic
  
  // Default to free tier
  pop
  int 0
  b get_tier_end
  
  return_enterprise:
    pop
    int 3
    b get_tier_end
  
  return_pro:
    pop
    int 2
    b get_tier_end
  
  return_basic:
    pop
    int 1
  
  get_tier_end:
  retsub

// Subroutine to determine subscription duration from tier
get_duration:
  // amount is on the stack
  callsub get_tier
  
  int 3 // Enterprise tier
  ==
  bnz return_enterprise_duration
  
  int 2 // Pro tier
  ==
  bnz return_pro_duration
  
  int 1 // Basic tier
  ==
  bnz return_basic_duration
  
  // Free tier has no duration
  int 0
  b get_duration_end
  
  return_enterprise_duration:
    int 2592000 // 30 days in seconds
    b get_duration_end
  
  return_pro_duration:
    int 2592000 // 30 days in seconds
    b get_duration_end
  
  return_basic_duration:
    int 2592000 // 30 days in seconds
  
  get_duration_end:
  retsub
`;

/**
 * TEAL clear state program for subscription smart contract
 */
export const CLEAR_STATE_PROGRAM = `#pragma version 6
// Clear State Program - Allow users to clear their local state
int 1
return
`;

/**
 * Compile TEAL code to bytecode
 */
export async function compileTEAL(client: AlgodClient, tealCode: string): Promise<Uint8Array> {
  const compileResponse = await client.compile(tealCode).do();
  return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
}

/**
 * Deploy subscription smart contract to Algorand
 */
export async function deploySubscriptionContract(
  client: AlgodClient,
  creatorAccount: algosdk.Account
): Promise<number> {
  try {
    // Compile approval and clear state programs
    const approvalProgram = await compileTEAL(client, APPROVAL_PROGRAM);
    const clearStateProgram = await compileTEAL(client, CLEAR_STATE_PROGRAM);
    
    // Get suggested transaction parameters
    const params = await client.getTransactionParams().do();
    
    // Create application
    const txn = algosdk.makeApplicationCreateTxn(
      creatorAccount.addr,
      params,
      algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram,
      clearStateProgram,
      0, // Local ints
      3, // Local bytes (tier, start_date, end_date)
      0, // Global ints
      0, // Global bytes
      undefined,
      undefined,
      undefined,
      undefined,
      'Subscription Manager'
    );
    
    // Sign transaction
    const signedTxn = txn.signTxn(creatorAccount.sk);
    
    // Submit transaction
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    const result = await waitForConfirmation(client, txId);
    
    // Get application ID
    const appId = result['application-index'];
    console.log(`Deployed subscription contract with App ID: ${appId}`);
    
    return appId;
  } catch (error) {
    console.error('Error deploying subscription contract:', error);
    throw error;
  }
}

/**
 * Create subscription transaction group
 */
export async function createSubscriptionTransaction(
  client: AlgodClient,
  appId: number,
  sender: string,
  tier: SubscriptionTier
): Promise<algosdk.Transaction[]> {
  try {
    // Get subscription price
    const amount = SUBSCRIPTION_PRICES[tier];
    
    // Get suggested transaction parameters
    const params = await client.getTransactionParams().do();
    
    // Create payment transaction
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender,
      to: await getApplicationAddress(client, appId),
      amount,
      note: new Uint8Array(Buffer.from(`Subscription:${tier}`)),
      suggestedParams: params
    });
    
    // Create application call transaction
    const appCallTxn = algosdk.makeApplicationNoOpTxn(
      sender,
      params,
      appId,
      [new Uint8Array(Buffer.from('subscribe'))]
    );
    
    // Group transactions
    const txnGroup = [paymentTxn, appCallTxn];
    algosdk.assignGroupID(txnGroup);
    
    return txnGroup;
  } catch (error) {
    console.error('Error creating subscription transaction:', error);
    throw error;
  }
}

/**
 * Check subscription status
 */
export async function checkSubscriptionStatus(
  client: AlgodClient,
  appId: number,
  userAddress: string
): Promise<boolean> {
  try {
    // Get account information
    const accountInfo = await client.accountInformation(userAddress).do();
    
    // Find local state for our application
    const appLocalState = accountInfo['apps-local-state']?.find(
      (app: any) => app.id === appId
    );
    
    if (!appLocalState) {
      return false; // User has not opted in to the application
    }
    
    // Find end_date in local state
    const endDateKey = Buffer.from('end_date').toString('base64');
    const endDateValue = appLocalState['key-value']?.find(
      (kv: any) => kv.key === endDateKey
    )?.value?.uint;
    
    if (!endDateValue) {
      return false; // No end date found
    }
    
    // Check if subscription is still active
    const currentTimestamp = Math.floor(Date.now() / 1000);
    return currentTimestamp <= endDateValue;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get application address
 */
async function getApplicationAddress(client: AlgodClient, appId: number): Promise<string> {
  try {
    const appInfo = await client.getApplicationByID(appId).do();
    return appInfo.params.creator;
  } catch (error) {
    console.error('Error getting application address:', error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation
 */
async function waitForConfirmation(client: AlgodClient, txId: string): Promise<any> {
  const status = await client.status().do();
  let lastRound = status['last-round'];
  
  while (true) {
    const pendingInfo = await client.pendingTransactionInformation(txId).do();
    
    if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
      return pendingInfo;
    }
    
    lastRound++;
    await client.statusAfterBlock(lastRound).do();
  }
}