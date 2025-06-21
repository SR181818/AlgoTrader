import * as tf from '@tensorflow/tfjs';
import { MLPluginMetadata } from '../MLPlugin';
import { TensorFlowPlugin, TensorFlowPluginConfig } from '../tensorflow/TensorFlowPlugin';
import { MLPluginRegistry } from '../MLPlugin';
import { CandleData } from '../../types/trading';

/**
 * Example anomaly detection model using TensorFlow.js
 */
export class AnomalyDetectionPlugin {
  /**
   * Create and register an anomaly detection plugin
   */
  static async create(): Promise<TensorFlowPlugin> {
    // Create metadata
    const metadata: MLPluginMetadata = {
      id: `anomaly_detection_${Date.now()}`,
      name: 'Market Anomaly Detector',
      version: '1.0.0',
      description: 'Detects market anomalies using autoencoder',
      framework: 'tensorflow',
      type: 'anomaly_detector',
      inputShape: [20, 5], // 20 time steps, 5 features (OHLCV)
      outputShape: [1],    // 1 output (anomaly score)
      inputFeatures: ['open', 'high', 'low', 'close', 'volume'],
      outputFeatures: ['anomaly_score'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Create model
    const model = await AnomalyDetectionPlugin.createModel();
    
    // Create configuration
    const config: TensorFlowPluginConfig = {
      modelJson: model.toJSON(),
      inputShape: metadata.inputShape as number[],
      outputShape: metadata.outputShape as number[],
      inputFeatures: metadata.inputFeatures,
      outputFeatures: metadata.outputFeatures,
      preprocessor: (data: CandleData[]) => {
        // Preprocess candle data for the model
        return AnomalyDetectionPlugin.preprocessData(data);
      },
      postprocessor: (prediction: tf.Tensor) => {
        // Convert prediction tensor to anomaly score
        return AnomalyDetectionPlugin.postprocessPrediction(prediction);
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
   * Create a simple autoencoder model for anomaly detection
   */
  private static async createModel(): Promise<tf.LayersModel> {
    const inputDim = 5; // OHLCV
    const timeSteps = 20;
    const encodingDim = 3;
    
    // Encoder
    const input = tf.input({shape: [timeSteps, inputDim]});
    const encoded = tf.layers.lstm({
      units: encodingDim,
      returnSequences: false
    }).apply(input);
    
    // Decoder
    const decoded = tf.layers.repeatVector({n: timeSteps}).apply(encoded);
    const output = tf.layers.lstm({
      units: inputDim,
      returnSequences: true
    }).apply(decoded);
    
    // Create model
    const model = tf.model({inputs: input, outputs: output});
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
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
    
    // Normalize data
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Convert to tensor with shape [1, 20, 5]
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
   * Calculate anomaly score from reconstruction error
   */
  private static async postprocessPrediction(prediction: tf.Tensor): Promise<{
    anomalyScore: number;
    isAnomaly: boolean;
    threshold: number;
  }> {
    // Get input data (this would be the original data in a real implementation)
    const inputData = tf.randomNormal([1, 20, 5]);
    
    // Calculate reconstruction error (MSE)
    const error = tf.metrics.meanSquaredError(inputData, prediction);
    const errorValue = await error.data();
    
    // Define anomaly threshold (this would be calibrated in a real implementation)
    const threshold = 0.1;
    
    // Determine if this is an anomaly
    const anomalyScore = errorValue[0];
    const isAnomaly = anomalyScore > threshold;
    
    // Clean up tensors
    inputData.dispose();
    error.dispose();
    
    return {
      anomalyScore,
      isAnomaly,
      threshold
    };
  }
}