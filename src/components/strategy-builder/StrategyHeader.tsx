import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookTemplate, 
  Save, 
  Settings, 
  Share2, 
  Play, 
  Download, 
  Upload, 
  BarChart3 
} from 'lucide-react';

interface StrategyHeaderProps {
  strategyName: string;
  onSave: () => void;
  onShowTemplates: () => void;
  onShowSettings: () => void;
}

export function StrategyHeader({ 
  strategyName, 
  onSave, 
  onShowTemplates, 
  onShowSettings 
}: StrategyHeaderProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            className="p-2 bg-blue-600 rounded-lg mr-3"
          >
            <BarChart3 size={24} />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold">Strategy Builder</h1>
            <p className="text-sm text-gray-400">
              {strategyName || "Untitled Strategy"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onShowTemplates}
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <BookTemplate size={16} className="mr-2" />
            Templates
          </button>
          
          <button
            onClick={onShowSettings}
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Settings size={16} className="mr-2" />
            Settings
          </button>
          
          <button
            onClick={onSave}
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
          
          <div className="relative group">
            <button
              className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              <Share2 size={16} className="mr-2" />
              Share
            </button>
          </div>
          
          <div className="relative group">
            <button
              className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              Test Strategy
            </button>
          </div>
          
          <div className="relative group">
            <button
              className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              <Download size={16} />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center">
                <Download size={14} className="mr-2" />
                Export Strategy
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center">
                <Upload size={14} className="mr-2" />
                Import Strategy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}