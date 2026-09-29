import * as userService from '../services/user.service.js';
import ApiResponse from '../utils/apiResponse.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/users'
};

const getRefreshToken = (req) => {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${REFRESH_COOKIE_NAME}=`));
  return cookie ? cookie.slice(REFRESH_COOKIE_NAME.length + 1) : null;
};

const sendTokenPair = (res, result, message, statusCode = 200) => {
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    ...refreshCookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
  return ApiResponse.success(
    res,
    {
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      accessToken: result.accessToken
    },
    message,
    statusCode
  );
};

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return ApiResponse.error(res, 'Name, email, and password are required', 400);
    }

    const result = await userService.registerUser({ name, email, password });
    return sendTokenPair(res, result, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Login a user
// @route   POST /api/users/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'Email and password are required', 400);
    }

    const result = await userService.loginUser({ email, password });
    return sendTokenPair(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token is required', 401);
    }

    const result = await userService.rotateRefreshToken(refreshToken);
    return sendTokenPair(res, result, 'Token refreshed');
  } catch (error) {
    if (error.statusCode === 401) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    }
    return next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    await userService.revokeRefreshToken(getRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};

// @desc    Get current logged-in user profile
// @route   GET /api/users/me
const getProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, req.user, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

export { getProfile, loginUser, logoutUser, refreshSession, registerUser };
