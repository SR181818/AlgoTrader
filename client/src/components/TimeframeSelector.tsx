import React from 'react';
import { TimeframeConfig } from '../types/trading';
import { TIMEFRAMES } from '../data/tradingPairs';
import { Clock } from 'lucide-react';

interface TimeframeSelectorProps {
  selectedTimeframes: string[];
  onTimeframeChange: (timeframes: string[]) => void;
}

export function TimeframeSelector({ selectedTimeframes, onTimeframeChange }: TimeframeSelectorProps) {
  const handleTimeframeToggle = (timeframeId: string) => {
    if (selectedTimeframes.includes(timeframeId)) {
      // Remove timeframe if already selected
      onTimeframeChange(selectedTimeframes.filter(tf => tf !== timeframeId));
    } else {
      // Add timeframe if not selected
      onTimeframeChange([...selectedTimeframes, timeframeId]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center mb-3">
        <Clock className="text-blue-400 mr-2" size={18} />
        <h3 className="text-white font-medium">Active Timeframes</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map(timeframe => (
          <button
            key={timeframe.id}
            onClick={() => handleTimeframeToggle(timeframe.id)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              selectedTimeframes.includes(timeframe.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {timeframe.name}
          </button>
        ))}
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Selected: {selectedTimeframes.length} timeframe{selectedTimeframes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}