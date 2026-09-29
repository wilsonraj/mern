import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useDispatch, useSelector } from 'react-redux';

import { hideNotification } from '../../app/notificationSlice';

const ToastNotification = () => {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector((state) => state.notification);

  const closeNotification = (_, reason) => {
    if (reason !== 'clickaway') {
      dispatch(hideNotification());
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={4500}
      onClose={closeNotification}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={closeNotification} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ToastNotification;
