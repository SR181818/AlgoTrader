import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { StrategyWorkspace } from '../components/strategy-builder/StrategyWorkspace';
import { IndicatorPanel } from '../components/strategy-builder/IndicatorPanel';
import { StrategyHeader } from '../components/strategy-builder/StrategyHeader';
import { StrategyPreview } from '../components/strategy-builder/StrategyPreview';
import { StrategySettings } from '../components/strategy-builder/StrategySettings';
import { OnboardingFlow } from '../components/strategy-builder/OnboardingFlow';
import { TemplateGallery } from '../components/strategy-builder/TemplateGallery';
import { StrategyConfig, StrategyRule } from '../trading/StrategyRunner';
import { createDefaultStrategy } from '../utils/strategyTemplates';
import { AlertCircle, HelpCircle, Info } from 'lucide-react';

export default function StrategyBuilderPage() {
  const [strategy, setStrategy] = useState<StrategyConfig>(createDefaultStrategy());
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'preview'>('workspace');
  const [isNewUser, setIsNewUser] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    // Check if user has used the strategy builder before
    const hasUsedBuilder = localStorage.getItem('hasUsedStrategyBuilder');
    if (hasUsedBuilder) {
      setIsNewUser(false);
    } else {
      // Show onboarding for new users
      setShowOnboarding(true);
    }

    // Try to load saved strategy
    const savedStrategy = localStorage.getItem('savedStrategy');
    if (savedStrategy) {
      try {
        setStrategy(JSON.parse(savedStrategy));
      } catch (error) {
        console.error('Failed to load saved strategy:', error);
      }
    }
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    setActiveIndicator(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveIndicator(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Handle reordering
      const oldIndex = strategy.rules.findIndex(rule => rule.id === active.id);
      const newIndex = strategy.rules.findIndex(rule => rule.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setStrategy(prev => ({
          ...prev,
          rules: arrayMove(prev.rules, oldIndex, newIndex)
        }));
      }
    }
  };

  const handleAddRule = (rule: StrategyRule) => {
    setStrategy(prev => ({
      ...prev,
      rules: [...prev.rules, rule]
    }));
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<StrategyRule>) => {
    setStrategy(prev => ({
      ...prev,
      rules: prev.rules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const handleRemoveRule = (ruleId: string) => {
    setStrategy(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const handleUpdateStrategy = (updates: Partial<StrategyConfig>) => {
    setStrategy(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleSaveStrategy = async () => {
    try {
      // Save to database
      const strategyData = {
        name: strategy.name,
        description: strategy.description || `Custom strategy built with Strategy Builder`,
        type: 'custom',
        parameters: {
          symbol: 'BTCUSDT', // Default symbol, can be made configurable
          timeframe: '1h',
          stopLoss: 2,
          takeProfit: 4,
          riskPercentage: 1,
          maxPositions: 1,
        },
        conditions: {
          entry: strategy.rules.filter(rule => rule.type === 'entry').map(rule => rule.conditions),
          exit: strategy.rules.filter(rule => rule.type === 'exit').map(rule => rule.conditions)
        }
      };

      const response = await fetch('/api/trading/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategyData)
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('savedStrategy', JSON.stringify(strategy));
        localStorage.setItem('hasUsedStrategyBuilder', 'true');
        alert(`Strategy "${strategy.name}" saved successfully to database!`);
      } else {
        throw new Error('Failed to save strategy to database');
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      // Fallback to localStorage
      localStorage.setItem('savedStrategy', JSON.stringify(strategy));
      localStorage.setItem('hasUsedStrategyBuilder', 'true');
      alert('Strategy saved locally (database save failed)');
    }
  };

  const handleLoadTemplate = (template: StrategyConfig) => {
    setStrategy(template);
    setShowTemplates(false);
  };

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasUsedStrategyBuilder', 'true');
    setIsNewUser(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <StrategyHeader 
        strategyName={strategy.name}
        onSave={handleSaveStrategy}
        onShowTemplates={() => setShowTemplates(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <div className="container mx-auto px-4 py-6">
        {isNewUser && !showOnboarding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6 flex items-start"
          >
            <Info className="text-blue-400 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-blue-300">New to Strategy Building?</h3>
              <p className="text-blue-200 text-sm mt-1">
                We've noticed this is your first time using our Strategy Builder. Would you like to see a quick tutorial?
              </p>
              <button 
                onClick={() => setShowOnboarding(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
              >
                Show Tutorial
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-3/4 space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="border-b border-gray-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'workspace' 
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Workspace
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'preview' 
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Preview & Test
                  </button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
              >
                <SortableContext items={strategy.rules.map(rule => rule.id)}>
                  {activeTab === 'workspace' ? (
                    <StrategyWorkspace
                      strategy={strategy}
                      onUpdateRule={handleUpdateRule}
                      onRemoveRule={handleRemoveRule}
                      isDragging={isDragging}
                    />
                  ) : (
                    <StrategyPreview strategy={strategy} />
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="w-full lg:w-1/4 space-y-6">
            <IndicatorPanel 
              onAddIndicator={handleAddRule}
              strategy={strategy}
            />

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <HelpCircle size={18} className="text-blue-400 mr-2" />
                Need Help?
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                Drag indicators from the panel above to build your strategy. Configure each block by clicking on it.
              </p>
              <div className="flex items-center text-yellow-400 text-sm bg-yellow-400/10 p-2 rounded">
                <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                <span>Remember to test your strategy before using it with real funds.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingFlow onComplete={handleCompleteOnboarding} onSkip={handleCompleteOnboarding} />
      )}

      {showTemplates && (
        <TemplateGallery 
          onClose={() => setShowTemplates(false)} 
          onSelectTemplate={handleLoadTemplate}
        />
      )}

      {showSettings && (
        <StrategySettings 
          strategy={strategy}
          onClose={() => setShowSettings(false)}
          onUpdate={handleUpdateStrategy}
        />
      )}
    </div>
  );
}