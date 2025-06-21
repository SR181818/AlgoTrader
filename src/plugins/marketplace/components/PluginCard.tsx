import React from 'react';
import { Plugin } from '../models/PluginModel';
import { Star, Download, CheckCircle, Tag, Clock } from 'lucide-react';

interface PluginCardProps {
  plugin: Plugin;
  onClick?: (plugin: Plugin) => void;
}

export function PluginCard({ plugin, onClick }: PluginCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(plugin);
    }
  };
  
  const formatPrice = (price: number, pricingModel: string, interval?: string) => {
    if (price === 0) return 'Free';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
    
    if (pricingModel === 'subscription') {
      return `${formattedPrice}/${interval === 'year' ? 'yr' : 'mo'}`;
    }
    
    return formattedPrice;
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'indicator':
        return 'bg-blue-600/20 text-blue-400';
      case 'strategy':
        return 'bg-green-600/20 text-green-400';
      case 'risk-management':
        return 'bg-red-600/20 text-red-400';
      case 'data-source':
        return 'bg-purple-600/20 text-purple-400';
      case 'visualization':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'utility':
        return 'bg-gray-600/20 text-gray-400';
      case 'ml-model':
        return 'bg-indigo-600/20 text-indigo-400';
      case 'integration':
        return 'bg-orange-600/20 text-orange-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };
  
  return (
    <div 
      className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="h-40 bg-gray-700 relative">
        {plugin.thumbnailUrl ? (
          <img 
            src={plugin.thumbnailUrl} 
            alt={plugin.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span className="text-4xl">{plugin.name.charAt(0)}</span>
          </div>
        )}
        
        {/* Price tag */}
        <div className="absolute top-3 right-3 bg-gray-800/90 px-2 py-1 rounded text-sm font-medium">
          {formatPrice(plugin.price, plugin.pricingModel, plugin.subscriptionInterval)}
        </div>
        
        {/* Verification badge */}
        {plugin.isVerified && (
          <div className="absolute top-3 left-3 bg-blue-600/90 p-1 rounded-full">
            <CheckCircle size={16} className="text-white" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium truncate">{plugin.name}</h3>
          <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(plugin.category)}`}>
            {plugin.category}
          </span>
        </div>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{plugin.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center">
            <Star size={14} className="text-yellow-400 mr-1" />
            <span>{plugin.rating.toFixed(1)} ({plugin.ratingCount})</span>
          </div>
          
          <div className="flex items-center">
            <Download size={14} className="mr-1" />
            <span>{plugin.downloadCount.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center">
            <Tag size={14} className="mr-1" />
            <span>v{plugin.version}</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
          <div className="text-gray-400">By {plugin.author}</div>
          <div className="flex items-center text-gray-500">
            <Clock size={12} className="mr-1" />
            <span>{new Date(plugin.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}