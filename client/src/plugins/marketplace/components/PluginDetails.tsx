import React, { useState } from 'react';
import { Plugin, PluginVersion, PluginRating } from '../models/PluginModel';
import { Star, Download, CheckCircle, Tag, Clock, ExternalLink, Heart, Share2, ShieldCheck, DollarSign } from 'lucide-react';

interface PluginDetailsProps {
  plugin: Plugin;
  versions: PluginVersion[];
  ratings: PluginRating[];
  onPurchase?: (plugin: Plugin) => void;
  onDownload?: (plugin: Plugin, version: PluginVersion) => void;
  onRate?: (rating: number, review?: string) => void;
  currentUserRating?: PluginRating;
  isOwned?: boolean;
}

export function PluginDetails({ 
  plugin, 
  versions, 
  ratings, 
  onPurchase, 
  onDownload, 
  onRate,
  currentUserRating,
  isOwned = false
}: PluginDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'reviews'>('overview');
  const [selectedVersion, setSelectedVersion] = useState<PluginVersion | null>(
    versions.find(v => v.isLatest) || (versions.length > 0 ? versions[0] : null)
  );
  const [ratingValue, setRatingValue] = useState(currentUserRating?.rating || 0);
  const [reviewText, setReviewText] = useState(currentUserRating?.review || '');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const formatPrice = (price: number, pricingModel: string, interval?: string) => {
    if (price === 0) return 'Free';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
    
    if (pricingModel === 'subscription') {
      return `${formattedPrice}/${interval === 'year' ? 'year' : 'month'}`;
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
  
  const handleDownload = () => {
    if (selectedVersion && onDownload) {
      onDownload(plugin, selectedVersion);
    }
  };
  
  const handlePurchase = () => {
    if (onPurchase) {
      onPurchase(plugin);
    }
  };
  
  const handleSubmitRating = () => {
    if (onRate && ratingValue > 0) {
      setIsSubmittingRating(true);
      onRate(ratingValue, reviewText);
      setTimeout(() => {
        setIsSubmittingRating(false);
      }, 1000);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="relative">
        {/* Banner/Header Image */}
        <div className="h-48 bg-gradient-to-r from-gray-700 to-gray-600 relative">
          {plugin.screenshotUrls.length > 0 && (
            <img 
              src={plugin.screenshotUrls[0]} 
              alt={plugin.name} 
              className="w-full h-full object-cover opacity-30"
            />
          )}
          
          {/* Overlay content */}
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <div className="flex items-center mb-2">
              <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(plugin.category)}`}>
                {plugin.category}
              </span>
              {plugin.isVerified && (
                <span className="ml-2 bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs flex items-center">
                  <ShieldCheck size={12} className="mr-1" />
                  Verified
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-white">{plugin.name}</h1>
            
            <div className="flex items-center mt-2 text-sm text-gray-300">
              <div className="flex items-center">
                <Star size={16} className="text-yellow-400 mr-1" />
                <span>{plugin.rating.toFixed(1)} ({plugin.ratingCount})</span>
              </div>
              
              <div className="mx-3">•</div>
              
              <div className="flex items-center">
                <Download size={16} className="mr-1" />
                <span>{plugin.downloadCount.toLocaleString()} downloads</span>
              </div>
              
              <div className="mx-3">•</div>
              
              <div className="flex items-center">
                <Tag size={16} className="mr-1" />
                <span>v{plugin.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'versions'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Versions
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'reviews'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Reviews ({ratings.length})
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Description and Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
                <div className="text-gray-300 space-y-4">
                  <p>{plugin.description}</p>
                  
                  {plugin.readmeContent && (
                    <div className="mt-4 bg-gray-700/50 rounded-lg p-4 text-sm">
                      <pre className="whitespace-pre-wrap">{plugin.readmeContent}</pre>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Screenshots */}
              {plugin.screenshotUrls.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-white mb-3">Screenshots</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {plugin.screenshotUrls.map((url, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg overflow-hidden">
                        <img 
                          src={url} 
                          alt={`${plugin.name} screenshot ${index + 1}`} 
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {plugin.tags.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-white mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {plugin.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Info and Actions */}
            <div className="space-y-6">
              {/* Price and Purchase */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-center mb-4">
                  <div className="text-gray-400 text-sm">Price</div>
                  <div className="text-2xl font-bold text-white">
                    {formatPrice(plugin.price, plugin.pricingModel, plugin.subscriptionInterval)}
                  </div>
                  {plugin.pricingModel === 'subscription' && (
                    <div className="text-xs text-gray-400">
                      Billed {plugin.subscriptionInterval === 'year' ? 'yearly' : 'monthly'}
                    </div>
                  )}
                </div>
                
                {isOwned ? (
                  <button
                    onClick={handleDownload}
                    disabled={!selectedVersion}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-white transition-colors"
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </button>
                ) : (
                  <button
                    onClick={handlePurchase}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
                  >
                    <DollarSign size={16} className="mr-2" />
                    {plugin.price === 0 ? 'Get for Free' : 'Purchase'}
                  </button>
                )}
                
                <div className="flex justify-between mt-4">
                  <button className="flex items-center text-gray-400 hover:text-gray-300 text-sm">
                    <Heart size={14} className="mr-1" />
                    Favorite
                  </button>
                  <button className="flex items-center text-gray-400 hover:text-gray-300 text-sm">
                    <Share2 size={14} className="mr-1" />
                    Share
                  </button>
                </div>
              </div>
              
              {/* Author Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Author</h3>
                <div className="text-gray-300">{plugin.author}</div>
                
                {plugin.homepageUrl && (
                  <a 
                    href={plugin.homepageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Visit Homepage
                  </a>
                )}
                
                {plugin.supportUrl && (
                  <a 
                    href={plugin.supportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Get Support
                  </a>
                )}
              </div>
              
              {/* Additional Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Information</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version</span>
                    <span className="text-gray-300">{plugin.version}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-gray-300">{new Date(plugin.updatedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">License</span>
                    <span className="text-gray-300">{plugin.licenseType}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min App Version</span>
                    <span className="text-gray-300">{plugin.minAppVersion}</span>
                  </div>
                  
                  {plugin.maxAppVersion && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max App Version</span>
                      <span className="text-gray-300">{plugin.maxAppVersion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Version History</h2>
            
            {versions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-lg mb-2">No Versions Available</div>
                <div className="text-sm">This plugin has no published versions yet.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {versions
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((version) => (
                    <div 
                      key={version.id} 
                      className={`bg-gray-700/50 rounded-lg p-4 border ${
                        selectedVersion?.id === version.id ? 'border-blue-500' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <h3 className="text-white font-medium">Version {version.version}</h3>
                          {version.isLatest && (
                            <span className="ml-2 bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs">
                              Latest
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">{version.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div>
                          File Size: {(version.fileSize / 1024).toFixed(1)} KB
                        </div>
                        
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDownload && isOwned) {
                                onDownload(plugin, version);
                              }
                            }}
                            disabled={!isOwned}
                            className={`flex items-center px-2 py-1 rounded ${
                              isOwned 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Download size={12} className="mr-1" />
                            Download
                          </button>
                        </div>
                      </div>
                      
                      {version.changelogContent && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="text-xs text-gray-400 mb-1">Changelog:</div>
                          <div className="text-xs text-gray-300 bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{version.changelogContent}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Reviews</h2>
            
            {/* User's review form */}
            {isOwned && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-white font-medium mb-3">
                  {currentUserRating ? 'Update Your Review' : 'Write a Review'}
                </h3>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-2">Rating</div>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingValue(star)}
                        className={`p-1 ${star <= ratingValue ? 'text-yellow-400' : 'text-gray-600'}`}
                      >
                        <Star size={24} fill={star <= ratingValue ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-2">Review (Optional)</div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    rows={4}
                    placeholder="Share your experience with this plugin..."
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingValue === 0 || isSubmittingRating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-white transition-colors"
                  >
                    {isSubmittingRating ? 'Submitting...' : currentUserRating ? 'Update Review' : 'Submit Review'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Reviews list */}
            {ratings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-lg mb-2">No Reviews Yet</div>
                <div className="text-sm">Be the first to review this plugin!</div>
              </div>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              size={16} 
                              className="text-yellow-400" 
                              fill={star <= rating.rating ? 'currentColor' : 'none'} 
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-white">User ID: {rating.userId.substring(0, 8)}...</span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {rating.review && (
                      <p className="text-gray-300 text-sm">{rating.review}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}