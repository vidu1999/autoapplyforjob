import { Router } from 'express';
import { asyncHandler, escapeHtml } from '../utils.js';
import {
  createAuthorizationUrl,
  disconnectGmail,
  finishAuthorization,
  gmailStatus,
} from '../services/gmail.js';

export const authRouter = Router();

authRouter.get('/status', asyncHandler(async (_req, res) => res.json(await gmailStatus())));

authRouter.post(
  '/start',
  asyncHandler(async (_req, res) => res.json({ authorizationUrl: createAuthorizationUrl() })),
);

authRouter.post(
  '/disconnect',
  asyncHandler(async (_req, res) => {
    await disconnectGmail();
    res.status(204).end();
  }),
);

export async function oauthCallback(req, res, next) {
  try {
    if (req.query.error) throw Object.assign(new Error(`Google authorization was cancelled: ${req.query.error}`), { status: 400 });
    if (!req.query.code || !req.query.state) throw Object.assign(new Error('Missing OAuth callback parameters.'), { status: 400 });
    const account = await finishAuthorization(req.query.code, req.query.state);
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Gmail connected</title><style>body{font-family:Inter,system-ui;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;max-width:440px;box-shadow:0 16px 48px #0f172a14}b{color:#2563eb}</style></head><body><div class="card"><h1>Gmail connected</h1><p><b>${escapeHtml(account || 'Your Google account')}</b> is ready. Return to AutoApply AI and close this tab.</p></div></body></html>`);
  } catch (error) {
    next(error);
  }
}
