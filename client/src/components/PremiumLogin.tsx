import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Shield, CheckCircle } from 'lucide-react';

export function PremiumLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<'free' | 'ai'>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Demo credentials - in a real app, this would be a server-side check
      if (username && password) {
        // Store user token
        localStorage.setItem('userToken', `demo-token-${Date.now()}`);
        
        // Store subscription info
        localStorage.setItem('userSubscription', JSON.stringify({
          tier: tier,
          active: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        }));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Please enter both username and password');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-xl inline-block">
              <Shield size={32} />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">Premium Access</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter any username and password to access premium features
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter any username"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter any password"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Subscription Tier
              </label>
              <div className="flex space-x-4 mt-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg font-semibold border ${tier === 'free' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'} transition`}
                  onClick={() => setTier('free')}
                >
                  Free Plan
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg font-semibold border ${tier === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'} transition`}
                  onClick={() => setTier('ai')}
                >
                  AI Plan
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Access Premium Features'}
            </button>
          </div>
          
          <div className="text-center text-xs text-gray-400 mt-4">
            This is a demo login. Any username and password will work.
          </div>
        </form>
      </div>
    </div>
  );
}