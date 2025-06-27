import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Activity, Zap, Library, Bot, Shield, ArrowRight } from 'lucide-react';

export default function PlatformOverview() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Platform Overview</h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Our comprehensive trading platform provides all the tools you need for successful trading
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<BarChart3 className="text-blue-400" size={24} />}
          title="Live Trading Dashboard"
          description="Real-time market data with advanced technical indicators and automated trading signals."
          link="/dashboard"
          linkText="Open Dashboard"
        />
        
        <FeatureCard 
          icon={<Activity className="text-green-400" size={24} />}
          title="Strategy Backtesting"
          description="Test your trading strategies against historical data with detailed performance metrics."
          link="/backtest"
          linkText="Start Backtesting"
        />
        
        <FeatureCard 
          icon={<Zap className="text-yellow-400" size={24} />}
          title="Portfolio Management"
          description="Track and manage your trading portfolio with risk management tools and performance analytics."
          link="/portfolio"
          linkText="Manage Portfolio"
          premium={true}
        />
        
        <FeatureCard 
          icon={<Library className="text-purple-400" size={24} />}
          title="Indicator Library"
          description="Access a comprehensive library of technical indicators powered by TA-Lib."
          link="/indicators"
          linkText="Explore Indicators"
        />
        
        <FeatureCard 
          icon={<Bot className="text-red-400" size={24} />}
          title="Plugin Marketplace"
          description="Extend your trading capabilities with custom plugins and integrations."
          link="/plugins"
          linkText="Browse Plugins"
          premium={true}
        />
        
        <FeatureCard 
          icon={<Shield className="text-indigo-400" size={24} />}
          title="Blockchain Integration"
          description="Secure your trading with blockchain-based identity verification and subscription management."
          link="/blockchain"
          linkText="Explore Blockchain"
        />
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  premium?: boolean;
}

function FeatureCard({ icon, title, description, link, linkText, premium = false }: FeatureCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition-colors">
      <div className="p-3 bg-gray-700/50 rounded-lg inline-block mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300 mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <Link 
          to={link} 
          className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
        >
          {linkText}
          <ArrowRight size={16} className="ml-2" />
        </Link>
        
        {premium && (
          <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
            Premium
          </span>
        )}
      </div>
    </div>
  );
}