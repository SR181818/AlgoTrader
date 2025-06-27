import React, { useState } from 'react';
import { X, CreditCard, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { SubscriptionTier, SUBSCRIPTION_PRICES } from '../../blockchain/AlgorandPaywall';

interface SubscriptionModalProps {
  tier: SubscriptionTier;
  onClose: () => void;
  onSubscribe: (tier: SubscriptionTier) => Promise<boolean>;
}

export function SubscriptionModal({ tier, onClose, onSubscribe }: SubscriptionModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success' | 'error'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'algo-wallet'>('credit-card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const formatPrice = (tier: SubscriptionTier) => {
    const price = SUBSCRIPTION_PRICES[tier] / 1_000_000; // Convert from microAlgos to Algos
    return `${price} ALGO`;
  };
  
  const formatTierName = (tier: SubscriptionTier) => {
    if (tier === SubscriptionTier.FREE) return 'Free';
    if (tier === SubscriptionTier.AI) return 'AI';
    return '';
  };
  
  const handleProceedToPayment = () => {
    setStep('payment');
  };
  
  const handleSubmitPayment = async () => {
    // Validate form
    if (paymentMethod === 'credit-card') {
      if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
        setError('Please fill in all card details');
        return;
      }
      
      // Simple validation
      if (cardNumber.length < 16) {
        setError('Invalid card number');
        return;
      }
    }
    
    setError(null);
    setStep('processing');
    
    try {
      // Process subscription
      const success = await onSubscribe(tier);
      
      if (success) {
        setStep('success');
      } else {
        setStep('error');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setStep('error');
    }
  };
  
  const handleTryAgain = () => {
    setStep('payment');
  };
  
  const handleFinish = () => {
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-indigo-900/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl max-w-md w-full mx-4 overflow-hidden border border-blue-400/30">
        {/* Header */}
        <div className="p-4 border-b border-blue-400/30 flex items-center justify-between bg-gradient-to-r from-blue-700/60 to-purple-700/60">
          <h2 className="text-lg font-semibold text-white drop-shadow">
            {step === 'details' && `Subscribe to ${formatTierName(tier)} Plan`}
            {step === 'payment' && 'Payment Details'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Subscription Complete'}
            {step === 'error' && 'Payment Failed'}
          </h2>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {/* Details Step */}
          {step === 'details' && (
            <div>
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 flex items-center justify-center mr-4 shadow-lg">
                  <Shield size={24} className="text-white drop-shadow" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg drop-shadow">{formatTierName(tier)} Plan</h3>
                  <div className="text-blue-200 text-sm">Blockchain-secured subscription</div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6 border border-blue-400/20">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-200">Price</span>
                  <span className="text-white font-semibold">
                    {formatPrice(tier)}
                  </span>
                </div>
                <div className="text-xs text-blue-300">
                  Subscription will be stored on the Algorand blockchain for transparency and security
                </div>
              </div>
              <div className="text-sm text-blue-100 mb-6">
                <p>By subscribing, you agree to the terms of service and the subscription agreement.</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleProceedToPayment}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow hover:from-blue-600 hover:to-purple-600 transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          )}
          {/* Payment Step */}
          {step === 'payment' && (
            <div>
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setPaymentMethod('credit-card')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border-2 ${
                      paymentMethod === 'credit-card'
                        ? 'border-blue-500 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow'
                        : 'border-blue-300 bg-white/10 text-blue-200'
                    } transition-colors`}
                  >
                    <CreditCard size={16} className="mr-2" />
                    Credit Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('algo-wallet')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border-2 ${
                      paymentMethod === 'algo-wallet'
                        ? 'border-purple-500 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                        : 'border-purple-300 bg-white/10 text-purple-200'
                    } transition-colors`}
                  >
                    <Shield size={16} className="mr-2" />
                    Algo Wallet
                  </button>
                </div>
                {paymentMethod === 'credit-card' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-blue-200 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-white/20 text-white rounded px-3 py-2 border border-blue-400/30 focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-blue-200 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white/20 text-white rounded px-3 py-2 border border-blue-400/30 focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-blue-200 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (value.length > 2) {
                              setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
                            } else {
                              setCardExpiry(value);
                            }
                          }}
                          placeholder="MM/YY"
                          className="w-full bg-white/20 text-white rounded px-3 py-2 border border-blue-400/30 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-blue-200 mb-1">CVC</label>
                        <input
                          type="text"
                          value={cardCVC}
                          onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="123"
                          className="w-full bg-white/20 text-white rounded px-3 py-2 border border-blue-400/30 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-purple-200 py-8">
                    <div className="text-lg mb-2 font-semibold">Algorand Wallet Payment</div>
                    <div className="text-sm">Connect your Algorand wallet to complete the subscription payment.</div>
                    <button className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold shadow hover:from-purple-600 hover:to-indigo-600 transition-colors">
                      Connect Wallet
                    </button>
                  </div>
                )}
                {error && (
                  <div className="mt-4 text-red-300 bg-red-400/10 p-3 rounded text-sm border border-red-400/30">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-blue-400/20 text-blue-200 hover:bg-blue-400/10 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitPayment}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow hover:from-blue-600 hover:to-purple-600 transition-colors"
                >
                  Pay {formatPrice(tier)}
                </button>
              </div>
            </div>
          )}
          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="inline-block w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-lg text-white mb-2 font-semibold">Processing Your Payment</div>
              <div className="text-sm text-blue-200">Please wait while we process your payment...</div>
            </div>
          )}
          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-green-500/20 rounded-full mb-4">
                <CheckCircle size={48} className="text-green-400 drop-shadow" />
              </div>
              <div className="text-lg text-green-200 mb-2 font-semibold">Payment Successful!</div>
              <div className="text-sm text-green-100 mb-6">
                Thank you for your subscription. Your {formatTierName(tier)} plan is now active.
              </div>
              <button
                onClick={handleFinish}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold shadow hover:from-green-600 hover:to-blue-600 transition-colors"
              >
                Start Using Premium Features
              </button>
            </div>
          )}
          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-red-500/20 rounded-full mb-4">
                <AlertTriangle size={48} className="text-red-400 drop-shadow" />
              </div>
              <div className="text-lg text-red-200 mb-2 font-semibold">Payment Failed</div>
              <div className="text-sm text-red-100 mb-6">
                There was an issue processing your payment. Please try again.
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-red-400/20 text-red-200 hover:bg-red-400/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTryAgain}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-purple-500 text-white font-semibold shadow hover:from-red-600 hover:to-purple-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}