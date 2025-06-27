import React, { useState, useEffect } from 'react';
import { AlgorandIdentity, UserIdentity, IdentityClaim, VerificationStatus } from '../../blockchain/AlgorandIdentity';
import { WalletProvider } from '../../blockchain/AlgorandPaywall';
import { Shield, User, Mail, CheckCircle, AlertTriangle, Clock, Edit, Save, Wallet, ExternalLink } from 'lucide-react';

interface AlgorandIdentityManagerProps {
  onConnect?: (accounts: string[]) => void;
  onDisconnect?: () => void;
  onIdentityChange?: (identity: UserIdentity | null) => void;
}

export function AlgorandIdentityManager({
  onConnect,
  onDisconnect,
  onIdentityChange
}: AlgorandIdentityManagerProps) {
  const [identityManager] = useState(() => new AlgorandIdentity());
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [claims, setClaims] = useState<IdentityClaim[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Set up event listeners
    identityManager.onConnect((newAccounts) => {
      onConnect?.(newAccounts);
    });

    identityManager.onDisconnect(() => {
      setIdentity(null);
      setClaims([]);
      onDisconnect?.();
    });

    identityManager.onIdentityChange((newIdentity) => {
      setIdentity(newIdentity);
      onIdentityChange?.(newIdentity);
      
      if (newIdentity) {
        const userClaims = identityManager.getIdentityClaims(newIdentity.address);
        setClaims(userClaims);
        
        // Initialize form values
        setNewName(newIdentity.name || '');
        setNewEmail(newIdentity.email || '');
      }
    });

    // Check for existing connection
    const checkExistingConnection = async () => {
      const currentIdentity = identityManager.getCurrentIdentity();
      if (currentIdentity) {
        setIdentity(currentIdentity);
        const userClaims = identityManager.getIdentityClaims(currentIdentity.address);
        setClaims(userClaims);
        
        // Initialize form values
        setNewName(currentIdentity.name || '');
        setNewEmail(currentIdentity.email || '');
      }
    };

    checkExistingConnection();

    return () => {
      // Cleanup if needed
    };
  }, [identityManager, onConnect, onDisconnect, onIdentityChange]);

  const connectWallet = async (provider: WalletProvider) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await identityManager.connectWallet(provider);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await identityManager.disconnectWallet();
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  const submitIdentityClaims = async () => {
    if (!identity) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Add name claim if changed
      if (newName && (identity.name !== newName)) {
        await identityManager.addIdentityClaim({
          type: 'name',
          value: newName
        });
      }
      
      // Add email claim if changed
      if (newEmail && (identity.email !== newEmail)) {
        await identityManager.addIdentityClaim({
          type: 'email',
          value: newEmail
        });
      }
      
      // Simulate verification (in a real app, this would be done by a verification authority)
      if (newName) {
        await identityManager.verifyIdentityClaim(identity.address, 'name', newName);
      }
      
      if (newEmail) {
        await identityManager.verifyIdentityClaim(identity.address, 'email', newEmail);
      }
      
      // Refresh claims
      const updatedIdentity = identityManager.getCurrentIdentity();
      if (updatedIdentity) {
        setIdentity(updatedIdentity);
        const userClaims = identityManager.getIdentityClaims(updatedIdentity.address);
        setClaims(userClaims);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error submitting identity claims:', err);
      setError('Failed to submit identity claims. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return <CheckCircle size={14} className="text-green-400" />;
      case VerificationStatus.PENDING:
        return <Clock size={14} className="text-yellow-400" />;
      case VerificationStatus.REJECTED:
        return <AlertTriangle size={14} className="text-red-400" />;
      default:
        return <AlertTriangle size={14} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return 'Verified';
      case VerificationStatus.PENDING:
        return 'Pending';
      case VerificationStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Unverified';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Decentralized Identity</h3>
        
        {identity && identity.verified && (
          <div className="flex items-center text-green-400 text-xs">
            <Shield size={14} className="mr-1" />
            Verified
          </div>
        )}
      </div>
      
      {!identity ? (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Connect your Algorand wallet to manage your decentralized identity.
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
              <div className="text-sm text-gray-400">Wallet Address</div>
              <div className="text-white font-mono">{formatAddress(identity.address)}</div>
            </div>
            
            <a
              href={`https://${identityManager.config.network === 'mainnet' ? '' : identityManager.config.network + '.'}algoexplorer.io/address/${identity.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          
          {isEditing ? (
            <div className="mb-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={submitIdentityClaims}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
                >
                  <Save size={16} className="mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Save Identity'}
                </button>
                
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                <div className="flex items-center mb-2">
                  <User size={16} className="text-blue-400 mr-2" />
                  <div className="text-sm text-gray-400">Name</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    {identity.name || 'Not set'}
                  </div>
                  {identity.name && (
                    <div className="flex items-center text-green-400 text-xs">
                      <CheckCircle size={14} className="mr-1" />
                      Verified
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Mail size={16} className="text-blue-400 mr-2" />
                  <div className="text-sm text-gray-400">Email</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    {identity.email || 'Not set'}
                  </div>
                  {identity.email && (
                    <div className="flex items-center text-green-400 text-xs">
                      <CheckCircle size={14} className="mr-1" />
                      Verified
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <Edit size={16} className="mr-2" />
                Edit Identity
              </button>
            </div>
          )}
          
          {claims.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Identity Claims</div>
              <div className="space-y-2">
                {claims.map((claim, index) => (
                  <div key={index} className="bg-gray-700/30 rounded-lg p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-300 capitalize">{claim.type}</div>
                      <div className="flex items-center text-xs">
                        {getStatusIcon(claim.status)}
                        <span className={`ml-1 ${
                          claim.status === VerificationStatus.VERIFIED ? 'text-green-400' :
                          claim.status === VerificationStatus.PENDING ? 'text-yellow-400' :
                          claim.status === VerificationStatus.REJECTED ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {getStatusText(claim.status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-white mt-1">{claim.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
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
    </div>
  );
}