import * as tf from '@tensorflow/tfjs';
import { MLPluginMetadata } from '../MLPlugin';
import { TensorFlowPlugin, TensorFlowPluginConfig } from '../tensorflow/TensorFlowPlugin';
import { MLPluginRegistry } from '../MLPlugin';
import { CandleData } from '../../types/trading';

/**
 * Example price prediction model using TensorFlow.js
 */
export class PricePredictionPlugin {
  /**
   * Create and register a price prediction plugin
   */
  static async create(): Promise<TensorFlowPlugin> {
    // Create metadata
    const metadata: MLPluginMetadata = {
      id: `price_prediction_${Date.now()}`,
      name: 'Price Prediction Model',
      version: '1.0.0',
      description: 'Predicts future price movements using LSTM',
      framework: 'tensorflow',
      type: 'regressor',
      inputShape: [10, 5], // 10 time steps, 5 features (OHLCV)
      outputShape: [1],    // 1 output (predicted price)
      inputFeatures: ['open', 'high', 'low', 'close', 'volume'],
      outputFeatures: ['predicted_close'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Create model
    const model = await PricePredictionPlugin.createModel();
    
    // Create configuration
    const config: TensorFlowPluginConfig = {
      modelJson: model.toJSON(),
      inputShape: metadata.inputShape as number[],
      outputShape: metadata.outputShape as number[],
      inputFeatures: metadata.inputFeatures,
      outputFeatures: metadata.outputFeatures,
      preprocessor: (data: CandleData[]) => {
        // Preprocess candle data for the model
        return PricePredictionPlugin.preprocessData(data);
      },
      postprocessor: (prediction: tf.Tensor) => {
        // Convert prediction tensor to JavaScript value
        return PricePredictionPlugin.postprocessPrediction(prediction);
      }
    };
    
    // Create plugin
    const plugin = new TensorFlowPlugin(metadata, config);
    
    // Initialize plugin
    await plugin.initialize();
    
    // Register plugin
    MLPluginRegistry.getInstance().registerPlugin(plugin);
    
    return plugin;
  }
  
  /**
   * Create a simple LSTM model for price prediction
   */
  private static async createModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: true,
      inputShape: [10, 5], // 10 time steps, 5 features (OHLCV)
    }));
    
    // Hidden layer
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: false,
    }));
    
    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'linear',
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });
    
    return model;
  }
  
  /**
   * Preprocess candle data for the model
   */
  private static preprocessData(candles: CandleData[]): tf.Tensor {
    // Extract features
    const features = candles.map(candle => [
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
    ]);
    
    // Normalize data (simple min-max normalization)
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Convert to tensor with shape [1, 10, 5]
    return tf.tensor3d([normalizedFeatures]);
  }
  
  /**
   * Normalize features using min-max scaling
   */
  private static normalizeFeatures(features: number[][]): number[][] {
    // Calculate min and max for each feature
    const numFeatures = features[0].length;
    const mins = Array(numFeatures).fill(Infinity);
    const maxs = Array(numFeatures).fill(-Infinity);
    
    for (const sample of features) {
      for (let i = 0; i < numFeatures; i++) {
        mins[i] = Math.min(mins[i], sample[i]);
        maxs[i] = Math.max(maxs[i], sample[i]);
      }
    }
    
    // Normalize features
    return features.map(sample => {
      return sample.map((value, i) => {
        if (maxs[i] === mins[i]) return 0.5;
        return (value - mins[i]) / (maxs[i] - mins[i]);
      });
    });
  }
  
  /**
   * Postprocess model prediction
   */
  private static async postprocessPrediction(prediction: tf.Tensor): Promise<number> {
    // Convert tensor to JavaScript value
    const value = await prediction.data();
    return value[0];
  }
}