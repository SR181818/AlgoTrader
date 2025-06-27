import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StrategyConfig } from '../../trading/StrategyRunner';
import { 
  X, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Star, 
  Clock, 
  Zap, 
  Filter, 
  Search 
} from 'lucide-react';
import { strategyTemplates } from '../../utils/strategyTemplates';

interface TemplateGalleryProps {
  onClose: () => void;
  onSelectTemplate: (template: StrategyConfig) => void;
}

export function TemplateGallery({ onClose, onSelectTemplate }: TemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const categories = [
    { id: 'all', name: 'All Templates', icon: Activity },
    { id: 'trend', name: 'Trend Following', icon: TrendingUp },
    { id: 'momentum', name: 'Momentum', icon: Zap },
    { id: 'mean_reversion', name: 'Mean Reversion', icon: BarChart3 },
    { id: 'volatility', name: 'Volatility', icon: Activity },
  ];
  
  const filteredTemplates = strategyTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Strategy Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-700">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const CategoryIcon = category.icon;
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
                  <CategoryIcon size={14} className="mr-1" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">No Templates Found</div>
              <div className="text-sm">Try adjusting your search or filter</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-700/50 rounded-lg border border-gray-600 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`p-2 rounded mr-2 ${
                          template.category === 'trend' ? 'bg-green-900/30 text-green-400' :
                          template.category === 'momentum' ? 'bg-purple-900/30 text-purple-400' :
                          template.category === 'mean_reversion' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {template.category === 'trend' ? <TrendingUp size={18} /> :
                           template.category === 'momentum' ? <Zap size={18} /> :
                           template.category === 'mean_reversion' ? <BarChart3 size={18} /> :
                           <Activity size={18} />}
                        </div>
                        <h3 className="font-semibold">{template.name}</h3>
                      </div>
                      <div className="flex items-center text-yellow-400">
                        <Star size={14} className="fill-current" />
                        <span className="ml-1 text-sm">{template.rating}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">{template.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center">
                        <Filter size={12} className="mr-1" />
                        <span>{template.rules.length} rules</span>
                      </div>
                      <div className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        <span>Win rate: {template.winRate}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}