import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StrategyConfig, StrategyRule } from '../../trading/StrategyRunner';
import { IndicatorBlock } from './IndicatorBlock';
import { ArrowDown, Plus } from 'lucide-react';

interface StrategyWorkspaceProps {
  strategy: StrategyConfig;
  onUpdateRule: (ruleId: string, updates: Partial<StrategyRule>) => void;
  onRemoveRule: (ruleId: string) => void;
  isDragging: boolean;
}

export function StrategyWorkspace({ 
  strategy, 
  onUpdateRule, 
  onRemoveRule,
  isDragging
}: StrategyWorkspaceProps) {
  const entryRules = strategy.rules.filter(rule => rule.category === 'entry');
  const filterRules = strategy.rules.filter(rule => rule.category === 'filter');
  const exitRules = strategy.rules.filter(rule => rule.category === 'exit');

  return (
    <div className="p-6 min-h-[600px]">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Strategy: {strategy.name}</h2>
        <p className="text-gray-400 text-sm">{strategy.description}</p>
      </div>
      
      <div className="space-y-8">
        {/* Entry Rules Section */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-green-400 flex items-center">
            Entry Rules
            <span className="ml-2 text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
              {entryRules.length} rule{entryRules.length !== 1 ? 's' : ''}
            </span>
          </h3>
          
          {entryRules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-gray-700/50 rounded-full">
                  <Plus className="text-gray-400" size={24} />
                </div>
              </div>
              <p className="text-gray-400">Drag entry indicators here to start building your strategy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entryRules.map((rule, index) => (
                <SortableIndicatorBlock
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                  onRemove={() => onRemoveRule(rule.id)}
                  isDragging={isDragging}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Connector */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowDown className="text-gray-500" size={24} />
          </motion.div>
        </div>
        
        {/* Filter Rules Section */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-blue-400 flex items-center">
            Filter Rules
            <span className="ml-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
              {filterRules.length} rule{filterRules.length !== 1 ? 's' : ''}
            </span>
          </h3>
          
          {filterRules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-gray-700/50 rounded-full">
                  <Plus className="text-gray-400" size={24} />
                </div>
              </div>
              <p className="text-gray-400">Drag filter indicators here to refine your strategy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filterRules.map((rule, index) => (
                <SortableIndicatorBlock
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                  onRemove={() => onRemoveRule(rule.id)}
                  isDragging={isDragging}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Connector */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <ArrowDown className="text-gray-500" size={24} />
          </motion.div>
        </div>
        
        {/* Exit Rules Section */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-red-400 flex items-center">
            Exit Rules
            <span className="ml-2 text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">
              {exitRules.length} rule{exitRules.length !== 1 ? 's' : ''}
            </span>
          </h3>
          
          {exitRules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-gray-700/50 rounded-full">
                  <Plus className="text-gray-400" size={24} />
                </div>
              </div>
              <p className="text-gray-400">Drag exit indicators here to complete your strategy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exitRules.map((rule, index) => (
                <SortableIndicatorBlock
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                  onRemove={() => onRemoveRule(rule.id)}
                  isDragging={isDragging}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableIndicatorBlockProps {
  rule: StrategyRule;
  onUpdate: (updates: Partial<StrategyRule>) => void;
  onRemove: () => void;
  isDragging: boolean;
}

function SortableIndicatorBlock({ rule, onUpdate, onRemove, isDragging }: SortableIndicatorBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ id: rule.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isThisItemDragging ? 10 : 1,
    opacity: isDragging && !isThisItemDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IndicatorBlock
        rule={rule}
        onUpdate={onUpdate}
        onRemove={onRemove}
        isDragging={isThisItemDragging}
      />
    </div>
  );
}