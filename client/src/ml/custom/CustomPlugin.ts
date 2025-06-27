import { BaseMLPlugin, MLPluginMetadata, TrainingResult } from '../MLPlugin';

/**
 * Custom ML plugin configuration
 */
export interface CustomPluginConfig {
  modelPath?: string;
  modelData?: any;
  inputShape: number[] | { [key: string]: number[] };
  outputShape: number[] | { [key: string]: number[] };
  inputFeatures: string[];
  outputFeatures: string[];
  initializeFn: (config: CustomPluginConfig) => Promise<any>;
  predictFn: (model: any, inputs: any) => Promise<any>;
  trainFn?: (model: any, data: any, options: any) => Promise<TrainingResult>;
  disposeFn: (model: any) => void;
}

/**
 * Custom ML plugin implementation for any JS-compatible model
 */
export class CustomPlugin extends BaseMLPlugin {
  private config: CustomPluginConfig;
  private model: any = null;
  
  constructor(metadata: MLPluginMetadata, config: CustomPluginConfig) {
    super(metadata);
    this.config = config;
    this.framework = 'custom';
  }
  
  async initialize(): Promise<boolean> {
    try {
      this.model = await this.config.initializeFn(this.config);
      this._initialized = true;
      console.log(`Custom model initialized: ${this.name}`);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }
  
  async predict(inputs: any): Promise<any> {
    if (!this._initialized || !this.model) {
      throw new Error('Model not initialized');
    }
    
    try {
      return await this.config.predictFn(this.model, inputs);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
  
  async train(data: any, options: any = {}): Promise<TrainingResult> {
    if (!this._initialized || !this.model || !this.config.trainFn) {
      throw new Error('Model not initialized or training not supported');
    }
    
    try {
      return await this.config.trainFn(this.model, data, options);
    } catch (error) {
      this.handleError(error as Error);
      return {
        success: false,
        epochs: 0,
        metrics: {},
        elapsedTime: 0,
        error: (error as Error).message
      };
    }
  }
  
  canTrain(): boolean {
    return !!this.config.trainFn;
  }
  
  getMetadata(): MLPluginMetadata {
    return {
      ...super.getMetadata(),
      inputShape: this.config.inputShape,
      outputShape: this.config.outputShape,
      inputFeatures: this.config.inputFeatures,
      outputFeatures: this.config.outputFeatures,
    };
  }
  
  dispose(): void {
    if (this.model) {
      this.config.disposeFn(this.model);
      this.model = null;
    }
    this._initialized = false;
    console.log(`Custom model disposed: ${this.name}`);
  }
}