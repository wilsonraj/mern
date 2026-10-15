import './config/env.js';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import { User } from './models/index.js';
import { getCallPeer } from './services/community.service.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});
const activeCalls = new Map();

app.set('io', io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') throw new Error('Authentication required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'string' || decoded.type !== 'access' || typeof decoded.sub !== 'string') {
      throw new Error('Invalid access token');
    }

    const user = await User.findById(decoded.sub).select('_id name role');
    if (!user) throw new Error('User not found');
    socket.data.userId = user._id.toString();
    socket.data.userName = user.name;
    socket.data.userRole = user.role;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`);

  const findCallForUser = () => [...activeCalls.entries()]
    .find(([, call]) => call.callerId === socket.data.userId ||
      call.recipientId === socket.data.userId);
  const getPeerId = (call) => (
    call.callerId === socket.data.userId ? call.recipientId : call.callerId
  );
  const clearCall = (callId, event, message) => {
    const call = activeCalls.get(callId);
    if (!call) return false;
    activeCalls.delete(callId);
    activeCalls.delete(call.callerId);
    activeCalls.delete(call.recipientId);
    if (event) {
      io.to(`user:${getPeerId(call)}`).emit(event, { callId, message });
    }
    return true;
  };

  socket.on('call:invite', async (payload = {}) => {
    try {
      const { recipientId, callType } = payload || {};
      if (!['audio', 'video'].includes(callType)) {
        socket.emit('call:error', { message: 'Choose audio or video calling.' });
        return;
      }

      const callerId = socket.data.userId;
      const peer = await getCallPeer({
        _id: new mongoose.Types.ObjectId(callerId),
        role: socket.data.userRole
      }, recipientId);
      if (activeCalls.has(callerId) || activeCalls.has(peer._id.toString())) {
        socket.emit('call:error', { message: 'You or this person is already in a call.' });
        return;
      }

      const peerSockets = await io.in(`user:${peer._id}`).fetchSockets();
      if (peerSockets.length === 0) {
        socket.emit('call:error', { message: 'This person is not available right now.' });
        return;
      }

      const callId = randomUUID();
      const call = {
        callId,
        callerId,
        recipientId: peer._id.toString(),
        callType,
        status: 'ringing'
      };
      activeCalls.set(callId, call);
      activeCalls.set(callerId, call);
      activeCalls.set(call.recipientId, call);
      io.to(`user:${call.recipientId}`).emit('call:incoming', {
        callId,
        callerId,
        callerName: socket.data.userName,
        callType
      });
      socket.emit('call:outgoing', {
        callId,
        recipientId: call.recipientId,
        recipientName: peer.name,
        callType
      });
    } catch (error) {
      if (error.statusCode) {
        socket.emit('call:error', { message: error.message });
        return;
      }
      logger.error(`Could not initiate call: ${error.message}`);
      socket.emit('call:error', { message: 'Could not start this call. Please try again.' });
    }
  });

  socket.on('call:accept', (payload = {}) => {
    const { callId } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || call.recipientId !== socket.data.userId || call.status !== 'ringing') return;
    call.status = 'connected';
    io.to(`user:${call.callerId}`).emit('call:accepted', { callId });
  });

  socket.on('call:decline', (payload = {}) => {
    const { callId } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || call.recipientId !== socket.data.userId || call.status !== 'ringing') return;
    clearCall(callId, 'call:declined');
  });

  socket.on('call:end', (payload = {}) => {
    const { callId } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== socket.data.userId &&
      call.recipientId !== socket.data.userId)) return;
    clearCall(callId, 'call:ended');
  });

  socket.on('call:offer', (payload = {}) => {
    const { callId, description } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || call.callerId !== socket.data.userId || call.status !== 'connected' ||
      !description || typeof description !== 'object') return;
    io.to(`user:${call.recipientId}`).emit('call:offer', { callId, description });
  });

  socket.on('call:answer', (payload = {}) => {
    const { callId, description } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || call.recipientId !== socket.data.userId || call.status !== 'connected' ||
      !description || typeof description !== 'object') return;
    io.to(`user:${call.callerId}`).emit('call:answer', { callId, description });
  });

  socket.on('call:ice-candidate', (payload = {}) => {
    const { callId, candidate } = payload || {};
    const call = activeCalls.get(callId);
    if (!call || call.status !== 'connected' ||
      (call.callerId !== socket.data.userId && call.recipientId !== socket.data.userId) ||
      !candidate || typeof candidate !== 'object') return;
    io.to(`user:${getPeerId(call)}`).emit('call:ice-candidate', { callId, candidate });
  });

  socket.on('disconnect', () => {
    const entry = findCallForUser();
    if (entry) clearCall(entry[0], 'call:ended', 'The other person disconnected.');
  });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Missing JWT_SECRET environment variable. Set it in backend/.env before starting the server.');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('Missing JWT_REFRESH_SECRET environment variable. Set it in backend/.env before starting the server.');
    }
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      logger.warn('Google sign-in is disabled. Set GOOGLE_CLIENT_ID in backend/.env and restart the server.');
    }

    await connectDB();
    httpServer.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});
