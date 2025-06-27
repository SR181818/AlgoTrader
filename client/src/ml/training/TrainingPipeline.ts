import { Observable, Subject } from 'rxjs';
import { MLPlugin, TrainingResult } from '../MLPlugin';

/**
 * Training pipeline configuration
 */
export interface TrainingPipelineConfig {
  id: string;
  name: string;
  description?: string;
  pluginId: string;
  dataPreprocessors: DataTransformer[];
  dataPostprocessors: DataTransformer[];
  validationSplit?: number;
  batchSize?: number;
  epochs?: number;
  learningRate?: number;
  optimizer?: string;
  loss?: string;
  metrics?: string[];
  callbacks?: any[];
  earlyStoppingPatience?: number;
  saveCheckpoints?: boolean;
  checkpointPath?: string;
}

/**
 * Data transformer for preprocessing/postprocessing
 */
export interface DataTransformer {
  id: string;
  name: string;
  transform: (data: any) => any;
}

/**
 * Training progress update
 */
export interface TrainingProgress {
  pipelineId: string;
  epoch: number;
  totalEpochs: number;
  metrics: { [key: string]: number };
  elapsedTime: number;
  estimatedTimeRemaining: number;
  status: 'running' | 'completed' | 'error';
  message?: string;
}

/**
 * Training pipeline for ML models
 */
export class TrainingPipeline {
  private config: TrainingPipelineConfig;
  private plugin: MLPlugin;
  private progressSubject = new Subject<TrainingProgress>();
  private isRunning = false;
  
  constructor(config: TrainingPipelineConfig, plugin: MLPlugin) {
    this.config = config;
    this.plugin = plugin;
    
    if (!plugin.canTrain()) {
      throw new Error(`Plugin ${plugin.name} does not support training`);
    }
  }
  
  /**
   * Get pipeline configuration
   */
  getConfig(): TrainingPipelineConfig {
    return { ...this.config };
  }
  
  /**
   * Get training progress observable
   */
  getProgress(): Observable<TrainingProgress> {
    return this.progressSubject.asObservable();
  }
  
  /**
   * Check if training is currently running
   */
  isTrainingRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Run the training pipeline
   */
  async train(data: any): Promise<TrainingResult> {
    if (this.isRunning) {
      throw new Error('Training is already running');
    }
    
    if (!this.plugin.train) {
      throw new Error(`Plugin ${this.plugin.name} does not support training`);
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      // Apply data preprocessors
      let processedData = { ...data };
      for (const preprocessor of this.config.dataPreprocessors) {
        processedData = preprocessor.transform(processedData);
      }
      
      // Prepare training options
      const trainingOptions = {
        epochs: this.config.epochs || 10,
        batchSize: this.config.batchSize || 32,
        validationSplit: this.config.validationSplit || 0.2,
        callbacks: [
          {
            onEpochBegin: (epoch: number) => {
              this.progressSubject.next({
                pipelineId: this.config.id,
                epoch,
                totalEpochs: this.config.epochs || 10,
                metrics: {},
                elapsedTime: Date.now() - startTime,
                estimatedTimeRemaining: 0, // Will be calculated after first epoch
                status: 'running'
              });
            },
            onEpochEnd: (epoch: number, logs: any) => {
              const elapsedTime = Date.now() - startTime;
              const timePerEpoch = elapsedTime / (epoch + 1);
              const remainingEpochs = (this.config.epochs || 10) - epoch - 1;
              const estimatedTimeRemaining = timePerEpoch * remainingEpochs;
              
              this.progressSubject.next({
                pipelineId: this.config.id,
                epoch: epoch + 1,
                totalEpochs: this.config.epochs || 10,
                metrics: logs,
                elapsedTime,
                estimatedTimeRemaining,
                status: 'running'
              });
            }
          },
          ...(this.config.callbacks || [])
        ]
      };
      
      // Add optimizer if specified
      if (this.config.optimizer) {
        Object.assign(trainingOptions, { optimizer: this.config.optimizer });
      }
      
      // Add learning rate if specified
      if (this.config.learningRate) {
        Object.assign(trainingOptions, { learningRate: this.config.learningRate });
      }
      
      // Add loss function if specified
      if (this.config.loss) {
        Object.assign(trainingOptions, { loss: this.config.loss });
      }
      
      // Add metrics if specified
      if (this.config.metrics) {
        Object.assign(trainingOptions, { metrics: this.config.metrics });
      }
      
      // Add early stopping if specified
      if (this.config.earlyStoppingPatience) {
        Object.assign(trainingOptions, { 
          earlyStoppingPatience: this.config.earlyStoppingPatience 
        });
      }
      
      // Run training
      const result = await this.plugin.train(processedData, trainingOptions);
      
      // Apply data postprocessors to result if needed
      let processedResult = { ...result };
      for (const postprocessor of this.config.dataPostprocessors) {
        processedResult = postprocessor.transform(processedResult);
      }
      
      // Save checkpoint if enabled
      if (this.config.saveCheckpoints && this.config.checkpointPath && 'saveModel' in this.plugin) {
        try {
          await (this.plugin as any).saveModel(this.config.checkpointPath);
        } catch (error) {
          console.error('Failed to save model checkpoint:', error);
        }
      }
      
      // Emit final progress update
      this.progressSubject.next({
        pipelineId: this.config.id,
        epoch: result.epochs,
        totalEpochs: result.epochs,
        metrics: result.metrics ? Object.fromEntries(
          Object.entries(result.metrics).map(([k, v]) => [k, v[v.length - 1]])
        ) : {},
        elapsedTime: result.elapsedTime,
        estimatedTimeRemaining: 0,
        status: 'completed'
      });
      
      return processedResult;
    } catch (error) {
      // Emit error progress update
      this.progressSubject.next({
        pipelineId: this.config.id,
        epoch: 0,
        totalEpochs: this.config.epochs || 10,
        metrics: {},
        elapsedTime: Date.now() - startTime,
        estimatedTimeRemaining: 0,
        status: 'error',
        message: (error as Error).message
      });
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Stop the training pipeline
   */
  stop(): void {
    // This would require support from the underlying plugin
    // For now, just mark as not running
    this.isRunning = false;
  }
  
  /**
   * Dispose the pipeline
   */
  dispose(): void {
    this.progressSubject.complete();
  }
}

/**
 * Registry for training pipelines
 */
export class TrainingPipelineRegistry {
  private static instance: TrainingPipelineRegistry;
  private pipelines = new Map<string, TrainingPipeline>();
  
  private constructor() {}
  
  static getInstance(): TrainingPipelineRegistry {
    if (!TrainingPipelineRegistry.instance) {
      TrainingPipelineRegistry.instance = new TrainingPipelineRegistry();
    }
    return TrainingPipelineRegistry.instance;
  }
  
  registerPipeline(pipeline: TrainingPipeline): void {
    const config = pipeline.getConfig();
    if (this.pipelines.has(config.id)) {
      throw new Error(`Pipeline with ID ${config.id} is already registered`);
    }
    this.pipelines.set(config.id, pipeline);
    console.log(`Registered training pipeline: ${config.name} (${config.id})`);
  }
  
  unregisterPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline) {
      pipeline.dispose();
      this.pipelines.delete(pipelineId);
      console.log(`Unregistered training pipeline: ${pipelineId}`);
      return true;
    }
    return false;
  }
  
  getPipeline(pipelineId: string): TrainingPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }
  
  getAllPipelines(): TrainingPipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  async disposeAll(): Promise<void> {
    for (const pipeline of this.pipelines.values()) {
      pipeline.dispose();
    }
    this.pipelines.clear();
  }
}