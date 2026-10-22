const getCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error('Razorpay credentials are not configured; a refund for an existing paid appointment cannot be issued.');
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

export { createRefund };
