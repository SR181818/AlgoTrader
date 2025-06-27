import React, { useState, useEffect } from 'react';
import { AlgorandPaywall } from '../../blockchain/AlgorandPaywall';
import { Lock, CreditCard } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize on mount
  useEffect(() => {
    const checkFeatureAvailability = () => {
      setIsAvailable(paywall.isFeatureAvailable(featureName));
      setIsLoading(false);
    };

    // Set up subscription change listener
    paywall.onSubscriptionChange(() => {
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

  // All features are now free by default
  return <>{children}</>;
}