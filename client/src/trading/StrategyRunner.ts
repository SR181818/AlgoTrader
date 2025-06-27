import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, filter, distinctUntilChanged, debounceTime, tap } from 'rxjs/operators';
import { CandleData } from '../types/trading';
import { TALibIndicatorResult } from '../utils/talib-indicators';
import BinanceDataService from '../utils/ccxtDataService';

export type SignalType = 'LONG' | 'SHORT' | 'HOLD';
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG';

export interface IndicatorSignal {
  name: string;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  value: number | { [key: string]: number };
  timestamp: number;
  confidence?: number;
}

export interface StrategySignal {
  type: SignalType;
  strength: SignalStrength;
  confidence: number; // 0-1
  price: number;
  timestamp: number;
  reasoning: string[];
  indicators: IndicatorSignal[];
  metadata: {
    symbol: string;
    timeframe: string;
    stopLoss?: number;
    takeProfit?: number;
    riskReward?: number;
    entryConditions: string[];
    exitConditions: string[];
  };
}

export interface StrategyRule {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, importance of this rule
  category: 'entry' | 'exit' | 'filter';
  enabled: boolean;
  evaluate: (signals: IndicatorSignal[], candle: CandleData, context: StrategyContext) => RuleResult;
}

export interface RuleResult {
  signal: 'buy' | 'sell' | 'neutral';
  confidence: number; // 0-1
  reasoning: string;
  metadata?: { [key: string]: any };
}

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  previousCandles: CandleData[];
  previousSignals: StrategySignal[];
  marketCondition: 'trending' | 'ranging' | 'volatile' | 'unknown';
  sessionTime: 'asian' | 'london' | 'newyork' | 'overlap' | 'quiet';
}

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: StrategyRule[];
  requiredIndicators: string[];
  minConfidence: number; // Minimum confidence to generate signal
  maxSignalsPerHour: number;
  riskRewardRatio: number;
  stopLossMethod: 'atr' | 'percentage' | 'support_resistance' | 'dynamic';
  takeProfitMethod: 'fixed_ratio' | 'trailing' | 'resistance' | 'dynamic';
  filters: {
    timeFilters: string[]; // e.g., ['09:00-17:00']
    volatilityFilter: boolean;
    trendFilter: boolean;
    volumeFilter: boolean;
  };
  parameters: { [key: string]: any };
}

export interface StrategyPerformance {
  totalSignals: number;
  signalsByType: { [key in SignalType]: number };
  averageConfidence: number;
  lastSignalTime: number;
  signalsPerHour: number;
  successRate?: number; // If backtesting data available
}

/**
 * StrategyRunner orchestrates the execution of trading strategies, manages signals, and maintains context/state.
 *
 * @remarks
 * - Handles indicator and strategy signals
 * - Maintains context and performance metrics
 * - Supports rate limiting and history management
 */
export class StrategyRunner {
  private candleSubject = new Subject<CandleData>();
  private indicatorSignals = new Map<string, BehaviorSubject<IndicatorSignal>>();
  private strategySignals = new Subject<StrategySignal>();
  private currentStrategy: StrategyConfig | null = null;
  private context: StrategyContext;
  private performance: StrategyPerformance;

  // Signal rate limiting
  private lastSignalTime = 0;
  private signalCount = 0;
  private signalCountResetTime = Date.now();

  // Candle history for context
  private candleHistory: CandleData[] = [];
  private maxHistoryLength = 200;

  // Signal history
  private signalHistory: StrategySignal[] = [];
  private maxSignalHistory = 100;

  private dataService: BinanceDataService;

  constructor(strategy?: StrategyConfig, apiKey?: string, apiSecret?: string) {
    this.dataService = new BinanceDataService(apiKey, apiSecret);

    this.context = {
      symbol: '',
      timeframe: '',
      previousCandles: [],
      previousSignals: [],
      marketCondition: 'unknown',
      sessionTime: 'quiet'
    };

    this.performance = {
      totalSignals: 0,
      signalsByType: { LONG: 0, SHORT: 0, HOLD: 0 },
      averageConfidence: 0,
      lastSignalTime: 0,
      signalsPerHour: 0
    };

    if (strategy) {
      this.setStrategy(strategy);
    }

    this.setupSignalGeneration();
  }

  /**
   * Set the trading strategy
   */
  setStrategy(strategy: StrategyConfig): void {
    this.currentStrategy = strategy;
    this.resetPerformance();
    console.log(`Strategy set: ${strategy.name} v${strategy.version}`);
  }

  /**
   * Update with new candle data
   */
  updateCandle(candle: CandleData): void {
    // Add to history
    this.candleHistory.push(candle);
    if (this.candleHistory.length > this.maxHistoryLength) {
      this.candleHistory.shift();
    }

    // Update context
    this.updateContext(candle);

    // Emit candle update
    this.candleSubject.next(candle);
  }

  /**
   * Update indicator signal
   */
  updateIndicatorSignal(indicatorName: string, result: TALibIndicatorResult): void {
    if (!result.values) return;

    const latest = Array.isArray(result.values) 
      ? result.values[result.values.length - 1]
      : result.values;

    const signal: IndicatorSignal = {
      name: indicatorName,
      signal: result.signals?.[result.signals.length - 1] || 'neutral',
      strength: this.calculateSignalStrength(indicatorName, latest),
      value: latest,
      timestamp: Date.now(),
      confidence: this.calculateIndicatorConfidence(indicatorName, latest, result)
    };

    if (!this.indicatorSignals.has(indicatorName)) {
      this.indicatorSignals.set(indicatorName, new BehaviorSubject(signal));
    } else {
      this.indicatorSignals.get(indicatorName)!.next(signal);
    }
  }

  /**
   * Get strategy signals as observable
   */
  getStrategySignals(): Observable<StrategySignal> {
    return this.strategySignals.asObservable();
  }

  /**
   * Get current indicator signals
   */
  getCurrentIndicatorSignals(): IndicatorSignal[] {
    return Array.from(this.indicatorSignals.values()).map(subject => subject.value);
  }

  /**
   * Get strategy performance metrics
   */
  getPerformance(): StrategyPerformance {
    return { ...this.performance };
  }

  /**
   * Get current strategy configuration
   */
  getCurrentStrategy(): StrategyConfig | null {
    return this.currentStrategy ? { ...this.currentStrategy } : null;
  }

  /**
   * Update strategy parameters
   */
  updateStrategyParameters(parameters: { [key: string]: any }): void {
    if (this.currentStrategy) {
      this.currentStrategy.parameters = { ...this.currentStrategy.parameters, ...parameters };
    }
  }

  /**
   * Enable/disable specific rules
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    if (this.currentStrategy) {
      const rule = this.currentStrategy.rules.find(r => r.id === ruleId);
      if (rule) {
        rule.enabled = enabled;
      }
    }
  }

  /**
   * Setup signal generation pipeline
   */
  private setupSignalGeneration(): void {
    // Combine latest candle with all indicator signals
    combineLatest([
      this.candleSubject.asObservable(),
      ...Array.from(this.indicatorSignals.values()).map(subject => subject.asObservable())
    ]).pipe(
      filter(() => this.currentStrategy !== null),
      debounceTime(100), // Prevent excessive signal generation
      map(([candle, ...signals]) => this.evaluateStrategy(candle, signals)),
      filter(signal => signal !== null),
      distinctUntilChanged((prev, curr) => 
        prev?.type === curr?.type && 
        Math.abs(prev.confidence - curr.confidence) < 0.05
      ),
      tap(signal => this.updatePerformance(signal!))
    ).subscribe(signal => {
      if (signal && this.shouldEmitSignal(signal)) {
        this.strategySignals.next(signal);
        this.addToSignalHistory(signal);
        this.lastSignalTime = Date.now();
        this.signalCount++;
      }
    });
  }

  /**
   * Evaluate strategy rules and generate signal
   */
  private evaluateStrategy(candle: CandleData, signals: IndicatorSignal[]): StrategySignal | null {
    if (!this.currentStrategy) return null;

    // Check if we have all required indicators
    const availableIndicators = new Set(signals.map(s => s.name));
    const missingIndicators = this.currentStrategy.requiredIndicators.filter(
      name => !availableIndicators.has(name)
    );

    if (missingIndicators.length > 0) {
      console.warn(`Missing required indicators: ${missingIndicators.join(', ')}`);
      return null;
    }

    // Apply filters first
    if (!this.passesFilters(candle, signals)) {
      return null;
    }

    // Evaluate entry rules
    const entryRules = this.currentStrategy.rules.filter(r => r.category === 'entry' && r.enabled);
    const entryResults = entryRules.map(rule => ({
      rule,
      result: rule.evaluate(signals, candle, this.context),
      weightedConfidence: 0
    }));

    // Calculate weighted confidence for each direction
    const buyResults = entryResults.filter(r => r.result.signal === 'buy');
    const sellResults = entryResults.filter(r => r.result.signal === 'sell');

    buyResults.forEach(r => {
      r.weightedConfidence = r.result.confidence * r.rule.weight;
    });
    sellResults.forEach(r => {
      r.weightedConfidence = r.result.confidence * r.rule.weight;
    });

    const totalBuyWeight = buyResults.reduce((sum, r) => sum + r.rule.weight, 0);
    const totalSellWeight = sellResults.reduce((sum, r) => sum + r.rule.weight, 0);

    const buyConfidence = totalBuyWeight > 0 ? 
      buyResults.reduce((sum, r) => sum + r.weightedConfidence, 0) / totalBuyWeight : 0;
    const sellConfidence = totalSellWeight > 0 ? 
      sellResults.reduce((sum, r) => sum + r.weightedConfidence, 0) / totalSellWeight : 0;

    // Determine signal type and confidence
    let signalType: SignalType = 'HOLD';
    let confidence = 0;
    let reasoning: string[] = [];
    let entryConditions: string[] = [];

    if (buyConfidence > sellConfidence && buyConfidence >= this.currentStrategy.minConfidence) {
      signalType = 'LONG';
      confidence = buyConfidence;
      reasoning = buyResults.map(r => r.result.reasoning);
      entryConditions = buyResults.map(r => r.rule.name);
    } else if (sellConfidence > buyConfidence && sellConfidence >= this.currentStrategy.minConfidence) {
      signalType = 'SHORT';
      confidence = sellConfidence;
      reasoning = sellResults.map(r => r.result.reasoning);
      entryConditions = sellResults.map(r => r.rule.name);
    } else {
      signalType = 'HOLD';
      confidence = Math.max(buyConfidence, sellConfidence);
      reasoning = ['Insufficient confidence or conflicting signals'];
      entryConditions = [];
    }

    // Calculate strength based on confidence
    const strength = this.calculateSignalStrength('strategy', confidence);

    // Calculate stop loss and take profit
    const stopLoss = this.calculateStopLoss(candle.close, signalType, signals);
    const takeProfit = this.calculateTakeProfit(candle.close, signalType, stopLoss);
    const riskReward = takeProfit && stopLoss ? 
      Math.abs(takeProfit - candle.close) / Math.abs(stopLoss - candle.close) : undefined;

    // Get exit conditions
    const exitConditions = this.getExitConditions(signalType);

    return {
      type: signalType,
      strength,
      confidence,
      price: candle.close,
      timestamp: Date.now(),
      reasoning,
      indicators: signals,
      metadata: {
        symbol: this.context.symbol || 'UNKNOWN',
        timeframe: this.context.timeframe || '15m',
        stopLoss,
        takeProfit,
        riskReward,
        entryConditions,
        exitConditions
      }
    };
  }

  /**
   * Check if signal passes strategy filters
   */
  private passesFilters(candle: CandleData, signals: IndicatorSignal[]): boolean {
    if (!this.currentStrategy) return false;

    const filters = this.currentStrategy.filters;

    // Time filter
    if (filters.timeFilters.length > 0) {
      const currentTime = new Date(candle.timestamp);
      const timeString = currentTime.toTimeString().substring(0, 5); // HH:MM format

      const inTimeWindow = filters.timeFilters.some(timeFilter => {
        const [start, end] = timeFilter.split('-');
        return timeString >= start && timeString <= end;
      });

      if (!inTimeWindow) return false;
    }

    // Volatility filter
    if (filters.volatilityFilter) {
      const atr = signals.find(s => s.name.includes('ATR'));
      if (atr && typeof atr.value === 'number') {
        const volatilityThreshold = candle.close * 0.001; // 0.1% minimum volatility
        if (atr.value < volatilityThreshold) return false;
      }
    }

    // Trend filter
    if (filters.trendFilter) {
      if (this.context.marketCondition === 'ranging') return false;
    }

    // Volume filter
    if (filters.volumeFilter) {
      if (this.candleHistory.length >= 20) {
        const avgVolume = this.candleHistory.slice(-20)
          .reduce((sum, c) => sum + c.volume, 0) / 20;
        if (candle.volume < avgVolume * 0.8) return false; // 80% of average volume
      }
    }

    return true;
  }

  /**
   * Calculate signal strength based on confidence
   */
  private calculateSignalStrength(indicatorOrType: string, confidenceOrValue: number | any): SignalStrength {
    let confidence: number;

    if (typeof indicatorOrType === 'string' && indicatorOrType === 'strategy') {
      confidence = confidenceOrValue;
    } else if (typeof confidenceOrValue === 'number') {
      confidence = Math.min(Math.abs(confidenceOrValue) / 100, 1);
    } else {
      confidence = 0.5;
    }

    if (confidence >= 0.8) return 'STRONG';
    if (confidence >= 0.6) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Calculate indicator confidence based on historical performance
   */
  private calculateIndicatorConfidence(
    indicatorName: string, 
    value: any, 
    result: TALibIndicatorResult
  ): number {
    // Base confidence from signal strength
    let confidence = 0.5;

    // Adjust based on indicator type and value
    switch (indicatorName) {
      case 'RSI':
        if (typeof value === 'number') {
          if (value < 20 || value > 80) confidence = 0.9;
          else if (value < 30 || value > 70) confidence = 0.7;
          else confidence = 0.3;
        }
        break;
      case 'MACD':
        if (typeof value === 'object' && value.histogram !== undefined) {
          confidence = Math.min(Math.abs(value.histogram) / 10, 1);
        }
        break;
      case 'STOCH':
        if (typeof value === 'object' && value.k !== undefined) {
          if (value.k < 20 || value.k > 80) confidence = 0.8;
          else confidence = 0.4;
        }
        break;
      default:
        confidence = 0.6;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  /**
   * Calculate stop loss based on strategy method
   */
  private calculateStopLoss(price: number, signalType: SignalType, signals: IndicatorSignal[]): number | undefined {
    if (signalType === 'HOLD' || !this.currentStrategy) return undefined;

    switch (this.currentStrategy.stopLossMethod) {
      case 'atr':
        const atr = signals.find(s => s.name.includes('ATR'));
        if (atr && typeof atr.value === 'number') {
          const atrMultiplier = this.currentStrategy.parameters.atrMultiplier || 2;
          return signalType === 'LONG' ? 
            price - (atr.value * atrMultiplier) :
            price + (atr.value * atrMultiplier);
        }
        break;

      case 'percentage':
        const stopLossPercent = this.currentStrategy.parameters.stopLossPercent || 0.02;
        return signalType === 'LONG' ? 
          price * (1 - stopLossPercent) :
          price * (1 + stopLossPercent);

      case 'support_resistance':
        // Simplified support/resistance calculation
        if (this.candleHistory.length >= 20) {
          const recentCandles = this.candleHistory.slice(-20);
          if (signalType === 'LONG') {
            const support = Math.min(...recentCandles.map(c => c.low));
            return support * 0.999; // Slightly below support
          } else {
            const resistance = Math.max(...recentCandles.map(c => c.high));
            return resistance * 1.001; // Slightly above resistance
          }
        }
        break;

      case 'dynamic':
        // Dynamic stop loss based on volatility and trend
        const volatility = this.calculateVolatility();
        const dynamicPercent = Math.max(0.01, Math.min(0.05, volatility));
        return signalType === 'LONG' ? 
          price * (1 - dynamicPercent) :
          price * (1 + dynamicPercent);
    }

    // Fallback to percentage method
    const fallbackPercent = 0.02;
    return signalType === 'LONG' ? 
      price * (1 - fallbackPercent) :
      price * (1 + fallbackPercent);
  }

  /**
   * Calculate take profit based on strategy method
   */
  private calculateTakeProfit(price: number, signalType: SignalType, stopLoss?: number): number | undefined {
    if (signalType === 'HOLD' || !this.currentStrategy || !stopLoss) return undefined;

    const riskAmount = Math.abs(price - stopLoss);

    switch (this.currentStrategy.takeProfitMethod) {
      case 'fixed_ratio':
        const ratio = this.currentStrategy.riskRewardRatio;
        return signalType === 'LONG' ? 
          price + (riskAmount * ratio) :
          price - (riskAmount * ratio);

      case 'trailing':
        // Initial take profit, would be adjusted dynamically in practice
        return signalType === 'LONG' ? 
          price + (riskAmount * 1.5) :
          price - (riskAmount * 1.5);

      case 'resistance':
        if (this.candleHistory.length >= 20) {
          const recentCandles = this.candleHistory.slice(-20);
          if (signalType === 'LONG') {
            const resistance = Math.max(...recentCandles.map(c => c.high));
            return resistance * 0.999;
          } else {
            const support = Math.min(...recentCandles.map(c => c.low));
            return support * 1.001;
          }
        }
        break;

      case 'dynamic':
        const dynamicRatio = this.calculateDynamicRiskReward();
        return signalType === 'LONG' ? 
          price + (riskAmount * dynamicRatio) :
          price - (riskAmount * dynamicRatio);
    }

    // Fallback to fixed ratio
    return signalType === 'LONG' ? 
      price + (riskAmount * this.currentStrategy.riskRewardRatio) :
      price - (riskAmount * this.currentStrategy.riskRewardRatio);
  }

  /**
   * Get exit conditions for the signal type
   */
  private getExitConditions(signalType: SignalType): string[] {
    if (!this.currentStrategy || signalType === 'HOLD') return [];

    const exitRules = this.currentStrategy.rules.filter(r => r.category === 'exit' && r.enabled);
    return exitRules.map(rule => rule.name);
  }

  /**
   * Check if we should emit a signal based on rate limiting
   */
  private shouldEmitSignal(signal: StrategySignal): boolean {
    if (!this.currentStrategy) return false;

    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    // Reset signal count every hour
    if (now - this.signalCountResetTime > hourInMs) {
      this.signalCount = 0;
      this.signalCountResetTime = now;
    }

    // Check rate limit
    if (this.signalCount >= this.currentStrategy.maxSignalsPerHour) {
      return false;
    }

    // Don't emit HOLD signals too frequently
    if (signal.type === 'HOLD' && now - this.lastSignalTime < 60000) { // 1 minute
      return false;
    }

    return true;
  }

  /**
   * Update strategy context
   */
  private updateContext(candle: CandleData): void {
    this.context.previousCandles = [...this.candleHistory];
    this.context.previousSignals = [...this.signalHistory];
    this.context.marketCondition = this.detectMarketCondition();
    this.context.sessionTime = this.detectSessionTime(candle.timestamp);
  }

  /**
   * Detect market condition
   */
  private detectMarketCondition(): 'trending' | 'ranging' | 'volatile' | 'unknown' {
    if (this.candleHistory.length < 20) return 'unknown';

    const recentCandles = this.candleHistory.slice(-20);
    const prices = recentCandles.map(c => c.close);

    // Calculate trend strength
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const trendPercent = Math.abs((lastPrice - firstPrice) / firstPrice);

    // Calculate volatility
    const volatility = this.calculateVolatility();

    if (volatility > 0.03) return 'volatile'; // 3% volatility
    if (trendPercent > 0.02) return 'trending'; // 2% trend
    return 'ranging';
  }

  /**
   * Detect trading session
   */
  private detectSessionTime(timestamp: number): 'asian' | 'london' | 'newyork' | 'overlap' | 'quiet' {
    const date = new Date(timestamp);
    const utcHour = date.getUTCHours();

    // Simplified session detection (UTC hours)
    if (utcHour >= 0 && utcHour < 8) return 'asian';
    if (utcHour >= 8 && utcHour < 12) return 'overlap'; // London-Asian overlap
    if (utcHour >= 12 && utcHour < 16) return 'london';
    if (utcHour >= 16 && utcHour < 20) return 'overlap'; // London-NY overlap
    if (utcHour >= 20 && utcHour < 24) return 'newyork';
    return 'quiet';
  }

  /**
   * Calculate market volatility
   */
  private calculateVolatility(): number {
    if (this.candleHistory.length < 20) return 0;

    const recentCandles = this.candleHistory.slice(-20);
    const returns = [];

    for (let i = 1; i < recentCandles.length; i++) {
      const returnValue = (recentCandles[i].close - recentCandles[i-1].close) / recentCandles[i-1].close;
      returns.push(returnValue);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate dynamic risk-reward ratio
   */
  private calculateDynamicRiskReward(): number {
    const volatility = this.calculateVolatility();
    const baseRatio = this.currentStrategy?.riskRewardRatio || 2;

    // Adjust ratio based on volatility
    if (volatility > 0.03) return baseRatio * 0.8; // Reduce in high volatility
    if (volatility < 0.01) return baseRatio * 1.2; // Increase in low volatility
    return baseRatio;
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(signal: StrategySignal): void {
    this.performance.totalSignals++;
    this.performance.signalsByType[signal.type]++;
    this.performance.lastSignalTime = signal.timestamp;

    // Update average confidence
    const totalConfidence = this.performance.averageConfidence * (this.performance.totalSignals - 1) + signal.confidence;
    this.performance.averageConfidence = totalConfidence / this.performance.totalSignals;

    // Calculate signals per hour
    const hourInMs = 60 * 60 * 1000;
    const recentSignals = this.signalHistory.filter(s => 
      Date.now() - s.timestamp < hourInMs
    );
    this.performance.signalsPerHour = recentSignals.length;
  }

  /**
   * Add signal to history
   */
  private addToSignalHistory(signal: StrategySignal): void {
    this.signalHistory.push(signal);
    if (this.signalHistory.length > this.maxSignalHistory) {
      this.signalHistory.shift();
    }
  }

  /**
   * Reset performance metrics
   */
  private resetPerformance(): void {
    this.performance = {
      totalSignals: 0,
      signalsByType: { LONG: 0, SHORT: 0, HOLD: 0 },
      averageConfidence: 0,
      lastSignalTime: 0,
      signalsPerHour: 0
    };
    this.signalHistory = [];
  }

  /**
   * Create a default multi-indicator strategy
   */
  static createDefaultStrategy(): StrategyConfig {
    return {
      id: 'default_multi_indicator',
      name: 'Multi-Indicator Confluence Strategy',
      description: 'Advanced strategy using EMA, RSI, MACD, and Bollinger Bands with confluence requirements',
      version: '1.0.0',
      minConfidence: 0.65,
      maxSignalsPerHour: 8,
      riskRewardRatio: 2.5,
      stopLossMethod: 'atr',
      takeProfitMethod: 'fixed_ratio',
      filters: {
        timeFilters: ['09:00-17:00'], // Trading hours
        volatilityFilter: true,
        trendFilter: false,
        volumeFilter: true,
      },
      parameters: {
        atrMultiplier: 2.0,
        stopLossPercent: 0.02,
        emaFast: 20,
        emaSlow: 50,
        rsiPeriod: 14,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        bbPeriod: 20,
        bbStdDev: 2,
      },
      requiredIndicators: ['EMA_20', 'EMA_50', 'RSI', 'MACD', 'BBANDS'],
      rules: [
        {
          id: 'ema_trend_long',
          name: 'EMA Bullish Trend',
          description: 'EMA20 > EMA50 indicates bullish trend',
          weight: 0.25,
          category: 'entry',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const ema20 = signals.find(s => s.name === 'EMA_20');
            const ema50 = signals.find(s => s.name === 'EMA_50');

            if (!ema20 || !ema50) {
              return { signal: 'neutral', confidence: 0, reasoning: 'EMA data unavailable' };
            }

            let ema20Value: number, ema50Value: number;

            if (typeof ema20.value === 'number') {
              ema20Value = ema20.value;
            } else if (Array.isArray(ema20.value) && ema20.value.length > 0) {
              ema20Value = ema20.value[ema20.value.length - 1];
            } else {
              return { signal: 'neutral', confidence: 0, reasoning: 'EMA20 data invalid' };
            }

            if (typeof ema50.value === 'number') {
              ema50Value = ema50.value;
            } else if (Array.isArray(ema50.value) && ema50.value.length > 0) {
              ema50Value = ema50.value[ema50.value.length - 1];
            } else {
              return { signal: 'neutral', confidence: 0, reasoning: 'EMA50 data invalid' };
            }

            if (ema20Value > ema50Value) {
              const spread = (ema20Value - ema50Value) / ema50Value;
              const confidence = Math.min(spread * 100, 0.9);
              return { signal: 'buy', confidence, reasoning: `EMA20 (${ema20Value.toFixed(2)}) > EMA50 (${ema50Value.toFixed(2)}) - bullish trend` };
            } else if (ema20Value < ema50Value) {
              const spread = (ema50Value - ema20Value) / ema50Value;
              const confidence = Math.min(spread * 100, 0.9);
              return { signal: 'sell', confidence, reasoning: `EMA20 (${ema20Value.toFixed(2)}) < EMA50 (${ema50Value.toFixed(2)}) - bearish trend` };
            }

            return { signal: 'neutral', confidence: 0.3, reasoning: 'EMA lines too close' };
          }
        },
        {
          id: 'rsi_momentum',
          name: 'RSI Momentum',
          description: 'RSI oversold/overbought with momentum confirmation',
          weight: 0.3,
          category: 'entry',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const rsi = signals.find(s => s.name === 'RSI');

            if (!rsi || typeof rsi.value !== 'number') {
              return { signal: 'neutral', confidence: 0, reasoning: 'RSI data unavailable' };
            }

            if (rsi.value < 25) {
              return { signal: 'buy', confidence: 0.95, reasoning: `RSI extremely oversold (${rsi.value.toFixed(1)})` };
            } else if (rsi.value < 35) {
              return { signal: 'buy', confidence: 0.75, reasoning: `RSI oversold (${rsi.value.toFixed(1)})` };
            } else if (rsi.value > 75) {
              return { signal: 'sell', confidence: 0.95, reasoning: `RSI extremely overbought (${rsi.value.toFixed(1)})` };
            } else if (rsi.value > 65) {
              return { signal: 'sell', confidence: 0.75, reasoning: `RSI overbought (${rsi.value.toFixed(1)})` };
            }

            return { signal: 'neutral', confidence: 0.2, reasoning: 'RSI in neutral zone' };
          }
        },
        {
          id: 'macd_signal',
          name: 'MACD Signal Line Cross',
          description: 'MACD line crosses signal line with histogram confirmation',
          weight: 0.25,
          category: 'entry',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const macd = signals.find(s => s.name === 'MACD');

            if (!macd || typeof macd.value !== 'object' || !macd.value) {
              return { signal: 'neutral', confidence: 0, reasoning: 'MACD data unavailable' };
            }

            const macdValue = macd.value as { [key: string]: number };
            const macdLine = macdValue.MACD || macdValue.macd;
            const signalLine = macdValue.signal;
            const histogram = macdValue.histogram;

            if (macdLine && signalLine && histogram !== undefined) {
              if (macdLine > signalLine && histogram > 0) {                const strength = Math.min(Math.abs(histogram) / Math.abs(macdLine), 1);
                return { signal: 'buy', confidence: 0.6 + (strength * 0.3), reasoning: 'MACD bullish crossover with positive histogram' };
              } else if (macdLine < signalLine && histogram < 0) {
                const strength = Math.min(Math.abs(histogram) / Math.abs(macdLine), 1);
                return { signal: 'sell', confidence: 0.6 + (strength * 0.3), reasoning: 'MACD bearish crossover with negative histogram' };
              }
            }

            return { signal: 'neutral', confidence: 0.3, reasoning: 'MACD signals mixed' };
          }
        },
        {
          id: 'bollinger_bands',
          name: 'Bollinger Bands Mean Reversion',
          description: 'Price touches Bollinger Bands for mean reversion entries',
          weight: 0.2,
          category: 'entry',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const bb = signals.find(s => s.name === 'BBANDS');

            if (!bb || typeof bb.value !== 'object' || !bb.value) {
              return { signal: 'neutral', confidence: 0, reasoning: 'Bollinger Bands data unavailable' };
            }

            const bbValue = bb.value as { [key: string]: number };
            const upper = bbValue.upper;
            const lower = bbValue.lower;
            const middle = bbValue.middle;
            const currentPrice = candle.close;

            if (upper && lower && middle) {
              const bandWidth = (upper - lower) / middle;

              // Only trade when bands are not too wide (avoid trending markets)
              if (bandWidth < 0.04) { // 4% band width
                if (currentPrice <= lower * 1.001) { // Price at or below lower band
                  return { signal: 'buy', confidence: 0.8, reasoning: 'Price at lower Bollinger Band - mean reversion opportunity' };
                } else if (currentPrice >= upper * 0.999) { // Price at or above upper band
                  return { signal: 'sell', confidence: 0.8, reasoning: 'Price at upper Bollinger Band - mean reversion opportunity' };
                }
              }
            }

            return { signal: 'neutral', confidence: 0.2, reasoning: 'Price not at Bollinger Band extremes' };
          }
        },
        {
          id: 'volume_confirmation',
          name: 'Volume Confirmation',
          description: 'Volume confirms the price movement',
          weight: 0.15,
          category: 'filter',
          enabled: true,
          evaluate: (signals, candle, context) => {
            if (context.previousCandles.length < 10) {
              return { signal: 'neutral', confidence: 0.5, reasoning: 'Insufficient volume history' };
            }

            const avgVolume = context.previousCandles.slice(-10)
              .reduce((sum, c) => sum + c.volume, 0) / 10;

            const volumeRatio = candle.volume / avgVolume;

            if (volumeRatio > 1.5) {
              return { signal: 'buy', confidence: 0.7, reasoning: `High volume confirmation (${volumeRatio.toFixed(1)}x average)` };
            } else if (volumeRatio > 1.2) {
              return { signal: 'buy', confidence: 0.5, reasoning: `Above average volume (${volumeRatio.toFixed(1)}x average)` };
            } else if (volumeRatio < 0.7) {
              return { signal: 'neutral', confidence: 0.2, reasoning: 'Low volume - weak signal' };
            }

            return { signal: 'neutral', confidence: 0.4, reasoning: 'Average volume' };
          }
        },
        {
          id: 'profit_target_exit',
          name: 'Profit Target Exit',
          description: 'Exit when profit target is reached',
          weight: 1.0,
          category: 'exit',
          enabled: true,
          evaluate: (signals, candle, context) => {
            // This would be used by position management system
            return { signal: 'neutral', confidence: 1.0, reasoning: 'Profit target monitoring' };
          }
        },
        {
          id: 'stop_loss_exit',
          name: 'Stop Loss Exit',
          description: 'Exit when stop loss is hit',
          weight: 1.0,
          category: 'exit',
          enabled: true,
          evaluate: (signals, candle, context) => {
            // This would be used by position management system
            return { signal: 'neutral', confidence: 1.0, reasoning: 'Stop loss monitoring' };
          }
        }
      ]
    };
  }

  /**
   * Create a simple trend following strategy
   */
  static createTrendFollowingStrategy(): StrategyConfig {
    return {
      id: 'trend_following',
      name: 'Trend Following Strategy',
      description: 'Simple trend following using EMA crossover with momentum confirmation',
      version: '1.0.0',
      minConfidence: 0.7,
      maxSignalsPerHour: 5,
      riskRewardRatio: 3.0,
      stopLossMethod: 'atr',
      takeProfitMethod: 'trailing',
      filters: {
        timeFilters: [],
        volatilityFilter: false,
        trendFilter: true,
        volumeFilter: false,
      },
      parameters: {
        atrMultiplier: 2.5,
        emaFast: 12,
        emaSlow: 26,
        adxThreshold: 25,
      },
      requiredIndicators: ['EMA_12', 'EMA_26', 'ADX'],
      rules: [
        {
          id: 'ema_crossover',
          name: 'EMA Crossover',
          description: 'Fast EMA crosses above/below slow EMA',
          weight: 0.6,
          category: 'entry',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const emaFast = signals.find(s => s.name === 'EMA_12');
            const emaSlow = signals.find(s => s.name === 'EMA_26');

            if (!emaFast || !emaSlow || typeof emaFast.value !== 'number' || typeof emaSlow.value !== 'number') {
              return { signal: 'neutral', confidence: 0, reasoning: 'EMA data unavailable' };
            }

            // Check for crossover by comparing with previous values
            if (context.previousCandles.length > 0) {
              const prevCandle = context.previousCandles[context.previousCandles.length - 1];
              // In a real implementation, you'd track previous EMA values
              // For now, just check current relationship

              if (emaFast.value > emaSlow.value) {
                return { signal: 'buy', confidence: 0.8, reasoning: 'Fast EMA above slow EMA - uptrend' };
              } else {
                return { signal: 'sell', confidence: 0.8, reasoning: 'Fast EMA below slow EMA - downtrend' };
              }
            }

            return { signal: 'neutral', confidence: 0, reasoning: 'Insufficient data for crossover detection' };
          }
        },
        {
          id: 'adx_trend_strength',
          name: 'ADX Trend Strength',
          description: 'ADX confirms strong trending market',
          weight: 0.4,
          category: 'filter',
          enabled: true,
          evaluate: (signals, candle, context) => {
            const adx = signals.find(s => s.name === 'ADX');

            if (!adx || typeof adx.value !== 'number') {
              return { signal: 'neutral', confidence: 0.5, reasoning: 'ADX data unavailable' };
            }

            if (adx.value > 25) {
              const strength = Math.min(adx.value / 50, 1);
              return { signal: 'buy', confidence: strength, reasoning: `Strong trend confirmed by ADX (${adx.value.toFixed(1)})` };
            }

            return { signal: 'neutral', confidence: 0.2, reasoning: 'Weak trend - ADX below threshold' };
          }
        }
      ]
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.candleSubject.complete();
    this.strategySignals.complete();
    this.indicatorSignals.forEach(subject => subject.complete());
    this.indicatorSignals.clear();
  }

  /**
   * Update candle from BinanceDataService
   */
  async updateCandleFromService(symbol: string, timeframe: string): Promise<void> {
    try {
      const candles = await this.dataService.fetchOHLCV(symbol, timeframe, 1);
      if (candles.length > 0) {
        this.updateCandle(candles[0]);
      }
    } catch (error) {
      console.error('Failed to update candle from BinanceDataService:', error);
    }
  }

  /**
   * Update market data from BinanceDataService
   */
  async updateMarketData(symbol: string): Promise<void> {
    try {
      const marketData = await this.dataService.fetchTicker(symbol);
      console.log('Market data:', marketData);
    } catch (error) {
      console.error('Failed to update market data from BinanceDataService:', error);
    }
  }

  updateIndicatorSignal(name: string, signal: any): void {
    this.indicatorSignals.set(name, signal);
    this.evaluateStrategy();
  }

  // Method to initialize required indicators
  initializeIndicators(candles: CandleData[]): void {
    if (candles.length < 50) return;

    import('../utils/technicalIndicators').then(({ generateAllIndicators }) => {
      const indicators = generateAllIndicators(candles);

      // Set all calculated indicators
      Object.entries(indicators).forEach(([name, indicator]) => {
        this.updateIndicatorSignal(name, {
          values: indicator.values,
          signals: indicator.signals
        });
      });
    }).catch(error => {
      console.warn('Failed to initialize indicators:', error);
    });
  }
}