import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import documentReducer from './documentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    documents: documentReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'meta.arg'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.sessionExpiry']
      }
    }),
  devTools: import.meta.env.MODE !== 'production'
});

export default store;
