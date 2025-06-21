import * as tf from '@tensorflow/tfjs';
import { MLPluginMetadata } from '../MLPlugin';
import { TensorFlowPlugin, TensorFlowPluginConfig } from '../tensorflow/TensorFlowPlugin';
import { MLPluginRegistry } from '../MLPlugin';
import { CandleData } from '../../types/trading';

/**
 * Example market regime classification model using TensorFlow.js
 */
export class MarketRegimePlugin {
  /**
   * Create and register a market regime classification plugin
   */
  static async create(): Promise<TensorFlowPlugin> {
    // Create metadata
    const metadata: MLPluginMetadata = {
      id: `market_regime_${Date.now()}`,
      name: 'Market Regime Classifier',
      version: '1.0.0',
      description: 'Classifies market regimes (trending, ranging, volatile)',
      framework: 'tensorflow',
      type: 'classifier',
      inputShape: [30, 7], // 30 time steps, 7 features
      outputShape: [3],    // 3 classes (trending, ranging, volatile)
      inputFeatures: ['open', 'high', 'low', 'close', 'volume', 'atr', 'adx'],
      outputFeatures: ['trending', 'ranging', 'volatile'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Create model
    const model = await MarketRegimePlugin.createModel();
    
    // Create configuration
    const config: TensorFlowPluginConfig = {
      modelJson: model.toJSON(),
      inputShape: metadata.inputShape as number[],
      outputShape: metadata.outputShape as number[],
      inputFeatures: metadata.inputFeatures,
      outputFeatures: metadata.outputFeatures,
      preprocessor: (data: CandleData[]) => {
        // Preprocess candle data for the model
        return MarketRegimePlugin.preprocessData(data);
      },
      postprocessor: (prediction: tf.Tensor) => {
        // Convert prediction tensor to regime classification
        return MarketRegimePlugin.postprocessPrediction(prediction);
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
   * Create a CNN-LSTM model for market regime classification
   */
  private static async createModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    // 1D CNN for feature extraction
    model.add(tf.layers.conv1d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      inputShape: [30, 7], // 30 time steps, 7 features
    }));
    
    model.add(tf.layers.maxPooling1d({
      poolSize: 2,
    }));
    
    // LSTM layer
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: false,
    }));
    
    // Dense layers
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
    }));
    
    model.add(tf.layers.dropout({
      rate: 0.2,
    }));
    
    // Output layer (3 classes)
    model.add(tf.layers.dense({
      units: 3,
      activation: 'softmax',
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    
    return model;
  }
  
  /**
   * Preprocess candle data for the model
   */
  private static preprocessData(candles: CandleData[]): tf.Tensor {
    // Extract basic features
    const features = candles.map(candle => {
      // Calculate additional features (ATR and ADX would be calculated properly in a real implementation)
      const atr = (candle.high - candle.low) / candle.close; // Simplified ATR
      const adx = Math.random() * 100; // Dummy ADX value
      
      return [
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        atr,
        adx,
      ];
    });
    
    // Normalize data
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Convert to tensor with shape [1, 30, 7]
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
   * Process model prediction into market regime classification
   */
  private static async postprocessPrediction(prediction: tf.Tensor): Promise<{
    regime: 'trending' | 'ranging' | 'volatile';
    probabilities: {
      trending: number;
      ranging: number;
      volatile: number;
    };
    confidence: number;
  }> {
    // Get probabilities
    const probabilities = await prediction.data();
    
    // Get predicted class
    const predictedClass = await prediction.argMax(1).data();
    const regimes = ['trending', 'ranging', 'volatile'] as const;
    const regime = regimes[predictedClass[0]];
    
    // Get confidence (probability of predicted class)
    const confidence = probabilities[predictedClass[0]];
    
    return {
      regime,
      probabilities: {
        trending: probabilities[0],
        ranging: probabilities[1],
        volatile: probabilities[2],
      },
      confidence,
    };
  }
}