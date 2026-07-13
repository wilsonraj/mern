import { createSlice } from '@reduxjs/toolkit';

const getInitialMode = () => {
  const stored = window.localStorage.getItem('themeMode');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: getInitialMode()
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      window.localStorage.setItem('themeMode', state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      window.localStorage.setItem('themeMode', state.mode);
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
