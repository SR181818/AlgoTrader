import React, { useState } from 'react';
import { Plus, Minus, Settings, Play, Target, TrendingUp, BarChart3 } from 'lucide-react';

export interface IndicatorConfig {
  id: string;
  type: 'RSI' | 'MACD' | 'EMA' | 'SMA' | 'Bollinger' | 'Stochastic' | 'Williams' | 'CCI';
  period: number;
  threshold?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  enabled: boolean;
}

export interface StrategyRule {
  id: string;
  type: 'entry' | 'exit';
  direction: 'long' | 'short';
  conditions: Array<{
    indicator: string;
    operator: '>' | '<' | '=' | 'cross_above' | 'cross_below';
    value: number | string;
    logicalOperator?: 'AND' | 'OR';
  }>;
  enabled: boolean;
}

export interface CustomStrategy {
  name: string;
  description: string;
  indicators: IndicatorConfig[];
  rules: StrategyRule[];
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    maxDrawdown: number;
  };
}

interface StrategyBuilderProps {
  strategy: CustomStrategy;
  onStrategyChange: (strategy: CustomStrategy) => void;
  onTestStrategy: () => void;
  isRunning: boolean;
}

export function StrategyBuilder({ strategy, onStrategyChange, onTestStrategy, isRunning }: StrategyBuilderProps) {
  const [activeTab, setActiveTab] = useState<'indicators' | 'rules' | 'risk'>('indicators');

  const indicatorTypes = [
    { type: 'RSI', name: 'Relative Strength Index', description: 'Momentum oscillator (0-100)' },
    { type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence' },
    { type: 'EMA', name: 'Exponential Moving Average', description: 'Weighted moving average' },
    { type: 'SMA', name: 'Simple Moving Average', description: 'Basic moving average' },
    { type: 'Bollinger', name: 'Bollinger Bands', description: 'Price volatility bands' },
    { type: 'Stochastic', name: 'Stochastic Oscillator', description: 'Momentum indicator' },
    { type: 'Williams', name: 'Williams %R', description: 'Momentum indicator' },
    { type: 'CCI', name: 'Commodity Channel Index', description: 'Trend indicator' },
  ];

  const operators = [
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '=', label: 'Equal to' },
    { value: 'cross_above', label: 'Crosses above' },
    { value: 'cross_below', label: 'Crosses below' },
  ];

  const addIndicator = (type: IndicatorConfig['type']) => {
    const newIndicator: IndicatorConfig = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      type,
      period: type === 'RSI' ? 14 : type === 'MACD' ? 12 : 20,
      threshold: type === 'RSI' ? 70 : undefined,
      fastPeriod: type === 'MACD' ? 12 : undefined,
      slowPeriod: type === 'MACD' ? 26 : undefined,
      signalPeriod: type === 'MACD' ? 9 : undefined,
      enabled: true,
    };

    onStrategyChange({
      ...strategy,
      indicators: [...strategy.indicators, newIndicator],
    });
  };

  const updateIndicator = (id: string, updates: Partial<IndicatorConfig>) => {
    onStrategyChange({
      ...strategy,
      indicators: strategy.indicators.map(ind => 
        ind.id === id ? { ...ind, ...updates } : ind
      ),
    });
  };

  const removeIndicator = (id: string) => {
    onStrategyChange({
      ...strategy,
      indicators: strategy.indicators.filter(ind => ind.id !== id),
      rules: strategy.rules.map(rule => ({
        ...rule,
        conditions: rule.conditions.filter(cond => cond.indicator !== id),
      })),
    });
  };

  const addRule = (type: 'entry' | 'exit', direction: 'long' | 'short') => {
    const newRule: StrategyRule = {
      id: `${type}_${direction}_${Date.now()}`,
      type,
      direction,
      conditions: [],
      enabled: true,
    };

    onStrategyChange({
      ...strategy,
      rules: [...strategy.rules, newRule],
    });
  };

  const updateRule = (id: string, updates: Partial<StrategyRule>) => {
    onStrategyChange({
      ...strategy,
      rules: strategy.rules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      ),
    });
  };

  const removeRule = (id: string) => {
    onStrategyChange({
      ...strategy,
      rules: strategy.rules.filter(rule => rule.id !== id),
    });
  };

  const addCondition = (ruleId: string) => {
    const firstIndicator = strategy.indicators[0];
    if (!firstIndicator) return;

    const newCondition = {
      indicator: firstIndicator.id,
      operator: '>' as const,
      value: firstIndicator.type === 'RSI' ? 70 : 0,
    };

    onStrategyChange({
      ...strategy,
      rules: strategy.rules.map(rule => 
        rule.id === ruleId 
          ? { ...rule, conditions: [...rule.conditions, newCondition] }
          : rule
      ),
    });
  };

  const updateCondition = (ruleId: string, conditionIndex: number, updates: any) => {
    onStrategyChange({
      ...strategy,
      rules: strategy.rules.map(rule => 
        rule.id === ruleId 
          ? {
              ...rule,
              conditions: rule.conditions.map((cond, index) => 
                index === conditionIndex ? { ...cond, ...updates } : cond
              ),
            }
          : rule
      ),
    });
  };

  const removeCondition = (ruleId: string, conditionIndex: number) => {
    onStrategyChange({
      ...strategy,
      rules: strategy.rules.map(rule => 
        rule.id === ruleId 
          ? {
              ...rule,
              conditions: rule.conditions.filter((_, index) => index !== conditionIndex),
            }
          : rule
      ),
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Strategy Builder</h2>
            <p className="text-gray-400 text-sm">Create and customize your trading strategy</p>
          </div>
          <button
            onClick={onTestStrategy}
            disabled={isRunning || strategy.indicators.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <Play size={16} className="mr-2" />
            {isRunning ? 'Testing...' : 'Test Strategy'}
          </button>
        </div>

        {/* Strategy Info */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Strategy Name</label>
            <input
              type="text"
              value={strategy.name}
              onChange={(e) => onStrategyChange({ ...strategy, name: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="My Custom Strategy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={strategy.description}
              onChange={(e) => onStrategyChange({ ...strategy, description: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Strategy description..."
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'indicators', label: 'Indicators', icon: BarChart3 },
          { id: 'rules', label: 'Rules', icon: Target },
          { id: 'risk', label: 'Risk Management', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Indicators Tab */}
        {activeTab === 'indicators' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Technical Indicators</h3>
              <div className="flex space-x-2">
                {indicatorTypes.slice(0, 4).map((indType) => (
                  <button
                    key={indType.type}
                    onClick={() => addIndicator(indType.type as any)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-colors"
                  >
                    + {indType.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {strategy.indicators.map((indicator) => (
                <div key={indicator.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={indicator.enabled}
                        onChange={(e) => updateIndicator(indicator.id, { enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className="font-medium text-white">{indicator.type}</span>
                      <span className="text-sm text-gray-400">
                        {indicatorTypes.find(t => t.type === indicator.type)?.description}
                      </span>
                    </div>
                    <button
                      onClick={() => removeIndicator(indicator.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Period</label>
                      <input
                        type="number"
                        value={indicator.period}
                        onChange={(e) => updateIndicator(indicator.id, { period: parseInt(e.target.value) })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                        min="1"
                        max="200"
                      />
                    </div>

                    {indicator.type === 'RSI' && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Threshold</label>
                        <input
                          type="number"
                          value={indicator.threshold || 70}
                          onChange={(e) => updateIndicator(indicator.id, { threshold: parseFloat(e.target.value) })}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                          min="0"
                          max="100"
                        />
                      </div>
                    )}

                    {indicator.type === 'MACD' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Fast Period</label>
                          <input
                            type="number"
                            value={indicator.fastPeriod || 12}
                            onChange={(e) => updateIndicator(indicator.id, { fastPeriod: parseInt(e.target.value) })}
                            className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Slow Period</label>
                          <input
                            type="number"
                            value={indicator.slowPeriod || 26}
                            onChange={(e) => updateIndicator(indicator.id, { slowPeriod: parseInt(e.target.value) })}
                            className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {strategy.indicators.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No indicators added yet</p>
                  <p className="text-sm">Add indicators to start building your strategy</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Trading Rules</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => addRule('entry', 'long')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs"
                >
                  + Long Entry
                </button>
                <button
                  onClick={() => addRule('entry', 'short')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                >
                  + Short Entry
                </button>
                <button
                  onClick={() => addRule('exit', 'long')}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-xs"
                >
                  + Exit Rule
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {strategy.rules.map((rule) => (
                <div key={rule.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.type === 'entry' 
                          ? rule.direction === 'long' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {rule.type === 'entry' ? `${rule.direction.toUpperCase()} ENTRY` : 'EXIT'}
                      </span>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rule.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {index > 0 && (
                          <select
                            value={condition.logicalOperator || 'AND'}
                            onChange={(e) => updateCondition(rule.id, index, { logicalOperator: e.target.value })}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}

                        <select
                          value={condition.indicator}
                          onChange={(e) => updateCondition(rule.id, index, { indicator: e.target.value })}
                          className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                        >
                          {strategy.indicators.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {ind.type} ({ind.period})
                            </option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(rule.id, index, { operator: e.target.value })}
                          className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white"
                        >
                          {operators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={condition.value}
                          onChange={(e) => updateCondition(rule.id, index, { value: parseFloat(e.target.value) })}
                          className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white w-20"
                        />

                        <button
                          onClick={() => removeCondition(rule.id, index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => addCondition(rule.id)}
                      disabled={strategy.indicators.length === 0}
                      className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white text-sm"
                    >
                      <Plus size={14} className="mr-1" />
                      Add Condition
                    </button>
                  </div>
                </div>
              ))}

              {strategy.rules.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No trading rules defined</p>
                  <p className="text-sm">Add entry and exit rules to complete your strategy</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Management Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Risk Management</h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-4">Position Management</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Stop Loss (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={strategy.riskManagement.stopLoss * 100}
                      onChange={(e) => onStrategyChange({
                        ...strategy,
                        riskManagement: {
                          ...strategy.riskManagement,
                          stopLoss: parseFloat(e.target.value) / 100,
                        },
                      })}
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Take Profit (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={strategy.riskManagement.takeProfit * 100}
                      onChange={(e) => onStrategyChange({
                        ...strategy,
                        riskManagement: {
                          ...strategy.riskManagement,
                          takeProfit: parseFloat(e.target.value) / 100,
                        },
                      })}
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-4">Portfolio Limits</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Position Size (%)</label>
                    <input
                      type="number"
                      step="1"
                      value={strategy.riskManagement.positionSize * 100}
                      onChange={(e) => onStrategyChange({
                        ...strategy,
                        riskManagement: {
                          ...strategy.riskManagement,
                          positionSize: parseFloat(e.target.value) / 100,
                        },
                      })}
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Drawdown (%)</label>
                    <input
                      type="number"
                      step="1"
                      value={strategy.riskManagement.maxDrawdown * 100}
                      onChange={(e) => onStrategyChange({
                        ...strategy,
                        riskManagement: {
                          ...strategy.riskManagement,
                          maxDrawdown: parseFloat(e.target.value) / 100,
                        },
                      })}
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}