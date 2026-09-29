import { configureStore } from '@reduxjs/toolkit';

import { apiSlice } from '../services/apiSlice';
import authReducer from '../features/auth/authSlice';
import notificationReducer from './notificationSlice';
import themeReducer from '../theme/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notification: notificationReducer,
    theme: themeReducer,
    [apiSlice.reducerPath]: apiSlice.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware)
});
