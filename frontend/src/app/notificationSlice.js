import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  open: false,
  message: '',
  severity: 'info'
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.message = action.payload.message;
      state.severity = action.payload.severity || 'info';
      state.open = true;
    },
    hideNotification: (state) => {
      state.open = false;
    }
  }
});

export const { hideNotification, showNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
