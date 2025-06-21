import { Observable, Subject } from 'rxjs';
import { CandleData } from '../types/trading';

/**
 * Base interface for all ML model plugins
 */
export interface MLPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'classifier' | 'regressor' | 'anomaly_detector' | 'reinforcement_learning';
  framework: 'tensorflow' | 'pytorch' | 'onnx' | 'custom';
  
  // Lifecycle methods
  initialize(): Promise<boolean>;
  dispose(): void;
  
  // Model methods
  predict(inputs: any): Promise<any>;
  getMetadata(): MLPluginMetadata;
  
  // Optional training methods
  canTrain(): boolean;
  train?(data: any, options?: any): Promise<TrainingResult>;
  
  // Events
  onError: Observable<Error>;
}

/**
 * Metadata for ML plugins
 */
export interface MLPluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  framework: 'tensorflow' | 'pytorch' | 'onnx' | 'custom';
  type: 'classifier' | 'regressor' | 'anomaly_detector' | 'reinforcement_learning';
  inputShape: number[] | { [key: string]: number[] };
  outputShape: number[] | { [key: string]: number[] };
  inputFeatures: string[];
  outputFeatures: string[];
  preprocessor?: string;
  postprocessor?: string;
  metrics?: { [key: string]: number };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of model training
 */
export interface TrainingResult {
  success: boolean;
  epochs: number;
  metrics: { [key: string]: number[] };
  elapsedTime: number;
  error?: string;
}

/**
 * Base abstract class for ML plugins
 */
export abstract class BaseMLPlugin implements MLPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'classifier' | 'regressor' | 'anomaly_detector' | 'reinforcement_learning';
  framework: 'tensorflow' | 'pytorch' | 'onnx' | 'custom';
  
  protected _initialized: boolean = false;
  protected _errorSubject = new Subject<Error>();
  
  constructor(metadata: MLPluginMetadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.version = metadata.version;
    this.description = metadata.description;
    this.type = metadata.type;
    this.framework = metadata.framework;
  }
  
  abstract initialize(): Promise<boolean>;
  abstract predict(inputs: any): Promise<any>;
  abstract dispose(): void;
  
  getMetadata(): MLPluginMetadata {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      framework: this.framework,
      type: this.type,
      inputShape: [],
      outputShape: [],
      inputFeatures: [],
      outputFeatures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  canTrain(): boolean {
    return false;
  }
  
  get onError(): Observable<Error> {
    return this._errorSubject.asObservable();
  }
  
  protected handleError(error: Error): void {
    console.error(`[${this.name}] Error:`, error);
    this._errorSubject.next(error);
  }
}

/**
 * Registry for ML plugins
 */
export class MLPluginRegistry {
  private static instance: MLPluginRegistry;
  private plugins = new Map<string, MLPlugin>();
  
  private constructor() {}
  
  static getInstance(): MLPluginRegistry {
    if (!MLPluginRegistry.instance) {
      MLPluginRegistry.instance = new MLPluginRegistry();
    }
    return MLPluginRegistry.instance;
  }
  
  registerPlugin(plugin: MLPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID ${plugin.id} is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`Registered ML plugin: ${plugin.name} (${plugin.id})`);
  }
  
  unregisterPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.dispose();
      this.plugins.delete(pluginId);
      console.log(`Unregistered ML plugin: ${plugin.name} (${plugin.id})`);
      return true;
    }
    return false;
  }
  
  getPlugin(pluginId: string): MLPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  getAllPlugins(): MLPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  getPluginsByType(type: MLPlugin['type']): MLPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }
  
  getPluginsByFramework(framework: MLPlugin['framework']): MLPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.framework === framework);
  }
  
  async disposeAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      plugin.dispose();
    }
    this.plugins.clear();
  }
}

export { BaseMLPlugin }