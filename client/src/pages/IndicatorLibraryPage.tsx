import React, { useState, useEffect } from 'react';
import { IndicatorLibrary } from '../components/IndicatorLibrary';
import { CustomIndicatorSelector } from '../components/CustomIndicatorSelector';
import { CandleData } from '../types/trading';
import { realDataService } from '../utils/realDataService';

export default function IndicatorLibraryPage() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCandles = async () => {
      setIsLoading(true);
      try {
        const data = await realDataService.fetchOHLCV(symbol, '15m', 200);
        setCandles(data);
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandles();

    const handleDataUpdate = (update: any) => {
      if (update.type === 'candle_data') {
        setCandles(update.data);
      }
    };

    realDataService.subscribe(symbol, '15m', handleDataUpdate);

    return () => {
      realDataService.unsubscribe(symbol, '15m', handleDataUpdate);
    };
  }, [symbol]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Technical Indicator Library</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="ADA/USDT">ADA/USDT</option>
            <option value="SOL/USDT">SOL/USDT</option>
            <option value="DOT/USDT">DOT/USDT</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-lg text-gray-300">Loading indicator data...</div>
        </div>
      ) : (
        <div className="space-y-8">
          <CustomIndicatorSelector 
            candles={candles}
            symbol={symbol}
          />
          
          <IndicatorLibrary 
            candles={candles}
            symbol={symbol}
          />
        </div>
      )}
    </div>
  );
}