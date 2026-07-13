import * as userService from '../services/user.service.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return ApiResponse.error(res, 'Name, email, and password are required', 400);
    }

    const { user, token } = await userService.registerUser({ name, email, password });

    return ApiResponse.success(
      res,
      { id: user._id, name: user.name, email: user.email, role: user.role, token },
      'User registered successfully',
      201
    );
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

    const { user, token } = await userService.loginUser({ email, password });

    return ApiResponse.success(
      res,
      { id: user._id, name: user.name, email: user.email, role: user.role, token },
      'Login successful'
    );
  } catch (error) {
    next(error);
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

export { registerUser, loginUser, getProfile };
