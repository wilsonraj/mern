import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
const { parsed } = dotenv.config({ path: envPath });

for (const [key, value] of Object.entries(parsed || {})) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
