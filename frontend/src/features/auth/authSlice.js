import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  ready: false
};

const clearAuthState = (state) => {
  state.user = null;
  state.accessToken = null;
  state.refreshToken = null;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken  } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.ready = true;
    },
    setAuthReady: (state) => {
      state.ready = true;
    },
    logout: (state) => {
      clearAuthState(state);
      state.ready = true;
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/forceLogout', (state) => {
      clearAuthState(state);
      state.ready = true;
    });
  }
});

export const { logout, setAuthReady, setCredentials } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken);
