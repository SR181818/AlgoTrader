import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  status: 'pending' | 'filled' | 'rejected';
  createdAt: number;
}

interface OrderState {
  orders: Order[];
  optimisticOrderIds: Set<string>;
}

const initialState: OrderState = {
  orders: [],
  optimisticOrderIds: new Set(),
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    placeOrderOptimistic: (state, action: PayloadAction<Order>) => {
      state.orders.push({ ...action.payload, status: 'pending' });
      state.optimisticOrderIds.add(action.payload.id);
    },
    orderFilled: (state, action: PayloadAction<{ id: string }>) => {
      const order = state.orders.find(o => o.id === action.payload.id);
      if (order) {
        order.status = 'filled';
        state.optimisticOrderIds.delete(order.id);
      }
    },
    orderRejected: (state, action: PayloadAction<{ id: string }>) => {
      const order = state.orders.find(o => o.id === action.payload.id);
      if (order) {
        order.status = 'rejected';
        state.optimisticOrderIds.delete(order.id);
      }
    },
    rollbackOrder: (state, action: PayloadAction<{ id: string }>) => {
      state.orders = state.orders.filter(o => o.id !== action.payload.id);
      state.optimisticOrderIds.delete(action.payload.id);
    },
  },
});

export const { placeOrderOptimistic, orderFilled, orderRejected, rollbackOrder } = orderSlice.actions;
export default orderSlice.reducer;
