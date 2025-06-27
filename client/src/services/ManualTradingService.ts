
import { Subject, BehaviorSubject } from 'rxjs';

export interface ManualTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price: number;
  fillPrice?: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
  pnl?: number;
  currentPrice?: number;
}

export interface ManualBalance {
  USDT: number;
  BTC: number;
  ETH: number;
  [key: string]: number;
}

class ManualTradingService {
  private tradesSubject = new BehaviorSubject<ManualTrade[]>([]);
  private balanceSubject = new BehaviorSubject<ManualBalance>({
    USDT: 10000,
    BTC: 0,
    ETH: 0
  });
  private pnlSubject = new BehaviorSubject<number>(0);

  constructor() {
    this.loadFromStorage();
    this.startPriceUpdates();
  }

  private loadFromStorage() {
    try {
      const storedTrades = localStorage.getItem('manualTrades');
      const storedBalance = localStorage.getItem('manualBalance');
      
      if (storedTrades) {
        const trades = JSON.parse(storedTrades);
        this.tradesSubject.next(trades);
      }
      
      if (storedBalance) {
        const balance = JSON.parse(storedBalance);
        this.balanceSubject.next(balance);
      }
    } catch (error) {
      console.warn('Failed to load manual trading data from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('manualTrades', JSON.stringify(this.tradesSubject.value));
      localStorage.setItem('manualBalance', JSON.stringify(this.balanceSubject.value));
    } catch (error) {
      console.warn('Failed to save manual trading data to storage:', error);
    }
  }

  private startPriceUpdates() {
    // Update PnL calculations every 5 seconds with mock price movements
    setInterval(() => {
      this.updatePnL();
    }, 5000);
  }

  private updatePnL() {
    const trades = this.tradesSubject.value;
    const filledTrades = trades.filter(t => t.status === 'filled');
    
    let totalPnL = 0;
    const updatedTrades = filledTrades.map(trade => {
      // Simulate price movement (±2% random movement)
      const priceChange = (Math.random() - 0.5) * 0.04; // ±2%
      const currentPrice = trade.fillPrice! * (1 + priceChange);
      
      // Calculate PnL
      let pnl = 0;
      if (trade.side === 'buy') {
        pnl = (currentPrice - trade.fillPrice!) * trade.quantity;
      } else {
        pnl = (trade.fillPrice! - currentPrice) * trade.quantity;
      }
      
      totalPnL += pnl;
      
      return {
        ...trade,
        currentPrice,
        pnl
      };
    });

    // Update other trades that haven't changed
    const otherTrades = trades.filter(t => t.status !== 'filled');
    const allTrades = [...updatedTrades, ...otherTrades];
    
    this.tradesSubject.next(allTrades);
    this.pnlSubject.next(totalPnL);
    this.saveToStorage();
  }

  addTrade(trade: Omit<ManualTrade, 'id' | 'timestamp'>): ManualTrade {
    const newTrade: ManualTrade = {
      ...trade,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fillPrice: trade.type === 'market' ? trade.price : undefined
    };

    const currentTrades = this.tradesSubject.value;
    const updatedTrades = [newTrade, ...currentTrades];
    this.tradesSubject.next(updatedTrades);

    // Update balance for filled trades
    if (newTrade.status === 'filled') {
      this.updateBalance(newTrade);
    }

    this.saveToStorage();
    return newTrade;
  }

  private updateBalance(trade: ManualTrade) {
    const currentBalance = this.balanceSubject.value;
    const symbolBase = trade.symbol.replace('USDT', '');
    const tradeValue = (trade.fillPrice || trade.price) * trade.quantity;

    let newBalance = { ...currentBalance };

    if (trade.side === 'buy') {
      newBalance.USDT -= tradeValue;
      newBalance[symbolBase] = (newBalance[symbolBase] || 0) + trade.quantity;
    } else {
      newBalance.USDT += tradeValue;
      newBalance[symbolBase] = (newBalance[symbolBase] || 0) - trade.quantity;
    }

    this.balanceSubject.next(newBalance);
  }

  getTrades() {
    return this.tradesSubject.asObservable();
  }

  getBalance() {
    return this.balanceSubject.asObservable();
  }

  getPnL() {
    return this.pnlSubject.asObservable();
  }

  getCurrentTrades(): ManualTrade[] {
    return this.tradesSubject.value;
  }

  getCurrentBalance(): ManualBalance {
    return this.balanceSubject.value;
  }

  getCurrentPnL(): number {
    return this.pnlSubject.value;
  }

  clearData() {
    this.tradesSubject.next([]);
    this.balanceSubject.next({ USDT: 10000, BTC: 0, ETH: 0 });
    this.pnlSubject.next(0);
    localStorage.removeItem('manualTrades');
    localStorage.removeItem('manualBalance');
  }
}

export const manualTradingService = new ManualTradingService();
