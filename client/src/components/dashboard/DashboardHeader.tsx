import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Bell, User, Shield } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  subscription?: {
    tier: string;
    active: boolean;
  } | null;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, subscription, actions }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400">{subtitle}</p>}
      </div>
      
      <div className="flex items-center space-x-3">
        {subscription && (
          <div className={`flex items-center px-3 py-1 rounded-lg text-sm ${
            subscription.tier === 'free' ? 'bg-gray-600/20 text-gray-300' :
            subscription.tier === 'basic' ? 'bg-blue-600/20 text-blue-400' :
            subscription.tier === 'pro' ? 'bg-purple-600/20 text-purple-400' :
            'bg-yellow-600/20 text-yellow-400'
          }`}>
            <Shield size={16} className="mr-2" />
            {subscription.tier.toUpperCase()}
          </div>
        )}
        
        {actions}
        
        <Link to="/settings" className="p-2 text-gray-400 hover:text-white transition-colors">
          <Settings size={20} />
        </Link>
        
        <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <Link to="/settings" className="p-2 text-gray-400 hover:text-white transition-colors">
          <User size={20} />
        </Link>
      </div>
    </div>
  );
}