import React, { useState, useEffect } from 'react';
import { CandleData } from '../types/trading';
import { TechnicalIndicatorService, IndicatorResult } from '../services/TechnicalIndicatorService';
import { Plus, X, Settings, TrendingUp, Activity, Volume2, BarChart3, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface CustomIndicatorSelectorProps {
  candles: CandleData[];
  symbol: string;
  onIndicatorAdd?: (indicator: IndicatorResult) => void;
}

interface SelectedIndicator {
  id: string;
  name: string;
  displayName: string;
  parameters: { [key: string]: any };
  result?: IndicatorResult;
}

export function CustomIndicatorSelector({ candles, symbol, onIndicatorAdd }: CustomIndicatorSelectorProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<SelectedIndicator[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [availableIndicators, setAvailableIndicators] = useState<any[]>([]);

  const categories = [
    { id: 'all', name: 'All Indicators', icon: Activity },
    { id: 'trend', name: 'Trend', icon: TrendingUp },
    { id: 'momentum', name: 'Momentum', icon: Activity },
    { id: 'volume', name: 'Volume', icon: Volume2 },
    { id: 'volatility', name: 'Volatility', icon: BarChart3 },
    { id: 'overlap', name: 'Overlap Studies', icon: Layers }
  ];

  // Initialize available indicators
  useEffect(() => {
    // This would typically come from the TechnicalIndicatorService
    // For now, we'll define some common indicators
    const indicators = [
      {
        name: 'SMA',
        displayName: 'Simple Moving Average',
        category: 'trend',
        description: 'Simple Moving Average - smooths price data to identify trend direction',
        parameters: {
          period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
        },
        requiredInputs: ['close']
      },
      {
        name: 'EMA',
        displayName: 'Exponential Moving Average',
        category: 'trend',
        description: 'Exponential Moving Average - gives more weight to recent prices',
        parameters: {
          period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
        },
        requiredInputs: ['close']
      },
      {
        name: 'RSI',
        displayName: 'Relative Strength Index',
        category: 'momentum',
        description: 'Measures the speed and magnitude of price changes',
        parameters: {
          period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
        },
        requiredInputs: ['close']
      },
      {
        name: 'MACD',
        displayName: 'MACD',
        category: 'trend',
        description: 'Moving Average Convergence Divergence - trend following momentum indicator',
        parameters: {
          fastPeriod: { name: 'Fast Period', type: 'number', default: 12, min: 2, max: 100 },
          slowPeriod: { name: 'Slow Period', type: 'number', default: 26, min: 2, max: 100 },
          signalPeriod: { name: 'Signal Period', type: 'number', default: 9, min: 2, max: 50 }
        },
        requiredInputs: ['close']
      },
      {
        name: 'BollingerBands',
        displayName: 'Bollinger Bands',
        category: 'volatility',
        description: 'Volatility bands placed above and below moving average',
        parameters: {
          period: { name: 'Period', type: 'number', default: 20, min: 2, max: 100 },
          stdDev: { name: 'Standard Deviation', type: 'number', default: 2, min: 0.1, max: 5 }
        },
        requiredInputs: ['close']
      },
      {
        name: 'ATR',
        displayName: 'Average True Range',
        category: 'volatility',
        description: 'Measures market volatility',
        parameters: {
          period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
        },
        requiredInputs: ['high', 'low', 'close']
      },
      {
        name: 'OBV',
        displayName: 'On Balance Volume',
        category: 'volume',
        description: 'Relates volume to price change',
        parameters: {},
        requiredInputs: ['close', 'volume']
      },
      {
        name: 'ADX',
        displayName: 'Average Directional Index',
        category: 'trend',
        description: 'Measures the strength of a trend regardless of direction',
        parameters: {
          period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
        },
        requiredInputs: ['high', 'low', 'close']
      },
      {
        name: 'Ichimoku',
        displayName: 'Ichimoku Cloud',
        category: 'trend',
        description: 'Japanese charting technique that provides more data points than traditional candlestick charts',
        parameters: {
          conversionPeriod: { name: 'Conversion Period', type: 'number', default: 9, min: 2, max: 100 },
          basePeriod: { name: 'Base Period', type: 'number', default: 26, min: 2, max: 100 },
          spanPeriod: { name: 'Span Period', type: 'number', default: 52, min: 2, max: 100 },
          displacement: { name: 'Displacement', type: 'number', default: 26, min: 2, max: 100 }
        },
        requiredInputs: ['high', 'low']
      },
      {
        name: 'PSAR',
        displayName: 'Parabolic SAR',
        category: 'trend',
        description: 'Parabolic Stop and Reverse - trend following indicator',
        parameters: {
          step: { name: 'Step', type: 'number', default: 0.02, min: 0.01, max: 0.1 },
          max: { name: 'Maximum', type: 'number', default: 0.2, min: 0.1, max: 1.0 }
        },
        requiredInputs: ['high', 'low']
      }
    ];
    
    setAvailableIndicators(indicators);
  }, []);

  // Filter indicators based on search and category
  const filteredIndicators = availableIndicators.filter(indicator => {
    const matchesCategory = selectedCategory === 'all' || indicator.category === selectedCategory;
    const matchesSearch = indicator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         indicator.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate indicators when candles change
  useEffect(() => {
    if (candles.length < 50) return;

    const updatedIndicators = selectedIndicators.map(indicator => {
      const result = TechnicalIndicatorService.calculateIndicator(
        indicator.name,
        candles,
        indicator.parameters
      );
      
      if (result && onIndicatorAdd) {
        onIndicatorAdd(result);
      }

      return {
        ...indicator,
        result
      };
    });

    setSelectedIndicators(updatedIndicators);
  }, [candles, onIndicatorAdd]);

  const addIndicator = (indicator: any) => {
    const defaultParams: { [key: string]: any } = {};
    Object.entries(indicator.parameters).forEach(([key, param]: [string, any]) => {
      defaultParams[key] = param.default;
    });

    const newIndicator: SelectedIndicator = {
      id: `${indicator.name}_${Date.now()}`,
      name: indicator.name,
      displayName: indicator.displayName,
      parameters: defaultParams
    };

    setSelectedIndicators(prev => [...prev, newIndicator]);
    setShowAddDialog(false);

    // Calculate immediately if we have enough data
    if (candles.length >= 50) {
      const result = TechnicalIndicatorService.calculateIndicator(indicator.name, candles, defaultParams);
      if (result && onIndicatorAdd) {
        onIndicatorAdd(result);
      }
    }
  };

  const removeIndicator = (id: string) => {
    setSelectedIndicators(prev => prev.filter(indicator => indicator.id !== id));
  };

  const updateIndicatorParameters = (id: string, newParameters: { [key: string]: any }) => {
    setSelectedIndicators(prev => prev.map(indicator => {
      if (indicator.id === id) {
        const updated = { ...indicator, parameters: newParameters };
        
        // Recalculate with new parameters
        if (candles.length >= 50) {
          const result = TechnicalIndicatorService.calculateIndicator(
            indicator.name,
            candles,
            newParameters
          );
          updated.result = result;
          
          if (result && onIndicatorAdd) {
            onIndicatorAdd(result);
          }
        }
        
        return updated;
      }
      return indicator;
    }));
  };

  const renderParameterInput = (
    indicatorId: string,
    paramKey: string,
    param: any,
    currentValue: any
  ) => {
    const handleChange = (value: any) => {
      const indicator = selectedIndicators.find(ind => ind.id === indicatorId);
      if (indicator) {
        updateIndicatorParameters(indicatorId, {
          ...indicator.parameters,
          [paramKey]: value
        });
      }
    };

    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.min && param.min < 1 ? 0.01 : 1}
            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={currentValue}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4"
          />
        );
      case 'string':
        if (param.options) {
          return (
            <select
              value={currentValue}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
            >
              {param.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
          />
        );
      default:
        return null;
    }
  };

  const renderIndicatorResult = (indicator: SelectedIndicator) => {
    if (!indicator.result) return null;

    const { result } = indicator;
    const latest = Array.isArray(result.values) 
      ? result.values[result.values.length - 1]
      : result.values;

    if (typeof latest === 'object' && latest !== null) {
      // Multi-value indicator (like MACD, Bollinger Bands)
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(latest).map(([key, value]) => (
            <div key={key}>
              <span className="text-gray-400 capitalize">{key}:</span>
              <span className="text-white font-mono ml-1">
                {typeof value === 'number' ? value.toFixed(4) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    } else {
      // Single value indicator
      return (
        <div className="text-white font-mono text-sm">
          {typeof latest === 'number' ? latest.toFixed(4) : 'N/A'}
        </div>
      );
    }
  };

  const getSignalColor = (signals?: ('buy' | 'sell' | 'neutral')[]) => {
    if (!signals || signals.length === 0) return 'text-gray-400';
    const latest = signals[signals.length - 1];
    switch (latest) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSignalText = (signals?: ('buy' | 'sell' | 'neutral')[]) => {
    if (!signals || signals.length === 0) return 'NEUTRAL';
    const latest = signals[signals.length - 1];
    return latest.toUpperCase();
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="text-blue-400 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-white">Custom TA-Lib Indicators</h3>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Add Indicator
          </button>
        </div>
        
        {selectedIndicators.length > 0 && (
          <div className="mt-2 text-sm text-gray-400">
            {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''} active
          </div>
        )}
      </div>

      {/* Selected Indicators */}
      <div className="p-4">
        {selectedIndicators.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-lg mb-2">No Custom Indicators Selected</div>
            <div className="text-sm">Click "Add Indicator" to start using TA-Lib indicators</div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedIndicators.map(indicator => (
              <div key={indicator.id} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <h4 className="text-white font-medium">{indicator.displayName}</h4>
                    <span className="ml-2 text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      {indicator.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {indicator.result?.signals && (
                      <div className={`text-xs font-bold ${getSignalColor(indicator.result.signals)}`}>
                        {getSignalText(indicator.result.signals)}
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedIndicator(
                        expandedIndicator === indicator.id ? null : indicator.id
                      )}
                      className="text-gray-400 hover:text-white"
                    >
                      {expandedIndicator === indicator.id ? 
                        <ChevronUp size={16} /> : <ChevronDown size={16} />
                      }
                    </button>
                    <button
                      onClick={() => removeIndicator(indicator.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Current Values */}
                <div className="mb-2">
                  {renderIndicatorResult(indicator)}
                </div>

                {/* Expanded Configuration */}
                {expandedIndicator === indicator.id && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="text-sm text-gray-400 mb-2">Parameters</div>
                    
                    {Object.entries(indicator.parameters).length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(indicator.parameters).map(([paramKey, paramValue]) => {
                          const indicatorDef = availableIndicators.find(i => i.name === indicator.name);
                          if (!indicatorDef) return null;
                          
                          const paramDef = indicatorDef.parameters[paramKey];
                          if (!paramDef) return null;
                          
                          return (
                            <div key={paramKey}>
                              <label className="block text-xs text-gray-400 mb-1">
                                {paramDef.name}
                              </label>
                              {renderParameterInput(
                                indicator.id,
                                paramKey,
                                paramDef,
                                paramValue
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Indicator Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add TA-Lib Indicator</h2>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search and Category Filter */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 mb-3"
              />
              
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <Icon size={14} className="mr-1" />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredIndicators.map(indicator => (
                <div
                  key={indicator.name}
                  className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => addIndicator(indicator)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium text-sm">{indicator.displayName}</h4>
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      {indicator.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{indicator.description}</div>
                  <div className="text-xs text-gray-500">
                    Inputs: {indicator.requiredInputs.join(', ')}
                  </div>
                  {Object.keys(indicator.parameters).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Parameters: {Object.keys(indicator.parameters).length}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredIndicators.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No indicators found matching your criteria
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}