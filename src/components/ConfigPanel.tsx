import React, { useState } from 'react';
import { TradingConfig } from '../types/trading';
import { DEFAULT_CONFIG } from '../data/tradingPairs';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface ConfigPanelProps {
  config: TradingConfig;
  onConfigChange: (config: TradingConfig) => void;
}

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onConfigChange(localConfig);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG as TradingConfig);
  };

  const updateIndicatorConfig = (indicator: string, field: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      indicators: {
        ...prev.indicators,
        [indicator]: typeof prev.indicators[indicator as keyof typeof prev.indicators] === 'object'
          ? { ...prev.indicators[indicator as keyof typeof prev.indicators], [field]: value }
          : value
      }
    }));
  };

  const updateRiskConfig = (field: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      risk: {
        ...prev.risk,
        [field]: value
      }
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
      >
        <Settings size={16} className="mr-2" />
        Strategy Config
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Strategy Configuration</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Indicator Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Technical Indicators</h3>
            
            {/* Bollinger Bands */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-3">Bollinger Bands</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.BB.period}
                    onChange={(e) => updateIndicatorConfig('BB', 'period', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Standard Deviation</label>
                  <input
                    type="number"
                    step="0.1"
                    value={localConfig.indicators.BB.stddev}
                    onChange={(e) => updateIndicatorConfig('BB', 'stddev', parseFloat(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* MACD */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-3">MACD</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Fast Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.MACD.fast}
                    onChange={(e) => updateIndicatorConfig('MACD', 'fast', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Slow Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.MACD.slow}
                    onChange={(e) => updateIndicatorConfig('MACD', 'slow', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Signal Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.MACD.signal}
                    onChange={(e) => updateIndicatorConfig('MACD', 'signal', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Other Indicators */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-3">Other Indicators</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">RSI Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.RSI}
                    onChange={(e) => updateIndicatorConfig('RSI', '', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">ATR Period</label>
                  <input
                    type="number"
                    value={localConfig.indicators.ATR}
                    onChange={(e) => updateIndicatorConfig('ATR', '', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={localConfig.indicators.Klinger}
                    onChange={(e) => updateIndicatorConfig('Klinger', '', e.target.checked)}
                    className="mr-2"
                  />
                  Enable Klinger Oscillator
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={localConfig.indicators.SAR}
                    onChange={(e) => updateIndicatorConfig('SAR', '', e.target.checked)}
                    className="mr-2"
                  />
                  Enable Parabolic SAR
                </label>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Risk Management</h3>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Trade Size ($)</label>
                  <input
                    type="number"
                    value={localConfig.risk.trade_size}
                    onChange={(e) => updateRiskConfig('trade_size', parseFloat(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Stop Loss (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={localConfig.risk.stop_loss_pct}
                    onChange={(e) => updateRiskConfig('stop_loss_pct', parseFloat(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max Hold (Candles)</label>
                  <input
                    type="number"
                    value={localConfig.risk.max_hold_candles}
                    onChange={(e) => updateRiskConfig('max_hold_candles', parseInt(e.target.value))}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={localConfig.risk.trailing_sl_after_tp1}
                      onChange={(e) => updateRiskConfig('trailing_sl_after_tp1', e.target.checked)}
                      className="mr-2"
                    />
                    Trailing SL after TP1
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset to Default
          </button>
          
          <div className="space-x-3">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              <Save size={16} className="mr-2" />
              Save Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}