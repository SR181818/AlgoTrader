import { Plugin, PluginVersion, PluginRating, PluginCategory, PluginStatus } from '../models/PluginModel';

/**
 * Service for managing plugins in the marketplace
 */
export class PluginService {
  private plugins: Map<string, Plugin> = new Map();
  private versions: Map<string, PluginVersion[]> = new Map();
  private ratings: Map<string, PluginRating[]> = new Map();
  
  constructor() {
    // Initialize with some sample data
    this.initializeSampleData();
  }
  
  /**
   * Get all plugins with optional filtering
   */
  async getPlugins(options?: {
    category?: PluginCategory;
    tags?: string[];
    search?: string;
    authorId?: string;
    status?: PluginStatus;
    isVerified?: boolean;
    isPublic?: boolean;
    minRating?: number;
    maxPrice?: number;
    sortBy?: 'name' | 'rating' | 'downloads' | 'price' | 'created' | 'updated';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<Plugin[]> {
    let filteredPlugins = Array.from(this.plugins.values());
    
    // Apply filters
    if (options) {
      if (options.category) {
        filteredPlugins = filteredPlugins.filter(p => p.category === options.category);
      }
      
      if (options.tags && options.tags.length > 0) {
        filteredPlugins = filteredPlugins.filter(p => 
          options.tags!.some(tag => p.tags.includes(tag))
        );
      }
      
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredPlugins = filteredPlugins.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      if (options.authorId) {
        filteredPlugins = filteredPlugins.filter(p => p.authorId === options.authorId);
      }
      
      if (options.status) {
        filteredPlugins = filteredPlugins.filter(p => p.status === options.status);
      }
      
      if (options.isVerified !== undefined) {
        filteredPlugins = filteredPlugins.filter(p => p.isVerified === options.isVerified);
      }
      
      if (options.isPublic !== undefined) {
        filteredPlugins = filteredPlugins.filter(p => p.isPublic === options.isPublic);
      }
      
      if (options.minRating !== undefined) {
        filteredPlugins = filteredPlugins.filter(p => p.rating >= options.minRating!);
      }
      
      if (options.maxPrice !== undefined) {
        filteredPlugins = filteredPlugins.filter(p => p.price <= options.maxPrice!);
      }
      
      // Apply sorting
      if (options.sortBy) {
        filteredPlugins.sort((a, b) => {
          let comparison = 0;
          
          switch (options.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'rating':
              comparison = a.rating - b.rating;
              break;
            case 'downloads':
              comparison = a.downloadCount - b.downloadCount;
              break;
            case 'price':
              comparison = a.price - b.price;
              break;
            case 'created':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'updated':
              comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
              break;
          }
          
          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }
      
      // Apply pagination
      if (options.limit !== undefined) {
        const offset = options.offset || 0;
        filteredPlugins = filteredPlugins.slice(offset, offset + options.limit);
      }
    }
    
    return filteredPlugins;
  }
  
  /**
   * Get a plugin by ID
   */
  async getPlugin(id: string): Promise<Plugin | null> {
    return this.plugins.get(id) || null;
  }
  
  /**
   * Create a new plugin
   */
  async createPlugin(plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount' | 'rating' | 'ratingCount'>): Promise<Plugin> {
    const id = `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPlugin: Plugin = {
      ...plugin,
      id,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.plugins.set(id, newPlugin);
    this.versions.set(id, []);
    this.ratings.set(id, []);
    
    return newPlugin;
  }
  
  /**
   * Update a plugin
   */
  async updatePlugin(id: string, updates: Partial<Plugin>): Promise<Plugin | null> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return null;
    }
    
    const updatedPlugin = {
      ...plugin,
      ...updates,
      updatedAt: new Date()
    };
    
    this.plugins.set(id, updatedPlugin);
    return updatedPlugin;
  }
  
  /**
   * Delete a plugin
   */
  async deletePlugin(id: string): Promise<boolean> {
    if (!this.plugins.has(id)) {
      return false;
    }
    
    this.plugins.delete(id);
    this.versions.delete(id);
    this.ratings.delete(id);
    
    return true;
  }
  
  /**
   * Get all versions of a plugin
   */
  async getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
    return this.versions.get(pluginId) || [];
  }
  
  /**
   * Get a specific version of a plugin
   */
  async getPluginVersion(pluginId: string, version: string): Promise<PluginVersion | null> {
    const versions = this.versions.get(pluginId) || [];
    return versions.find(v => v.version === version) || null;
  }
  
  /**
   * Create a new version of a plugin
   */
  async createPluginVersion(version: Omit<PluginVersion, 'id' | 'createdAt'>): Promise<PluginVersion> {
    const id = `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newVersion: PluginVersion = {
      ...version,
      id,
      createdAt: new Date(),
    };
    
    const versions = this.versions.get(version.pluginId) || [];
    
    // If this is marked as latest, update other versions
    if (newVersion.isLatest) {
      versions.forEach(v => {
        v.isLatest = false;
      });
    }
    
    versions.push(newVersion);
    this.versions.set(version.pluginId, versions);
    
    // Update plugin version
    const plugin = this.plugins.get(version.pluginId);
    if (plugin && newVersion.isLatest) {
      plugin.version = newVersion.version;
      plugin.updatedAt = new Date();
    }
    
    return newVersion;
  }
  
  /**
   * Get all ratings for a plugin
   */
  async getPluginRatings(pluginId: string): Promise<PluginRating[]> {
    return this.ratings.get(pluginId) || [];
  }
  
  /**
   * Get a user's rating for a plugin
   */
  async getUserRating(pluginId: string, userId: string): Promise<PluginRating | null> {
    const ratings = this.ratings.get(pluginId) || [];
    return ratings.find(r => r.userId === userId) || null;
  }
  
  /**
   * Create or update a rating for a plugin
   */
  async ratePlugin(rating: Omit<PluginRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<PluginRating> {
    const ratings = this.ratings.get(rating.pluginId) || [];
    const existingRatingIndex = ratings.findIndex(r => r.userId === rating.userId);
    
    if (existingRatingIndex >= 0) {
      // Update existing rating
      const updatedRating = {
        ...ratings[existingRatingIndex],
        rating: rating.rating,
        review: rating.review,
        updatedAt: new Date()
      };
      
      ratings[existingRatingIndex] = updatedRating;
      this.ratings.set(rating.pluginId, ratings);
      
      // Update plugin rating
      this.updatePluginRating(rating.pluginId);
      
      return updatedRating;
    } else {
      // Create new rating
      const id = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRating: PluginRating = {
        ...rating,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      ratings.push(newRating);
      this.ratings.set(rating.pluginId, ratings);
      
      // Update plugin rating
      this.updatePluginRating(rating.pluginId);
      
      return newRating;
    }
  }
  
  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<boolean> {
    for (const [pluginId, ratings] of this.ratings.entries()) {
      const index = ratings.findIndex(r => r.id === ratingId);
      
      if (index >= 0) {
        ratings.splice(index, 1);
        this.ratings.set(pluginId, ratings);
        
        // Update plugin rating
        this.updatePluginRating(pluginId);
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Increment download count for a plugin
   */
  async incrementDownloadCount(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    plugin.downloadCount += 1;
    plugin.lastDownloadedAt = new Date();
    
    return true;
  }
  
  /**
   * Update plugin status
   */
  async updatePluginStatus(pluginId: string, status: PluginStatus): Promise<Plugin | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }
    
    plugin.status = status;
    plugin.updatedAt = new Date();
    
    // If publishing, set publishedAt
    if (status === 'published' && !plugin.publishedAt) {
      plugin.publishedAt = new Date();
    }
    
    return plugin;
  }
  
  /**
   * Update plugin verification status
   */
  async verifyPlugin(pluginId: string, isVerified: boolean): Promise<Plugin | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }
    
    plugin.isVerified = isVerified;
    plugin.updatedAt = new Date();
    
    return plugin;
  }
  
  /**
   * Search plugins
   */
  async searchPlugins(query: string): Promise<Plugin[]> {
    const queryLower = query.toLowerCase();
    
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.name.toLowerCase().includes(queryLower) ||
      plugin.description.toLowerCase().includes(queryLower) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }
  
  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(limit: number = 10): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .filter(p => p.isPublic && p.status === 'published')
      .sort((a, b) => b.rating - a.rating || b.downloadCount - a.downloadCount)
      .slice(0, limit);
  }
  
  /**
   * Get popular plugins
   */
  async getPopularPlugins(limit: number = 10): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .filter(p => p.isPublic && p.status === 'published')
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, limit);
  }
  
  /**
   * Get newest plugins
   */
  async getNewestPlugins(limit: number = 10): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .filter(p => p.isPublic && p.status === 'published')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  /**
   * Get top rated plugins
   */
  async getTopRatedPlugins(limit: number = 10): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .filter(p => p.isPublic && p.status === 'published' && p.ratingCount > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
  
  /**
   * Update plugin rating based on all ratings
   */
  private updatePluginRating(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    const ratings = this.ratings.get(pluginId) || [];
    
    if (!plugin) {
      return;
    }
    
    if (ratings.length === 0) {
      plugin.rating = 0;
      plugin.ratingCount = 0;
      return;
    }
    
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    plugin.rating = totalRating / ratings.length;
    plugin.ratingCount = ratings.length;
  }
  
  /**
   * Initialize sample data
   */
  private initializeSampleData(): void {
    // Sample plugins
    const samplePlugins: Plugin[] = [
      {
        id: 'plugin_1',
        name: 'RSI Strategy',
        description: 'A trading strategy based on RSI indicator',
        version: '1.0.0',
        author: 'TradingMaster',
        authorId: 'user_1',
        category: 'strategy',
        tags: ['rsi', 'technical', 'momentum'],
        price: 0,
        pricingModel: 'free',
        downloadCount: 1250,
        rating: 4.5,
        ratingCount: 48,
        status: 'published',
        isVerified: true,
        isPublic: true,
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2023-01-15'),
        publishedAt: new Date('2023-01-15'),
        lastDownloadedAt: new Date('2023-05-20'),
        repositoryUrl: 'https://github.com/tradingmaster/rsi-strategy',
        homepageUrl: 'https://tradingmaster.dev/plugins/rsi-strategy',
        licenseType: 'MIT',
        dependencies: [],
        compatibleVersions: ['1.0.0', '1.1.0', '1.2.0'],
        minAppVersion: '1.0.0',
        screenshotUrls: [
          'https://example.com/screenshots/rsi-strategy-1.png',
          'https://example.com/screenshots/rsi-strategy-2.png'
        ],
        readmeContent: '# RSI Strategy\n\nA trading strategy based on RSI indicator...'
      },
      {
        id: 'plugin_2',
        name: 'Advanced Bollinger Bands',
        description: 'Enhanced Bollinger Bands indicator with multiple timeframe analysis',
        version: '2.1.0',
        author: 'IndicatorPro',
        authorId: 'user_2',
        category: 'indicator',
        tags: ['bollinger', 'bands', 'volatility', 'multi-timeframe'],
        price: 19.99,
        pricingModel: 'one-time',
        downloadCount: 875,
        rating: 4.8,
        ratingCount: 32,
        status: 'published',
        isVerified: true,
        isPublic: true,
        createdAt: new Date('2023-02-10'),
        updatedAt: new Date('2023-04-05'),
        publishedAt: new Date('2023-02-10'),
        lastDownloadedAt: new Date('2023-05-18'),
        repositoryUrl: 'https://github.com/indicatorpro/advanced-bb',
        homepageUrl: 'https://indicatorpro.dev/plugins/advanced-bb',
        licenseType: 'Commercial',
        dependencies: [],
        compatibleVersions: ['1.1.0', '1.2.0'],
        minAppVersion: '1.1.0',
        screenshotUrls: [
          'https://example.com/screenshots/advanced-bb-1.png',
          'https://example.com/screenshots/advanced-bb-2.png'
        ],
        readmeContent: '# Advanced Bollinger Bands\n\nEnhanced Bollinger Bands indicator...'
      },
      {
        id: 'plugin_3',
        name: 'Risk Manager Pro',
        description: 'Advanced risk management system with position sizing and drawdown protection',
        version: '1.5.0',
        author: 'RiskWise',
        authorId: 'user_3',
        category: 'risk-management',
        tags: ['risk', 'position-sizing', 'drawdown', 'protection'],
        price: 29.99,
        pricingModel: 'subscription',
        subscriptionInterval: 'month',
        downloadCount: 620,
        rating: 4.7,
        ratingCount: 25,
        status: 'published',
        isVerified: true,
        isPublic: true,
        createdAt: new Date('2023-03-05'),
        updatedAt: new Date('2023-05-10'),
        publishedAt: new Date('2023-03-05'),
        lastDownloadedAt: new Date('2023-05-19'),
        repositoryUrl: 'https://github.com/riskwise/risk-manager-pro',
        homepageUrl: 'https://riskwise.dev/plugins/risk-manager-pro',
        licenseType: 'Commercial',
        dependencies: [],
        compatibleVersions: ['1.0.0', '1.1.0', '1.2.0'],
        minAppVersion: '1.0.0',
        screenshotUrls: [
          'https://example.com/screenshots/risk-manager-1.png',
          'https://example.com/screenshots/risk-manager-2.png'
        ],
        readmeContent: '# Risk Manager Pro\n\nAdvanced risk management system...'
      }
    ];
    
    // Add sample plugins to the map
    samplePlugins.forEach(plugin => {
      this.plugins.set(plugin.id, plugin);
      this.versions.set(plugin.id, []);
      this.ratings.set(plugin.id, []);
    });
    
    // Sample versions
    const sampleVersions: PluginVersion[] = [
      {
        id: 'version_1_1',
        pluginId: 'plugin_1',
        version: '1.0.0',
        description: 'Initial release',
        downloadUrl: 'https://example.com/downloads/rsi-strategy-1.0.0.zip',
        fileSize: 25600,
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        createdAt: new Date('2023-01-15'),
        publishedAt: new Date('2023-01-15'),
        isLatest: true,
        minAppVersion: '1.0.0',
        dependencies: []
      },
      {
        id: 'version_2_1',
        pluginId: 'plugin_2',
        version: '2.0.0',
        description: 'Initial release',
        downloadUrl: 'https://example.com/downloads/advanced-bb-2.0.0.zip',
        fileSize: 38400,
        sha256Hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0',
        createdAt: new Date('2023-02-10'),
        publishedAt: new Date('2023-02-10'),
        isLatest: false,
        minAppVersion: '1.1.0',
        dependencies: []
      },
      {
        id: 'version_2_2',
        pluginId: 'plugin_2',
        version: '2.1.0',
        description: 'Added multi-timeframe support',
        downloadUrl: 'https://example.com/downloads/advanced-bb-2.1.0.zip',
        fileSize: 40960,
        sha256Hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1',
        createdAt: new Date('2023-04-05'),
        publishedAt: new Date('2023-04-05'),
        isLatest: true,
        minAppVersion: '1.1.0',
        dependencies: []
      },
      {
        id: 'version_3_1',
        pluginId: 'plugin_3',
        version: '1.0.0',
        description: 'Initial release',
        downloadUrl: 'https://example.com/downloads/risk-manager-1.0.0.zip',
        fileSize: 51200,
        sha256Hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
        createdAt: new Date('2023-03-05'),
        publishedAt: new Date('2023-03-05'),
        isLatest: false,
        minAppVersion: '1.0.0',
        dependencies: []
      },
      {
        id: 'version_3_2',
        pluginId: 'plugin_3',
        version: '1.5.0',
        description: 'Added drawdown protection features',
        downloadUrl: 'https://example.com/downloads/risk-manager-1.5.0.zip',
        fileSize: 61440,
        sha256Hash: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
        createdAt: new Date('2023-05-10'),
        publishedAt: new Date('2023-05-10'),
        isLatest: true,
        minAppVersion: '1.0.0',
        dependencies: []
      }
    ];
    
    // Add sample versions to the map
    sampleVersions.forEach(version => {
      const versions = this.versions.get(version.pluginId) || [];
      versions.push(version);
      this.versions.set(version.pluginId, versions);
    });
    
    // Sample ratings
    const sampleRatings: PluginRating[] = [
      {
        id: 'rating_1_1',
        pluginId: 'plugin_1',
        userId: 'user_101',
        rating: 5,
        review: 'Excellent RSI strategy, very profitable!',
        createdAt: new Date('2023-01-20'),
        updatedAt: new Date('2023-01-20')
      },
      {
        id: 'rating_1_2',
        pluginId: 'plugin_1',
        userId: 'user_102',
        rating: 4,
        review: 'Good strategy, but could use more customization options.',
        createdAt: new Date('2023-02-05'),
        updatedAt: new Date('2023-02-05')
      },
      {
        id: 'rating_2_1',
        pluginId: 'plugin_2',
        userId: 'user_103',
        rating: 5,
        review: 'Best Bollinger Bands indicator I\'ve used!',
        createdAt: new Date('2023-02-15'),
        updatedAt: new Date('2023-02-15')
      },
      {
        id: 'rating_3_1',
        pluginId: 'plugin_3',
        userId: 'user_104',
        rating: 5,
        review: 'This risk manager has saved me from blowing my account multiple times.',
        createdAt: new Date('2023-03-10'),
        updatedAt: new Date('2023-03-10')
      },
      {
        id: 'rating_3_2',
        pluginId: 'plugin_3',
        userId: 'user_105',
        rating: 4,
        review: 'Great risk management tool, worth the subscription.',
        createdAt: new Date('2023-04-01'),
        updatedAt: new Date('2023-04-01')
      }
    ];
    
    // Add sample ratings to the map
    sampleRatings.forEach(rating => {
      const ratings = this.ratings.get(rating.pluginId) || [];
      ratings.push(rating);
      this.ratings.set(rating.pluginId, ratings);
    });
  }
}