import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { RefreshToken, User } from '../models/index.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const unauthorizedError = (
  message = 'Invalid or expired refresh token'
) => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

// Generate access + refresh tokens
const issueTokenPair = async (user) => {
  const userId = user._id.toString();
  const tokenId = randomUUID();

  const accessToken = jwt.sign(
    {
      type: 'access'
    },
    process.env.JWT_SECRET,
    {
      subject: userId,
      expiresIn: ACCESS_TOKEN_TTL
    }
  );

  const refreshToken = jwt.sign(
    {
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      jwtid: tokenId,
      expiresIn: REFRESH_TOKEN_TTL
    }
  );

  await RefreshToken.create({
    tokenId,
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  return {
    accessToken,
    refreshToken
  };
};

// Register
const registerUser = async ({ name, email, password, role = 'patient' }) => {
  if (!['patient', 'doctor'].includes(role)) {
    const error = new Error('Choose either a patient or doctor account');
    error.statusCode = 400;
    throw error;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error(
      'User already exists with this email'
    );

    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role
  });

  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens
  };
};

// Login
const loginUser = async ({ email, password }) => {
  const normalizedEmail = typeof email === 'string'
    ? email.trim().toLowerCase()
    : '';
  const user = await User
    .findOne({ email: normalizedEmail })
    .select('+password');

  if (!user || !user.password) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid =
    await user.comparePassword(password);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const tokens = await issueTokenPair(user);

  // Don't return password
  user.password = undefined;

  return {
    user,
    ...tokens
  };
};

// Google / Microsoft login
const loginWithProvider = async (provider, identity) => {
  const providerIdField = `${provider}Id`;

  let user = await User.findOne({
    [providerIdField]: identity.id
  });

  if (!user) {
    const existingEmail = await User.findOne({
      email: identity.email
    });

    if (existingEmail) {
      const error = new Error(
        'An account already exists with this email. Sign in with your existing method.'
      );

      error.statusCode = 409;
      throw error;
    }

    try {
      user = await User.create({
        name: identity.name,
        email: identity.email,
        [providerIdField]: identity.id
      });
    } catch (error) {
      // Duplicate key
      if (error.code !== 11000) {
        throw error;
      }

      user = await User.findOne({
        [providerIdField]: identity.id
      });

      if (!user) {
        const conflict = new Error(
          'An account already exists with this email. Sign in with your existing method.'
        );

        conflict.statusCode = 409;
        throw conflict;
      }
    }
  }

  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens
  };
};

// Refresh access token
const rotateRefreshToken = async (token) => {
  if (!token) {
    throw unauthorizedError();
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );
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

  // Remove old refresh token
  const session = await RefreshToken.findOneAndDelete({
    tokenId: decoded.jti,
    userId: decoded.sub,
    expiresAt: {
      $gt: new Date()
    }
  });

  if (!session) {
    throw unauthorizedError();
  }

  const user = await User
    .findById(decoded.sub)
    .select('-password');

  if (!user) {
    throw unauthorizedError();
  }

  // Create new token pair
  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens
  };
};

// Logout
const revokeRefreshToken = async (token) => {
  if (!token) {
    return;
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return;
    }

    throw error;
  }

  if (
    typeof decoded !== 'string' &&
    decoded.type === 'refresh' &&
    typeof decoded.jti === 'string' &&
    typeof decoded.sub === 'string'
  ) {
    await RefreshToken.deleteOne({
      tokenId: decoded.jti,
      userId: decoded.sub
    });
  }
};

export {
  loginUser,
  loginWithProvider,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken
};