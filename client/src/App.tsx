import React, { useState, useEffect } from 'react';
import { Router, Route, Link, useLocation } from 'wouter';
import { Activity, Zap, BarChart3, Globe, Database, Library, Settings, Bell, Bot, Shield, LogOut, User } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Import pages
import TradingDashboardPage from './pages/TradingDashboardPage';
import BacktestPage from './pages/BacktestPage';
import ManualTradingPage from './pages/ManualTradingPage';
import PortfolioDashboardPage from './pages/PortfolioDashboardPage';
import IndicatorLibraryPage from './pages/IndicatorLibraryPage';
import SettingsPage from './pages/SettingsPage';
import BlockchainPaywallPage from './pages/BlockchainPaywallPage';
import LandingPage from './pages/LandingPage';
import StrategyBuilderPage from './pages/StrategyBuilderPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LiveSimulationPage from './pages/LiveSimulationPage';
import LiveTradingPage from './pages/LiveTradingPage';
import LiveTradingDashboardPage from './pages/LiveTradingDashboardPage';

// Wrap the main App component with error boundary
const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

// Main App content
function AppContent() {
  const [location, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<{tier: string, active: boolean} | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const userToken = localStorage.getItem('userToken');
    if (userToken) {
      setIsAuthenticated(true);

      // Check subscription status
      const userSubscription = localStorage.getItem('userSubscription');
      if (userSubscription) {
        setSubscription(JSON.parse(userSubscription));
      } else {
        // Set default subscription for authenticated users
        setSubscription({ tier: 'ai', active: true });
      }
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userSubscription');
    setIsAuthenticated(false);
    setSubscription(null);
    setLocation('/');
  };

  // Protected route component
  const ProtectedRoute = ({ children, requiredTier = 'free' }: { children: React.ReactNode, requiredTier?: string }) => {
    if (!isAuthenticated) {
      return <LoginPage onLogin={handleLogin} />;
    }

    // All features are now free - no tier restrictions
    return <>{children}</>;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Router>
        {/* Navigation */}
        {isAuthenticated && (
          <nav className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Link href="/dashboard" className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-blue-400 mr-2" />
                    <span className="text-xl font-bold">Trading Platform</span>
                  </Link>
                </div>

                <div className="flex items-center space-x-4">
                  <NavLink to="/dashboard" icon={<Activity size={18} />} text="Dashboard" />
                  <NavLink to="/backtest" icon={<Zap size={18} />} text="Backtest" />
                  <NavLink to="/manual-trading" icon={<Globe size={18} />} text="Manual Trade" />
                  <NavLink to="/live-trading" icon={<Zap size={18} />} text="Live Trading" />
                  <NavLink to="/live-dashboard" icon={<Activity size={18} />} text="Live Dashboard" />
                  <NavLink to="/portfolio" icon={<BarChart3 size={18} />} text="Portfolio" />
                  <NavLink to="/indicators" icon={<Library size={18} />} text="Indicators" />
                  <NavLink to="/strategy-builder" icon={<Bot size={18} />} text="Strategy" />
                  <NavLink to="/blockchain" icon={<Shield size={18} />} text="Blockchain" />
                  <NavLink to="/settings" icon={<Settings size={18} />} text="Settings" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Routes */}
        <Route path="/">
          {isAuthenticated ? <TradingDashboardPage /> : <LandingPage />}
        </Route>
        <Route path="/login">
          <LoginPage onLogin={handleLogin} />
        </Route>
        <Route path="/register" component={RegisterPage} />

        <Route path="/dashboard">
          <ProtectedRoute>
            <TradingDashboardPage />
          </ProtectedRoute>
        </Route>

        <Route path="/backtest">
          <ProtectedRoute>
            <BacktestPage />
          </ProtectedRoute>
        </Route>

        <Route path="/manual-trading">
          <ProtectedRoute>
            <ManualTradingPage />
          </ProtectedRoute>
        </Route>

        <Route path="/portfolio">
          <ProtectedRoute>
            <PortfolioDashboardPage />
          </ProtectedRoute>
        </Route>

        <Route path="/indicators">
          <ProtectedRoute>
            <IndicatorLibraryPage />
          </ProtectedRoute>
        </Route>

        <Route path="/strategy-builder">
          <ProtectedRoute requiredTier="ai">
            <StrategyBuilderPage />
          </ProtectedRoute>
        </Route>

        <Route path="/blockchain">
          <ProtectedRoute>
            <BlockchainPaywallPage />
          </ProtectedRoute>
        </Route>

        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/live-simulation">
          <ProtectedRoute>
            <LiveSimulationPage />
          </ProtectedRoute>
        </Route>

        <Route path="/live-trading">
          <ProtectedRoute>
            <LiveTradingPage />
          </ProtectedRoute>
        </Route>

        <Route path="/live-dashboard">
          <ProtectedRoute>
            <LiveTradingDashboardPage />
          </ProtectedRoute>
        </Route>

      </Router>
    </div>
  );
}

// Navigation link component
function NavLink({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  const [location] = useLocation();
  const isActive = location === to;

  return (
    <Link
      href={to}
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="ml-2">{text}</span>
    </Link>
  );
}

export default App;