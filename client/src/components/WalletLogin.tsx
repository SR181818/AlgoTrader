import React, { useState } from 'react';
import { Wallet, Shield, Check, AlertCircle } from 'lucide-react';
import { AlgorandIdentity } from '../blockchain/AlgorandIdentity';

interface WalletLoginProps {
  onLogin: (token: string, user: any) => void;
  onError: (error: string) => void;
}

export function WalletLogin({ onLogin, onError }: WalletLoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [algorandIdentity] = useState(new AlgorandIdentity());

  const handleWalletConnect = async () => {
    setIsConnecting(true);
    
    try {
      const accounts = await algorandIdentity.connectWallet();
      
      if (accounts.length > 0) {
        const address = accounts[0];
        setConnectedAddress(address);
        
        // Authenticate with backend
        const response = await fetch('/api/auth/algorand-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            algorandAddress: address,
            loginType: 'algorand'
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          onLogin(data.token, data.user);
        } else {
          onError(data.error || 'Wallet authentication failed');
        }
      }
    } catch (err: any) {
      onError('Failed to connect wallet: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Connect Algorand Wallet</h3>
        <p className="text-gray-400 text-sm">
          Use your Algorand wallet to securely access the trading platform
        </p>
      </div>

      {!connectedAddress ? (
        <button
          onClick={handleWalletConnect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-400">
            <Check className="w-5 h-5" />
            <span className="font-medium">Wallet Connected</span>
          </div>
          <p className="text-sm text-gray-300 mt-2 break-all">
            {connectedAddress}
          </p>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-blue-400 font-medium text-sm">Secure Authentication</h4>
            <p className="text-gray-400 text-xs mt-1">
              Your wallet signature proves ownership without exposing private keys
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}