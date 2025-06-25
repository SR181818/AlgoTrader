// Redux middleware to log illegal state transitions and document invariants
import { Middleware } from '@reduxjs/toolkit';

// Example state invariants (expand as needed)
const stateInvariants = [
  (state) => Array.isArray(state.orders),
  (state) => typeof state.portfolioPnL === 'number',
];

export const illegalStateLogger: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();
  for (const check of stateInvariants) {
    if (!check(state)) {
      // Log illegal state transition
      console.error('Illegal state transition detected after action:', action.type);
    }
  }
  return result;
};

// Documented invariants:
// - orders must always be an array
// - portfolioPnL must always be a number
// Add more as your state grows
