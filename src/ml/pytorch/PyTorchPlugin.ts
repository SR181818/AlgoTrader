import { BaseMLPlugin, MLPluginMetadata, TrainingResult } from '../MLPlugin';

/**
 * PyTorch specific plugin configuration
 * Note: This is a proxy implementation that communicates with a Python backend
 * since PyTorch models can't run directly in the browser
 */
export interface PyTorchPluginConfig {
  modelUrl?: string;
  modelId?: string;
  apiEndpoint: string;
  apiKey?: string;
  inputShape: number[] | { [key: string]: number[] };
  outputShape: number[] | { [key: string]: number[] };
  inputFeatures: string[];
  outputFeatures: string[];
  preprocessor?: (data: any) => any;
  postprocessor?: (prediction: any) => any;
}

/**
 * PyTorch plugin implementation (proxy to Python backend)
 */
export class PyTorchPlugin extends BaseMLPlugin {
  private config: PyTorchPluginConfig;
  private modelId: string | null = null;
  
  constructor(metadata: MLPluginMetadata, config: PyTorchPluginConfig) {
    super(metadata);
    this.config = config;
    this.framework = 'pytorch';
    this.modelId = config.modelId || null;
  }
  
  async initialize(): Promise<boolean> {
    try {
      // Verify connection to the Python backend
      const response = await fetch(`${this.config.apiEndpoint}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to connect to PyTorch backend: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`PyTorch backend error: ${data.error}`);
      }
      
      // If model URL is provided but no model ID, load the model
      if (this.config.modelUrl && !this.modelId) {
        await this.loadModel(this.config.modelUrl);
      }
      
      this._initialized = true;
      console.log(`PyTorch model initialized: ${this.name}`);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }
  
  private async loadModel(modelUrl: string): Promise<void> {
    const response = await fetch(`${this.config.apiEndpoint}/load_model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
      },
      body: JSON.stringify({ model_url: modelUrl })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Failed to load model: ${data.error}`);
    }
    
    this.modelId = data.model_id;
  }
  
  async predict(inputs: any): Promise<any> {
    if (!this._initialized || !this.modelId) {
      throw new Error('Model not initialized');
    }
    
    try {
      // Preprocess inputs if needed
      const processedInputs = this.config.preprocessor ? this.config.preprocessor(inputs) : inputs;
      
      // Send prediction request to Python backend
      const response = await fetch(`${this.config.apiEndpoint}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
        },
        body: JSON.stringify({
          model_id: this.modelId,
          inputs: processedInputs
        })
      });
      
      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`Prediction failed: ${data.error}`);
      }
      
      // Postprocess outputs if needed
      return this.config.postprocessor ? this.config.postprocessor(data.predictions) : data.predictions;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
  
  async train(data: any, options: any = {}): Promise<TrainingResult> {
    if (!this._initialized || !this.modelId) {
      throw new Error('Model not initialized');
    }
    
    try {
      const startTime = Date.now();
      
      // Send training request to Python backend
      const response = await fetch(`${this.config.apiEndpoint}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
        },
        body: JSON.stringify({
          model_id: this.modelId,
          data,
          options
        })
      });
      
      if (!response.ok) {
        throw new Error(`Training failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(`Training failed: ${result.error}`);
      }
      
      const elapsedTime = Date.now() - startTime;
      
      return {
        success: true,
        epochs: result.epochs,
        metrics: result.metrics,
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
    return true; // PyTorch models can be trained via the Python backend
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
    if (this.modelId) {
      // Send unload request to Python backend
      fetch(`${this.config.apiEndpoint}/unload_model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
        },
        body: JSON.stringify({ model_id: this.modelId })
      }).catch(error => {
        console.error(`Failed to unload model: ${error}`);
      });
      
      this.modelId = null;
    }
    
    this._initialized = false;
    console.log(`PyTorch model disposed: ${this.name}`);
  }
}