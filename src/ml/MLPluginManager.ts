import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { MLPlugin, MLPluginRegistry, MLPluginMetadata } from './MLPlugin';
import { TensorFlowPlugin } from './tensorflow/TensorFlowPlugin';
import { ONNXPlugin } from './onnx/ONNXPlugin';
import { PyTorchPlugin } from './pytorch/PyTorchPlugin';
import { CustomPlugin } from './custom/CustomPlugin';

/**
 * Plugin loading status
 */
export interface PluginLoadingStatus {
  pluginId: string;
  status: 'loading' | 'loaded' | 'error';
  message?: string;
  progress?: number;
}

/**
 * Plugin inference hook
 */
export interface InferenceHook {
  id: string;
  name: string;
  pluginId: string;
  priority: number;
  enabled: boolean;
  preprocessor?: (data: any) => any;
  postprocessor?: (result: any) => any;
}

/**
 * Manager for ML plugins
 */
export class MLPluginManager {
  private registry = MLPluginRegistry.getInstance();
  private loadingStatus = new BehaviorSubject<Map<string, PluginLoadingStatus>>(new Map());
  private inferenceHooks = new Map<string, InferenceHook>();
  private inferenceResults = new Subject<{ pluginId: string, hookId: string, result: any }>();
  
  /**
   * Load a TensorFlow.js plugin
   */
  async loadTensorFlowPlugin(metadata: MLPluginMetadata, config: any): Promise<MLPlugin> {
    this.updateLoadingStatus(metadata.id, 'loading');
    
    try {
      const plugin = new TensorFlowPlugin(metadata, config);
      const initialized = await plugin.initialize();
      
      if (!initialized) {
        throw new Error(`Failed to initialize TensorFlow.js plugin: ${metadata.name}`);
      }
      
      this.registry.registerPlugin(plugin);
      this.updateLoadingStatus(metadata.id, 'loaded');
      return plugin;
    } catch (error) {
      this.updateLoadingStatus(metadata.id, 'error', (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Load an ONNX Runtime plugin
   */
  async loadONNXPlugin(metadata: MLPluginMetadata, config: any): Promise<MLPlugin> {
    this.updateLoadingStatus(metadata.id, 'loading');
    
    try {
      const plugin = new ONNXPlugin(metadata, config);
      const initialized = await plugin.initialize();
      
      if (!initialized) {
        throw new Error(`Failed to initialize ONNX plugin: ${metadata.name}`);
      }
      
      this.registry.registerPlugin(plugin);
      this.updateLoadingStatus(metadata.id, 'loaded');
      return plugin;
    } catch (error) {
      this.updateLoadingStatus(metadata.id, 'error', (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Load a PyTorch plugin (via Python backend)
   */
  async loadPyTorchPlugin(metadata: MLPluginMetadata, config: any): Promise<MLPlugin> {
    this.updateLoadingStatus(metadata.id, 'loading');
    
    try {
      const plugin = new PyTorchPlugin(metadata, config);
      const initialized = await plugin.initialize();
      
      if (!initialized) {
        throw new Error(`Failed to initialize PyTorch plugin: ${metadata.name}`);
      }
      
      this.registry.registerPlugin(plugin);
      this.updateLoadingStatus(metadata.id, 'loaded');
      return plugin;
    } catch (error) {
      this.updateLoadingStatus(metadata.id, 'error', (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Load a custom plugin
   */
  async loadCustomPlugin(metadata: MLPluginMetadata, config: any): Promise<MLPlugin> {
    this.updateLoadingStatus(metadata.id, 'loading');
    
    try {
      const plugin = new CustomPlugin(metadata, config);
      const initialized = await plugin.initialize();
      
      if (!initialized) {
        throw new Error(`Failed to initialize custom plugin: ${metadata.name}`);
      }
      
      this.registry.registerPlugin(plugin);
      this.updateLoadingStatus(metadata.id, 'loaded');
      return plugin;
    } catch (error) {
      this.updateLoadingStatus(metadata.id, 'error', (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Unload a plugin
   */
  unloadPlugin(pluginId: string): boolean {
    const result = this.registry.unregisterPlugin(pluginId);
    
    if (result) {
      // Remove loading status
      const currentStatus = this.loadingStatus.value;
      currentStatus.delete(pluginId);
      this.loadingStatus.next(currentStatus);
      
      // Remove associated inference hooks
      for (const [hookId, hook] of this.inferenceHooks.entries()) {
        if (hook.pluginId === pluginId) {
          this.inferenceHooks.delete(hookId);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): MLPlugin | undefined {
    return this.registry.getPlugin(pluginId);
  }
  
  /**
   * Get all plugins
   */
  getAllPlugins(): MLPlugin[] {
    return this.registry.getAllPlugins();
  }
  
  /**
   * Get plugins by type
   */
  getPluginsByType(type: MLPlugin['type']): MLPlugin[] {
    return this.registry.getPluginsByType(type);
  }
  
  /**
   * Get plugins by framework
   */
  getPluginsByFramework(framework: MLPlugin['framework']): MLPlugin[] {
    return this.registry.getPluginsByFramework(framework);
  }
  
  /**
   * Register an inference hook
   */
  registerInferenceHook(hook: InferenceHook): void {
    if (this.inferenceHooks.has(hook.id)) {
      throw new Error(`Inference hook with ID ${hook.id} already exists`);
    }
    
    // Verify that the plugin exists
    const plugin = this.registry.getPlugin(hook.pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${hook.pluginId} not found`);
    }
    
    this.inferenceHooks.set(hook.id, hook);
    console.log(`Registered inference hook: ${hook.name} (${hook.id}) for plugin ${hook.pluginId}`);
  }
  
  /**
   * Unregister an inference hook
   */
  unregisterInferenceHook(hookId: string): boolean {
    const result = this.inferenceHooks.delete(hookId);
    if (result) {
      console.log(`Unregistered inference hook: ${hookId}`);
    }
    return result;
  }
  
  /**
   * Enable or disable an inference hook
   */
  setInferenceHookEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.inferenceHooks.get(hookId);
    if (hook) {
      hook.enabled = enabled;
      return true;
    }
    return false;
  }
  
  /**
   * Run inference with a specific plugin
   */
  async runInference(pluginId: string, inputs: any): Promise<any> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    return await plugin.predict(inputs);
  }
  
  /**
   * Run inference through all enabled hooks for a plugin
   */
  async runInferenceWithHooks(pluginId: string, inputs: any): Promise<any[]> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    // Get all enabled hooks for this plugin, sorted by priority
    const hooks = Array.from(this.inferenceHooks.values())
      .filter(hook => hook.pluginId === pluginId && hook.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    const results = [];
    
    for (const hook of hooks) {
      try {
        // Apply preprocessor if available
        const processedInputs = hook.preprocessor ? hook.preprocessor(inputs) : inputs;
        
        // Run inference
        const prediction = await plugin.predict(processedInputs);
        
        // Apply postprocessor if available
        const result = hook.postprocessor ? hook.postprocessor(prediction) : prediction;
        
        // Emit result
        this.inferenceResults.next({
          pluginId,
          hookId: hook.id,
          result
        });
        
        results.push({
          hookId: hook.id,
          result
        });
      } catch (error) {
        console.error(`Error in inference hook ${hook.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Get loading status observable
   */
  getLoadingStatus(): Observable<Map<string, PluginLoadingStatus>> {
    return this.loadingStatus.asObservable();
  }
  
  /**
   * Get inference results observable
   */
  getInferenceResults(): Observable<{ pluginId: string, hookId: string, result: any }> {
    return this.inferenceResults.asObservable();
  }
  
  /**
   * Update loading status for a plugin
   */
  private updateLoadingStatus(
    pluginId: string, 
    status: 'loading' | 'loaded' | 'error', 
    message?: string, 
    progress?: number
  ): void {
    const currentStatus = this.loadingStatus.value;
    currentStatus.set(pluginId, { pluginId, status, message, progress });
    this.loadingStatus.next(currentStatus);
  }
  
  /**
   * Dispose all plugins
   */
  async dispose(): Promise<void> {
    await this.registry.disposeAll();
    this.inferenceHooks.clear();
    this.loadingStatus.next(new Map());
    this.inferenceResults.complete();
  }
}