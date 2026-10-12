import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { ZodError } from 'zod';
import { config } from './config.js';
import { getAiStatus } from './services/ai.js';
import { gmailStatus } from './services/gmail.js';
import { cvRouter } from './routes/cvs.js';
import { workspaceRouter } from './routes/workspace.js';
import { authRouter, oauthCallback } from './routes/auth.js';
import { applicationRouter } from './routes/applications.js';
import { asyncHandler } from './utils.js';

function originAllowed(origin) {
  if (!origin) return true;
  return origin.startsWith('chrome-extension://') || config.allowedOrigins.includes(origin);
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(originAllowed(origin) ? null : new Error('Origin is not allowed.'), originAllowed(origin));
      },
      methods: ['GET', 'POST', 'DELETE'],
      maxAge: 7200,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: 'draft-7', legacyHeaders: false }),
  );

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      res.json({ status: 'ok', ai: await getAiStatus(), gmail: await gmailStatus(), version: '0.1.0' });
    }),
  );
  app.get('/oauth2/callback', oauthCallback);
  app.use('/api/cvs', cvRouter);
  app.use('/api', workspaceRouter);
  app.use('/api/auth/gmail', authRouter);
  app.use('/api/applications', applicationRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Please check the submitted fields.', details: error.issues });
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? `PDF is too large (maximum ${config.maxPdfBytes / 1024 / 1024} MB).` : error.message;
      return res.status(400).json({ error: message });
    }
    const status = Number(error.status || (error.message === 'Origin is not allowed.' ? 403 : 500));
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'The server could not complete this request.' : error.message });
  });
  return app;
}
