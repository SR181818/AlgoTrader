import BinanceDataService from '../utils/ccxtDataService';

// Singleton instance for live price fetching
const binanceService = new BinanceDataService();

export default binanceService;
