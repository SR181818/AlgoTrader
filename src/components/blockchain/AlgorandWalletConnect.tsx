import React, { useState, useEffect } from 'react';
import { AlgorandPaywall, WalletProvider, SubscriptionTier, Subscription, SUBSCRIPTION_FEATURES, SUBSCRIPTION_PRICES } from '../../blockchain/AlgorandPaywall';
import { Wallet, CreditCard, CheckCircle, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

interface AlgorandWalletConnectProps {
  onConnect?: (accounts: string[]) => void;
  onDisconnect?: () => void;
  onSubscriptionChange?: (subscription: Subscription | null) => void;
}

export function AlgorandWalletConnect({ 
  onConnect, 
  onDisconnect, 
  onSubscriptionChange 
}: AlgorandWalletConnectProps) {
  const [paywall] = useState(() => new AlgorandPaywall());
  const [accounts, setAccounts] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    // Set up event listeners
    paywall.onConnect((newAccounts) => {
      setAccounts(newAccounts);
      onConnect?.(newAccounts);
    });

    paywall.onDisconnect(() => {
      setAccounts([]);
      setSubscription(null);
      onDisconnect?.();
    });

    paywall.onSubscriptionChange((newSubscription) => {
      setSubscription(newSubscription);
      onSubscriptionChange?.(newSubscription);
    });

    // Check for existing connection
    const checkExistingConnection = async () => {
      const connectedAccounts = paywall.getConnectedAccounts();
      if (connectedAccounts.length > 0) {
        setAccounts(connectedAccounts);
        
        // Check subscription
        try {
          const sub = await paywall.checkSubscription(connectedAccounts[0]);
          setSubscription(sub);
          onSubscriptionChange?.(sub);
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }
    };

    checkExistingConnection();

    return () => {
      // Cleanup if needed
    };
  }, [paywall, onConnect, onDisconnect, onSubscriptionChange]);

  const connectWallet = async (provider: WalletProvider) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const newAccounts = await paywall.connectWallet(provider);
      setAccounts(newAccounts);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await paywall.disconnectWallet();
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  const subscribe = async (tier: SubscriptionTier) => {
    try {
      setError(null);
      await paywall.subscribe(tier);
      setShowSubscriptionModal(false);
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Failed to process subscription. Please try again.');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Algorand Wallet</h3>
        
        {accounts.length > 0 && subscription && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            subscription.tier === SubscriptionTier.FREE ? 'bg-gray-600 text-gray-300' :
            subscription.tier === SubscriptionTier.BASIC ? 'bg-blue-600/20 text-blue-400' :
            subscription.tier === SubscriptionTier.PRO ? 'bg-purple-600/20 text-purple-400' :
            'bg-yellow-600/20 text-yellow-400'
          }`}>
            {subscription.tier.toUpperCase()} PLAN
          </div>
        )}
      </div>
      
      {accounts.length === 0 ? (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Connect your Algorand wallet to access premium features and manage your subscription.
          </p>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => connectWallet(WalletProvider.PERA)}
              disabled={isConnecting}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Wallet size={16} className="mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Pera Wallet'}
            </button>
            
            <button
              onClick={() => connectWallet(WalletProvider.MYALGO)}
              disabled={isConnecting}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Wallet size={16} className="mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect MyAlgo Wallet'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle size={16} className="inline-block mr-2" />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400">Connected Account</div>
              <div className="text-white font-mono">{formatAddress(accounts[0])}</div>
            </div>
            
            <a
              href={`https://${paywall.config.network === 'mainnet' ? '' : paywall.config.network + '.'}algoexplorer.io/address/${accounts[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">Subscription Status</div>
            {subscription ? (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-medium">{subscription.tier.toUpperCase()} Plan</div>
                  {subscription.active ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <CheckCircle size={14} className="mr-1" />
                      Active
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <AlertTriangle size={14} className="mr-1" />
                      Expired
                    </div>
                  )}
                </div>
                
                {subscription.tier !== SubscriptionTier.FREE && (
                  <div className="text-xs text-gray-400">
                    {subscription.active ? (
                      <>Expires on {subscription.endDate.toLocaleDateString()}</>
                    ) : (
                      <>Expired on {subscription.endDate.toLocaleDateString()}</>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-700/50 rounded-lg p-3 text-gray-400 text-sm">
                No active subscription
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <CreditCard size={16} className="mr-2" />
              {subscription && subscription.active ? 'Manage Subscription' : 'Subscribe'}
            </button>
            
            <button
              onClick={disconnectWallet}
              className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle size={16} className="inline-block mr-2" />
              {error}
            </div>
          )}
        </div>
      )}
      
      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Choose a Subscription Plan</h2>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {Object.values(SubscriptionTier).map((tier) => (
                  <div 
                    key={tier}
                    className={`bg-gray-700/50 rounded-lg p-4 border ${
                      subscription?.tier === tier && subscription?.active
                        ? 'border-blue-500'
                        : 'border-gray-600 hover:border-gray-500'
                    } cursor-pointer transition-colors`}
                    onClick={() => subscribe(tier)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white font-medium">{tier.toUpperCase()} Plan</div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        tier === SubscriptionTier.FREE ? 'bg-gray-600 text-gray-300' :
                        tier === SubscriptionTier.BASIC ? 'bg-blue-600/20 text-blue-400' :
                        tier === SubscriptionTier.PRO ? 'bg-purple-600/20 text-purple-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {tier === SubscriptionTier.FREE ? 'FREE' : 
                         `${SUBSCRIPTION_PRICES[tier] / 1_000_000} ALGO`}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      {SUBSCRIPTION_FEATURES[tier].map((feature, index) => (
                        <div key={index} className="flex items-start text-sm">
                          <CheckCircle size={14} className="text-green-400 mt-1 mr-2 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {subscription?.tier === tier && subscription?.active && (
                      <div className="mt-3 pt-3 border-t border-gray-600 flex items-center text-green-400 text-sm">
                        <Shield size={14} className="mr-2" />
                        Current Plan
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-xs text-gray-400">
                * Subscriptions are processed on the Algorand blockchain and require a connected wallet.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}