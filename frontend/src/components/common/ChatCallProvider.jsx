import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { selectCurrentToken } from '../../features/auth/authSlice';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');
const ChatCallContext = createContext(null);
const rtcConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const CallVideo = ({ stream, muted = false, label, localPreview = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
      style={{
        display: stream ? 'block' : 'none',
        width: localPreview ? '28%' : '100%',
        maxHeight: localPreview ? 150 : 'min(56vh, 520px)',
        position: localPreview ? 'absolute' : 'static',
        right: localPreview ? 8 : undefined,
        bottom: localPreview ? 8 : undefined,
        objectFit: 'contain',
        background: '#111',
        borderRadius: localPreview ? 8 : undefined
      }}
    />
  );
};

const ChatCallProvider = ({ children }) => {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectCurrentToken);
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const socketRef = useRef(null);
  const callRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const updateCall = useCallback((nextCall) => {
    const resolvedCall = typeof nextCall === 'function'
      ? nextCall(callRef.current)
      : nextCall;
    callRef.current = resolvedCall;
    setCall(resolvedCall);
  }, []);

  const releaseMedia = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMicrophoneEnabled(true);
    setCameraEnabled(true);
  }, []);

  const resetCall = useCallback(() => {
    releaseMedia();
    updateCall(null);
  }, [releaseMedia, updateCall]);

  const notifyError = useCallback((message) => {
    dispatch(showNotification({ message, severity: 'error' }));
  }, [dispatch]);

  const createPeerConnection = useCallback((currentCall) => {
    const socket = socketRef.current;
    const stream = localStreamRef.current;
    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = peerConnection;
    stream?.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket?.emit('call:ice-candidate', {
          callId: currentCall.callId,
          candidate
        });
      }
    };
    peerConnection.ontrack = ({ streams }) => {
      const [incomingStream] = streams;
      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
      }
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed') {
        socket?.emit('call:end', { callId: currentCall.callId });
        resetCall();
        notifyError('The call connection failed. Please try again.');
      }
    };
    return peerConnection;
  }, [notifyError, resetCall]);

  const flushPendingCandidates = useCallback(async (peerConnection) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    await Promise.all(candidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('call:incoming', (incomingCall) => {
      if (callRef.current) {
        socket.emit('call:decline', { callId: incomingCall.callId });
        return;
      }
      updateCall({
        ...incomingCall,
        peerId: incomingCall.callerId,
        peerName: incomingCall.callerName,
        direction: 'incoming',
        status: 'ringing'
      });
    });

    socket.on('call:outgoing', (outgoingCall) => {
      updateCall((currentCall) => currentCall ? ({
        ...currentCall,
        ...outgoingCall,
        peerId: outgoingCall.recipientId,
        peerName: outgoingCall.recipientName,
        direction: 'outgoing',
        status: 'ringing'
      }) : currentCall);
    });

    socket.on('call:accepted', async ({ callId }) => {
      const currentCall = callRef.current;
      if (!currentCall || currentCall.callId !== callId) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: currentCall.callType === 'video'
        });
        if (callRef.current?.callId !== callId) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        const peerConnection = createPeerConnection(currentCall);
        updateCall({ ...currentCall, status: 'connecting' });
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call:offer', {
          callId,
          description: peerConnection.localDescription
        });
      } catch (error) {
        if (callRef.current?.callId !== callId) return;
        socket.emit('call:end', { callId });
        resetCall();
        notifyError(error.name === 'NotAllowedError'
          ? 'Allow microphone and camera access to start the call.'
          : 'Could not access your microphone or camera.');
      }
    });

    socket.on('call:offer', async ({ callId, description }) => {
      const currentCall = callRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!currentCall || currentCall.callId !== callId || !peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(description);
        await flushPendingCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('call:answer', {
          callId,
          description: peerConnection.localDescription
        });
        updateCall({ ...currentCall, status: 'connecting' });
      } catch {
        socket.emit('call:end', { callId });
        resetCall();
        notifyError('Could not establish the call.');
      }
    });

    socket.on('call:answer', async ({ callId, description }) => {
      const currentCall = callRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!currentCall || currentCall.callId !== callId || !peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(description);
        await flushPendingCandidates(peerConnection);
        updateCall({ ...currentCall, status: 'connected' });
      } catch {
        socket.emit('call:end', { callId });
        resetCall();
        notifyError('Could not establish the call.');
      }
    });

    socket.on('call:ice-candidate', async ({ callId, candidate }) => {
      const currentCall = callRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!currentCall || currentCall.callId !== callId) return;
      if (!peerConnection?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch {
        notifyError('A network connection could not be established for the call.');
      }
    });

    socket.on('call:declined', ({ callId }) => {
      if (callRef.current?.callId !== callId) return;
      resetCall();
      dispatch(showNotification({ message: 'The call was declined.', severity: 'info' }));
    });

    socket.on('call:ended', ({ callId, message }) => {
      if (callRef.current?.callId !== callId) return;
      resetCall();
      if (message) dispatch(showNotification({ message, severity: 'info' }));
    });

    socket.on('call:error', ({ message }) => {
      resetCall();
      notifyError(message || 'Could not start this call.');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      resetCall();
    };
  }, [
    accessToken,
    createPeerConnection,
    dispatch,
    flushPendingCandidates,
    notifyError,
    resetCall,
    updateCall
  ]);

  const startCall = useCallback((person, callType) => {
    if (!socketRef.current?.connected) {
      notifyError('Call service is not connected. Please try again.');
      return;
    }
    if (callRef.current) {
      notifyError('Finish your current call before starting another one.');
      return;
    }
    updateCall({
      peerId: person.id,
      peerName: person.name,
      callType,
      direction: 'outgoing',
      status: 'starting'
    });
    socketRef.current.emit('call:invite', {
      recipientId: person.id,
      callType
    });
  }, [notifyError, updateCall]);

  const acceptCall = useCallback(async () => {
    const currentCall = callRef.current;
    if (!currentCall || currentCall.direction !== 'incoming') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentCall.callType === 'video'
      });
      if (callRef.current?.callId !== currentCall.callId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      createPeerConnection(currentCall);
      updateCall({ ...currentCall, status: 'connecting' });
      socketRef.current?.emit('call:accept', { callId: currentCall.callId });
    } catch (error) {
      if (callRef.current?.callId !== currentCall.callId) return;
      socketRef.current?.emit('call:decline', { callId: currentCall.callId });
      resetCall();
      notifyError(error.name === 'NotAllowedError'
        ? 'Allow microphone and camera access to answer the call.'
        : 'Could not access your microphone or camera.');
    }
  }, [createPeerConnection, notifyError, resetCall, updateCall]);

  const declineCall = useCallback(() => {
    const currentCall = callRef.current;
    if (!currentCall) return;
    socketRef.current?.emit(
      currentCall.direction === 'incoming' ? 'call:decline' : 'call:end',
      { callId: currentCall.callId }
    );
    resetCall();
  }, [resetCall]);

  const toggleMicrophone = useCallback(() => {
    const enabled = !microphoneEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicrophoneEnabled(enabled);
  }, [microphoneEnabled]);

  const toggleCamera = useCallback(() => {
    const enabled = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCameraEnabled(enabled);
  }, [cameraEnabled]);

  const value = { call, startCall };

  return (
    <ChatCallContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(call)}
        onClose={call?.status === 'ringing' ? declineCall : undefined}
        fullWidth
        maxWidth="sm"
        aria-labelledby="chat-call-title"
      >
        {call && (
          <>
            <DialogTitle id="chat-call-title">
              {call.status === 'ringing'
                ? call.direction === 'incoming' ? `Incoming ${call.callType} call` : `Calling ${call.peerName}…`
                : `${call.callType === 'video' ? 'Video' : 'Audio'} call`}
            </DialogTitle>
            <DialogContent>
              {call.status === 'ringing' ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
                  <Avatar sx={{ width: 68, height: 68 }}>
                    {call.peerName?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Typography>{call.peerName}</Typography>
                  {call.direction === 'outgoing' && (
                    <Typography variant="body2" color="text.secondary">Waiting for them to answer…</Typography>
                  )}
                </Stack>
              ) : (
                <Box sx={{ position: 'relative', minHeight: call.callType === 'video' ? 220 : 150 }}>
                  {call.callType === 'video' ? (
                    <>
                      <CallVideo stream={remoteStream} label={`${call.peerName}'s video`} />
                      <CallVideo
                        stream={localStream}
                        muted
                        label="Your video"
                        localPreview
                      />
                    </>
                  ) : (
                    <>
                      <audio ref={(element) => {
                        if (element) element.srcObject = remoteStream;
                      }} autoPlay />
                      <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                        <Avatar sx={{ width: 68, height: 68 }}>
                          {call.peerName?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <Typography>{call.peerName}</Typography>
                      </Stack>
                    </>
                  )}
                  {call.status === 'connecting' && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                      Connecting…
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              {call.direction === 'incoming' && call.status === 'ringing' ? (
                <>
                  <Button color="error" startIcon={<CallEndIcon />} onClick={declineCall}>
                    Decline
                  </Button>
                  <Button variant="contained" onClick={acceptCall}>
                    Answer
                  </Button>
                </>
              ) : call.status === 'ringing' ? (
                <Button color="error" startIcon={<CallEndIcon />} onClick={declineCall}>
                  Cancel call
                </Button>
              ) : (
                <>
                  <IconButton
                    aria-label={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
                    onClick={toggleMicrophone}
                    color={microphoneEnabled ? 'default' : 'primary'}
                  >
                    {microphoneEnabled ? <MicIcon /> : <MicOffIcon />}
                  </IconButton>
                  {call.callType === 'video' && (
                    <IconButton
                      aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                      onClick={toggleCamera}
                      color={cameraEnabled ? 'default' : 'primary'}
                    >
                      {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                    </IconButton>
                  )}
                  <IconButton aria-label="End call" color="error" onClick={declineCall}>
                    <CallEndIcon />
                  </IconButton>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </ChatCallContext.Provider>
  );
};

const useChatCalls = () => {
  const context = useContext(ChatCallContext);
  if (!context) throw new Error('useChatCalls must be used within ChatCallProvider');
  return context;
};

export { ChatCallProvider, useChatCalls };
