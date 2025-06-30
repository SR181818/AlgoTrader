import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ChevronRight, TrendingUp, Zap, Shield, Cpu, Rocket, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import boltBadge from '@assets/black_circle_360x360_1751285848749.png';

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
        
        {/* Moving Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Mouse Follower */}
        <div
          className="absolute w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none transition-all duration-300"
          style={{
            left: mousePos.x - 128,
            top: mousePos.y - 128,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              AlgoTrader
            </span>
          </div>
          
          {/* Bolt.new Badge */}
          <a 
            href="https://bolt.new/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105"
          >
            <img 
              src={boltBadge} 
              alt="Powered by Bolt.new" 
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-cyan-400/50 transition-shadow"
            />
          </a>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              FUTURE OF TRADING
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Advanced algorithmic trading platform powered by AI and quantum-level technical analysis. 
              Experience the next generation of financial technology.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-4 text-lg group">
                  Launch Platform
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link href="/backtest">
                <Button variant="outline" size="lg" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg">
                  Start Backtesting
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-400/20 backdrop-blur-sm">
                <Zap className="h-12 w-12 text-cyan-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
                <p className="text-gray-300">Execute trades in microseconds with our quantum-optimized engine</p>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-400/20 backdrop-blur-sm">
                <Shield className="h-12 w-12 text-purple-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
                <p className="text-gray-300">Military-grade encryption and multi-layer protection</p>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-pink-500/10 to-cyan-500/10 rounded-xl border border-pink-400/20 backdrop-blur-sm">
                <Cpu className="h-12 w-12 text-pink-400 mb-4 mx-auto" />
                <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
                <p className="text-gray-300">Advanced machine learning algorithms for predictive analysis</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="px-6 py-16 bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Powered by Cutting-Edge Technology
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Built with the most advanced tools and platforms for maximum performance and reliability
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Technology Badges */}
              <div className="flex flex-col items-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-400/20 backdrop-blur-sm hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <h3 className="font-bold text-green-400">Supabase</h3>
                <p className="text-sm text-gray-400">Database & Auth</p>
              </div>

              <div className="flex flex-col items-center p-6 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-400/20 backdrop-blur-sm hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">N</span>
                </div>
                <h3 className="font-bold text-teal-400">Netlify</h3>
                <p className="text-sm text-gray-400">Deployment</p>
              </div>

              <div className="flex flex-col items-center p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-400/20 backdrop-blur-sm hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <h3 className="font-bold text-orange-400">Entri</h3>
                <p className="text-sm text-gray-400">Integration</p>
              </div>

              <div className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-400/20 backdrop-blur-sm hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-blue-400">Algorand</h3>
                <p className="text-sm text-gray-400">Blockchain</p>
              </div>
            </div>

            <div className="mt-12 p-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <p className="text-lg text-gray-300">
                <span className="text-cyan-400 font-semibold">Acknowledgment:</span> This project utilizes all the above technologies to deliver a comprehensive, 
                high-performance trading platform. Each technology contributes to different aspects of the system - from real-time data processing 
                to secure user authentication and blockchain integration.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="p-6">
                <div className="text-4xl font-bold text-cyan-400 mb-2">99.9%</div>
                <div className="text-gray-300">Uptime</div>
              </div>
              <div className="p-6">
                <div className="text-4xl font-bold text-purple-400 mb-2">&lt;1ms</div>
                <div className="text-gray-300">Latency</div>
              </div>
              <div className="p-6">
                <div className="text-4xl font-bold text-pink-400 mb-2">50+</div>
                <div className="text-gray-300">Strategies</div>
              </div>
              <div className="p-6">
                <div className="text-4xl font-bold text-cyan-400 mb-2">24/7</div>
                <div className="text-gray-300">Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-gray-800">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-400">
              © 2025 AlgoTrader. Built with next-generation technology for the future of finance.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}