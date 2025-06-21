import * as ort from 'onnxruntime-web';
import { BaseMLPlugin, MLPluginMetadata } from '../MLPlugin';

/**
 * ONNX Runtime specific plugin configuration
 */
export interface ONNXPluginConfig {
  modelUrl?: string;
  modelBuffer?: ArrayBuffer;
  inputShape: { [key: string]: number[] };
  outputShape: { [key: string]: number[] };
  inputFeatures: string[];
  outputFeatures: string[];
  executionProviders?: string[];
  preprocessor?: (data: any) => { [key: string]: ort.Tensor };
  postprocessor?: (outputs: { [key: string]: ort.Tensor }) => any;
}

/**
 * ONNX Runtime plugin implementation
 */
export class ONNXPlugin extends BaseMLPlugin {
  private session: ort.InferenceSession | null = null;
  private config: ONNXPluginConfig;
  
  constructor(metadata: MLPluginMetadata, config: ONNXPluginConfig) {
    super(metadata);
    this.config = config;
    this.framework = 'onnx';
  }
  
  async initialize(): Promise<boolean> {
    try {
      // Set execution providers if specified
      if (this.config.executionProviders) {
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
        ort.env.wasm.simd = true;
      }
      
      // Create session options
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: this.config.executionProviders || ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      };
      
      // Create session from URL or buffer
      if (this.config.modelUrl) {
        this.session = await ort.InferenceSession.create(
          this.config.modelUrl, 
          sessionOptions
        );
      } else if (this.config.modelBuffer) {
        this.session = await ort.InferenceSession.create(
          this.config.modelBuffer, 
          sessionOptions
        );
      } else {
        throw new Error('No model configuration provided');
      }
      
      this._initialized = true;
      console.log(`ONNX model initialized: ${this.name}`);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }
  
  async predict(inputs: any): Promise<any> {
    if (!this._initialized || !this.session) {
      throw new Error('Model not initialized');
    }
    
    try {
      // Preprocess inputs if needed
      let feeds: { [key: string]: ort.Tensor };
      if (this.config.preprocessor) {
        feeds = this.config.preprocessor(inputs);
      } else if (inputs instanceof ort.Tensor || (typeof inputs === 'object' && inputs !== null)) {
        feeds = inputs;
      } else {
        throw new Error('Invalid input format');
      }
      
      // Run inference
      const outputData = await this.session.run(feeds);
      
      // Postprocess outputs if needed
      if (this.config.postprocessor) {
        return this.config.postprocessor(outputData);
      }
      
      // Convert to plain JavaScript objects
      const result: { [key: string]: any } = {};
      for (const key in outputData) {
        result[key] = outputData[key].data;
      }
      
      return result;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
  
  canTrain(): boolean {
    return false; // ONNX Runtime doesn't support training
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
    if (this.session) {
      // ONNX Runtime doesn't have explicit dispose method
      this.session = null;
    }
    this._initialized = false;
    console.log(`ONNX model disposed: ${this.name}`);
  }
}