import React, { useState } from 'react';
import { Plugin } from '../models/PluginModel';
import { X, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

interface PluginPurchaseModalProps {
  plugin: Plugin;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

export function PluginPurchaseModal({ plugin, onClose, onPurchaseComplete }: PluginPurchaseModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success' | 'error'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'paypal'>('credit-card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const formatPrice = (price: number, pricingModel: string, interval?: string) => {
    if (price === 0) return 'Free';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
    
    if (pricingModel === 'subscription') {
      return `${formattedPrice}/${interval === 'year' ? 'year' : 'month'}`;
    }
    
    return formattedPrice;
  };
  
  const handleProceedToPayment = () => {
    setStep('payment');
  };
  
  const handleSubmitPayment = () => {
    // Validate form
    if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
      setError('Please fill in all card details');
      return;
    }
    
    // Simple validation
    if (cardNumber.length < 16) {
      setError('Invalid card number');
      return;
    }
    
    setError(null);
    setStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      // 90% chance of success for demo purposes
      if (Math.random() > 0.1) {
        setStep('success');
      } else {
        setStep('error');
      }
    }, 2000);
  };
  
  const handleTryAgain = () => {
    setStep('payment');
  };
  
  const handleFinish = () => {
    onPurchaseComplete();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {step === 'details' && 'Purchase Plugin'}
            {step === 'payment' && 'Payment Details'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Purchase Complete'}
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
                <div className="flex-shrink-0 w-16 h-16 bg-gray-700 rounded overflow-hidden">
                  {plugin.thumbnailUrl ? (
                    <img 
                      src={plugin.thumbnailUrl} 
                      alt={plugin.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <span className="text-2xl">{plugin.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  <h3 className="text-white font-medium">{plugin.name}</h3>
                  <div className="text-gray-400 text-sm">by {plugin.author}</div>
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Price</span>
                  <span className="text-white font-medium">
                    {formatPrice(plugin.price, plugin.pricingModel, plugin.subscriptionInterval)}
                  </span>
                </div>
                
                {plugin.pricingModel === 'subscription' && (
                  <div className="text-xs text-gray-400">
                    You will be charged {formatPrice(plugin.price, 'one-time')} 
                    {plugin.subscriptionInterval === 'month' ? ' monthly' : ' yearly'}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-300 mb-6">
                <p>By purchasing this plugin, you agree to the terms of service and the plugin's license agreement.</p>
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
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded border ${
                      paymentMethod === 'paypal'
                        ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                        : 'border-gray-600 text-gray-400'
                    }`}
                  >
                    <span className="font-bold mr-1">Pay</span>Pal
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
                    <div className="text-lg mb-2">PayPal Integration</div>
                    <div className="text-sm">You will be redirected to PayPal to complete your purchase.</div>
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
                  Pay {formatPrice(plugin.price, 'one-time')}
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
                Thank you for your purchase. You now have access to {plugin.name}.
              </div>
              <button
                onClick={handleFinish}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                Download Now
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