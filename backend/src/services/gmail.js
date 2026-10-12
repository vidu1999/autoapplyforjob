import crypto from 'node:crypto';
import { google } from 'googleapis';
import { config, gmailConfigured } from '../config.js';
import { clearTokens, loadTokens, saveTokens } from './tokenVault.js';
import { safeFilename } from '../utils.js';

const oauthStates = new Map();
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send',
];

function oauthClient() {
  if (!gmailConfigured()) {
    const error = new Error('Gmail OAuth is not configured on the backend.');
    error.status = 503;
    throw error;
  }
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
}

function accountFromTokens(tokens) {
  if (!tokens?.id_token) return '';
  try {
    return JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8')).email || '';
  } catch {
    return '';
  }
}

export async function gmailStatus() {
  if (!gmailConfigured()) return { configured: false, connected: false, account: '' };
  try {
    const tokens = await loadTokens();
    return { configured: true, connected: Boolean(tokens?.refresh_token || tokens?.access_token), account: accountFromTokens(tokens) };
  } catch {
    return { configured: true, connected: false, account: '', error: 'Stored token could not be decrypted.' };
  }
}

export function createAuthorizationUrl() {
  const client = oauthClient();
  const state = crypto.randomBytes(24).toString('base64url');
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  for (const [key, expiry] of oauthStates) if (expiry < Date.now()) oauthStates.delete(key);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function finishAuthorization(code, state) {
  const expiry = oauthStates.get(state);
  oauthStates.delete(state);
  if (!expiry || expiry < Date.now()) {
    const error = new Error('OAuth state is missing or expired. Start the connection again.');
    error.status = 400;
    throw error;
  }
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    const error = new Error('Google did not return a refresh token. Revoke the app in your Google Account and reconnect.');
    error.status = 400;
    throw error;
  }
  await saveTokens(tokens);
  return accountFromTokens(tokens);
}

async function authorizedClient() {
  const tokens = await loadTokens();
  if (!tokens) {
    const error = new Error('Connect Gmail before sending.');
    error.status = 401;
    throw error;
  }
  const client = oauthClient();
  client.setCredentials(tokens);
  client.on('tokens', async (updated) => {
    await saveTokens({ ...tokens, ...updated, refresh_token: updated.refresh_token || tokens.refresh_token });
  });
  return client;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

export function buildMimeMessage({ to, subject, body, attachment, attachmentName }) {
  const boundary = `autoapply_${crypto.randomBytes(16).toString('hex')}`;
  const normalizedBody = String(body).replace(/\r?\n/g, '\r\n');
  const attachmentBase64 = attachment.toString('base64').replace(/(.{76})/g, '$1\r\n');
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(normalizedBody, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${safeFilename(attachmentName)}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeFilename(attachmentName)}"`,
    '',
    attachmentBase64,
    `--${boundary}--`,
    '',
  ];
  return base64url(lines.join('\r\n'));
}

export async function sendGmailMessage(input) {
  const auth = await authorizedClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildMimeMessage(input);
  const response = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return { messageId: response.data.id, threadId: response.data.threadId };
}

export async function disconnectGmail() {
  const tokens = await loadTokens();
  if (tokens) {
    try {
      const client = oauthClient();
      client.setCredentials(tokens);
      await client.revokeCredentials();
    } catch {
      // Always clear local credentials even if Google is temporarily unavailable.
    }
  }
  await clearTokens();
}
