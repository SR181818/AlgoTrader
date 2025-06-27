import { MLPluginRegistry, BaseMLPlugin, MLPluginMetadata } from '../MLPlugin';

// Mock implementation of BaseMLPlugin for testing
class MockMLPlugin extends BaseMLPlugin {
  private mockModel: any = null;
  
  constructor(metadata: MLPluginMetadata) {
    super(metadata);
  }
  
  async initialize(): Promise<boolean> {
    this.mockModel = { initialized: true };
    this._initialized = true;
    return true;
  }
  
  async predict(inputs: any): Promise<any> {
    if (!this._initialized) {
      throw new Error('Model not initialized');
    }
    return { prediction: inputs * 2 };
  }
  
  dispose(): void {
    this.mockModel = null;
    this._initialized = false;
  }
}

describe('MLPluginRegistry', () => {
  let registry: MLPluginRegistry;
  let mockPlugin: MockMLPlugin;
  
  beforeEach(() => {
    registry = MLPluginRegistry.getInstance();
    
    // Create a mock plugin
    const metadata: MLPluginMetadata = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      framework: 'tensorflow',
      type: 'classifier',
      inputShape: [1, 10],
      outputShape: [1],
      inputFeatures: ['feature1', 'feature2'],
      outputFeatures: ['output'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockPlugin = new MockMLPlugin(metadata);
  });
  
  afterEach(() => {
    // Clean up registry
    registry.unregisterPlugin('test-plugin');
  });
  
  test('should register a plugin', () => {
    registry.registerPlugin(mockPlugin);
    const retrievedPlugin = registry.getPlugin('test-plugin');
    expect(retrievedPlugin).toBe(mockPlugin);
  });
  
  test('should unregister a plugin', () => {
    registry.registerPlugin(mockPlugin);
    const result = registry.unregisterPlugin('test-plugin');
    expect(result).toBe(true);
    expect(registry.getPlugin('test-plugin')).toBeUndefined();
  });
  
  test('should get all plugins', () => {
    registry.registerPlugin(mockPlugin);
    const plugins = registry.getAllPlugins();
    expect(plugins).toContain(mockPlugin);
  });
  
  test('should get plugins by type', () => {
    registry.registerPlugin(mockPlugin);
    const plugins = registry.getPluginsByType('classifier');
    expect(plugins).toContain(mockPlugin);
  });
  
  test('should get plugins by framework', () => {
    registry.registerPlugin(mockPlugin);
    const plugins = registry.getPluginsByFramework('tensorflow');
    expect(plugins).toContain(mockPlugin);
  });
});

describe('BaseMLPlugin', () => {
  let mockPlugin: MockMLPlugin;
  
  beforeEach(() => {
    const metadata: MLPluginMetadata = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      framework: 'tensorflow',
      type: 'classifier',
      inputShape: [1, 10],
      outputShape: [1],
      inputFeatures: ['feature1', 'feature2'],
      outputFeatures: ['output'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockPlugin = new MockMLPlugin(metadata);
  });
  
  test('should initialize correctly', async () => {
    const result = await mockPlugin.initialize();
    expect(result).toBe(true);
  });
  
  test('should predict correctly', async () => {
    await mockPlugin.initialize();
    const result = await mockPlugin.predict(5);
    expect(result).toEqual({ prediction: 10 });
  });
  
  test('should throw error if predicting without initialization', async () => {
    await expect(mockPlugin.predict(5)).rejects.toThrow('Model not initialized');
  });
  
  test('should dispose correctly', async () => {
    await mockPlugin.initialize();
    mockPlugin.dispose();
    await expect(mockPlugin.predict(5)).rejects.toThrow('Model not initialized');
  });
  
  test('should return metadata', () => {
    const metadata = mockPlugin.getMetadata();
    expect(metadata.id).toBe('test-plugin');
    expect(metadata.name).toBe('Test Plugin');
    expect(metadata.framework).toBe('tensorflow');
    expect(metadata.type).toBe('classifier');
  });
  
  test('should check if training is supported', () => {
    expect(mockPlugin.canTrain()).toBe(false);
  });
});