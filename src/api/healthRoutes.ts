import { performHealthCheck } from '../utils/healthCheck';

// Simulated REST API endpoints for health checks
// In a real application, these would be Express.js routes or similar

export class HealthAPI {
  /**
   * GET /api/health
   * Returns the health status of the application
   */
  async getHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const healthStatus = await performHealthCheck();
      return { 
        success: healthStatus.status === 'healthy', 
        data: healthStatus 
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return { 
        success: false, 
        data: { 
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }
  
  /**
   * GET /api/health/market-data
   * Checks the health of market data services
   */
  async getMarketDataHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const healthStatus = await performHealthCheck();
      return { 
        success: healthStatus.checks.marketData.status === 'passed', 
        data: healthStatus.checks.marketData 
      };
    } catch (error) {
      console.error('Market data health check failed:', error);
      return { 
        success: false, 
        data: { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }
  
  /**
   * GET /api/health/strategy
   * Checks the health of strategy services
   */
  async getStrategyHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const healthStatus = await performHealthCheck();
      return { 
        success: healthStatus.checks.strategy.status === 'passed', 
        data: healthStatus.checks.strategy 
      };
    } catch (error) {
      console.error('Strategy health check failed:', error);
      return { 
        success: false, 
        data: { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }
  
  /**
   * GET /api/health/order-executor
   * Checks the health of order execution services
   */
  async getOrderExecutorHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const healthStatus = await performHealthCheck();
      return { 
        success: healthStatus.checks.orderExecutor.status === 'passed', 
        data: healthStatus.checks.orderExecutor 
      };
    } catch (error) {
      console.error('Order executor health check failed:', error);
      return { 
        success: false, 
        data: { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }
}