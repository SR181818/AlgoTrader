import CCXTDataService from '../utils/ccxtDataService';

// Singleton instance for live price fetching
const ccxtService = new CCXTDataService();

export default ccxtService;
