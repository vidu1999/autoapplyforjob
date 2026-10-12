import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const tokenPath = path.join(config.dataDir, 'gmail-token.enc');

function key() {
  if (!/^[a-f\d]{64}$/i.test(config.tokenEncryptionKey)) {
    const error = new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex value.');
    error.status = 503;
    throw error;
  }
  return Buffer.from(config.tokenEncryptionKey, 'hex');
}

export async function saveTokens(tokens) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  const payload = {
    version: 1,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
  await fs.mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(tokenPath, JSON.stringify(payload), { mode: 0o600 });
}

export async function loadTokens() {
  try {
    const payload = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(payload.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8'),
    );
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function clearTokens() {
  await fs.rm(tokenPath, { force: true });
}
