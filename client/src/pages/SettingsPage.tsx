import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Key, Shield, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const { toast } = useToast();

  // Fetch API key status
  const { data: apiKeyStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['settings', 'apikey'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/apikey');
      return response.json();
    },
  });

  // Save API credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async (credentials: { apiKey: string; apiSecret: string }) => {
      const response = await apiRequest('POST', '/api/settings/apikey', credentials);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'API Credentials Saved',
        description: 'Your Binance API credentials have been saved and validated successfully.',
      });
      setApiKey('');
      setApiSecret('');
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Save Credentials',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test API credentials mutation
  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/settings/apikey/test');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'API Test Successful',
        description: `Connected successfully. Account status: ${data.accountStatus}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'API Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete API credentials mutation
  const deleteCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/settings/apikey');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'API Credentials Removed',
        description: 'Your Binance API credentials have been removed.',
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Remove Credentials',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both API key and secret',
        variant: 'destructive',
      });
      return;
    }

    saveCredentialsMutation.mutate({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() });
  };

  const handleTestCredentials = () => {
    if (!apiKeyStatus?.hasApiKey) {
      toast({
        title: 'No API Credentials',
        description: 'Please save your API credentials first',
        variant: 'destructive',
      });
      return;
    }
    
    testCredentialsMutation.mutate();
  };

  const handleDeleteCredentials = () => {
    if (window.confirm('Are you sure you want to remove your API credentials? This will disable portfolio and trading features.')) {
      deleteCredentialsMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* API Credentials Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Binance API Credentials</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              {apiKeyStatus?.hasApiKey ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium">
                  {apiKeyStatus?.hasApiKey ? 'API Credentials Configured' : 'No API Credentials'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {apiKeyStatus?.hasApiKey 
                    ? `Key: ${apiKeyStatus.apiKeyPreview}` 
                    : 'Configure your Binance API credentials to enable trading and portfolio features'
                  }
                </p>
              </div>
            </div>
            {apiKeyStatus?.hasApiKey && (
              <div className="flex space-x-2">
                <Button
                  onClick={handleTestCredentials}
                  disabled={testCredentialsMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {testCredentialsMutation.isPending ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  onClick={handleDeleteCredentials}
                  disabled={deleteCredentialsMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* API Key Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Binance API key"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter your Binance API secret"
                className="font-mono"
              />
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="showSecret"
                  checked={showSecret}
                  onChange={(e) => setShowSecret(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showSecret" className="text-sm text-muted-foreground">
                  Show API secret
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saveCredentialsMutation.isPending}
              className="w-full"
            >
              {saveCredentialsMutation.isPending ? 'Saving...' : 'Save API Credentials'}
            </Button>
          </form>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  How to get your Binance API credentials:
                </h4>
                <ol className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                  <li>1. Go to <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer" className="underline">Binance API Management</a></li>
                  <li>2. Click "Create API" and complete verification</li>
                  <li>3. Enable "Enable Reading" and "Enable Spot & Margin Trading" permissions</li>
                  <li>4. Copy your API Key and Secret Key here</li>
                  <li>5. For security, consider IP restrictions in Binance settings</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  <strong>Security:</strong> Your API credentials are encrypted and stored securely. 
                  Never share your API secret with anyone.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Subscription</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">Free Plan</Badge>
                  <span className="text-sm text-muted-foreground">
                    Upgrade for AI trading features
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Trading Mode</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary">Paper Trading</Badge>
                  <span className="text-sm text-muted-foreground">
                    Safe mode for testing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}