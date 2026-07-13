import { createSlice } from '@reduxjs/toolkit';

const storedToken = window.localStorage.getItem('token');
const storedUser = window.localStorage.getItem('user');

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
    }
  },
  extraReducers: (builder) => {
    // Triggered by apiSlice when a request comes back 401 (expired/invalid token)
    builder.addCase('auth/forceLogout', (state) => {
      state.user = null;
      state.token = null;
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
    });
  }
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => Boolean(state.auth.token);
