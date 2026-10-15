import { createHmac, timingSafeEqual } from 'node:crypto';

const getCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error('Online payments are not configured. Choose pay at clinic or contact the administrator.');
    error.statusCode = 503;
    throw error;
  }
  return { keyId, keySecret };
};

const razorpayRequest = async (endpoint, { method = 'GET', body } = {}) => {
  const { keyId, keySecret } = getCredentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${authorization}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.description || 'Razorpay could not process the payment request.');
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return result;
};

const createOrder = async ({ amount, receipt, notes }) => {
  const { keyId } = getCredentials();
  const order = await razorpayRequest('/orders', {
    method: 'POST',
    body: { amount, currency: 'INR', receipt, notes }
  });
  return { order, keyId };
};

const verifyPayment = async ({ orderId, paymentId, signature, amount }) => {
  const { keySecret } = getCredentials();
  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  let payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (payment.order_id !== orderId || payment.amount !== amount) return false;
  if (payment.status === 'authorized') {
    await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      body: { amount, currency: 'INR' }
    });
    payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  }
  return payment.status === 'captured';
};

const verifyWebhookSignature = (body, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !Buffer.isBuffer(body) || typeof signature !== 'string') return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const createRefund = async (paymentId, amount, receipt) => razorpayRequest(
  `/payments/${encodeURIComponent(paymentId)}/refund`,
  {
    method: 'POST',
    body: {
      amount,
      notes: { appointment: receipt }
    }
  }
);

export { createOrder, createRefund, verifyPayment, verifyWebhookSignature };
