import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      'Missing MONGO_URI environment variable. Create a .env file or set MONGO_URI in your environment.'
    );
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    throw new Error(`MongoDB connection error: ${error.message}`, { cause: error });
  }
};

export default connectDB;
