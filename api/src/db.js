import dotenv from 'dotenv';
import pkg from 'pg';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

dotenv.config();
const { Pool } = pkg;
const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

const appBaseConfig = {
  vaultUrl: process.env.AZURE_KEY_VAULT_URL,
  secretName: process.env.AZURE_DB_SECRET_NAME,
  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT || '5432',
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
};

async function resolveDatabaseUrl() {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (!isProd) {
    if (envUrl) return envUrl;
    throw new Error('DATABASE_URL is not set in development');
  }

  // In production prefer Key Vault. Fall back to DATABASE_URL if explicitly provided
  if (envUrl && !appBaseConfig.secretName) {
    return envUrl;
  }

  const { vaultUrl, secretName, dbHost, dbPort, dbName, dbUser } = appBaseConfig;
  if (!vaultUrl || !secretName) {
    throw new Error('AZURE_KEY_VAULT_URL and AZURE_DB_SECRET_NAME must be set in production');
  }
  if (!dbHost || !dbName || !dbUser) {
    throw new Error('DB_HOST, DB_NAME, and DB_USER must be set in production');
  }

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);
  let password;
  try {
    const secret = await client.getSecret(secretName);
    password = secret?.value?.trim();
  } catch (err) {
    console.error('[DB] Failed to read secret from Key Vault:', err?.message || err);
    throw err;
  }

  if (!password) {
    throw new Error(`Secret '${secretName}' in Key Vault '${vaultUrl}' is empty`);
  }

  const hostWithPort = buildHostPort(dbHost, dbPort);
  return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(password)}@${hostWithPort}/${dbName}`;
}

function buildHostPort(host, port) {
  if (!host) return host;
  // If host already includes an explicit port (e.g., localhost:5432 or [::1]:5432), keep it
  const hasPort = /:\d+$/.test(host) || host.includes(']');
  if (hasPort) {
    return host;
  }
  return `${host}:${port}`;
}

const connectionString = await resolveDatabaseUrl();

function sanitizeDbUrl(url) {
  if (!url) return '';
  try {
    // mask password in formats like: postgres://user:password@host:port/db
    return url.replace(/(postgres(?:ql)?:\/\/[^:]*:)([^@]+)(@)/i, '$1****$3');
  } catch (_) {
    return '';
  }
}

export const safeConnectionString = sanitizeDbUrl(connectionString);

console.log('[DB] Initializing PG pool with connectionString:', safeConnectionString);

export const pool = new Pool({
  connectionString,
  // If you ever need SSL (managed DBs), add: ssl: { rejectUnauthorized: false }
});

// verify connection at startup
export async function assertDbConnection() {
  try {
    const res = await pool.query('select 1 as ok');
    if (res.rows?.[0]?.ok !== 1) throw new Error('DB connection test failed');
  } catch (err) {
    // Surface rich pg error info when available
    const details = {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
      where: err?.where,
      routine: err?.routine,
      connectionString: safeConnectionString,
    };
    console.error('[DB] Connection test failed:', details);
    throw err;
  }
}
