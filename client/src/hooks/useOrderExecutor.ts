import { useEffect, useState, useCallback, useRef } from 'react';
import { Subscription } from 'rxjs';
import { OrderExecutor, Order, Position, Balance, OrderIntent, ExecutorConfig, ExecutorStats } from '../trading/OrderExecutor';

export interface UseOrderExecutorOptions {
  autoStart?: boolean;
  enableLogging?: boolean;
}

export const useOrderExecutor = (
  config: ExecutorConfig,
  options: UseOrderExecutorOptions = {}
) => {
  const { autoStart = true, enableLogging = false } = options;
  
  const [orderExecutor] = useState(() => new OrderExecutor(config));
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<Balance>({});
  const [stats, setStats] = useState<ExecutorStats>({
    totalOrders: 0,
    filledOrders: 0,
    cancelledOrders: 0,
    rejectedOrders: 0,
    totalVolume: 0,
    totalFees: 0,
    averageFillTime: 0,
    successRate: 0
  });
  const [errors, setErrors] = useState<Array<{ type: string; message: string; timestamp: number }>>([]);
  const [isActive, setIsActive] = useState(autoStart);
  
  const subscriptionsRef = useRef<Subscription[]>([]);

  // Subscribe to order executor updates
  useEffect(() => {
    if (isActive) {
      const orderSub = orderExecutor.getOrderUpdates().subscribe({
        next: (order) => {
          setOrders(prev => {
            const updated = prev.filter(o => o.id !== order.id);
            return [...updated, order].sort((a, b) => b.timestamp - a.timestamp);
          });
          
          if (enableLogging) {
            console.log('Order update:', order);
          }
        },
        error: (error) => {
          console.error('Order update error:', error);
        }
      });

      const positionSub = orderExecutor.getPositionUpdates().subscribe({
        next: (position) => {
          setPositions(prev => {
            const updated = prev.filter(p => p.symbol !== position.symbol);
            return [...updated, position];
          });
          
          if (enableLogging) {
            console.log('Position update:', position);
          }
        },
        error: (error) => {
          console.error('Position update error:', error);
        }
      });

      const balanceSub = orderExecutor.getBalanceUpdates().subscribe({
        next: (newBalance) => {
          setBalance(newBalance);
          
          if (enableLogging) {
            console.log('Balance update:', newBalance);
          }
        },
        error: (error) => {
          console.error('Balance update error:', error);
        }
      });

      const errorSub = orderExecutor.getErrorUpdates().subscribe({
        next: (error) => {
          setErrors(prev => [
            { ...error, timestamp: Date.now() },
            ...prev.slice(0, 49) // Keep last 50 errors
          ]);
          
          console.error('OrderExecutor error:', error);
        }
      });

      subscriptionsRef.current = [orderSub, positionSub, balanceSub, errorSub];

      // Update stats periodically
      const statsInterval = setInterval(() => {
        setStats(orderExecutor.getStats());
      }, 1000);

      return () => {
        subscriptionsRef.current.forEach(sub => sub.unsubscribe());
        clearInterval(statsInterval);
      };
    }
  }, [isActive, enableLogging]);

  // Execute order
  const executeOrder = useCallback(async (intent: OrderIntent): Promise<Order> => {
    try {
      const order = await orderExecutor.executeOrder(intent);
      
      if (enableLogging) {
        console.log('Order executed:', order);
      }
      
      return order;
    } catch (error) {
      console.error('Failed to execute order:', error);
      throw error;
    }
  }, [enableLogging]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const result = await orderExecutor.cancelOrder(orderId);
      
      if (enableLogging) {
        console.log(`Order ${orderId} ${result ? 'cancelled' : 'cancel failed'}`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }, [enableLogging]);

  // Get order by ID
  const getOrder = useCallback((orderId: string): Order | undefined => {
    return orderExecutor.getOrder(orderId);
  }, []);

  // Get orders by status
  const getOrdersByStatus = useCallback((status: Order['status']): Order[] => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  // Get position by symbol
  const getPosition = useCallback((symbol: string): Position | undefined => {
    return orderExecutor.getPosition(symbol);
  }, []);

  // Get open positions
  const getOpenPositions = useCallback((): Position[] => {
    return positions.filter(position => position.amount > 0);
  }, [positions]);

  // Get total portfolio value
  const getPortfolioValue = useCallback((): number => {
    const balanceValue = Object.values(balance).reduce((sum, curr) => {
      // Simplified: assume all currencies are worth their USDT equivalent
      return sum + curr.total;
    }, 0);
    
    const positionValue = positions.reduce((sum, position) => {
      return sum + position.unrealizedPnL;
    }, 0);
    
    return balanceValue + positionValue;
  }, [balance, positions]);

  // Get total unrealized P&L
  const getTotalUnrealizedPnL = useCallback((): number => {
    return positions.reduce((sum, position) => sum + position.unrealizedPnL, 0);
  }, [positions]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Start/stop executor
  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      orderExecutor.dispose();
    };
  }, []);

  return {
    // State
    orders,
    positions,
    balance,
    stats,
    errors,
    isActive,
    
    // Actions
    executeOrder,
    cancelOrder,
    start,
    stop,
    clearErrors,
    
    // Getters
    getOrder,
    getOrdersByStatus,
    getPosition,
    getOpenPositions,
    getPortfolioValue,
    getTotalUnrealizedPnL,
    
    // Utilities
    getCurrentBalance: () => orderExecutor.getCurrentBalance(),
    getAllOrders: () => orderExecutor.getAllOrders(),
    getAllPositions: () => orderExecutor.getAllPositions(),
  };
};

// Hook for order management
export const useOrderManagement = (orderExecutor: OrderExecutor) => {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [filledOrders, setFilledOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);

  useEffect(() => {
    const subscription = orderExecutor.getOrderUpdates().subscribe(order => {
      // Update order lists based on status
      const updateOrderList = (
        setter: React.Dispatch<React.SetStateAction<Order[]>>,
        targetStatus: Order['status']
      ) => {
        if (order.status === targetStatus) {
          setter(prev => {
            const updated = prev.filter(o => o.id !== order.id);
            return [...updated, order];
          });
        } else {
          setter(prev => prev.filter(o => o.id !== order.id));
        }
      };

      updateOrderList(setPendingOrders, 'pending');
      updateOrderList(setFilledOrders, 'filled');
      updateOrderList(setCancelledOrders, 'cancelled');
    });

    return () => subscription.unsubscribe();
  }, [orderExecutor]);

  return {
    pendingOrders,
    filledOrders,
    cancelledOrders,
  };
};

// Hook for position management
export const usePositionManagement = (orderExecutor: OrderExecutor) => {
  const [longPositions, setLongPositions] = useState<Position[]>([]);
  const [shortPositions, setShortPositions] = useState<Position[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);

  useEffect(() => {
    const subscription = orderExecutor.getPositionUpdates().subscribe(position => {
      if (position.side === 'long') {
        setLongPositions(prev => {
          const updated = prev.filter(p => p.symbol !== position.symbol);
          return position.amount > 0 ? [...updated, position] : updated;
        });
      } else {
        setShortPositions(prev => {
          const updated = prev.filter(p => p.symbol !== position.symbol);
          return position.amount > 0 ? [...updated, position] : updated;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [orderExecutor]);

  useEffect(() => {
    const total = [...longPositions, ...shortPositions]
      .reduce((sum, position) => sum + position.unrealizedPnL, 0);
    setTotalPnL(total);
  }, [longPositions, shortPositions]);

  return {
    longPositions,
    shortPositions,
    totalPnL,
  };
};