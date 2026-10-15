import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  open: false,
  message: '',
  severity: 'info',
  actionLabel: '',
  actionPath: ''
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.message = action.payload.message;
      state.severity = action.payload.severity || 'info';
      state.actionLabel = action.payload.actionLabel || '';
      state.actionPath = action.payload.actionPath || '';
      state.open = true;
    },
    hideNotification: (state) => {
      state.open = false;
      state.actionLabel = '';
      state.actionPath = '';
    }
  }
});

export const { hideNotification, showNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
