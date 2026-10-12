import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataValue = process.env.DATA_DIR || '.data';

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '127.0.0.1',
  publicUrl: process.env.PUBLIC_URL || 'http://127.0.0.1:8787',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  aiProvider: process.env.AI_PROVIDER || 'deterministic',
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8787/oauth2/callback',
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
  dataDir: path.isAbsolute(dataValue) ? dataValue : path.join(backendRoot, dataValue),
  maxPdfBytes: Math.max(1, Number(process.env.MAX_PDF_MB || 8)) * 1024 * 1024,
};

export function gmailConfigured() {
  return Boolean(
    config.googleClientId &&
      config.googleClientSecret &&
      /^[a-f\d]{64}$/i.test(config.tokenEncryptionKey),
  );
}
