import React, { useState, useEffect } from 'react';
import { AlgorandWalletConnect } from '../components/blockchain/AlgorandWalletConnect';
import { AlgorandIdentityManager } from '../components/blockchain/AlgorandIdentityManager';
import { FeaturePaywall } from '../components/blockchain/FeaturePaywall';
import { SubscriptionModal } from '../components/blockchain/SubscriptionModal';
import { Subscription, SubscriptionTier, SUBSCRIPTION_FEATURES, SUBSCRIPTION_PRICES } from '../blockchain/AlgorandPaywall';
import { UserIdentity } from '../blockchain/AlgorandIdentity';
import { Wallet, Shield, CreditCard, Lock, Unlock, Bot, CheckCircle, User } from 'lucide-react';

interface BlockchainPaywallPageProps {
  onSubscriptionChange?: (subscription: Subscription | null) => void;
}

export default function BlockchainPaywallPage({ onSubscriptionChange }: BlockchainPaywallPageProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);

  const handleSubscriptionChange = (newSubscription: Subscription | null) => {
    setSubscription(newSubscription);
    if (onSubscriptionChange) {
      onSubscriptionChange(newSubscription);
    }
  };

  const handleIdentityChange = (newIdentity: UserIdentity | null) => {
    setIdentity(newIdentity);
  };

  const handleSubscribeClick = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setShowSubscriptionModal(true);
  };
  
  const handleSubscribe = async (tier: SubscriptionTier): Promise<boolean> => {
    // In a real implementation, this would interact with the Algorand blockchain
    // For demo purposes, we'll simulate a successful subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.2; // 80% success rate for demo
    
    if (success) {
      const newSubscription: Subscription = {
        tier,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        transactionId: 'tx_' + Math.random().toString(36).substring(2),
        walletAddress: identity?.address || 'unknown',
        active: true
      };
      
      handleSubscriptionChange(newSubscription);
    }
    
    return success;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Blockchain Paywall & Identity</h1>
          <p className="text-gray-400">Secure access to premium features with Algorand blockchain</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {identity && (
            <div className="flex items-center bg-gray-800 rounded-lg px-3 py-1 border border-gray-700">
              <User size={16} className="text-blue-400 mr-2" />
              <span className="text-white text-sm">{identity.name || 'Anonymous'}</span>
            </div>
          )}
          
          {subscription && subscription.active && (
            <div className={`flex items-center rounded-lg px-3 py-1 ${
              subscription.tier === 'free' ? 'bg-gray-800 border border-gray-700 text-gray-300' :
              'bg-blue-600/20 border border-blue-600/30 text-blue-400'
            }`}>
              <Shield size={16} className="mr-2" />
              <span className="text-sm font-medium">{subscription.tier.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wallet and Identity */}
        <div className="space-y-6">
          <AlgorandWalletConnect 
            onSubscriptionChange={handleSubscriptionChange}
          />
          
          <AlgorandIdentityManager
            onIdentityChange={handleIdentityChange}
          />
        </div>
        
        {/* Right Column - Subscription Plans and Features */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Subscription Plans</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {[SubscriptionTier.FREE, SubscriptionTier.AI].map(tier => (
                <div key={tier} className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center">
                  <h3 className="text-xl font-bold text-white mb-2">{tier === SubscriptionTier.FREE ? 'Free Plan' : 'AI Plan'}</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {tier === SubscriptionTier.FREE ? 'Free' : `${SUBSCRIPTION_PRICES[tier] / 1_000_000} Algos/mo`}
                  </div>
                  <ul className="text-gray-300 mb-4">
                    {SUBSCRIPTION_FEATURES[tier].map(f => (
                      <li key={f} className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-400" /> {f}</li>
                    ))}
                  </ul>
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold mt-auto"
                    onClick={() => handleSubscribeClick(tier)}
                  >
                    {tier === SubscriptionTier.FREE ? 'Activate Free' : 'Subscribe to AI'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Premium Features</h2>
            <p className="text-gray-400 mb-6">
              Access advanced trading features with blockchain-based subscriptions. Your subscription is stored on the Algorand blockchain, providing transparent and secure access control.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Free features */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-600/20 rounded-lg mr-3">
                    <Unlock size={18} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Basic Market Data</h3>
                    <p className="text-xs text-gray-400">Available to all users</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">
                  Access basic market data and simple technical analysis tools.
                </p>
              </div>
              
              {/* AI features */}
              <FeaturePaywall
                featureName="AI-powered signals"
                onSubscribe={() => handleSubscribeClick(SubscriptionTier.AI)}
              >
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg mr-3">
                      <Bot size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">AI-Powered Signals</h3>
                      <p className="text-xs text-blue-400">AI Plan Feature</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    Unlock advanced AI-powered trading signals and analytics.
                  </p>
                </div>
              </FeaturePaywall>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center mr-4">
                  <Wallet size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">1. Connect Your Wallet</h3>
                  <p className="text-sm text-gray-300">
                    Connect your Algorand wallet using Pera Wallet or MyAlgo Connect. Your wallet serves as your decentralized identity.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center mr-4">
                  <Shield size={20} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">2. Verify Your Identity</h3>
                  <p className="text-sm text-gray-300">
                    Add and verify identity claims like your name and email. These claims are stored securely on the Algorand blockchain.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center mr-4">
                  <CreditCard size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">3. Subscribe to Premium Features</h3>
                  <p className="text-sm text-gray-300">
                    Choose a subscription plan and pay with Algos. Your subscription is recorded on the blockchain and automatically verified.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center mr-4">
                  <Unlock size={20} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">4. Access Premium Features</h3>
                  <p className="text-sm text-gray-300">
                    Once subscribed, you'll have immediate access to premium features based on your subscription tier.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-600/20 rounded-full mr-3">
                <Shield size={20} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Blockchain-Powered Security</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Our blockchain paywall provides several advantages over traditional payment systems:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-300">Decentralized authentication without passwords</span>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-300">Transparent subscription management on-chain</span>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-300">Self-sovereign identity with verifiable claims</span>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-300">No central database of user credentials</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal 
          tier={selectedTier}
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={handleSubscribe}
        />
      )}
    </div>
  );
}