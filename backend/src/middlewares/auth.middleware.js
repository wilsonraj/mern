import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }

  if (typeof decoded === 'string' || decoded.type !== 'access' || typeof decoded.sub !== 'string') {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }

  try {
    req.user = await User.findById(decoded.sub).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : 'unknown'}' is not authorized to access this route`
      });
    }
    next();
  };
};

export { protect, authorize };
