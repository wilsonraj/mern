import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { hideNotification } from '../../app/notificationSlice';

const ToastNotification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { open, message, severity, actionLabel, actionPath } = useSelector((state) => state.notification);

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
      <Alert
        onClose={closeNotification}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
        action={actionLabel && actionPath ? (
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              dispatch(hideNotification());
              navigate(actionPath);
            }}
          >
            {actionLabel}
          </Button>
        ) : undefined}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ToastNotification;
