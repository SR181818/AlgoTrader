import { CandleData } from '../../types/trading';

/**
 * Data transformer interface
 */
export interface DataTransformer {
  transform(data: any): any;
}

/**
 * Feature extractor for candle data
 */
export class CandleFeatureExtractor implements DataTransformer {
  private features: string[];
  private windowSize: number;
  private stride: number;
  
  constructor(features: string[] = ['open', 'high', 'low', 'close', 'volume'], windowSize: number = 1, stride: number = 1) {
    this.features = features;
    this.windowSize = windowSize;
    this.stride = stride;
  }
  
  transform(candles: CandleData[]): number[][] | number[][][] {
    if (candles.length < this.windowSize) {
      throw new Error(`Not enough candles for window size ${this.windowSize}`);
    }
    
    if (this.windowSize === 1) {
      // Single candle features
      return candles.map(candle => this.extractFeatures(candle));
    } else {
      // Window of candles
      const windows = [];
      for (let i = 0; i <= candles.length - this.windowSize; i += this.stride) {
        const window = candles.slice(i, i + this.windowSize);
        windows.push(window.map(candle => this.extractFeatures(candle)));
      }
      return windows;
    }
  }
  
  private extractFeatures(candle: CandleData): number[] {
    return this.features.map(feature => {
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
  }
}

/**
 * Min-max scaler for normalizing data
 */
export class MinMaxScaler implements DataTransformer {
  private min: number[] | null = null;
  private max: number[] | null = null;
  private featureRange: [number, number];
  
  constructor(featureRange: [number, number] = [0, 1]) {
    this.featureRange = featureRange;
  }
  
  fit(data: number[][]): void {
    if (data.length === 0) {
      throw new Error('Empty dataset');
    }
    
    const numFeatures = data[0].length;
    this.min = Array(numFeatures).fill(Infinity);
    this.max = Array(numFeatures).fill(-Infinity);
    
    for (const sample of data) {
      for (let i = 0; i < numFeatures; i++) {
        this.min![i] = Math.min(this.min![i], sample[i]);
        this.max![i] = Math.max(this.max![i], sample[i]);
      }
    }
  }
  
  transform(data: number[][]): number[][] {
    if (!this.min || !this.max) {
      throw new Error('Scaler not fitted');
    }
    
    const [min, max] = this.featureRange;
    const range = max - min;
    
    return data.map(sample => {
      return sample.map((value, i) => {
        if (this.max![i] === this.min![i]) {
          return min;
        }
        return min + range * (value - this.min![i]) / (this.max![i] - this.min![i]);
      });
    });
  }
  
  fitTransform(data: number[][]): number[][] {
    this.fit(data);
    return this.transform(data);
  }
  
  inverse_transform(data: number[][]): number[][] {
    if (!this.min || !this.max) {
      throw new Error('Scaler not fitted');
    }
    
    const [min, max] = this.featureRange;
    const range = max - min;
    
    return data.map(sample => {
      return sample.map((value, i) => {
        return this.min![i] + (value - min) / range * (this.max![i] - this.min![i]);
      });
    });
  }
}

/**
 * Standard scaler for standardizing data
 */
export class StandardScaler implements DataTransformer {
  private mean: number[] | null = null;
  private std: number[] | null = null;
  
  fit(data: number[][]): void {
    if (data.length === 0) {
      throw new Error('Empty dataset');
    }
    
    const numFeatures = data[0].length;
    this.mean = Array(numFeatures).fill(0);
    this.std = Array(numFeatures).fill(0);
    
    // Calculate mean
    for (const sample of data) {
      for (let i = 0; i < numFeatures; i++) {
        this.mean[i] += sample[i];
      }
    }
    
    for (let i = 0; i < numFeatures; i++) {
      this.mean[i] /= data.length;
    }
    
    // Calculate standard deviation
    for (const sample of data) {
      for (let i = 0; i < numFeatures; i++) {
        this.std[i] += Math.pow(sample[i] - this.mean[i], 2);
      }
    }
    
    for (let i = 0; i < numFeatures; i++) {
      this.std[i] = Math.sqrt(this.std[i] / data.length);
      // Avoid division by zero
      if (this.std[i] === 0) {
        this.std[i] = 1;
      }
    }
  }
  
  transform(data: number[][]): number[][] {
    if (!this.mean || !this.std) {
      throw new Error('Scaler not fitted');
    }
    
    return data.map(sample => {
      return sample.map((value, i) => {
        return (value - this.mean![i]) / this.std![i];
      });
    });
  }
  
  fitTransform(data: number[][]): number[][] {
    this.fit(data);
    return this.transform(data);
  }
  
  inverse_transform(data: number[][]): number[][] {
    if (!this.mean || !this.std) {
      throw new Error('Scaler not fitted');
    }
    
    return data.map(sample => {
      return sample.map((value, i) => {
        return value * this.std![i] + this.mean![i];
      });
    });
  }
}

/**
 * Data pipeline for preprocessing and feature engineering
 */
export class DataPipeline {
  private steps: DataTransformer[] = [];
  
  constructor(steps: DataTransformer[] = []) {
    this.steps = steps;
  }
  
  addStep(transformer: DataTransformer): void {
    this.steps.push(transformer);
  }
  
  transform(data: any): any {
    let result = data;
    for (const step of this.steps) {
      result = step.transform(result);
    }
    return result;
  }
  
  fit(data: any): void {
    let currentData = data;
    for (const step of this.steps) {
      if ('fit' in step && typeof (step as any).fit === 'function') {
        (step as any).fit(currentData);
      }
      currentData = step.transform(currentData);
    }
  }
  
  fitTransform(data: any): any {
    let result = data;
    for (const step of this.steps) {
      if ('fitTransform' in step && typeof (step as any).fitTransform === 'function') {
        result = (step as any).fitTransform(result);
      } else {
        if ('fit' in step && typeof (step as any).fit === 'function') {
          (step as any).fit(result);
        }
        result = step.transform(result);
      }
    }
    return result;
  }
}