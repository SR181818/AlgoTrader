import * as tf from '@tensorflow/tfjs';
import { BaseMLPlugin, MLPluginMetadata, TrainingResult } from '../MLPlugin';

/**
 * TensorFlow.js specific plugin configuration
 */
export interface TensorFlowPluginConfig {
  modelUrl?: string;
  modelJson?: any;
  modelWeights?: ArrayBuffer;
  modelTopology?: any;
  inputShape: number[] | { [key: string]: number[] };
  outputShape: number[] | { [key: string]: number[] };
  inputFeatures: string[];
  outputFeatures: string[];
  preprocessor?: (data: any) => tf.Tensor | tf.Tensor[];
  postprocessor?: (prediction: tf.Tensor | tf.Tensor[]) => any;
}

/**
 * TensorFlow.js plugin implementation
 */
export class TensorFlowPlugin extends BaseMLPlugin {
  private model: tf.LayersModel | tf.GraphModel | null = null;
  private config: TensorFlowPluginConfig;
  
  constructor(metadata: MLPluginMetadata, config: TensorFlowPluginConfig) {
    super(metadata);
    this.config = config;
    this.framework = 'tensorflow';
  }
  
  async initialize(): Promise<boolean> {
    try {
      // Ensure TensorFlow.js is ready
      await tf.ready();
      
      // Load model based on provided configuration
      if (this.config.modelUrl) {
        // Load from URL
        this.model = await tf.loadLayersModel(this.config.modelUrl);
      } else if (this.config.modelJson) {
        // Load from JSON
        this.model = await tf.loadLayersModel(tf.io.fromMemory(this.config.modelJson));
      } else if (this.config.modelTopology) {
        // Load from topology and weights
        const modelArtifacts = {
          modelTopology: this.config.modelTopology,
          weightSpecs: undefined,
          weightData: this.config.modelWeights,
        };
        this.model = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));
      } else {
        throw new Error('No model configuration provided');
      }
      
      // Warm up the model with a dummy prediction
      const inputShape = Array.isArray(this.config.inputShape) 
        ? this.config.inputShape 
        : Object.values(this.config.inputShape)[0];
      
      const dummyInput = tf.zeros([1, ...inputShape.slice(1)]);
      this.model.predict(dummyInput);
      dummyInput.dispose();
      
      this._initialized = true;
      console.log(`TensorFlow.js model initialized: ${this.name}`);
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
      // Preprocess inputs if needed
      let tensorInputs: tf.Tensor | tf.Tensor[];
      if (this.config.preprocessor) {
        tensorInputs = this.config.preprocessor(inputs);
      } else if (inputs instanceof tf.Tensor) {
        tensorInputs = inputs;
      } else if (Array.isArray(inputs)) {
        tensorInputs = tf.tensor(inputs);
      } else {
        throw new Error('Invalid input format');
      }
      
      // Run prediction
      const prediction = this.model.predict(tensorInputs);
      
      // Postprocess outputs if needed
      let result;
      if (this.config.postprocessor) {
        result = this.config.postprocessor(prediction);
      } else {
        // Convert tensor to JavaScript array
        if (Array.isArray(prediction)) {
          result = await Promise.all(prediction.map(p => p.array()));
        } else {
          result = await prediction.array();
        }
      }
      
      // Clean up tensors
      if (!(inputs instanceof tf.Tensor)) {
        tf.dispose(tensorInputs);
      }
      
      if (Array.isArray(prediction)) {
        prediction.forEach(p => p.dispose());
      } else {
        prediction.dispose();
      }
      
      return result;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
  
  async train(data: any, options: tf.ModelFitArgs = {}): Promise<TrainingResult> {
    if (!this._initialized || !this.model || !(this.model instanceof tf.LayersModel)) {
      throw new Error('Model not initialized or not a trainable LayersModel');
    }
    
    try {
      const startTime = Date.now();
      
      // Prepare data
      let xs: tf.Tensor;
      let ys: tf.Tensor;
      
      if (data.xs instanceof tf.Tensor && data.ys instanceof tf.Tensor) {
        xs = data.xs;
        ys = data.ys;
      } else if (Array.isArray(data.xs) && Array.isArray(data.ys)) {
        xs = tf.tensor(data.xs);
        ys = tf.tensor(data.ys);
      } else {
        throw new Error('Invalid training data format');
      }
      
      // Set up default training options
      const defaultOptions: tf.ModelFitArgs = {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}`);
          }
        }
      };
      
      const fitOptions = { ...defaultOptions, ...options };
      
      // Train the model
      const history = await this.model.fit(xs, ys, fitOptions);
      
      const elapsedTime = Date.now() - startTime;
      
      // Clean up tensors
      if (!(data.xs instanceof tf.Tensor)) {
        xs.dispose();
      }
      if (!(data.ys instanceof tf.Tensor)) {
        ys.dispose();
      }
      
      // Extract metrics
      const metrics: { [key: string]: number[] } = {};
      Object.keys(history.history).forEach(key => {
        metrics[key] = history.history[key];
      });
      
      return {
        success: true,
        epochs: history.epoch.length,
        metrics,
        elapsedTime
      };
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
    return this.model instanceof tf.LayersModel;
  }
  
  async saveModel(path: string): Promise<boolean> {
    if (!this._initialized || !this.model) {
      throw new Error('Model not initialized');
    }
    
    try {
      if (this.model instanceof tf.LayersModel) {
        await this.model.save(`localstorage://${path}`);
        return true;
      } else {
        throw new Error('Only LayersModel can be saved');
      }
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
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
      this.model.dispose();
      this.model = null;
    }
    this._initialized = false;
    console.log(`TensorFlow.js model disposed: ${this.name}`);
  }
}