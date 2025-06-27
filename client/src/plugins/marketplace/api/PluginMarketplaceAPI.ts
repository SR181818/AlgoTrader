import { PluginService } from '../services/PluginService';
import { StripeService } from '../services/StripeService';
import { SandboxService } from '../services/SandboxService';
import { Plugin, PluginVersion, PluginRating, PluginCategory, PluginStatus } from '../models/PluginModel';
import { User } from '../models/UserModel';
import Logger from '../../../utils/logger';

/**
 * API for the Plugin Marketplace
 */
export class PluginMarketplaceAPI {
  private pluginService: PluginService;
  private stripeService: StripeService;
  private sandboxService: SandboxService;
  
  constructor() {
    this.pluginService = new PluginService();
    this.stripeService = new StripeService(
      process.env.STRIPE_API_KEY || 'sk_test_example',
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_example'
    );
    this.sandboxService = new SandboxService();
  }
  
  /**
   * Plugin CRUD Operations
   */
  
  // GET /api/plugins
  /**
   * Supports offset-based (limit, offset) and cursor-based (after) pagination.
   * Returns { data, nextCursor, totalCount }
   */
  async getPlugins(req: any): Promise<{ success: boolean; data: Plugin[]; nextCursor?: string; totalCount: number }> {
    try {
      const { limit, offset, after } = req.query;
      let plugins: Plugin[] = [];
      let nextCursor: string | undefined = undefined;
      let totalCount = await this.pluginService.getPluginCount({
        // pass all filters except pagination
        category: req.query.category as PluginCategory,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        search: req.query.search,
        authorId: req.query.authorId,
        status: req.query.status as PluginStatus,
        isVerified: req.query.isVerified === 'true' ? true : 
                   req.query.isVerified === 'false' ? false : undefined,
        isPublic: req.query.isPublic === 'true' ? true : 
                 req.query.isPublic === 'false' ? false : undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      });
      if (after) {
        // Cursor-based pagination
        const result = await this.pluginService.getPluginsByCursor({
          ...req.query,
          after,
          limit: limit ? parseInt(limit) : 20,
        });
        plugins = result.plugins;
        nextCursor = result.nextCursor;
      } else {
        // Offset-based pagination (default)
        plugins = await this.pluginService.getPlugins({
          category: req.query.category as PluginCategory,
          tags: req.query.tags ? req.query.tags.split(',') : undefined,
          search: req.query.search,
          authorId: req.query.authorId,
          status: req.query.status as PluginStatus,
          isVerified: req.query.isVerified === 'true' ? true : 
                     req.query.isVerified === 'false' ? false : undefined,
          isPublic: req.query.isPublic === 'true' ? true : 
                   req.query.isPublic === 'false' ? false : undefined,
          minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
          maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
          sortBy: req.query.sortBy as any,
          sortOrder: req.query.sortOrder as any,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
      }
      return { success: true, data: plugins, nextCursor, totalCount };
    } catch (error) {
      Logger.error('Failed to get plugins:', error, { method: 'getPlugins' });
      throw new Error('Failed to get plugins');
    }
  }
  
  // GET /api/plugins/:id
  async getPlugin(req: any): Promise<{ success: boolean; data: Plugin | null }> {
    try {
      const plugin = await this.pluginService.getPlugin(req.params.id);
      return { success: true, data: plugin };
    } catch (error) {
      Logger.error('Failed to get plugin:', error, { method: 'getPlugin', pluginId: req.params.id });
      throw new Error('Failed to get plugin');
    }
  }
  
  // POST /api/plugins
  async createPlugin(req: any): Promise<{ success: boolean; data: Plugin }> {
    try {
      // Validate user permissions
      if (!req.user || (!req.user.isDeveloper && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Only developers can create plugins');
      }
      
      const plugin = await this.pluginService.createPlugin({
        ...req.body,
        authorId: req.user.id,
        author: req.user.username,
        status: 'draft',
        isVerified: false,
        isPublic: false,
      });
      
      return { success: true, data: plugin };
    } catch (error) {
      Logger.error('Failed to create plugin:', error, { method: 'createPlugin', user: req.user });
      throw new Error('Failed to create plugin');
    }
  }
  
  // PUT /api/plugins/:id
  async updatePlugin(req: any): Promise<{ success: boolean; data: Plugin | null }> {
    try {
      // Get existing plugin
      const existingPlugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!existingPlugin) {
        throw new Error('Plugin not found');
      }
      
      // Validate user permissions
      if (!req.user || (req.user.id !== existingPlugin.authorId && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Only the author or admin can update this plugin');
      }
      
      // Prevent changing certain fields if not admin
      if (!req.user.isAdmin) {
        delete req.body.isVerified;
        delete req.body.status;
        
        // If plugin is published, restrict what can be updated
        if (existingPlugin.status === 'published') {
          delete req.body.name;
          delete req.body.category;
          delete req.body.pricingModel;
          delete req.body.price;
          delete req.body.subscriptionInterval;
        }
      }
      
      const plugin = await this.pluginService.updatePlugin(req.params.id, req.body);
      return { success: true, data: plugin };
    } catch (error) {
      Logger.error('Failed to update plugin:', error, { method: 'updatePlugin', pluginId: req.params.id });
      throw new Error('Failed to update plugin');
    }
  }
  
  // DELETE /api/plugins/:id
  async deletePlugin(req: any): Promise<{ success: boolean; message: string }> {
    try {
      // Get existing plugin
      const existingPlugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!existingPlugin) {
        throw new Error('Plugin not found');
      }
      
      // Validate user permissions
      if (!req.user || (req.user.id !== existingPlugin.authorId && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Only the author or admin can delete this plugin');
      }
      
      const result = await this.pluginService.deletePlugin(req.params.id);
      
      return { 
        success: result, 
        message: result ? 'Plugin deleted successfully' : 'Failed to delete plugin' 
      };
    } catch (error) {
      Logger.error('Failed to delete plugin:', error, { method: 'deletePlugin', pluginId: req.params.id });
      throw new Error('Failed to delete plugin');
    }
  }
  
  /**
   * Plugin Version Operations
   */
  
  // GET /api/plugins/:id/versions
  async getPluginVersions(req: any): Promise<{ success: boolean; data: PluginVersion[] }> {
    try {
      const versions = await this.pluginService.getPluginVersions(req.params.id);
      return { success: true, data: versions };
    } catch (error) {
      console.error('Failed to get plugin versions:', error);
      throw new Error('Failed to get plugin versions');
    }
  }
  
  // GET /api/plugins/:id/versions/:version
  async getPluginVersion(req: any): Promise<{ success: boolean; data: PluginVersion | null }> {
    try {
      const version = await this.pluginService.getPluginVersion(req.params.id, req.params.version);
      return { success: true, data: version };
    } catch (error) {
      console.error('Failed to get plugin version:', error);
      throw new Error('Failed to get plugin version');
    }
  }
  
  // POST /api/plugins/:id/versions
  async createPluginVersion(req: any): Promise<{ success: boolean; data: PluginVersion }> {
    try {
      // Get existing plugin
      const existingPlugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!existingPlugin) {
        throw new Error('Plugin not found');
      }
      
      // Validate user permissions
      if (!req.user || (req.user.id !== existingPlugin.authorId && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Only the author or admin can add versions');
      }
      
      // Validate plugin code if provided
      if (req.body.code) {
        const validationResult = await this.sandboxService.validatePlugin(req.body.code);
        
        if (!validationResult.valid) {
          throw new Error(`Invalid plugin code: ${validationResult.error}`);
        }
        
        // Extract metadata if available
        const metadata = await this.sandboxService.extractPluginMetadata(req.body.code);
        
        if (metadata) {
          // Update version with metadata
          req.body.description = metadata.description || req.body.description;
          req.body.minAppVersion = metadata.minAppVersion || req.body.minAppVersion;
          req.body.maxAppVersion = metadata.maxAppVersion || req.body.maxAppVersion;
          req.body.dependencies = metadata.dependencies || req.body.dependencies;
        }
      }
      
      const version = await this.pluginService.createPluginVersion({
        ...req.body,
        pluginId: req.params.id,
      });
      
      return { success: true, data: version };
    } catch (error) {
      console.error('Failed to create plugin version:', error);
      throw new Error('Failed to create plugin version');
    }
  }
  
  /**
   * Plugin Rating Operations
   */
  
  // GET /api/plugins/:id/ratings
  async getPluginRatings(req: any): Promise<{ success: boolean; data: PluginRating[] }> {
    try {
      const ratings = await this.pluginService.getPluginRatings(req.params.id);
      return { success: true, data: ratings };
    } catch (error) {
      console.error('Failed to get plugin ratings:', error);
      throw new Error('Failed to get plugin ratings');
    }
  }
  
  // POST /api/plugins/:id/ratings
  async ratePlugin(req: any): Promise<{ success: boolean; data: PluginRating }> {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw new Error('Unauthorized: Must be logged in to rate plugins');
      }
      
      // Check if user has purchased or installed the plugin
      const hasPurchased = await this.stripeService.hasUserPurchasedPlugin(req.user.id, req.params.id);
      
      if (!hasPurchased) {
        throw new Error('Unauthorized: Must purchase or install the plugin before rating');
      }
      
      const rating = await this.pluginService.ratePlugin({
        pluginId: req.params.id,
        userId: req.user.id,
        rating: req.body.rating,
        review: req.body.review,
      });
      
      return { success: true, data: rating };
    } catch (error) {
      console.error('Failed to rate plugin:', error);
      throw new Error('Failed to rate plugin');
    }
  }
  
  // DELETE /api/plugins/ratings/:id
  async deleteRating(req: any): Promise<{ success: boolean; message: string }> {
    try {
      // Get the rating
      const pluginId = req.params.pluginId;
      const ratings = await this.pluginService.getPluginRatings(pluginId);
      const rating = ratings.find(r => r.id === req.params.id);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Validate user permissions
      if (!req.user || (req.user.id !== rating.userId && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Only the author or admin can delete this rating');
      }
      
      const result = await this.pluginService.deleteRating(req.params.id);
      
      return { 
        success: result, 
        message: result ? 'Rating deleted successfully' : 'Failed to delete rating' 
      };
    } catch (error) {
      console.error('Failed to delete rating:', error);
      throw new Error('Failed to delete rating');
    }
  }
  
  /**
   * Plugin Purchase Operations
   */
  
  // POST /api/plugins/:id/purchase
  async purchasePlugin(req: any): Promise<{ success: boolean; data: any }> {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw new Error('Unauthorized: Must be logged in to purchase plugins');
      }
      
      // Get plugin
      const plugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      // Check if plugin is free
      if (plugin.price === 0) {
        throw new Error('Plugin is free, no purchase required');
      }
      
      // Check if plugin is published
      if (plugin.status !== 'published') {
        throw new Error('Plugin is not available for purchase');
      }
      
      // Check if user has already purchased
      const hasPurchased = await this.stripeService.hasUserPurchasedPlugin(req.user.id, plugin.id);
      
      if (hasPurchased) {
        throw new Error('You have already purchased this plugin');
      }
      
      // Create payment based on pricing model
      if (plugin.pricingModel === 'one-time') {
        const paymentIntent = await this.stripeService.createPaymentIntent(
          plugin,
          req.user,
          req.body.paymentMethodId
        );
        
        return { 
          success: true, 
          data: {
            clientSecret: paymentIntent.clientSecret,
            paymentIntentId: paymentIntent.paymentIntentId,
            plugin
          }
        };
      } else if (plugin.pricingModel === 'subscription') {
        const subscription = await this.stripeService.createSubscription(
          plugin,
          req.user,
          req.body.paymentMethodId
        );
        
        return { 
          success: true, 
          data: {
            subscriptionId: subscription.subscriptionId,
            clientSecret: subscription.clientSecret,
            plugin
          }
        };
      } else {
        throw new Error('Invalid pricing model');
      }
    } catch (error) {
      console.error('Failed to purchase plugin:', error);
      throw new Error('Failed to purchase plugin');
    }
  }
  
  // GET /api/users/:id/purchases
  async getUserPurchases(req: any): Promise<{ success: boolean; data: any[] }> {
    try {
      // Validate user permissions
      if (!req.user || (req.user.id !== req.params.id && !req.user.isAdmin)) {
        throw new Error('Unauthorized: Can only view your own purchases');
      }
      
      const purchases = await this.stripeService.getUserPurchases(req.params.id);
      
      // Enrich with plugin data
      const enrichedPurchases = await Promise.all(
        purchases.map(async purchase => {
          const plugin = await this.pluginService.getPlugin(purchase.pluginId);
          return {
            ...purchase,
            plugin: plugin ? {
              id: plugin.id,
              name: plugin.name,
              version: plugin.version,
              author: plugin.author,
              category: plugin.category,
              thumbnailUrl: plugin.thumbnailUrl
            } : null
          };
        })
      );
      
      return { success: true, data: enrichedPurchases };
    } catch (error) {
      console.error('Failed to get user purchases:', error);
      throw new Error('Failed to get user purchases');
    }
  }
  
  /**
   * Plugin Execution Operations
   */
  
  // POST /api/plugins/:id/execute
  async executePlugin(req: any): Promise<{ success: boolean; data: any }> {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw new Error('Unauthorized: Must be logged in to execute plugins');
      }
      
      // Get plugin
      const plugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      // Get plugin version
      const version = req.body.version 
        ? await this.pluginService.getPluginVersion(plugin.id, req.body.version)
        : (await this.pluginService.getPluginVersions(plugin.id)).find(v => v.isLatest);
      
      if (!version) {
        throw new Error('Plugin version not found');
      }
      
      // Check if user has access to the plugin
      const hasPurchased = plugin.price === 0 || 
                          await this.stripeService.hasUserPurchasedPlugin(req.user.id, plugin.id);
      
      if (!hasPurchased) {
        throw new Error('You must purchase this plugin to use it');
      }
      
      // Execute plugin in sandbox
      const result = await this.sandboxService.executePlugin(
        plugin,
        version,
        req.body.code || '', // In a real implementation, we would fetch the code from storage
        req.body.input,
        {
          timeout: req.body.timeout || 5000,
          memoryLimit: req.body.memoryLimit || 50 * 1024 * 1024,
          context: req.body.context || {}
        }
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to execute plugin:', error);
      throw new Error('Failed to execute plugin');
    }
  }
  
  // POST /api/plugins/:id/validate
  async validatePlugin(req: any): Promise<{ success: boolean; data: any }> {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw new Error('Unauthorized: Must be logged in to validate plugins');
      }
      
      // Get plugin
      const plugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      // Validate user permissions
      if (req.user.id !== plugin.authorId && !req.user.isAdmin) {
        throw new Error('Unauthorized: Only the author or admin can validate this plugin');
      }
      
      // Validate plugin code
      const validationResult = await this.sandboxService.validatePlugin(req.body.code);
      
      if (validationResult.valid) {
        // Extract metadata
        const metadata = await this.sandboxService.extractPluginMetadata(req.body.code);
        
        return { 
          success: true, 
          data: { 
            valid: true,
            metadata
          } 
        };
      } else {
        return { 
          success: true, 
          data: { 
            valid: false,
            error: validationResult.error
          } 
        };
      }
    } catch (error) {
      console.error('Failed to validate plugin:', error);
      throw new Error('Failed to validate plugin');
    }
  }
  
  // POST /api/plugins/:id/test
  async testPlugin(req: any): Promise<{ success: boolean; data: any }> {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw new Error('Unauthorized: Must be logged in to test plugins');
      }
      
      // Get plugin
      const plugin = await this.pluginService.getPlugin(req.params.id);
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      // Validate user permissions
      if (req.user.id !== plugin.authorId && !req.user.isAdmin) {
        throw new Error('Unauthorized: Only the author or admin can test this plugin');
      }
      
      // Get plugin version
      const version = req.body.version 
        ? await this.pluginService.getPluginVersion(plugin.id, req.body.version)
        : (await this.pluginService.getPluginVersions(plugin.id)).find(v => v.isLatest);
      
      if (!version) {
        throw new Error('Plugin version not found');
      }
      
      // Test plugin with sample data
      const testResult = await this.sandboxService.testPlugin(
        plugin,
        version,
        req.body.code,
        req.body.sampleData || []
      );
      
      return { success: true, data: testResult };
    } catch (error) {
      console.error('Failed to test plugin:', error);
      throw new Error('Failed to test plugin');
    }
  }
  
  /**
   * Marketplace Operations
   */
  
  // GET /api/marketplace/featured
  async getFeaturedPlugins(req: any): Promise<{ success: boolean; data: Plugin[] }> {
    try {
      const plugins = await this.pluginService.getFeaturedPlugins(req.query.limit ? parseInt(req.query.limit) : 10);
      return { success: true, data: plugins };
    } catch (error) {
      console.error('Failed to get featured plugins:', error);
      throw new Error('Failed to get featured plugins');
    }
  }
  
  // GET /api/marketplace/popular
  async getPopularPlugins(req: any): Promise<{ success: boolean; data: Plugin[] }> {
    try {
      const plugins = await this.pluginService.getPopularPlugins(req.query.limit ? parseInt(req.query.limit) : 10);
      return { success: true, data: plugins };
    } catch (error) {
      console.error('Failed to get popular plugins:', error);
      throw new Error('Failed to get popular plugins');
    }
  }
  
  // GET /api/marketplace/newest
  async getNewestPlugins(req: any): Promise<{ success: boolean; data: Plugin[] }> {
    try {
      const plugins = await this.pluginService.getNewestPlugins(req.query.limit ? parseInt(req.query.limit) : 10);
      return { success: true, data: plugins };
    } catch (error) {
      console.error('Failed to get newest plugins:', error);
      throw new Error('Failed to get newest plugins');
    }
  }
  
  // GET /api/marketplace/top-rated
  async getTopRatedPlugins(req: any): Promise<{ success: boolean; data: Plugin[] }> {
    try {
      const plugins = await this.pluginService.getTopRatedPlugins(req.query.limit ? parseInt(req.query.limit) : 10);
      return { success: true, data: plugins };
    } catch (error) {
      console.error('Failed to get top rated plugins:', error);
      throw new Error('Failed to get top rated plugins');
    }
  }
  
  // GET /api/marketplace/search
  async searchPlugins(req: any): Promise<{ success: boolean; data: Plugin[] }> {
    try {
      const plugins = await this.pluginService.searchPlugins(req.query.q || '');
      return { success: true, data: plugins };
    } catch (error) {
      console.error('Failed to search plugins:', error);
      throw new Error('Failed to search plugins');
    }
  }
  
  /**
   * Admin Operations
   */
  
  // POST /api/admin/plugins/:id/verify
  async verifyPlugin(req: any): Promise<{ success: boolean; data: Plugin | null }> {
    try {
      // Validate user is admin
      if (!req.user || !req.user.isAdmin) {
        throw new Error('Unauthorized: Only admins can verify plugins');
      }
      
      const plugin = await this.pluginService.verifyPlugin(req.params.id, req.body.isVerified);
      return { success: true, data: plugin };
    } catch (error) {
      console.error('Failed to verify plugin:', error);
      throw new Error('Failed to verify plugin');
    }
  }
  
  // POST /api/admin/plugins/:id/status
  async updatePluginStatus(req: any): Promise<{ success: boolean; data: Plugin | null }> {
    try {
      // Validate user is admin
      if (!req.user || !req.user.isAdmin) {
        throw new Error('Unauthorized: Only admins can update plugin status');
      }
      
      const plugin = await this.pluginService.updatePluginStatus(req.params.id, req.body.status);
      return { success: true, data: plugin };
    } catch (error) {
      console.error('Failed to update plugin status:', error);
      throw new Error('Failed to update plugin status');
    }
  }
  
  /**
   * Webhook Handler
   */
  
  // POST /api/webhooks/stripe
  async handleStripeWebhook(req: any): Promise<{ success: boolean }> {
    try {
      await this.stripeService.handleWebhookEvent(req.body, req.headers['stripe-signature']);
      return { success: true };
    } catch (error) {
      console.error('Failed to handle Stripe webhook:', error);
      throw new Error('Failed to handle Stripe webhook');
    }
  }
}