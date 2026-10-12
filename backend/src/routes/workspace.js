import { Router } from 'express';
import { analyzeSchema, chatSchema, draftSchema } from '../schemas.js';
import { asyncHandler } from '../utils.js';
import { createDraft, reviseDraft } from '../services/ai.js';
import { matchCvToJob } from '../services/matcher.js';
import { getCv } from '../services/storage.js';

export const workspaceRouter = Router();

workspaceRouter.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    const input = analyzeSchema.parse(req.body);
    const cv = await getCv(input.cvId);
    if (!cv) return res.status(404).json({ error: 'Selected CV was not found.' });
    res.json({ analysis: matchCvToJob(cv.extractedText, input.job) });
  }),
);

workspaceRouter.post(
  '/drafts',
  asyncHandler(async (req, res) => {
    const input = draftSchema.parse(req.body);
    const cv = await getCv(input.cvId);
    if (!cv) return res.status(404).json({ error: 'Selected CV was not found.' });
    const analysis = matchCvToJob(cv.extractedText, input.job);
    res.json({ draft: await createDraft({ job: input.job, cv, analysis }) });
  }),
);

workspaceRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const input = chatSchema.parse(req.body);
    const cv = await getCv(input.cvId);
    if (!cv) return res.status(404).json({ error: 'Selected CV was not found.' });
    res.json({ revision: await reviseDraft({ ...input, cv }) });
  }),
);
