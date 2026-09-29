import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { RefreshToken, User } from '../models/index.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const unauthorizedError = (message = 'Invalid or expired refresh token') => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

const issueTokenPair = async (user) => {
  const userId = user._id.toString();
  const tokenId = randomUUID();
  const accessToken = jwt.sign({ type: 'access' }, process.env.JWT_SECRET, {
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL
  });
  const refreshToken = jwt.sign({ type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: tokenId,
    expiresIn: REFRESH_TOKEN_TTL
  });

  await RefreshToken.create({
    tokenId,
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  return { accessToken, refreshToken };
};

const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('User already exists with this email');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({ name, email, password });
  return { user, ...(await issueTokenPair(user)) };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  return { user, ...(await issueTokenPair(user)) };
};

const rotateRefreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw unauthorizedError();
  }

  if (
    typeof decoded === 'string' ||
    decoded.type !== 'refresh' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.jti !== 'string'
  ) {
    throw unauthorizedError();
  }

  const session = await RefreshToken.findOneAndDelete({
    tokenId: decoded.jti,
    userId: decoded.sub,
    expiresAt: { $gt: new Date() }
  });
  if (!session) {
    throw unauthorizedError();
  }

  const user = await User.findById(decoded.sub).select('-password');
  if (!user) {
    throw unauthorizedError();
  }

  return { user, ...(await issueTokenPair(user)) };
};

const revokeRefreshToken = async (token) => {
  if (!token) return;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return;
    throw error;
  }

  if (
    typeof decoded !== 'string' &&
    decoded.type === 'refresh' &&
    typeof decoded.jti === 'string' &&
    typeof decoded.sub === 'string'
  ) {
    await RefreshToken.deleteOne({ tokenId: decoded.jti, userId: decoded.sub });
  }
};

export { loginUser, registerUser, revokeRefreshToken, rotateRefreshToken };
