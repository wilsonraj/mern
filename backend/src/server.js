import './config/env.js';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;
console.log("JWT_SECRET exists:", process.env.JWT_SECRET);
console.log("JWT_REFRESH_SECRET exists:", !!process.env.JWT_REFRESH_SECRET);
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

    await connectDB();
    app.listen(PORT, () => {
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
