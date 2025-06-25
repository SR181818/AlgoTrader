from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import vectorbt as vbt
import time
from datetime import datetime

app = FastAPI(title="Backtesting Microservice")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Candle(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class StrategyParams(BaseModel):
    fast_window: int = 20
    slow_window: int = 50
    rsi_window: int = 14
    rsi_oversold: int = 30
    rsi_overbought: int = 70
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.04
    strategy_type: str = "ma_crossover"  # ma_crossover, rsi, macd, etc.
    initial_capital: float = 10000
    commission_pct: float = 0.001

class BacktestRequest(BaseModel):
    candles: List[Candle]
    strategy_params: StrategyParams
    symbol: str = "BTC/USDT"
    timeframe: str = "15m"

class BacktestResult(BaseModel):
    total_return: float
    total_return_pct: float
    sharpe_ratio: float
    max_drawdown: float
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]
    execution_time: float

@app.get("/")
async def root():
    return {"message": "Backtesting Microservice is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/run-backtest", response_model=BacktestResult)
async def run_backtest(request: BacktestRequest):
    start_time = time.time()
    
    try:
        # Convert candles to DataFrame
        df = pd.DataFrame([candle.dict() for candle in request.candles])
        df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('date', inplace=True)
        
        # Ensure data is sorted
        df = df.sort_index()
        
        # Run strategy based on type
        if request.strategy_params.strategy_type == "ma_crossover":
            result = run_ma_crossover_strategy(df, request.strategy_params)
        elif request.strategy_params.strategy_type == "rsi":
            result = run_rsi_strategy(df, request.strategy_params)
        else:
            raise HTTPException(status_code=400, detail=f"Strategy type '{request.strategy_params.strategy_type}' not supported")
        
        # Calculate execution time
        execution_time = time.time() - start_time
        result["execution_time"] = execution_time
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

def run_ma_crossover_strategy(df: pd.DataFrame, params: StrategyParams) -> dict:
    # Calculate moving averages
    fast_ma = vbt.MA.run(df['close'], window=params.fast_window)
    slow_ma = vbt.MA.run(df['close'], window=params.slow_window)
    
    # Generate entry signals
    entries = fast_ma.ma_above(slow_ma)
    exits = fast_ma.ma_below(slow_ma)
    
    # Run backtest
    portfolio = vbt.Portfolio.from_signals(
        df['close'],
        entries,
        exits,
        init_cash=params.initial_capital,
        fees=params.commission_pct,
        sl_stop=params.stop_loss_pct,
        tp_stop=params.take_profit_pct
    )
    
    # Get trade statistics
    stats = portfolio.stats()
    trades = portfolio.trades
    
    # Prepare equity curve
    equity_curve = []
    for i, value in enumerate(portfolio.equity.values):
        equity_curve.append({
            "timestamp": int(df.index[i].timestamp() * 1000),
            "value": float(value)
        })
    
    # Prepare trades list
    trade_list = []
    for trade in trades.records_arr:
        entry_time = int(df.index[trade['entry_idx']].timestamp() * 1000)
        exit_time = int(df.index[trade['exit_idx']].timestamp() * 1000) if trade['exit_idx'] != -1 else None
        
        trade_list.append({
            "id": str(trade['id']),
            "symbol": df.get('symbol', 'Unknown'),
            "side": "buy" if trade['direction'] > 0 else "sell",
            "entryTime": entry_time,
            "exitTime": exit_time,
            "entryPrice": float(trade['entry_price']),
            "exitPrice": float(trade['exit_price']) if trade['exit_price'] != 0 else None,
            "quantity": float(trade['size']),
            "pnl": float(trade['pnl']),
            "pnlPercent": float(trade['return']) * 100,
            "status": "closed" if trade['exit_idx'] != -1 else "open"
        })
    
    # Calculate additional metrics
    winning_trades = trades.win_count
    losing_trades = trades.lose_count
    total_trades = winning_trades + losing_trades
    win_rate = winning_trades / total_trades if total_trades > 0 else 0
    
    avg_win = trades.win_pnl.mean() if winning_trades > 0 else 0
    avg_loss = trades.lose_pnl.mean() if losing_trades > 0 else 0
    
    largest_win = trades.win_pnl.max() if winning_trades > 0 else 0
    largest_loss = trades.lose_pnl.min() if losing_trades > 0 else 0
    
    profit_factor = abs(trades.win_pnl.sum() / trades.lose_pnl.sum()) if trades.lose_pnl.sum() != 0 else float('inf')
    
    return {
        "total_return": float(stats["Total Return"]),
        "total_return_pct": float(stats["Total Return [%]"]),
        "sharpe_ratio": float(stats["Sharpe Ratio"]),
        "max_drawdown": float(stats["Max Drawdown"]),
        "max_drawdown_pct": float(stats["Max Drawdown [%]"]),
        "win_rate": float(win_rate * 100),
        "profit_factor": float(profit_factor),
        "total_trades": int(total_trades),
        "winning_trades": int(winning_trades),
        "losing_trades": int(losing_trades),
        "avg_win": float(avg_win),
        "avg_loss": float(avg_loss),
        "largest_win": float(largest_win),
        "largest_loss": float(largest_loss),
        "equity_curve": equity_curve,
        "trades": trade_list,
        "execution_time": 0  # Will be updated later
    }

def run_rsi_strategy(df: pd.DataFrame, params: StrategyParams) -> dict:
    # Calculate RSI
    rsi = vbt.RSI.run(df['close'], window=params.rsi_window)
    
    # Generate entry signals
    entries = rsi.rsi_below(params.rsi_oversold)
    exits = rsi.rsi_above(params.rsi_overbought)
    
    # Run backtest
    portfolio = vbt.Portfolio.from_signals(
        df['close'],
        entries,
        exits,
        init_cash=params.initial_capital,
        fees=params.commission_pct,
        sl_stop=params.stop_loss_pct,
        tp_stop=params.take_profit_pct
    )
    
    # Get trade statistics
    stats = portfolio.stats()
    trades = portfolio.trades
    
    # Prepare equity curve
    equity_curve = []
    for i, value in enumerate(portfolio.equity.values):
        equity_curve.append({
            "timestamp": int(df.index[i].timestamp() * 1000),
            "value": float(value)
        })
    
    # Prepare trades list
    trade_list = []
    for trade in trades.records_arr:
        entry_time = int(df.index[trade['entry_idx']].timestamp() * 1000)
        exit_time = int(df.index[trade['exit_idx']].timestamp() * 1000) if trade['exit_idx'] != -1 else None
        
        trade_list.append({
            "id": str(trade['id']),
            "symbol": df.get('symbol', 'Unknown'),
            "side": "buy" if trade['direction'] > 0 else "sell",
            "entryTime": entry_time,
            "exitTime": exit_time,
            "entryPrice": float(trade['entry_price']),
            "exitPrice": float(trade['exit_price']) if trade['exit_price'] != 0 else None,
            "quantity": float(trade['size']),
            "pnl": float(trade['pnl']),
            "pnlPercent": float(trade['return']) * 100,
            "status": "closed" if trade['exit_idx'] != -1 else "open"
        })
    
    # Calculate additional metrics
    winning_trades = trades.win_count
    losing_trades = trades.lose_count
    total_trades = winning_trades + losing_trades
    win_rate = winning_trades / total_trades if total_trades > 0 else 0
    
    avg_win = trades.win_pnl.mean() if winning_trades > 0 else 0
    avg_loss = trades.lose_pnl.mean() if losing_trades > 0 else 0
    
    largest_win = trades.win_pnl.max() if winning_trades > 0 else 0
    largest_loss = trades.lose_pnl.min() if losing_trades > 0 else 0
    
    profit_factor = abs(trades.win_pnl.sum() / trades.lose_pnl.sum()) if trades.lose_pnl.sum() != 0 else float('inf')
    
    return {
        "total_return": float(stats["Total Return"]),
        "total_return_pct": float(stats["Total Return [%]"]),
        "sharpe_ratio": float(stats["Sharpe Ratio"]),
        "max_drawdown": float(stats["Max Drawdown"]),
        "max_drawdown_pct": float(stats["Max Drawdown [%]"]),
        "win_rate": float(win_rate * 100),
        "profit_factor": float(profit_factor),
        "total_trades": int(total_trades),
        "winning_trades": int(winning_trades),
        "losing_trades": int(losing_trades),
        "avg_win": float(avg_win),
        "avg_loss": float(avg_loss),
        "largest_win": float(largest_win),
        "largest_loss": float(largest_loss),
        "equity_curve": equity_curve,
        "trades": trade_list,
        "execution_time": 0  # Will be updated later
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)