import { SandboxService } from '../services/SandboxService';
import { Plugin, PluginVersion } from '../models/PluginModel';

describe('SandboxService', () => {
  let sandboxService: SandboxService;
  
  // Mock plugin and version
  const mockPlugin: Plugin = {
    id: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin',
    version: '1.0.0',
    author: 'Test Author',
    authorId: 'user_test',
    category: 'utility',
    tags: ['test'],
    price: 0,
    pricingModel: 'free',
    downloadCount: 0,
    rating: 0,
    ratingCount: 0,
    status: 'published',
    isVerified: false,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    licenseType: 'MIT',
    dependencies: [],
    compatibleVersions: ['1.0.0'],
    minAppVersion: '1.0.0',
    screenshotUrls: []
  };
  
  const mockVersion: PluginVersion = {
    id: 'test-version',
    pluginId: 'test-plugin',
    version: '1.0.0',
    description: 'Test version',
    downloadUrl: 'https://example.com/test.zip',
    fileSize: 1000,
    sha256Hash: 'test-hash',
    createdAt: new Date(),
    isLatest: true,
    minAppVersion: '1.0.0',
    dependencies: []
  };
  
  beforeEach(() => {
    sandboxService = new SandboxService();
  });
  
  describe('validatePlugin', () => {
    it('should validate valid JavaScript code', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        
        module.exports = { add };
      `;
      
      const result = await sandboxService.validatePlugin(code);
      expect(result.valid).toBe(true);
    });
    
    it('should reject invalid JavaScript code', async () => {
      const code = `
        function add(a, b {
          return a + b;
        }
        
        module.exports = { add };
      `;
      
      const result = await sandboxService.validatePlugin(code);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('extractPluginMetadata', () => {
    it('should extract metadata from module.exports', async () => {
      const code = `
        const metadata = {
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'A test plugin',
          author: 'Test Author'
        };
        
        module.exports = {
          metadata,
          someFunction: () => {}
        };
      `;
      
      const result = await sandboxService.extractPluginMetadata(code);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Plugin');
      expect(result?.version).toBe('1.0.0');
    });
    
    it('should extract metadata from getMetadata function', async () => {
      const code = `
        function getMetadata() {
          return {
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'A test plugin',
            author: 'Test Author'
          };
        }
        
        function someFunction() {}
      `;
      
      const result = await sandboxService.extractPluginMetadata(code);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Plugin');
      expect(result?.version).toBe('1.0.0');
    });
    
    it('should return null for code without metadata', async () => {
      const code = `
        function someFunction() {
          return 'Hello World';
        }
        
        module.exports = { someFunction };
      `;
      
      const result = await sandboxService.extractPluginMetadata(code);
      expect(result).toBeNull();
    });
  });
  
  describe('executePlugin', () => {
    it('should execute plugin code and return result', async () => {
      const code = `
        function main(input) {
          return {
            result: input.a + input.b,
            message: 'Success'
          };
        }
      `;
      
      const input = { a: 5, b: 3 };
      
      const result = await sandboxService.executePlugin(
        mockPlugin,
        mockVersion,
        code,
        input
      );
      
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ result: 8, message: 'Success' });
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.memoryUsage).toBeGreaterThan(0);
    });
    
    it('should handle errors in plugin code', async () => {
      const code = `
        function main(input) {
          throw new Error('Test error');
        }
      `;
      
      const input = { a: 5, b: 3 };
      
      const result = await sandboxService.executePlugin(
        mockPlugin,
        mockVersion,
        code,
        input
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Test error');
    });
    
    it('should respect timeout option', async () => {
      const code = `
        function main(input) {
          while(true) {}
          return 'This will never execute';
        }
      `;
      
      const input = {};
      
      const result = await sandboxService.executePlugin(
        mockPlugin,
        mockVersion,
        code,
        input,
        { timeout: 100 } // 100ms timeout
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Script execution timed out');
    });
    
    it('should block access to sensitive APIs', async () => {
      const code = `
        function main(input) {
          const fs = require('fs');
          return fs.readFileSync('/etc/passwd', 'utf8');
        }
      `;
      
      const input = {};
      
      const result = await sandboxService.executePlugin(
        mockPlugin,
        mockVersion,
        code,
        input
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('File system access is not allowed');
    });
  });
  
  describe('testPlugin', () => {
    it('should test plugin with sample data', async () => {
      const code = `
        function main(input) {
          return {
            result: input.value * 2
          };
        }
      `;
      
      const sampleData = [
        { value: 5 },
        { value: 10 },
        { value: 15 }
      ];
      
      const result = await sandboxService.testPlugin(
        mockPlugin,
        mockVersion,
        code,
        sampleData
      );
      
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);
      expect(result.results.every(r => r.success)).toBe(true);
      expect(result.summary).toContain('Success Rate: 100.00%');
    });
    
    it('should handle errors in test data', async () => {
      const code = `
        function main(input) {
          if (input.value > 10) {
            throw new Error('Value too large');
          }
          return {
            result: input.value * 2
          };
        }
      `;
      
      const sampleData = [
        { value: 5 },
        { value: 15 }, // This will cause an error
        { value: 8 }
      ];
      
      const result = await sandboxService.testPlugin(
        mockPlugin,
        mockVersion,
        code,
        sampleData
      );
      
      expect(result.success).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
      expect(result.summary).toContain('Success Rate: 66.67%');
    });
  });
});