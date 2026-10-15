import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  logger.error('Usage: npm run admin:promote -- registered-user@example.com');
  process.exitCode = 1;
} else {
  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'admin' } },
      { new: true }
    ).select('name email');

    if (!user) {
      throw new Error(`No registered account found for ${email}. Register this account first.`);
    }

    logger.info(`Administrator access granted to ${user.email}.`);
  } catch (error) {
    logger.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
