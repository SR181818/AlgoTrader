import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  X, 
  TrendingUp, 
  Filter, 
  Settings, 
  Play, 
  Save, 
  DollarSign 
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Strategy Builder",
      description: "Build and test trading strategies without writing code. This tutorial will guide you through the basics.",
      icon: <TrendingUp size={48} className="text-blue-400" />,
    },
    {
      title: "Drag & Drop Indicators",
      description: "Drag indicators from the panel on the right to build your strategy. Each indicator can be configured to your needs.",
      icon: <Filter size={48} className="text-green-400" />,
    },
    {
      title: "Configure Your Strategy",
      description: "Click on any indicator to configure its parameters. Adjust weights to control how much influence each indicator has.",
      icon: <Settings size={48} className="text-purple-400" />,
    },
    {
      title: "Test Your Strategy",
      description: "Use the Preview tab to test your strategy against historical data and see how it would have performed.",
      icon: <Play size={48} className="text-yellow-400" />,
    },
    {
      title: "Save & Deploy",
      description: "Once you're happy with your strategy, save it and deploy it to start trading with real or paper money.",
      icon: <Save size={48} className="text-blue-400" />,
    }
  ];
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Strategy Builder Tutorial</h2>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gray-700/50 rounded-full">
                  {steps[currentStep].icon}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">
                {steps[currentStep].title}
              </h3>
              
              <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
                {steps[currentStep].description}
              </p>
              
              {/* Step indicators */}
              <div className="flex justify-center space-x-2 mb-8">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index === currentStep ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              Skip Tutorial
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}