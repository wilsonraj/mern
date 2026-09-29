import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshSession,
  getProfile
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import ApiResponse from '../utils/apiResponse.js';

const router = express.Router();
const validateFrontendOrigin = (req, res, next) => {
  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (req.get('origin') !== new URL(frontendOrigin).origin) {
    return ApiResponse.error(res, 'Request origin is not allowed', 403);
  }
  return next();
};

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', validateFrontendOrigin, refreshSession);
router.post('/logout', validateFrontendOrigin, logoutUser);
router.get('/me', protect, getProfile);

export default router;
