import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StrategyConfig } from '../../trading/StrategyRunner';
import { 
  X, 
  Save, 
  Settings, 
  AlertTriangle, 
  Target, 
  Clock, 
  BarChart3, 
  Filter 
} from 'lucide-react';

interface StrategySettingsProps {
  strategy: StrategyConfig;
  onClose: () => void;
  onUpdate: (updates: Partial<StrategyConfig>) => void;
}

export function StrategySettings({ strategy, onClose, onUpdate }: StrategySettingsProps) {
  const [name, setName] = useState(strategy.name);
  const [description, setDescription] = useState(strategy.description);
  const [minConfidence, setMinConfidence] = useState(strategy.minConfidence);
  const [maxSignalsPerHour, setMaxSignalsPerHour] = useState(strategy.maxSignalsPerHour);
  const [riskRewardRatio, setRiskRewardRatio] = useState(strategy.riskRewardRatio);
  const [stopLossMethod, setStopLossMethod] = useState(strategy.stopLossMethod);
  const [takeProfitMethod, setTakeProfitMethod] = useState(strategy.takeProfitMethod);
  const [timeFilters, setTimeFilters] = useState(strategy.filters.timeFilters);
  const [volatilityFilter, setVolatilityFilter] = useState(strategy.filters.volatilityFilter);
  const [trendFilter, setTrendFilter] = useState(strategy.filters.trendFilter);
  const [volumeFilter, setVolumeFilter] = useState(strategy.filters.volumeFilter);
  
  const handleSave = () => {
    onUpdate({
      name,
      description,
      minConfidence,
      maxSignalsPerHour,
      riskRewardRatio,
      stopLossMethod,
      takeProfitMethod,
      filters: {
        timeFilters,
        volatilityFilter,
        trendFilter,
        volumeFilter
      }
    });
    onClose();
  };
  
  const handleAddTimeFilter = () => {
    setTimeFilters([...timeFilters, '09:00-17:00']);
  };
  
  const handleUpdateTimeFilter = (index: number, value: string) => {
    const newFilters = [...timeFilters];
    newFilters[index] = value;
    setTimeFilters(newFilters);
  };
  
  const handleRemoveTimeFilter = (index: number) => {
    const newFilters = [...timeFilters];
    newFilters.splice(index, 1);
    setTimeFilters(newFilters);
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="text-blue-400 mr-2" size={24} />
            <h2 className="text-xl font-bold text-white">Strategy Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Strategy Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Minimum Confidence</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                    className="flex-1 mr-3"
                  />
                  <span className="text-white w-12 text-center">
                    {(minConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
          </div>
          
          {/* Signal Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="text-blue-400 mr-2" size={20} />
              Signal Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Max Signals Per Hour</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxSignalsPerHour}
                  onChange={(e) => setMaxSignalsPerHour(parseInt(e.target.value))}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Risk:Reward Ratio</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={riskRewardRatio}
                    onChange={(e) => setRiskRewardRatio(parseFloat(e.target.value))}
                    className="flex-1 mr-3"
                  />
                  <span className="text-white w-12 text-center">
                    {riskRewardRatio.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Risk Management */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="text-yellow-400 mr-2" size={20} />
              Risk Management
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Stop Loss Method</label>
                <select
                  value={stopLossMethod}
                  onChange={(e) => setStopLossMethod(e.target.value as any)}
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
                  value={takeProfitMethod}
                  onChange={(e) => setTakeProfitMethod(e.target.value as any)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                >
                  <option value="fixed_ratio">Fixed Ratio</option>
                  <option value="trailing">Trailing</option>
                  <option value="resistance">Resistance Level</option>
                  <option value="dynamic">Dynamic</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Filter className="text-purple-400 mr-2" size={20} />
              Filters
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Time Filters</label>
              <div className="space-y-2">
                {timeFilters.map((filter, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={filter}
                      onChange={(e) => handleUpdateTimeFilter(index, e.target.value)}
                      placeholder="09:00-17:00"
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                    <button
                      onClick={() => handleRemoveTimeFilter(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddTimeFilter}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Time Filter
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={volatilityFilter}
                  onChange={(e) => setVolatilityFilter(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">Volatility Filter</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={trendFilter}
                  onChange={(e) => setTrendFilter(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">Trend Filter</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={volumeFilter}
                  onChange={(e) => setVolumeFilter(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">Volume Filter</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}