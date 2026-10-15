import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';

import { showNotification } from '../../app/notificationSlice';
import { setCredentials } from './authSlice';
import { useSocialLoginMutation } from './authApi';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const googleClientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
let googleScriptPromise;
console.log('Google Client ID:', googleClientId);
console.log('Google Client Secret:', googleClientSecret);       
const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Unable to load Google sign-in.'));
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
};

const MicrosoftMark = () => (
  <Box
    aria-hidden="true"
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 9px)',
      gridTemplateRows: 'repeat(2, 9px)',
      gap: '2px',
      mr: 1.5
    }}
  >
    <Box sx={{ bgcolor: '#f25022' }} />
    <Box sx={{ bgcolor: '#7fba00' }} />
    <Box sx={{ bgcolor: '#00a4ef' }} />
    <Box sx={{ bgcolor: '#ffb900' }} />
  </Box>
);

const SocialAuthButtons = ({ disabled = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const credentialHandlerRef = useRef(null);
  const notificationHandlerRef = useRef(null);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [socialLogin, { isLoading }] = useSocialLoginMutation();
  const busy = disabled || isLoading || microsoftLoading;

  notificationHandlerRef.current = (message) => {
    dispatch(showNotification({ message, severity: 'error' }));
  };

  credentialHandlerRef.current = async (provider, credential) => {
    if (!credential) {
      notificationHandlerRef.current(`${provider} did not return a sign-in credential.`);
      return;
    }

    try {
      const result = await socialLogin({ provider, credential }).unwrap();
      const payload = result?.data ?? result;
      dispatch(setCredentials({ user: payload.user, accessToken: payload.accessToken }));
      dispatch(showNotification({ message: 'Signed in successfully.', severity: 'success' }));
      const roleHome = payload.user?.role === 'doctor'
        ? '/doctor'
        : payload.user?.role === 'patient'
          ? '/appointments'
          : '/products';
      navigate(location.state?.from?.pathname || roleHome, { replace: true });
    } catch (error) {
      notificationHandlerRef.current(
        error?.data?.message || `${provider} sign-in failed. Please try again.`
      );
    }
  };

  useEffect(() => {
    if (!googleClientId) return undefined;
    let active = true;

    loadGoogleIdentity()
      .then(() => {
        if (!active || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => credentialHandlerRef.current('google', response.credential)
        });
        googleButtonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(Math.max(googleButtonRef.current.clientWidth, 200), 400),
          logo_alignment: 'left'
        });
      })
      .catch((error) => {
        if (active) notificationHandlerRef.current(error.message);
      });

    return () => {
      active = false;
      googleButtonRef.current?.replaceChildren();
    };
  }, []);

  const handleMicrosoftSignIn = async () => {
    if (!microsoftClientId || busy) return;
    setMicrosoftLoading(true);
    try {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const client = new PublicClientApplication({
        auth: {
          clientId: microsoftClientId,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin
        }
      });
      await client.initialize();
      const response = await client.loginPopup({ scopes: ['openid', 'profile', 'email'] });
      await credentialHandlerRef.current('microsoft', response.idToken);
    } catch (error) {
      const message = error?.errorCode === 'user_cancelled'
        ? 'Microsoft sign-in was cancelled.'
        : 'Unable to complete Microsoft sign-in.';
      notificationHandlerRef.current(message);
    } finally {
      setMicrosoftLoading(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Divider>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          or continue with
        </Typography>
      </Divider>

      <Box
        ref={googleButtonRef}
        sx={{
          minHeight: 40,
          display: googleClientId ? 'flex' : 'none',
          justifyContent: 'center',
          pointerEvents: busy ? 'none' : 'auto',
          opacity: busy ? 0.6 : 1
        }}
      />
      {!googleClientId && (
        <Button variant="outlined" fullWidth disabled>
          Continue with Google
        </Button>
      )}

      <Button
        variant="outlined"
        fullWidth
        onClick={handleMicrosoftSignIn}
        disabled={busy || !microsoftClientId}
        startIcon={microsoftLoading ? <CircularProgress size={18} /> : <MicrosoftMark />}
        sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
      >
        Continue with Microsoft
      </Button>
      {(!googleClientId || !microsoftClientId) && (
        <Typography variant="caption" color="text.secondary" align="center">
          Configure the provider client IDs to enable social sign-in.
        </Typography>
      )}
    </Stack>
  );
};

export default SocialAuthButtons;
