import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StrategyRule } from '../../trading/StrategyRunner';
import { 
  Activity, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Grip, 
  Settings, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  X 
} from 'lucide-react';

interface IndicatorBlockProps {
  rule: StrategyRule;
  onUpdate: (updates: Partial<StrategyRule>) => void;
  onRemove: () => void;
  isDragging?: boolean;
}

export function IndicatorBlock({ rule, onUpdate, onRemove, isDragging = false }: IndicatorBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'entry':
        return 'bg-green-900/30 border-green-500/30 text-green-400';
      case 'filter':
        return 'bg-blue-900/30 border-blue-500/30 text-blue-400';
      case 'exit':
        return 'bg-red-900/30 border-red-500/30 text-red-400';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-300';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'entry':
        return <TrendingUp size={18} />;
      case 'filter':
        return <Filter size={18} />;
      case 'exit':
        return <TrendingDown size={18} />;
      default:
        return <Activity size={18} />;
    }
  };
  
  const blockVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9 },
    hover: { scale: isDragging ? 1.05 : 1.02 }
  };
  
  return (
    <motion.div
      variants={blockVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      className={`rounded-lg border ${getCategoryColor(rule.category)} overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 cursor-move text-gray-400">
              <Grip size={18} />
            </div>
            <div className={`p-1.5 rounded mr-2 ${getCategoryColor(rule.category)}`}>
              {getCategoryIcon(rule.category)}
            </div>
            <div>
              <h4 className="font-medium">{rule.name}</h4>
              {!isExpanded && (
                <p className="text-xs text-gray-400 mt-0.5 max-w-md truncate">{rule.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => onUpdate({ enabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`}></div>
              </div>
            </label>
            
            <button
              onClick={() => setIsConfiguring(true)}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
              title="Configure"
            >
              <Settings size={16} />
            </button>
            
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-700 transition-colors"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <p className="text-sm text-gray-300 mb-3">{rule.description}</p>
            
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                Weight: <span className="text-white">{(rule.weight * 100).toFixed(0)}%</span>
              </div>
              
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">Importance:</span>
                <div className="flex space-x-1">
                  {[0.25, 0.5, 0.75, 1].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => onUpdate({ weight })}
                      className={`w-5 h-2 rounded-full ${
                        rule.weight >= weight ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {isConfiguring && (
        <IndicatorConfigModal
          rule={rule}
          onUpdate={onUpdate}
          onClose={() => setIsConfiguring(false)}
        />
      )}
    </motion.div>
  );
}

interface IndicatorConfigModalProps {
  rule: StrategyRule;
  onUpdate: (updates: Partial<StrategyRule>) => void;
  onClose: () => void;
}

function IndicatorConfigModal({ rule, onUpdate, onClose }: IndicatorConfigModalProps) {
  const [name, setName] = useState(rule.name);
  const [description, setDescription] = useState(rule.description);
  const [category, setCategory] = useState(rule.category);
  const [weight, setWeight] = useState(rule.weight);
  
  const handleSave = () => {
    onUpdate({
      name,
      description,
      category: category as 'entry' | 'exit' | 'filter',
      weight
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Configure Indicator</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
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
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="entry">Entry Rule</option>
              <option value="filter">Filter Rule</option>
              <option value="exit">Exit Rule</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Weight: {(weight * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          
          {/* Additional parameters would go here based on indicator type */}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}