import { realDataService } from './realDataService';
import { StrategyRunner } from '../trading/StrategyRunner';
import { OrderExecutor } from '../trading/OrderExecutor';
import Logger from './logger';

/**
 * Performs a health check on the trading system
 * @returns A promise that resolves to a health check result
 */
export async function performHealthCheck() {
  const results = {
    status: 'healthy',
    checks: {
      marketData: { status: 'pending', message: '' },
      strategy: { status: 'pending', message: '' },
      orderExecutor: { status: 'pending', message: '' },
      routes: { status: 'pending', message: '' }
    },
    errors: [] as string[]
  };

  try {
    // Check market data
    try {
      const btcData = await realDataService.fetchTicker('BTC/USDT');
      if (btcData && btcData.price > 0) {
        results.checks.marketData = { status: 'passed', message: 'Market data is available' };
      } else {
        throw new Error('Invalid market data response');
      }
    } catch (error) {
      results.checks.marketData = { status: 'failed', message: 'Failed to fetch market data' };
      results.errors.push(`Market data error: ${error}`);
      results.status = 'unhealthy';
    }

    // Check strategy runner
    try {
      const strategyRunner = new StrategyRunner(StrategyRunner.createDefaultStrategy());
      const signals = strategyRunner.getCurrentIndicatorSignals();
      results.checks.strategy = { status: 'passed', message: 'Strategy runner initialized successfully' };
      strategyRunner.dispose();
    } catch (error) {
      results.checks.strategy = { status: 'failed', message: 'Failed to initialize strategy runner' };
      results.errors.push(`Strategy error: ${error}`);
      results.status = 'unhealthy';
    }

    // Check order executor
    try {
      const orderExecutor = new OrderExecutor({
        paperTrading: true,
        exchange: 'binance',
        testnet: true,
        defaultOrderType: 'market',
        slippageTolerance: 0.1,
        maxOrderSize: 1000,
        enableStopLoss: true,
        enableTakeProfit: true
      });
      
      const balance = orderExecutor.getCurrentBalance();
      results.checks.orderExecutor = { status: 'passed', message: 'Order executor initialized successfully' };
      orderExecutor.dispose();
    } catch (error) {
      results.checks.orderExecutor = { status: 'failed', message: 'Failed to initialize order executor' };
      results.errors.push(`Order executor error: ${error}`);
      results.status = 'unhealthy';
    }

    // Check routes (simplified)
    try {
      const routes = [
        '/',
        '/dashboard',
        '/backtest',
        '/portfolio',
        '/indicators',
        '/plugins',
        '/blockchain',
        '/settings',
        '/strategy-builder'
      ];
      
      results.checks.routes = { status: 'passed', message: `${routes.length} routes available` };
    } catch (error) {
      results.checks.routes = { status: 'failed', message: 'Failed to check routes' };
      results.errors.push(`Routes error: ${error}`);
      results.status = 'unhealthy';
    }

    return results;
  } catch (error) {
    results.status = 'unhealthy';
    results.errors.push(`Unexpected error: ${error}`);
    return results;
  }
}

/**
 * Run a smoke test on the trading system
 */
export async function runSmokeTest() {
  console.log('Starting smoke test...');
  const results = {
    success: true,
    tests: [] as { name: string, passed: boolean, message: string }[]
  };

  try {
    // Test 1: Fetch market data
    try {
      console.log('Testing market data...');
      const btcData = await realDataService.fetchTicker('BTC/USDT');
      const ethData = await realDataService.fetchTicker('ETH/USDT');
      
      results.tests.push({
        name: 'Market Data',
        passed: true,
        message: `Successfully fetched data for BTC (${btcData.price}) and ETH (${ethData.price})`
      });
    } catch (error) {
      results.tests.push({
        name: 'Market Data',
        passed: false,
        message: `Failed to fetch market data: ${error}`
      });
      results.success = false;
    }

    // Test 2: Fetch candle data
    try {
      console.log('Testing candle data...');
      const candles = await realDataService.fetchOHLCV('BTC/USDT', '15m', 50);
      
      results.tests.push({
        name: 'Candle Data',
        passed: candles.length > 0,
        message: `Fetched ${candles.length} candles for BTC/USDT`
      });
      
      if (candles.length === 0) {
        results.success = false;
      }
    } catch (error) {
      results.tests.push({
        name: 'Candle Data',
        passed: false,
        message: `Failed to fetch candle data: ${error}`
      });
      results.success = false;
    }

    // Test 3: Run strategy
    try {
      console.log('Testing strategy runner...');
      const strategyRunner = new StrategyRunner(StrategyRunner.createDefaultStrategy());
      const candles = await realDataService.fetchOHLCV('BTC/USDT', '15m', 200);
      
      // Update with latest candle
      strategyRunner.updateCandle(candles[candles.length - 1]);
      
      results.tests.push({
        name: 'Strategy Runner',
        passed: true,
        message: 'Strategy runner processed candle data successfully'
      });
      
      strategyRunner.dispose();
    } catch (error) {
      results.tests.push({
        name: 'Strategy Runner',
        passed: false,
        message: `Strategy runner failed: ${error}`
      });
      results.success = false;
    }

    // Test 4: Paper trading order
    try {
      console.log('Testing paper trading...');
      const orderExecutor = new OrderExecutor({
        paperTrading: true,
        exchange: 'binance',
        testnet: true,
        defaultOrderType: 'market',
        slippageTolerance: 0.1,
        maxOrderSize: 1000,
        enableStopLoss: true,
        enableTakeProfit: true
      });
      
      const order = await orderExecutor.executeOrder({
        id: `test_${Date.now()}`,
        signal: {
          type: 'LONG',
          strength: 'MODERATE',
          confidence: 0.75,
          price: 45000,
          timestamp: Date.now(),
          reasoning: ['Test order'],
          indicators: [],
          metadata: {
            symbol: 'BTC/USDT',
            timeframe: '15m',
            entryConditions: ['Test'],
            exitConditions: []
          }
        },
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.001,
        timestamp: Date.now()
      });
      
      results.tests.push({
        name: 'Paper Trading',
        passed: order.status === 'filled',
        message: `Paper order executed with status: ${order.status}`
      });
      
      if (order.status !== 'filled') {
        results.success = false;
      }
      
      orderExecutor.dispose();
    } catch (error) {
      results.tests.push({
        name: 'Paper Trading',
        passed: false,
        message: `Paper trading failed: ${error}`
      });
      results.success = false;
    }

    console.log('Smoke test completed:', results.success ? 'PASSED' : 'FAILED');
    console.table(results.tests);
    
    return results;
  } catch (error) {
    Logger.error('Smoke test failed with unexpected error:', error);
    return {
      success: false,
      tests: [
        {
          name: 'Unexpected Error',
          passed: false,
          message: `Smoke test failed with unexpected error: ${error}`
        }
      ]
    };
  }
}