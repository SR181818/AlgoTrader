import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Zap, 
  Database, 
  Settings, 
  Users, 
  ArrowRight, 
  ChevronDown, 
  Github, 
  Twitter, 
  Linkedin 
} from 'lucide-react';
import PlatformOverview from '../components/PlatformOverview';

export default function LandingPage() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div ref={targetRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-purple-900/30"
          style={{ 
            backgroundImage: "url('/grid.svg')", 
            backgroundSize: "cover",
            y: backgroundY,
            opacity,
            scale
          }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="p-3 bg-blue-600 rounded-xl">
                <BarChart3 size={48} />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Advanced Trading Platform <br />
              <span className="text-blue-400">Powered by Blockchain</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Create, test, and deploy sophisticated trading strategies with our intuitive platform. 
              Powered by blockchain security and machine learning.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to="/register" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center">
                Get Started
                <ArrowRight size={18} className="ml-2" />
              </Link>
              
              <Link to="/premium-login" className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center">
                <Shield size={18} className="mr-2" />
                Premium Access
              </Link>
              
              <a href="#features" className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center">
                Learn More
                <ChevronDown size={18} className="ml-2" />
              </a>
            </motion.div>
          </motion.div>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          >
            <ChevronDown size={30} className="text-white/70" />
          </motion.div>
        </div>
      </div>
      
      {/* Features Section */}
      <div id="features" className="py-20 bg-gray-900">
        <PlatformOverview />
      </div>
      
      {/* Subscription Plans */}
      <div className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Choose Your Plan
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-300 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Select the plan that best fits your trading needs
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
              title="Free"
              price="$0"
              period="forever"
              description="Basic features for beginners"
              features={[
                "Basic market data",
                "Limited technical indicators",
                "Single timeframe analysis",
                "Paper trading"
              ]}
              buttonText="Get Started"
              buttonLink="/register"
              highlighted={false}
            />
            
            <PricingCard 
              title="Basic"
              price="$29"
              period="per month"
              description="Essential tools for active traders"
              features={[
                "All FREE features",
                "Real-time market data",
                "Full technical indicator library",
                "Multi-timeframe analysis",
                "Basic backtesting"
              ]}
              buttonText="Subscribe Now"
              buttonLink="/blockchain"
              highlighted={true}
            />
            
            <PricingCard 
              title="Pro"
              price="$99"
              period="per month"
              description="Advanced features for professionals"
              features={[
                "All BASIC features",
                "Advanced backtesting",
                "Custom strategy builder",
                "ML model integration",
                "Portfolio management",
                "Risk management tools"
              ]}
              buttonText="Get Pro Access"
              buttonLink="/premium-login"
              highlighted={false}
            />
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-6">
          <motion.div 
            className="max-w-4xl mx-auto bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 md:p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Create your account today and experience the power of our trading platform
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center">
                Get Started Now
                <ArrowRight size={18} className="ml-2" />
              </Link>
              
              <Link to="/premium-login" className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center">
                <Shield size={18} className="mr-2" />
                Premium Access
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Trading Platform</h3>
                <p className="text-sm text-gray-400">Build. Test. Trade.</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 Trading Platform. All rights reserved.
            </p>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  highlighted: boolean;
}

function PricingCard({ 
  title, 
  price, 
  period, 
  description, 
  features, 
  buttonText, 
  buttonLink,
  highlighted 
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-xl p-6 ${
        highlighted 
          ? 'bg-gradient-to-b from-blue-900/40 to-purple-900/40 border-2 border-blue-500/50 transform scale-105' 
          : 'bg-gray-800 border border-gray-700'
      }`}
    >
      {highlighted && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
          Most Popular
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className={`text-xl font-bold ${highlighted ? 'text-blue-400' : 'text-white'}`}>{title}</h3>
        <div className="mt-4 flex items-baseline justify-center">
          <span className="text-4xl font-extrabold text-white">{price}</span>
          <span className="ml-1 text-xl text-gray-400">{period}</span>
        </div>
        <p className="mt-2 text-gray-400">{description}</p>
      </div>
      
      <ul className="mt-6 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="h-5 w-5 text-green-400 shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      
      <div className="mt-8">
        <Link
          to={buttonLink}
          className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium transition-colors ${
            highlighted 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : title === 'Pro' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {buttonText}
        </Link>
      </div>
    </motion.div>
  );
}