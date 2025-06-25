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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {step === 'details' && `Subscribe to ${formatTierName(tier)} Plan`}
            {step === 'payment' && 'Payment Details'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Subscription Complete'}
            {step === 'error' && 'Payment Failed'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
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
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mr-4">
                  <Shield size={24} className="text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-white font-medium">{formatTierName(tier)} Plan</h3>
                  <div className="text-gray-400 text-sm">Blockchain-secured subscription</div>
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Price</span>
                  <span className="text-white font-medium">
                    {formatPrice(tier)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-400">
                  Subscription will be stored on the Algorand blockchain for transparency and security
                </div>
              </div>
              
              <div className="text-sm text-gray-300 mb-6">
                <p>By subscribing, you agree to the terms of service and the subscription agreement.</p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleProceedToPayment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
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
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded border ${
                      paymentMethod === 'credit-card'
                        ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                        : 'border-gray-600 text-gray-400'
                    }`}
                  >
                    <CreditCard size={16} className="mr-2" />
                    Credit Card
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('algo-wallet')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded border ${
                      paymentMethod === 'algo-wallet'
                        ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                        : 'border-gray-600 text-gray-400'
                    }`}
                  >
                    <Shield size={16} className="mr-2" />
                    Algo Wallet
                  </button>
                </div>
                
                {paymentMethod === 'credit-card' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Expiry Date</label>
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
                          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">CVC</label>
                        <input
                          type="text"
                          value={cardCVC}
                          onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="123"
                          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-300 py-8">
                    <div className="text-lg mb-2">Algorand Wallet Payment</div>
                    <div className="text-sm">Connect your Algorand wallet to complete the subscription payment.</div>
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                      Connect Wallet
                    </button>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 text-red-400 bg-red-400/10 p-3 rounded text-sm">
                    {error}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                >
                  Back
                </button>
                
                <button
                  onClick={handleSubmitPayment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                >
                  Pay {formatPrice(tier)}
                </button>
              </div>
            </div>
          )}
          
          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-lg text-white mb-2">Processing Your Payment</div>
              <div className="text-sm text-gray-400">Please wait while we process your payment...</div>
            </div>
          )}
          
          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-green-600/20 rounded-full mb-4">
                <CheckCircle size={48} className="text-green-400" />
              </div>
              <div className="text-lg text-white mb-2">Payment Successful!</div>
              <div className="text-sm text-gray-300 mb-6">
                Thank you for your subscription. Your {formatTierName(tier)} plan is now active.
              </div>
              <button
                onClick={handleFinish}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                Start Using Premium Features
              </button>
            </div>
          )}
          
          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-red-600/20 rounded-full mb-4">
                <AlertTriangle size={48} className="text-red-400" />
              </div>
              <div className="text-lg text-white mb-2">Payment Failed</div>
              <div className="text-sm text-gray-300 mb-6">
                There was an issue processing your payment. Please try again.
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTryAgain}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
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