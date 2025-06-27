import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { MLPluginManager } from '../MLPluginManager';
import { CandleData } from '../../types/trading';

/**
 * Inference result from a model
 */
export interface InferenceResult {
  pluginId: string;
  timestamp: number;
  inputs: any;
  outputs: any;
  metadata?: any;
}

/**
 * Inference configuration
 */
export interface InferenceConfig {
  pluginId: string;
  interval: number; // milliseconds
  inputWindowSize: number;
  inputFeatures: string[];
  preprocessor?: (data: any) => any;
  postprocessor?: (result: any) => any;
  autoStart?: boolean;
}

/**
 * Engine for running real-time inference
 */
export class InferenceEngine {
  private pluginManager: MLPluginManager;
  private configs = new Map<string, InferenceConfig>();
  private dataBuffer = new Map<string, CandleData[]>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private resultsSubject = new Subject<InferenceResult>();
  private statusSubject = new BehaviorSubject<Map<string, boolean>>(new Map());
  
  constructor(pluginManager: MLPluginManager) {
    this.pluginManager = pluginManager;
  }
  
  /**
   * Register a new inference configuration
   */
  registerInference(config: InferenceConfig): void {
    if (this.configs.has(config.pluginId)) {
      throw new Error(`Inference already registered for plugin ${config.pluginId}`);
    }
    
    // Verify that the plugin exists
    const plugin = this.pluginManager.getPlugin(config.pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${config.pluginId} not found`);
    }
    
    this.configs.set(config.pluginId, config);
    this.dataBuffer.set(config.pluginId, []);
    
    // Update status
    const currentStatus = this.statusSubject.value;
    currentStatus.set(config.pluginId, false);
    this.statusSubject.next(currentStatus);
    
    console.log(`Registered inference for plugin: ${plugin.name} (${config.pluginId})`);
    
    // Auto-start if configured
    if (config.autoStart) {
      this.startInference(config.pluginId);
    }
  }
  
  /**
   * Unregister an inference configuration
   */
  unregisterInference(pluginId: string): boolean {
    if (!this.configs.has(pluginId)) {
      return false;
    }
    
    // Stop inference if running
    this.stopInference(pluginId);
    
    // Clean up
    this.configs.delete(pluginId);
    this.dataBuffer.delete(pluginId);
    
    // Update status
    const currentStatus = this.statusSubject.value;
    currentStatus.delete(pluginId);
    this.statusSubject.next(currentStatus);
    
    console.log(`Unregistered inference for plugin: ${pluginId}`);
    return true;
  }
  
  /**
   * Start inference for a plugin
   */
  startInference(pluginId: string): boolean {
    if (!this.configs.has(pluginId)) {
      return false;
    }
    
    // Stop existing interval if any
    this.stopInference(pluginId);
    
    const config = this.configs.get(pluginId)!;
    const plugin = this.pluginManager.getPlugin(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    // Set up interval for regular inference
    const interval = setInterval(async () => {
      try {
        const buffer = this.dataBuffer.get(pluginId) || [];
        
        // Skip if not enough data
        if (buffer.length < config.inputWindowSize) {
          return;
        }
        
        // Get the most recent data window
        const dataWindow = buffer.slice(-config.inputWindowSize);
        
        // Prepare inputs
        let inputs: any;
        if (config.preprocessor) {
          inputs = config.preprocessor(dataWindow);
        } else {
          // Default preprocessing: extract specified features
          inputs = this.extractFeatures(dataWindow, config.inputFeatures);
        }
        
        // Run inference
        const outputs = await plugin.predict(inputs);
        
        // Process outputs
        const result = config.postprocessor ? config.postprocessor(outputs) : outputs;
        
        // Emit result
        this.resultsSubject.next({
          pluginId,
          timestamp: Date.now(),
          inputs,
          outputs: result
        });
      } catch (error) {
        console.error(`Inference error for plugin ${pluginId}:`, error);
      }
    }, config.interval);
    
    this.intervals.set(pluginId, interval);
    
    // Update status
    const currentStatus = this.statusSubject.value;
    currentStatus.set(pluginId, true);
    this.statusSubject.next(currentStatus);
    
    console.log(`Started inference for plugin: ${plugin.name} (${pluginId})`);
    return true;
  }
  
  /**
   * Stop inference for a plugin
   */
  stopInference(pluginId: string): boolean {
    const interval = this.intervals.get(pluginId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(pluginId);
      
      // Update status
      const currentStatus = this.statusSubject.value;
      currentStatus.set(pluginId, false);
      this.statusSubject.next(currentStatus);
      
      console.log(`Stopped inference for plugin: ${pluginId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Update data buffer with new candle data
   */
  updateData(symbol: string, candle: CandleData): void {
    // Update all buffers
    for (const [pluginId, buffer] of this.dataBuffer.entries()) {
      // Add candle to buffer
      buffer.push(candle);
      
      // Limit buffer size to 2x the input window size
      const config = this.configs.get(pluginId);
      if (config && buffer.length > config.inputWindowSize * 2) {
        buffer.shift();
      }
    }
  }
  
  /**
   * Run a one-time inference without registering
   */
  async runOneTimeInference(
    pluginId: string, 
    data: any, 
    preprocessor?: (data: any) => any,
    postprocessor?: (result: any) => any
  ): Promise<any> {
    const plugin = this.pluginManager.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }
    
    // Preprocess data if needed
    const inputs = preprocessor ? preprocessor(data) : data;
    
    // Run inference
    const outputs = await plugin.predict(inputs);
    
    // Postprocess result if needed
    const result = postprocessor ? postprocessor(outputs) : outputs;
    
    // Emit result
    this.resultsSubject.next({
      pluginId,
      timestamp: Date.now(),
      inputs,
      outputs: result
    });
    
    return result;
  }
  
  /**
   * Get inference results observable
   */
  getResults(): Observable<InferenceResult> {
    return this.resultsSubject.asObservable();
  }
  
  /**
   * Get inference status observable
   */
  getStatus(): Observable<Map<string, boolean>> {
    return this.statusSubject.asObservable();
  }
  
  /**
   * Extract features from candle data
   */
  private extractFeatures(candles: CandleData[], features: string[]): number[][] {
    return candles.map(candle => {
      return features.map(feature => {
        switch (feature) {
          case 'open': return candle.open;
          case 'high': return candle.high;
          case 'low': return candle.low;
          case 'close': return candle.close;
          case 'volume': return candle.volume;
          case 'timestamp': return candle.timestamp;
          default:
            if (feature.includes('.')) {
              const [obj, prop] = feature.split('.');
              return (candle as any)[obj]?.[prop] || 0;
            }
            return (candle as any)[feature] || 0;
        }
      });
    });
  }
  
  /**
   * Dispose the inference engine
   */
  dispose(): void {
    // Stop all inference intervals
    for (const [pluginId, interval] of this.intervals.entries()) {
      clearInterval(interval);
      console.log(`Stopped inference for plugin: ${pluginId}`);
    }
    
    this.intervals.clear();
    this.configs.clear();
    this.dataBuffer.clear();
    
    this.resultsSubject.complete();
    this.statusSubject.complete();
  }
}