import './config/env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { uploadDirectory } from './config/feedUpload.config.js';
import { razorpayWebhook } from './controllers/payment.controller.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  razorpayWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/feed', express.static(uploadDirectory, { fallthrough: false }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

export default app;
