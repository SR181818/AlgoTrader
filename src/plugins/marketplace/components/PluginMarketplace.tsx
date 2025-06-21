import React, { useState, useEffect } from 'react';
import { Plugin, PluginVersion, PluginRating, PluginCategory } from '../models/PluginModel';
import { PluginCard } from './PluginCard';
import { PluginDetails } from './PluginDetails';
import { Search, Filter, Tag, Star, Download, Clock, CheckCircle, X } from 'lucide-react';

interface PluginMarketplaceProps {
  userId?: string;
  isAdmin?: boolean;
  isDeveloper?: boolean;
}

export function PluginMarketplace({ userId, isAdmin = false, isDeveloper = false }: PluginMarketplaceProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [featuredPlugins, setFeaturedPlugins] = useState<Plugin[]>([]);
  const [popularPlugins, setPopularPlugins] = useState<Plugin[]>([]);
  const [newestPlugins, setNewestPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [selectedPluginVersions, setSelectedPluginVersions] = useState<PluginVersion[]>([]);
  const [selectedPluginRatings, setSelectedPluginRatings] = useState<PluginRating[]>([]);
  const [currentUserRating, setCurrentUserRating] = useState<PluginRating | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'newest'>('rating');
  const [ownedPlugins, setOwnedPlugins] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch plugins on mount
  useEffect(() => {
    const fetchPlugins = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, these would be API calls
        // For this example, we'll use the sample data from PluginService
        
        // Create plugin service instance
        const { PluginService } = await import('../services/PluginService');
        const pluginService = new PluginService();
        
        // Fetch plugins
        const allPlugins = await pluginService.getPlugins({
          isPublic: true,
          status: 'published'
        });
        
        setPlugins(allPlugins);
        
        // Fetch featured plugins
        const featured = await pluginService.getFeaturedPlugins(6);
        setFeaturedPlugins(featured);
        
        // Fetch popular plugins
        const popular = await pluginService.getPopularPlugins(6);
        setPopularPlugins(popular);
        
        // Fetch newest plugins
        const newest = await pluginService.getNewestPlugins(6);
        setNewestPlugins(newest);
        
        // Fetch owned plugins if user is logged in
        if (userId) {
          // In a real implementation, this would be an API call
          // For this example, we'll just use a random selection
          const randomOwned = new Set<string>();
          allPlugins.forEach(plugin => {
            if (Math.random() > 0.7) {
              randomOwned.add(plugin.id);
            }
          });
          
          setOwnedPlugins(randomOwned);
        }
      } catch (error) {
        console.error('Failed to fetch plugins:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlugins();
  }, [userId]);
  
  // Fetch plugin details when selected
  useEffect(() => {
    const fetchPluginDetails = async () => {
      if (!selectedPlugin) return;
      
      try {
        // Create plugin service instance
        const { PluginService } = await import('../services/PluginService');
        const pluginService = new PluginService();
        
        // Fetch versions
        const versions = await pluginService.getPluginVersions(selectedPlugin.id);
        setSelectedPluginVersions(versions);
        
        // Fetch ratings
        const ratings = await pluginService.getPluginRatings(selectedPlugin.id);
        setSelectedPluginRatings(ratings);
        
        // Get current user's rating if available
        if (userId) {
          const userRating = await pluginService.getUserRating(selectedPlugin.id, userId);
          setCurrentUserRating(userRating || undefined);
        }
      } catch (error) {
        console.error('Failed to fetch plugin details:', error);
      }
    };
    
    fetchPluginDetails();
  }, [selectedPlugin, userId]);
  
  // Filter and sort plugins
  const filteredPlugins = plugins.filter(plugin => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    
    // Price filter
    const matchesPrice = priceFilter === 'all' || 
      (priceFilter === 'free' && plugin.price === 0) ||
      (priceFilter === 'paid' && plugin.price > 0);
    
    return matchesSearch && matchesCategory && matchesPrice;
  });
  
  // Sort plugins
  const sortedPlugins = [...filteredPlugins].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'downloads':
        return b.downloadCount - a.downloadCount;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });
  
  // Handle plugin selection
  const handleSelectPlugin = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
  };
  
  // Handle plugin purchase
  const handlePurchasePlugin = (plugin: Plugin) => {
    console.log('Purchase plugin:', plugin);
    // In a real implementation, this would open a payment modal
    
    // For this example, we'll just add it to owned plugins
    setOwnedPlugins(prev => new Set(prev).add(plugin.id));
  };
  
  // Handle plugin download
  const handleDownloadPlugin = (plugin: Plugin, version: PluginVersion) => {
    console.log('Download plugin:', plugin, 'version:', version);
    // In a real implementation, this would download the plugin
  };
  
  // Handle plugin rating
  const handleRatePlugin = (rating: number, review?: string) => {
    if (!selectedPlugin || !userId) return;
    
    console.log('Rate plugin:', selectedPlugin, 'rating:', rating, 'review:', review);
    // In a real implementation, this would submit the rating to the API
    
    // For this example, we'll just update the local state
    const newRating: PluginRating = {
      id: currentUserRating?.id || `rating_${Date.now()}`,
      pluginId: selectedPlugin.id,
      userId,
      rating,
      review,
      createdAt: currentUserRating?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    setCurrentUserRating(newRating);
    
    // Update ratings list
    if (currentUserRating) {
      setSelectedPluginRatings(prev => 
        prev.map(r => r.id === currentUserRating.id ? newRating : r)
      );
    } else {
      setSelectedPluginRatings(prev => [...prev, newRating]);
    }
    
    // Update plugin rating
    if (selectedPlugin) {
      const newRatingCount = currentUserRating ? selectedPlugin.ratingCount : selectedPlugin.ratingCount + 1;
      const newRatingTotal = selectedPluginRatings.reduce((sum, r) => 
        r.id === newRating.id ? sum : sum + r.rating, 0) + rating;
      const newRatingAvg = newRatingTotal / newRatingCount;
      
      setSelectedPlugin({
        ...selectedPlugin,
        rating: newRatingAvg,
        ratingCount: newRatingCount
      });
    }
  };
  
  // Reset selected plugin
  const handleBackToMarketplace = () => {
    setSelectedPlugin(null);
    setSelectedPluginVersions([]);
    setSelectedPluginRatings([]);
    setCurrentUserRating(undefined);
  };
  
  // Categories for filter
  const categories: { id: PluginCategory | 'all'; name: string }[] = [
    { id: 'all', name: 'All Categories' },
    { id: 'indicator', name: 'Indicators' },
    { id: 'strategy', name: 'Strategies' },
    { id: 'risk-management', name: 'Risk Management' },
    { id: 'data-source', name: 'Data Sources' },
    { id: 'visualization', name: 'Visualizations' },
    { id: 'utility', name: 'Utilities' },
    { id: 'ml-model', name: 'ML Models' },
    { id: 'integration', name: 'Integrations' }
  ];
  
  if (selectedPlugin) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={handleBackToMarketplace}
          className="flex items-center text-gray-400 hover:text-white mb-4"
        >
          <X size={16} className="mr-1" />
          Back to Marketplace
        </button>
        
        <PluginDetails
          plugin={selectedPlugin}
          versions={selectedPluginVersions}
          ratings={selectedPluginRatings}
          onPurchase={handlePurchasePlugin}
          onDownload={handleDownloadPlugin}
          onRate={handleRatePlugin}
          currentUserRating={currentUserRating}
          isOwned={ownedPlugins.has(selectedPlugin.id)}
        />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Plugin Marketplace</h1>
      
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Filter size={18} className="mr-2" />
            Filters
            {(selectedCategory !== 'all' || priceFilter !== 'all' || sortBy !== 'rating') && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {(selectedCategory !== 'all' ? 1 : 0) + 
                 (priceFilter !== 'all' ? 1 : 0) + 
                 (sortBy !== 'rating' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 bg-gray-700/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PluginCategory | 'all')}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Price Filter */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Price</label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as 'all' | 'free' | 'paid')}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Paid Only</option>
                </select>
              </div>
              
              {/* Sort By */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating' | 'downloads' | 'newest')}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
            
            {/* Active Filters */}
            {(selectedCategory !== 'all' || priceFilter !== 'all' || sortBy !== 'rating') && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCategory !== 'all' && (
                  <div className="flex items-center bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                    <Tag size={14} className="mr-1" />
                    {categories.find(c => c.id === selectedCategory)?.name}
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="ml-1 text-blue-400 hover:text-blue-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {priceFilter !== 'all' && (
                  <div className="flex items-center bg-green-600/20 text-green-400 px-2 py-1 rounded text-sm">
                    <DollarSign size={14} className="mr-1" />
                    {priceFilter === 'free' ? 'Free Only' : 'Paid Only'}
                    <button
                      onClick={() => setPriceFilter('all')}
                      className="ml-1 text-green-400 hover:text-green-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {sortBy !== 'rating' && (
                  <div className="flex items-center bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-sm">
                    {sortBy === 'downloads' ? (
                      <>
                        <Download size={14} className="mr-1" />
                        Most Downloaded
                      </>
                    ) : (
                      <>
                        <Clock size={14} className="mr-1" />
                        Newest
                      </>
                    )}
                    <button
                      onClick={() => setSortBy('rating')}
                      className="ml-1 text-purple-400 hover:text-purple-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceFilter('all');
                    setSortBy('rating');
                  }}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-lg mb-2">Loading Plugins...</div>
        </div>
      ) : (
        <>
          {/* Featured Plugins */}
          {searchTerm === '' && selectedCategory === 'all' && priceFilter === 'all' && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4">Featured Plugins</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPlugins.map(plugin => (
                  <PluginCard 
                    key={plugin.id} 
                    plugin={plugin} 
                    onClick={handleSelectPlugin} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Popular Plugins */}
          {searchTerm === '' && selectedCategory === 'all' && priceFilter === 'all' && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4">Popular Plugins</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularPlugins.map(plugin => (
                  <PluginCard 
                    key={plugin.id} 
                    plugin={plugin} 
                    onClick={handleSelectPlugin} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Newest Plugins */}
          {searchTerm === '' && selectedCategory === 'all' && priceFilter === 'all' && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4">Newest Plugins</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {newestPlugins.map(plugin => (
                  <PluginCard 
                    key={plugin.id} 
                    plugin={plugin} 
                    onClick={handleSelectPlugin} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Search Results or Filtered Results */}
          {(searchTerm !== '' || selectedCategory !== 'all' || priceFilter !== 'all') && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {searchTerm ? `Search Results for "${searchTerm}"` : 'Filtered Results'}
                <span className="text-gray-400 text-sm ml-2">
                  ({sortedPlugins.length} plugin{sortedPlugins.length !== 1 ? 's' : ''})
                </span>
              </h2>
              
              {sortedPlugins.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-lg mb-2">No Plugins Found</div>
                  <div className="text-sm">Try adjusting your search or filters</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedPlugins.map(plugin => (
                    <PluginCard 
                      key={plugin.id} 
                      plugin={plugin} 
                      onClick={handleSelectPlugin} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Developer CTA */}
          {!isDeveloper && (
            <div className="mt-12 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-8 text-center">
              <h2 className="text-xl font-bold text-white mb-2">Are You a Developer?</h2>
              <p className="text-gray-300 mb-4">Create and publish your own plugins to the marketplace</p>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
                Become a Developer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}