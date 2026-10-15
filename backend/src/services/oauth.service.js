import { OAuth2Client } from 'google-auth-library';
import { decodeJwt, createRemoteJWKSet, jwtVerify } from 'jose';

const googleClient = new OAuth2Client();
const microsoftJwks = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys')
);
const tenantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidMicrosoftTokenCodes = new Set([
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWT_EXPIRED',
  'ERR_JOSE_ALG_NOT_ALLOWED',
  'ERR_JOSE_NOT_SUPPORTED',
  'ERR_JWS_INVALID',
  'ERR_JWT_INVALID',
  'ERR_JWK_INVALID',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JWKS_MULTIPLE_MATCHING_KEYS',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
]);

const missingConfiguration = (provider) => {
  const error = new Error(`${provider} sign-in is not configured`);
  error.statusCode = 503;
  return error;
};

const invalidCredential = () => {
  const error = new Error('The identity provider returned an invalid sign-in credential');
  error.statusCode = 401;
  return error;
};

const verifyGoogleCredential = async (credential) => {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw missingConfiguration('Google');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    payload = ticket.getPayload();
  } catch (error) {
    if (error.message.startsWith('Failed to retrieve verification certificates:')) {
      throw error;
    }
    throw invalidCredential();
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw invalidCredential();
  }

  return {
    id: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email
  };
};

const verifyMicrosoftCredential = async (credential) => {
  const audience = process.env.MICROSOFT_CLIENT_ID;
  if (!audience) throw missingConfiguration('Microsoft');

  let tenantId;
  try {
    tenantId = decodeJwt(credential).tid;
  } catch (error) {
    if (!invalidMicrosoftTokenCodes.has(error.code)) throw error;
    throw invalidCredential();
  }
  if (typeof tenantId !== 'string' || !tenantIdPattern.test(tenantId)) {
    throw invalidCredential();
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(credential, microsoftJwks, {
      audience,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      algorithms: ['RS256']
    }));
  } catch {
    throw invalidCredential();
  }

  const email = payload.email || payload.preferred_username;
  if (typeof payload.sub !== 'string' || typeof email !== 'string' || !email.includes('@')) {
    throw invalidCredential();
  }

  return {
    id: payload.sub,
    email: email.toLowerCase(),
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name : email
  };
};

const verifyProviderCredential = (provider, credential) => {
  if (typeof credential !== 'string' || credential.length === 0) {
    const error = new Error('A provider credential is required');
    error.statusCode = 400;
    throw error;
  }

  if (provider === 'google') return verifyGoogleCredential(credential);
  if (provider === 'microsoft') return verifyMicrosoftCredential(credential);

  const error = new Error('Unsupported identity provider');
  error.statusCode = 404;
  throw error;
};

export { verifyProviderCredential };
