import React, { useState } from 'react';
import { PluginMarketplace } from '../components/PluginMarketplace';
import { PluginDeveloperDashboard } from '../components/PluginDeveloperDashboard';
import { PluginAdminDashboard } from '../components/PluginAdminDashboard';
import { Store, Code, ShieldCheck } from 'lucide-react';

interface PluginMarketplacePageProps {
  userId?: string;
  isAdmin?: boolean;
  isDeveloper?: boolean;
}

export default function PluginMarketplacePage({ 
  userId = 'user_123', // Mock user ID for demo
  isAdmin = false, 
  isDeveloper = false 
}: PluginMarketplacePageProps) {
  const [activeView, setActiveView] = useState<'marketplace' | 'developer' | 'admin'>('marketplace');
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Store size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Plugin Marketplace</h1>
                <p className="text-gray-400 text-sm">Extend your trading platform with powerful plugins</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Switcher */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('marketplace')}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    activeView === 'marketplace' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Store size={16} className="mr-2" />
                  Marketplace
                </button>
                
                {isDeveloper && (
                  <button
                    onClick={() => setActiveView('developer')}
                    className={`flex items-center px-3 py-1 rounded-md text-sm ${
                      activeView === 'developer' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Code size={16} className="mr-2" />
                    Developer
                  </button>
                )}
                
                {isAdmin && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`flex items-center px-3 py-1 rounded-md text-sm ${
                      activeView === 'admin' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <ShieldCheck size={16} className="mr-2" />
                    Admin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="min-h-screen">
        {activeView === 'marketplace' && (
          <PluginMarketplace 
            userId={userId}
            isAdmin={isAdmin}
            isDeveloper={isDeveloper}
          />
        )}
        
        {activeView === 'developer' && isDeveloper && (
          <PluginDeveloperDashboard 
            userId={userId}
            username="DeveloperUser"
          />
        )}
        
        {activeView === 'admin' && isAdmin && (
          <PluginAdminDashboard 
            userId={userId}
          />
        )}
      </div>
    </div>
  );
}