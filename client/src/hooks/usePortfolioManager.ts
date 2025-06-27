import { useState, useEffect, useCallback } from 'react';
import { PortfolioManager, Account, Portfolio, PortfolioMetrics, PortfolioPosition, PortfolioAllocation, PortfolioRiskLimits, PortfolioTrade } from '../services/PortfolioManager';

export function usePortfolioManager() {
  const [portfolioManager] = useState(() => new PortfolioManager());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<Map<string, PortfolioMetrics>>(new Map());
  const [portfolioPositions, setPortfolioPositions] = useState<Map<string, PortfolioPosition[]>>(new Map());
  const [portfolioAllocations, setPortfolioAllocations] = useState<Map<string, PortfolioAllocation[]>>(new Map());
  const [portfolioTrades, setPortfolioTrades] = useState<Map<string, PortfolioTrade[]>>(new Map());
  const [portfolioRiskLimits, setPortfolioRiskLimits] = useState<Map<string, PortfolioRiskLimits>>(new Map());
  const [riskAssessments, setRiskAssessments] = useState<Map<string, any>>(new Map());
  const [alerts, setAlerts] = useState<any[]>([]);

  // Initialize data
  useEffect(() => {
    // Load accounts
    setAccounts(portfolioManager.getAllAccounts());
    
    // Load portfolios
    const allPortfolios = portfolioManager.getAllPortfolios();
    setPortfolios(allPortfolios);
    
    // Set first portfolio as selected if available
    if (allPortfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(allPortfolios[0].id);
    }
    
    // Load initial data for all portfolios
    allPortfolios.forEach(portfolio => {
      // Load metrics
      const metrics = portfolioManager.getPortfolioMetrics(portfolio.id);
      if (metrics) {
        setPortfolioMetrics(prev => new Map(prev).set(portfolio.id, metrics));
      }
      
      // Load positions
      const positions = portfolioManager.getPortfolioPositions(portfolio.id);
      setPortfolioPositions(prev => new Map(prev).set(portfolio.id, positions));
      
      // Load allocations
      const allocations = portfolioManager.getPortfolioAllocations(portfolio.id);
      setPortfolioAllocations(prev => new Map(prev).set(portfolio.id, allocations));
      
      // Load trades
      const trades = portfolioManager.getPortfolioTrades(portfolio.id);
      setPortfolioTrades(prev => new Map(prev).set(portfolio.id, trades));
      
      // Load risk limits
      const riskLimits = portfolioManager.getPortfolioRiskLimits(portfolio.id);
      if (riskLimits) {
        setPortfolioRiskLimits(prev => new Map(prev).set(portfolio.id, riskLimits));
      }
      
      // Load risk assessment
      const assessment = portfolioManager.assessPortfolioRisk(portfolio.id);
      setRiskAssessments(prev => new Map(prev).set(portfolio.id, assessment));
      
      // Start monitoring
      portfolioManager.startPortfolioMonitoring(portfolio.id);
    });
    
    // Subscribe to portfolio updates
    const portfolioSubscription = portfolioManager.getPortfolioUpdates().subscribe(({ portfolioId, metrics }) => {
      setPortfolioMetrics(prev => new Map(prev).set(portfolioId, metrics));
      
      // Update risk assessment when metrics change
      const assessment = portfolioManager.assessPortfolioRisk(portfolioId);
      setRiskAssessments(prev => new Map(prev).set(portfolioId, assessment));
    });
    
    // Subscribe to position updates
    const positionSubscription = portfolioManager.getPositionUpdates().subscribe(({ portfolioId, positions }) => {
      setPortfolioPositions(prev => new Map(prev).set(portfolioId, positions));
    });
    
    // Subscribe to risk alerts
    const alertSubscription = portfolioManager.getRiskAlerts().subscribe(alert => {
      setAlerts(prev => [
        {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...alert,
          isRead: false,
          timestamp: Date.now()
        },
        ...prev
      ]);
    });
    
    return () => {
      portfolioSubscription.unsubscribe();
      positionSubscription.unsubscribe();
      alertSubscription.unsubscribe();
      portfolioManager.dispose();
    };
  }, []);

  // Account management
  const createAccount = useCallback((accountData: any) => {
    const account = portfolioManager.createAccount(accountData);
    setAccounts(prev => [...prev, account]);
    return account;
  }, [portfolioManager]);

  const updateAccount = useCallback((accountId: string, updates: Partial<Account>) => {
    const account = portfolioManager.updateAccount(accountId, updates);
    if (account) {
      setAccounts(prev => prev.map(a => a.id === accountId ? account : a));
    }
    return account;
  }, [portfolioManager]);

  const deleteAccount = useCallback((accountId: string) => {
    try {
      const result = portfolioManager.deleteAccount(accountId);
      if (result) {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      }
      return result;
    } catch (error) {
      console.error('Failed to delete account:', error);
      return false;
    }
  }, [portfolioManager]);

  // Portfolio management
  const createPortfolio = useCallback((portfolioData: any) => {
    const portfolio = portfolioManager.createPortfolio(portfolioData);
    setPortfolios(prev => [...prev, portfolio]);
    
    // Initialize data structures for new portfolio
    const metrics = portfolioManager.getPortfolioMetrics(portfolio.id);
    if (metrics) {
      setPortfolioMetrics(prev => new Map(prev).set(portfolio.id, metrics));
    }
    
    const positions = portfolioManager.getPortfolioPositions(portfolio.id);
    setPortfolioPositions(prev => new Map(prev).set(portfolio.id, positions));
    
    const allocations = portfolioManager.getPortfolioAllocations(portfolio.id);
    setPortfolioAllocations(prev => new Map(prev).set(portfolio.id, allocations));
    
    const trades = portfolioManager.getPortfolioTrades(portfolio.id);
    setPortfolioTrades(prev => new Map(prev).set(portfolio.id, trades));
    
    const riskLimits = portfolioManager.getPortfolioRiskLimits(portfolio.id);
    if (riskLimits) {
      setPortfolioRiskLimits(prev => new Map(prev).set(portfolio.id, riskLimits));
    }
    
    const assessment = portfolioManager.assessPortfolioRisk(portfolio.id);
    setRiskAssessments(prev => new Map(prev).set(portfolio.id, assessment));
    
    // Start monitoring
    portfolioManager.startPortfolioMonitoring(portfolio.id);
    
    return portfolio;
  }, [portfolioManager]);

  const updatePortfolio = useCallback((portfolioId: string, updates: Partial<Portfolio>) => {
    const portfolio = portfolioManager.updatePortfolio(portfolioId, updates);
    if (portfolio) {
      setPortfolios(prev => prev.map(p => p.id === portfolioId ? portfolio : p));
    }
    return portfolio;
  }, [portfolioManager]);

  const deletePortfolio = useCallback((portfolioId: string) => {
    try {
      const result = portfolioManager.deletePortfolio(portfolioId);
      if (result) {
        setPortfolios(prev => prev.filter(p => p.id !== portfolioId));
        
        // Clean up data structures
        setPortfolioMetrics(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        setPortfolioPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        setPortfolioAllocations(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        setPortfolioTrades(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        setPortfolioRiskLimits(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        setRiskAssessments(prev => {
          const newMap = new Map(prev);
          newMap.delete(portfolioId);
          return newMap;
        });
        
        // If deleted portfolio was selected, select another one
        if (selectedPortfolioId === portfolioId) {
          const remainingPortfolios = portfolios.filter(p => p.id !== portfolioId);
          setSelectedPortfolioId(remainingPortfolios.length > 0 ? remainingPortfolios[0].id : null);
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to delete portfolio:', error);
      return false;
    }
  }, [portfolioManager, portfolios, selectedPortfolioId]);

  // Risk management
  const updatePortfolioRiskLimits = useCallback((portfolioId: string, updates: Partial<PortfolioRiskLimits>) => {
    const result = portfolioManager.updatePortfolioRiskLimits(portfolioId, updates);
    if (result) {
      const updatedLimits = portfolioManager.getPortfolioRiskLimits(portfolioId);
      if (updatedLimits) {
        setPortfolioRiskLimits(prev => new Map(prev).set(portfolioId, updatedLimits));
      }
      
      // Update risk assessment
      const assessment = portfolioManager.assessPortfolioRisk(portfolioId);
      setRiskAssessments(prev => new Map(prev).set(portfolioId, assessment));
    }
    return result;
  }, [portfolioManager]);

  // Alert management
  const markAlertAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    // State
    accounts,
    portfolios,
    selectedPortfolioId,
    portfolioMetrics,
    portfolioPositions,
    portfolioAllocations,
    portfolioTrades,
    portfolioRiskLimits,
    riskAssessments,
    alerts,
    
    // Setters
    setSelectedPortfolioId,
    
    // Account actions
    createAccount,
    updateAccount,
    deleteAccount,
    
    // Portfolio actions
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    
    // Risk management
    updatePortfolioRiskLimits,
    
    // Alert management
    markAlertAsRead,
    clearAllAlerts,
    
    // Getters
    getPortfolioMetrics: useCallback((portfolioId: string) => {
      return portfolioMetrics.get(portfolioId);
    }, [portfolioMetrics]),
    
    getPortfolioPositions: useCallback((portfolioId: string) => {
      return portfolioPositions.get(portfolioId) || [];
    }, [portfolioPositions]),
    
    getPortfolioAllocations: useCallback((portfolioId: string) => {
      return portfolioAllocations.get(portfolioId) || [];
    }, [portfolioAllocations]),
    
    getPortfolioTrades: useCallback((portfolioId: string) => {
      return portfolioTrades.get(portfolioId) || [];
    }, [portfolioTrades]),
    
    getPortfolioRiskLimits: useCallback((portfolioId: string) => {
      return portfolioRiskLimits.get(portfolioId);
    }, [portfolioRiskLimits]),
    
    getPortfolioRiskAssessment: useCallback((portfolioId: string) => {
      return riskAssessments.get(portfolioId);
    }, [riskAssessments]),
    
    // Direct access to service
    portfolioManager,
  };
}