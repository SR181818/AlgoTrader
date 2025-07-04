
import React, { useState, useEffect } from 'react';
import { Zap, Lock, Brain, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

interface AIStatus {
  aiEnabled: boolean;
}

export default function AIFeaturesPage() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/paywall/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiStatus(data);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!window.AlgoSigner) {
      setPaymentMessage('Please install AlgoSigner wallet extension to continue.');
      return;
    }

    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      // Connect to AlgoSigner
      await window.AlgoSigner.connect();
      const accounts = await window.AlgoSigner.accounts({ ledger: 'TestNet' });
      
      if (!accounts.length) {
        setPaymentMessage('No Algorand accounts found. Please create an account in AlgoSigner.');
        setPaymentLoading(false);
        return;
      }

      const algorandAddress = accounts[0].address;

      // Create payment transaction
      const token = localStorage.getItem('token');
      const checkoutResponse = await fetch('/api/paywall/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planType: 'ai',
          algorandAddress
        })
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create payment transaction');
      }

      const checkoutData = await checkoutResponse.json();

      // Sign transaction with AlgoSigner
      const signedTxn = await window.AlgoSigner.signTxn([{
        txn: checkoutData.transaction.txnB64
      }]);

      // Submit transaction
      const submitResult = await window.AlgoSigner.send({
        ledger: 'TestNet',
        tx: signedTxn[0].blob
      });

      setPaymentMessage('Transaction submitted! Confirming payment...');

      // Confirm payment
      const confirmResponse = await fetch('/api/paywall/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: submitResult.txId
        })
      });

      if (confirmResponse.ok) {
        const confirmData = await confirmResponse.json();
        setPaymentMessage(confirmData.message);
        await checkAIStatus(); // Refresh status
      } else if (confirmResponse.status === 202) {
        setPaymentMessage('Payment submitted! Please wait a few moments for confirmation...');
        // Poll for confirmation
        setTimeout(() => checkAIStatus(), 10000);
      } else {
        throw new Error('Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentMessage('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white">Loading AI features...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            AI Trading Features
          </h1>
          <p className="text-gray-300 text-lg">
            Unlock advanced AI-powered trading capabilities with machine learning insights and automated strategy optimization.
          </p>
        </div>

        {paymentMessage && (
          <Alert className="mb-6 bg-blue-900/50 border-blue-500">
            <AlertCircle className="h-4 w-4" />
            <div>{paymentMessage}</div>
          </Alert>
        )}

        {aiStatus?.aiEnabled ? (
          <div className="space-y-6">
            <Alert className="bg-green-900/50 border-green-500">
              <CheckCircle className="h-4 w-4" />
              <div>AI Features Activated! You now have access to all advanced AI trading capabilities.</div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700 p-6">
                <Brain className="h-12 w-12 text-cyan-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Market Prediction</h3>
                <p className="text-gray-300">Advanced neural networks analyze market patterns to predict price movements with high accuracy.</p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6">
                <TrendingUp className="h-12 w-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Strategy Optimization</h3>
                <p className="text-gray-300">AI automatically optimizes your trading strategies based on historical performance and market conditions.</p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6">
                <Zap className="h-12 w-12 text-yellow-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Real-time Analysis</h3>
                <p className="text-gray-300">Get instant AI-powered insights on market sentiment, anomaly detection, and risk assessment.</p>
              </Card>
            </div>

            <div className="bg-gray-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4">AI Dashboard</h2>
              <p className="text-gray-300 mb-4">
                Your AI features are active. Explore the advanced capabilities in your trading dashboard.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Market Regime Detection</h4>
                  <div className="text-sm text-gray-300">Current: <span className="text-green-400">Bullish Trend</span></div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">AI Confidence Score</h4>
                  <div className="text-sm text-gray-300">Prediction Accuracy: <span className="text-cyan-400">87%</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-xl p-8 border border-orange-500/30">
              <div className="flex items-center mb-4">
                <Lock className="h-8 w-8 text-orange-400 mr-3" />
                <h2 className="text-2xl font-bold">AI Features Locked</h2>
              </div>
              <p className="text-gray-300 mb-6">
                Upgrade to unlock advanced AI-powered trading features including market prediction, 
                strategy optimization, and real-time analysis.
              </p>
              
              <div className="bg-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">AI Plan Features:</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Advanced ML-based market prediction
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Automated strategy optimization
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Real-time anomaly detection
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Advanced risk assessment
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    Priority customer support
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">5 ALGO</div>
                  <div className="text-gray-300">One-time payment via Algorand</div>
                </div>
              </div>

              <Button 
                onClick={handleUpgrade}
                disabled={paymentLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white py-3 text-lg"
              >
                {paymentLoading ? 'Processing...' : 'Upgrade to AI Plan'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700 p-6 opacity-60">
                <Lock className="h-8 w-8 text-gray-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">Market Prediction</h3>
                <p className="text-gray-400 text-sm">Locked - Upgrade to access AI market prediction</p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6 opacity-60">
                <Lock className="h-8 w-8 text-gray-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">Strategy Optimization</h3>
                <p className="text-gray-400 text-sm">Locked - Upgrade to access AI optimization</p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6 opacity-60">
                <Lock className="h-8 w-8 text-gray-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">Real-time Analysis</h3>
                <p className="text-gray-400 text-sm">Locked - Upgrade to access AI analysis</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
