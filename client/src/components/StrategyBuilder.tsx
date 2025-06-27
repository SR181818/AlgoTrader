import React, { useState } from 'react';
import { StrategyConfig, StrategyRule } from '../trading/StrategyRunner';
import { useStrategyConfig } from '../hooks/useStrategyRunner';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Play, 
  Pause, 
  Save, 
  RotateCcw,
  TrendingUp,
  Filter,
  Target,
  AlertTriangle
} from 'lucide-react';

interface StrategyBuilderProps {
  initialStrategy?: StrategyConfig;
  onSave?: (strategy: StrategyConfig) => void;
  onTest?: (strategy: StrategyConfig) => void;
}

export function StrategyBuilder({ initialStrategy, onSave, onTest }: StrategyBuilderProps) {
  const {
    config,
    isDirty,
    updateConfig,
    updateRule,
    addRule,
    removeRule,
    resetConfig,
    markClean
  } = useStrategyConfig(initialStrategy);

  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'filters' | 'risk'>('general');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  if (!config) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400">
          <Settings size={48} className="mx-auto mb-4 opacity-50" />
          <div className="text-lg mb-2">No Strategy Loaded</div>
          <div className="text-sm">Load or create a strategy to begin</div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (onSave && config) {
      onSave(config);
      markClean();
    }
  };

  const handleTest = () => {
    if (onTest && config) {
      onTest(config);
    }
  };

  const getRuleIcon = (category: string) => {
    switch (category) {
      case 'entry': return <TrendingUp size={16} className="text-green-400" />;
      case 'exit': return <Target size={16} className="text-red-400" />;
      case 'filter': return <Filter size={16} className="text-blue-400" />;
      default: return <Settings size={16} className="text-gray-400" />;
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Strategy Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => updateConfig({ name: e.target.value })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Version</label>
          <input
            type="text"
            value={config.version}
            onChange={(e) => updateConfig({ version: e.target.value })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Description</label>
        <textarea
          value={config.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          rows={3}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Min Confidence</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.minConfidence}
            onChange={(e) => updateConfig({ minConfidence: parseFloat(e.target.value) })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Max Signals/Hour</label>
          <input
            type="number"
            min="1"
            max="100"
            value={config.maxSignalsPerHour}
            onChange={(e) => updateConfig({ maxSignalsPerHour: parseInt(e.target.value) })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Risk:Reward Ratio</label>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={config.riskRewardRatio}
            onChange={(e) => updateConfig({ riskRewardRatio: parseFloat(e.target.value) })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
        </div>
      </div>
    </div>
  );

  const renderRulesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Strategy Rules</h3>
        <button
          onClick={() => {
            const newRule: StrategyRule = {
              id: `rule_${Date.now()}`,
              name: 'New Rule',
              description: 'Custom rule description',
              weight: 0.5,
              category: 'entry',
              enabled: true,
              evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: 'Not implemented' })
            };
            addRule(newRule);
          }}
          className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Add Rule
        </button>
      </div>

      <div className="space-y-2">
        {config.rules.map((rule) => (
          <div key={rule.id} className="bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRuleIcon(rule.category)}
                  <div>
                    <div className="text-white font-medium">{rule.name}</div>
                    <div className="text-xs text-gray-400">{rule.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-400">
                    Weight: {(rule.weight * 100).toFixed(0)}%
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">Enabled</span>
                  </label>
                  <button
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedRule === rule.id && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                        className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Category</label>
                      <select
                        value={rule.category}
                        onChange={(e) => updateRule(rule.id, { category: e.target.value })}
                        className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="entry">Entry</option>
                        <option value="exit">Exit</option>
                        <option value="filter">Filter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Weight</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={rule.weight}
                        onChange={(e) => updateRule(rule.id, { weight: parseFloat(e.target.value) })}
                        className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea
                      value={rule.description}
                      onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                      rows={2}
                      className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFiltersTab = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-medium mb-3">Trading Filters</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Time Filters</label>
            <div className="space-y-2">
              {config.filters.timeFilters.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => {
                      const newFilters = [...config.filters.timeFilters];
                      newFilters[index] = e.target.value;
                      updateConfig({ 
                        filters: { ...config.filters, timeFilters: newFilters }
                      });
                    }}
                    placeholder="09:00-17:00"
                    className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                  <button
                    onClick={() => {
                      const newFilters = config.filters.timeFilters.filter((_, i) => i !== index);
                      updateConfig({ 
                        filters: { ...config.filters, timeFilters: newFilters }
                      });
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  updateConfig({ 
                    filters: { 
                      ...config.filters, 
                      timeFilters: [...config.filters.timeFilters, '09:00-17:00']
                    }
                  });
                }}
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                <Plus size={16} className="mr-1" />
                Add Time Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.filters.volatilityFilter}
                onChange={(e) => updateConfig({ 
                  filters: { ...config.filters, volatilityFilter: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-white">Volatility Filter</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.filters.trendFilter}
                onChange={(e) => updateConfig({ 
                  filters: { ...config.filters, trendFilter: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-white">Trend Filter</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.filters.volumeFilter}
                onChange={(e) => updateConfig({ 
                  filters: { ...config.filters, volumeFilter: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-white">Volume Filter</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-medium mb-3">Risk Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Stop Loss Method</label>
            <select
              value={config.stopLossMethod}
              onChange={(e) => updateConfig({ stopLossMethod: e.target.value as any })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="atr">ATR-based</option>
              <option value="percentage">Percentage</option>
              <option value="support_resistance">Support/Resistance</option>
              <option value="dynamic">Dynamic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Take Profit Method</label>
            <select
              value={config.takeProfitMethod}
              onChange={(e) => updateConfig({ takeProfitMethod: e.target.value as any })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="fixed_ratio">Fixed Ratio</option>
              <option value="trailing">Trailing</option>
              <option value="resistance">Resistance Level</option>
              <option value="dynamic">Dynamic</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(config.parameters).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => updateConfig({
                    parameters: {
                      ...config.parameters,
                      [key]: parseFloat(e.target.value) || 0
                    }
                  })}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="text-blue-400 mr-2" size={20} />
            <h2 className="text-lg font-semibold text-white">Strategy Builder</h2>
            {isDirty && (
              <div className="ml-3 flex items-center text-yellow-400 text-sm">
                <AlertTriangle size={14} className="mr-1" />
                Unsaved changes
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={resetConfig}
              disabled={!isDirty}
              className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded text-white transition-colors"
            >
              <RotateCcw size={16} className="mr-1" />
              Reset
            </button>
            <button
              onClick={handleTest}
              className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
            >
              <Play size={16} className="mr-1" />
              Test
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-white transition-colors"
            >
              <Save size={16} className="mr-1" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex space-x-0">
          {[
            { id: 'general', name: 'General', icon: Settings },
            { id: 'rules', name: 'Rules', icon: TrendingUp },
            { id: 'filters', name: 'Filters', icon: Filter },
            { id: 'risk', name: 'Risk', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-gray-700/50'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon size={16} className="mr-2" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'rules' && renderRulesTab()}
        {activeTab === 'filters' && renderFiltersTab()}
        {activeTab === 'risk' && renderRiskTab()}
      </div>
    </div>
  );
}