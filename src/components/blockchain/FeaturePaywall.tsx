import React, { useState, useEffect } from 'react';
import { AlgorandPaywall, SubscriptionTier, Subscription, SUBSCRIPTION_FEATURES } from '../../blockchain/AlgorandPaywall';
import { Lock, Unlock, CreditCard, CheckCircle } from 'lucide-react';

interface FeaturePaywallProps {
  featureName: string;
  children: React.ReactNode;
  fallbackContent?: React.ReactNode;
  onSubscribe?: () => void;
}

export function FeaturePaywall({ 
  featureName, 
  children, 
  fallbackContent,
  onSubscribe
}: FeaturePaywallProps) {
  const [paywall] = useState(() => new AlgorandPaywall());
  const [isAvailable, setIsAvailable] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize on mount
  useEffect(() => {
    const checkFeatureAvailability = () => {
      const currentSubscription = paywall.getCurrentSubscription();
      setSubscription(currentSubscription);
      setIsAvailable(paywall.isFeatureAvailable(featureName));
      setIsLoading(false);
    };

    // Set up subscription change listener
    paywall.onSubscriptionChange((newSubscription) => {
      setSubscription(newSubscription);
      setIsAvailable(paywall.isFeatureAvailable(featureName));
    });

    checkFeatureAvailability();

    return () => {
      // Cleanup if needed
    };
  }, [paywall, featureName]);

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-700/50 rounded-lg p-6 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (isAvailable) {
    return <>{children}</>;
  }

  // Feature is not available, show paywall
  return fallbackContent || (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-blue-600/20 rounded-full mb-4">
          <Lock size={24} className="text-blue-400" />
        </div>
        
        <h3 className="text-white font-medium mb-2">Premium Feature</h3>
        
        <p className="text-gray-400 text-sm mb-4">
          This feature requires a {getRequiredTier(featureName)} subscription or higher.
        </p>
        
        <button
          onClick={handleSubscribe}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          <CreditCard size={16} className="mr-2" />
          Upgrade Subscription
        </button>
      </div>
    </div>
  );
}

// Helper function to determine required tier for a feature
function getRequiredTier(featureName: string): string {
  // This would be based on your feature configuration
  const featureTiers: Record<string, string> = {
    'Real-time market data': 'BASIC',
    'Full technical indicator library': 'BASIC',
    'Multi-timeframe analysis': 'BASIC',
    'Basic backtesting': 'BASIC',
    'Advanced backtesting': 'PRO',
    'Custom strategy builder': 'PRO',
    'ML model integration': 'PRO',
    'Portfolio management': 'PRO',
    'Risk management tools': 'PRO',
    'API access': 'ENTERPRISE',
    'Custom indicators': 'ENTERPRISE',
    'Priority support': 'ENTERPRISE',
    'Multiple portfolios': 'ENTERPRISE',
    'Team collaboration': 'ENTERPRISE'
  };
  
  return featureTiers[featureName] || 'BASIC';
}