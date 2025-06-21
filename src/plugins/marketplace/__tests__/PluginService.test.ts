import { PluginService } from '../services/PluginService';
import { Plugin, PluginStatus } from '../models/PluginModel';

describe('PluginService', () => {
  let pluginService: PluginService;
  
  beforeEach(() => {
    pluginService = new PluginService();
  });
  
  describe('getPlugins', () => {
    it('should return all plugins when no filters are provided', async () => {
      const plugins = await pluginService.getPlugins();
      expect(plugins.length).toBeGreaterThan(0);
    });
    
    it('should filter plugins by category', async () => {
      const plugins = await pluginService.getPlugins({ category: 'strategy' });
      expect(plugins.length).toBeGreaterThan(0);
      expect(plugins.every(p => p.category === 'strategy')).toBe(true);
    });
    
    it('should filter plugins by search term', async () => {
      const searchTerm = 'RSI';
      const plugins = await pluginService.getPlugins({ search: searchTerm });
      expect(plugins.every(p => 
        p.name.includes(searchTerm) || 
        p.description.includes(searchTerm) ||
        p.tags.some(tag => tag.includes(searchTerm))
      )).toBe(true);
    });
    
    it('should sort plugins by rating', async () => {
      const plugins = await pluginService.getPlugins({ sortBy: 'rating', sortOrder: 'desc' });
      
      for (let i = 0; i < plugins.length - 1; i++) {
        expect(plugins[i].rating).toBeGreaterThanOrEqual(plugins[i + 1].rating);
      }
    });
  });
  
  describe('getPlugin', () => {
    it('should return a plugin by ID', async () => {
      const plugins = await pluginService.getPlugins();
      const firstPlugin = plugins[0];
      
      const plugin = await pluginService.getPlugin(firstPlugin.id);
      expect(plugin).not.toBeNull();
      expect(plugin?.id).toBe(firstPlugin.id);
    });
    
    it('should return null for non-existent plugin ID', async () => {
      const plugin = await pluginService.getPlugin('non-existent-id');
      expect(plugin).toBeNull();
    });
  });
  
  describe('createPlugin', () => {
    it('should create a new plugin', async () => {
      const newPlugin = {
        name: 'Test Plugin',
        description: 'A test plugin',
        version: '1.0.0',
        author: 'Test Author',
        authorId: 'user_test',
        category: 'utility' as const,
        tags: ['test', 'utility'],
        price: 0,
        pricingModel: 'free' as const,
        status: 'draft' as const,
        isVerified: false,
        isPublic: false,
        licenseType: 'MIT',
        dependencies: [],
        compatibleVersions: ['1.0.0'],
        minAppVersion: '1.0.0',
        screenshotUrls: []
      };
      
      const plugin = await pluginService.createPlugin(newPlugin);
      expect(plugin).toBeDefined();
      expect(plugin.id).toBeDefined();
      expect(plugin.name).toBe(newPlugin.name);
      expect(plugin.downloadCount).toBe(0);
      expect(plugin.rating).toBe(0);
      expect(plugin.ratingCount).toBe(0);
    });
  });
  
  describe('updatePlugin', () => {
    it('should update an existing plugin', async () => {
      const plugins = await pluginService.getPlugins();
      const plugin = plugins[0];
      
      const updates = {
        description: 'Updated description',
        tags: [...plugin.tags, 'new-tag']
      };
      
      const updatedPlugin = await pluginService.updatePlugin(plugin.id, updates);
      expect(updatedPlugin).not.toBeNull();
      expect(updatedPlugin?.description).toBe(updates.description);
      expect(updatedPlugin?.tags).toEqual(updates.tags);
    });
    
    it('should return null for non-existent plugin ID', async () => {
      const updatedPlugin = await pluginService.updatePlugin('non-existent-id', { description: 'test' });
      expect(updatedPlugin).toBeNull();
    });
  });
  
  describe('ratePlugin', () => {
    it('should create a new rating for a plugin', async () => {
      const plugins = await pluginService.getPlugins();
      const plugin = plugins[0];
      
      const initialRating = plugin.rating;
      const initialCount = plugin.ratingCount;
      
      const rating = await pluginService.ratePlugin({
        pluginId: plugin.id,
        userId: 'test-user',
        rating: 5
      });
      
      expect(rating).toBeDefined();
      expect(rating.pluginId).toBe(plugin.id);
      expect(rating.userId).toBe('test-user');
      expect(rating.rating).toBe(5);
      
      // Check that plugin rating was updated
      const updatedPlugin = await pluginService.getPlugin(plugin.id);
      expect(updatedPlugin?.ratingCount).toBe(initialCount + 1);
      
      // Rating should be updated based on the new rating
      const expectedRating = (initialRating * initialCount + 5) / (initialCount + 1);
      expect(updatedPlugin?.rating).toBeCloseTo(expectedRating);
    });
    
    it('should update an existing rating', async () => {
      const plugins = await pluginService.getPlugins();
      const plugin = plugins[0];
      
      // First create a rating
      await pluginService.ratePlugin({
        pluginId: plugin.id,
        userId: 'test-user-2',
        rating: 4
      });
      
      const updatedPlugin1 = await pluginService.getPlugin(plugin.id);
      const initialRating = updatedPlugin1!.rating;
      const initialCount = updatedPlugin1!.ratingCount;
      
      // Then update it
      const updatedRating = await pluginService.ratePlugin({
        pluginId: plugin.id,
        userId: 'test-user-2',
        rating: 5,
        review: 'Great plugin!'
      });
      
      expect(updatedRating).toBeDefined();
      expect(updatedRating.rating).toBe(5);
      expect(updatedRating.review).toBe('Great plugin!');
      
      // Check that plugin rating was updated but count stayed the same
      const updatedPlugin2 = await pluginService.getPlugin(plugin.id);
      expect(updatedPlugin2?.ratingCount).toBe(initialCount);
      expect(updatedPlugin2?.rating).not.toBe(initialRating); // Rating should change
    });
  });
  
  describe('updatePluginStatus', () => {
    it('should update plugin status', async () => {
      const plugins = await pluginService.getPlugins();
      const plugin = plugins[0];
      
      const newStatus: PluginStatus = 'published';
      const updatedPlugin = await pluginService.updatePluginStatus(plugin.id, newStatus);
      
      expect(updatedPlugin).not.toBeNull();
      expect(updatedPlugin?.status).toBe(newStatus);
      
      if (newStatus === 'published') {
        expect(updatedPlugin?.publishedAt).toBeDefined();
      }
    });
  });
  
  describe('searchPlugins', () => {
    it('should find plugins matching search query', async () => {
      const results = await pluginService.searchPlugins('strategy');
      expect(results.length).toBeGreaterThan(0);
      
      // Each result should match the search term in name, description, or tags
      expect(results.every(p => 
        p.name.toLowerCase().includes('strategy') || 
        p.description.toLowerCase().includes('strategy') ||
        p.tags.some(tag => tag.toLowerCase().includes('strategy'))
      )).toBe(true);
    });
    
    it('should return empty array for non-matching search', async () => {
      const results = await pluginService.searchPlugins('xyznonexistent');
      expect(results.length).toBe(0);
    });
  });
});