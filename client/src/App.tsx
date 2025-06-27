import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { CandleData, TradingSignal, Trade, MarketData, TradingConfig } from './types/trading';
import { calculateIndicators } from './utils/technicalIndicators';
import { generateSignal } from './utils/signalGenerator';
import { realDataService } from './utils/realDataService';
import { TRADING_PAIRS, DEFAULT_CONFIG } from './data/tradingPairs';
import { RootState } from './store';
import { Activity, Zap, BarChart3, Globe, Database, Library, Settings, Bell, Bot, Shield, LogOut, User } from 'lucide-react';
import { MetricsProvider } from './monitoring/MetricsProvider';
import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './components/NotFoundPage';
import { PremiumLogin } from './components/PremiumLogin';
import { useMarketData } from './hooks/useMarketData';
import axios from 'axios';

// Import pages
import TradingDashboardPage from './pages/TradingDashboardPage';
import BacktestPage from './pages/BacktestPage';
import PortfolioDashboardPage from './pages/PortfolioDashboardPage';
import IndicatorLibraryPage from './pages/IndicatorLibraryPage';
import PluginMarketplacePage from './plugins/marketplace/pages/PluginMarketplacePage';
import SettingsPage from './pages/SettingsPage';
import BlockchainPaywallPage from './pages/BlockchainPaywallPage';
import LandingPage from './pages/LandingPage';
import StrategyBuilderPage from './pages/StrategyBuilderPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Wrap the main App component with the MetricsProvider
const AppWithMetrics = () => {
  return (
    <ErrorBoundary>
      <MetricsProvider>
        <AppContent />
      </MetricsProvider>
    </ErrorBoundary>
  );
};

// Main App content with metrics hook
function AppContent() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<{tier: string, active: boolean} | null>(null);
  // Example: symbol/timeframe selection (replace with your actual state/logic)
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  // Example: strategy config state (replace with your actual state/logic)
  const [strategyConfig, setStrategyConfig] = useState(null);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const data = await realDataService.fetchTicker('BTC/USDT');
        if (data.price > 0) {
          setConnectionStatus('connected');
        }
      } catch (error) {
        setConnectionStatus('error');
        console.error('Connection error:', error);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    
    // Check if user is logged in
    const userToken = localStorage.getItem('userToken');
    if (userToken) {
      setIsAuthenticated(true);
      
      // Check subscription status
      const userSubscription = localStorage.getItem('userSubscription');
      if (userSubscription) {
        setSubscription(JSON.parse(userSubscription));
      }
    }
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userSubscription');
    setIsAuthenticated(false);
    setSubscription(null);
  };

  // Protected route component
  const ProtectedRoute = ({ children, requiredTier = 'free' }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    // Only support 'free' and 'ai' tiers
    if (subscription) {
      const tierLevels = { 'free': 0, 'ai': 1 };
      const userTierLevel = tierLevels[subscription.tier] || 0;
      const requiredTierLevel = tierLevels[requiredTier] || 0;
      if (!subscription.active || userTierLevel < requiredTierLevel) {
        return <Navigate to="/blockchain" />;
      }
    }
    return children;
  };

  // Subscribe to live market data
  const { candles, isConnected } = useMarketData(selectedSymbol, selectedTimeframe, { autoConnect: true });

  // Send each new candle to backend TradingBotService/StrategyRunner
  useEffect(() => {
    if (!isAuthenticated || !subscription?.active || !candles.length) return;
    // Send only the latest candle
    const latestCandle = candles[candles.length - 1];
    if (!latestCandle) return;
    // Example REST API call to backend
    axios.post('/api/bot/update-candle', {
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      candle: latestCandle
    }).catch(err => {
      // Optionally handle/report error
      console.error('Failed to send candle to backend:', err);
    });
  }, [candles, isAuthenticated, subscription, selectedSymbol, selectedTimeframe]);

  // Update backend strategy config when changed in the UI (e.g., from strategy builder)
  useEffect(() => {
    if (!isAuthenticated || !subscription?.active || !strategyConfig) return;
    // Example REST API call to backend
    axios.post('/api/bot/set-strategy', {
      strategy: strategyConfig
    }).catch(err => {
      // Optionally handle/report error
      console.error('Failed to update strategy config:', err);
    });
  }, [strategyConfig, isAuthenticated, subscription]);

  // TODO: Listen for backend status/order updates (websocket or polling)
  // Example: useWebSocket('/api/bot/updates', ...)
  // Update UI with live order status, PnL, etc.

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Globe size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Live Multi-Asset Trading Dashboard</h1>
                  <p className="text-gray-400 text-sm">Real-time data with TA-Lib indicators & automated trading</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className={`flex items-center px-3 py-1 rounded-lg text-sm ${
                  connectionStatus === 'connected' ? 'bg-green-600/20 text-green-400' :
                  connectionStatus === 'connecting' ? 'bg-yellow-600/20 text-yellow-400' :
                  'bg-red-600/20 text-red-400'
                }`}>
                  <Database size={16} className="mr-2" />
                  {connectionStatus === 'connected' ? 'Live Data' :
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Error'}
                </div>
                
                {subscription && (
                  <div className={`flex items-center px-3 py-1 rounded-lg text-sm ${
                    subscription.tier === 'free' ? 'bg-gray-600/20 text-gray-300' :
                    subscription.tier === 'ai' ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300' :
                    'bg-gray-700/20 text-gray-300'
                  }`}>
                    <Shield size={16} className="mr-2" />
                    {subscription.tier.toUpperCase()}
                  </div>
                )}
                
                {isAuthenticated ? (
                  <div className="flex items-center space-x-2">
                    <Link to="/settings" className="p-2 text-gray-400 hover:text-white transition-colors">
                      <User size={20} />
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
                    Login
                  </Link>
                )}
                
                <nav className="hidden md:flex items-center space-x-2">
                  <NavLink to="/" icon={<BarChart3 size={16} />} text="Dashboard" />
                  <NavLink to="/backtest" icon={<Activity size={16} />} text="Backtest" />
                  <NavLink to="/portfolio" icon={<Zap size={16} />} text="Portfolio" />
                  <NavLink to="/indicators" icon={<Library size={16} />} text="Indicators" />
                  <NavLink to="/plugins" icon={<Bot size={16} />} text="Plugins" />
                  <NavLink to="/blockchain" icon={<Shield size={16} />} text="Blockchain" />
                  <NavLink to="/strategy-builder" icon={<Settings size={16} />} text="Strategy Builder" />
                </nav>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={() => setIsAuthenticated(true)} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/premium-login" element={<NotFoundPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <TradingDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/backtest" element={
              <ProtectedRoute>
                <BacktestPage />
              </ProtectedRoute>
            } />
            <Route path="/portfolio" element={
              <ProtectedRoute requiredTier="ai">
                <PortfolioDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/indicators" element={
              <ProtectedRoute>
                <IndicatorLibraryPage />
              </ProtectedRoute>
            } />
            <Route path="/plugins" element={
              <ProtectedRoute requiredTier="ai">
                <PluginMarketplacePage />
              </ProtectedRoute>
            } />
            <Route path="/blockchain" element={
              <BlockchainPaywallPage 
                onSubscriptionChange={(sub) => {
                  setSubscription(sub);
                  localStorage.setItem('userSubscription', JSON.stringify(sub));
                }}
              />
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/strategy-builder" element={
              <ProtectedRoute requiredTier="ai">
                <StrategyBuilderPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

// Navigation Link component
function NavLink({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <Link
      to={to}
      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-800"
    >
      <span className="mr-2">{icon}</span>
      {text}
    </Link>
  );
}

export default AppWithMetrics;