import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { showNotification } from '../../app/notificationSlice';
import { apiSlice } from '../../services/apiSlice';
import { logout, selectCurrentToken, selectCurrentUser } from '../../features/auth/authSlice';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');
const getId = (user) => user?._id || user?.id;

const RealtimeNotifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accessToken = useSelector(selectCurrentToken);
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    if (!accessToken || !user?.id) return undefined;

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    socket.on('message:new', (message) => {
      const senderId = getId(message.sender);
      const recipientId = getId(message.recipient);
      const peerId = senderId === user.id ? recipientId : senderId;
      dispatch(apiSlice.util.invalidateTags([
        { type: 'Community', id: `messages:${peerId}` },
        { type: 'Community', id: 'UNREAD_MESSAGES' }
      ]));

      if (recipientId === user.id && senderId !== user.id) {
        dispatch(showNotification({
          message: `${message.sender?.name || 'Someone'} sent you a message.`,
          severity: 'info',
          actionLabel: 'View',
          actionPath: '/messages'
        }));
      }
    });

    const refreshCommunity = () => {
      dispatch(apiSlice.util.invalidateTags([
        { type: 'Community', id: 'DIRECTORY' },
        { type: 'Community', id: 'REQUESTS' }
      ]));
    };
    socket.on('friend-request:updated', refreshCommunity);
    socket.on('account:updated', () => window.location.reload());
    socket.on('account:deleted', () => {
      socket.disconnect();
      dispatch(logout());
      dispatch(showNotification({
        message: 'Your account was removed by an administrator.',
        severity: 'warning'
      }));
      navigate('/login', { replace: true });
    });

    return () => socket.disconnect();
  }, [accessToken, dispatch, navigate, user?.id]);

  return null;
};

export default RealtimeNotifications;
