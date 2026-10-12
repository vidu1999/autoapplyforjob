import { Router } from 'express';
import { prepareSchema, sendSchema } from '../schemas.js';
import { asyncHandler, createId, jobFingerprint, nowIso } from '../utils.js';
import {
  findApplicationByFingerprint,
  getCv,
  getCvFile,
  listApplications,
  reserveApplication,
  saveApplication,
} from '../services/storage.js';
import { sendGmailMessage } from '../services/gmail.js';
import { unsupportedClaims } from '../services/grounding.js';

const confirmations = new Map();
const CONFIRMATION_LIFETIME_MS = 5 * 60 * 1000;

function cleanConfirmations() {
  for (const [id, item] of confirmations) if (item.expiresAt < Date.now()) confirmations.delete(id);
}

export const applicationRouter = Router();

applicationRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const applications = await listApplications();
    res.json({
      applications: applications.map(({ body: _body, ...item }) => item),
    });
  }),
);

applicationRouter.post(
  '/prepare',
  asyncHandler(async (req, res) => {
    cleanConfirmations();
    const input = prepareSchema.parse(req.body);
    const cv = await getCv(input.cvId);
    if (!cv) return res.status(404).json({ error: 'Selected CV was not found.' });
    const fingerprint = jobFingerprint(input.job, input.recipient);
    const previous = await findApplicationByFingerprint(fingerprint);
    if (previous && !input.allowDuplicate) {
      return res.status(409).json({
        error: 'Duplicate protection: an application for this role and recipient was already attempted.',
        code: 'DUPLICATE_APPLICATION',
        previous: {
          id: previous.id,
          status: previous.status,
          sentAt: previous.sentAt || previous.updatedAt,
          subject: previous.subject,
        },
      });
    }
    const claimWarnings = unsupportedClaims(input.body, cv.extractedText);
    const confirmationId = createId('confirm');
    const expiresAt = Date.now() + CONFIRMATION_LIFETIME_MS;
    confirmations.set(confirmationId, { input, fingerprint, expiresAt });
    res.json({
      confirmationId,
      expiresAt: new Date(expiresAt).toISOString(),
      review: {
        recipient: input.recipient,
        subject: input.subject,
        cvName: cv.name,
        jobTitle: input.job.title,
        company: input.job.company,
        bodyPreview: input.body.slice(0, 500),
        duplicateOverride: Boolean(previous),
        claimWarnings,
      },
    });
  }),
);

applicationRouter.post(
  '/:confirmationId/send',
  asyncHandler(async (req, res) => {
    sendSchema.parse(req.body);
    cleanConfirmations();
    const confirmation = confirmations.get(req.params.confirmationId);
    if (!confirmation) return res.status(410).json({ error: 'Confirmation expired or was already used. Review again.' });
    confirmations.delete(req.params.confirmationId);

    const { input, fingerprint } = confirmation;
    const cvFile = await getCvFile(input.cvId);
    if (!cvFile) return res.status(404).json({ error: 'The selected CV is no longer available.' });

    const application = {
      id: createId('app'),
      fingerprint,
      status: 'sending',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      job: input.job,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      cvId: input.cvId,
      cvName: cvFile.record.name,
    };
    const reservation = await reserveApplication(application, input.allowDuplicate);
    if (!reservation.reserved) {
      return res.status(409).json({
        error: 'Duplicate protection blocked this send because another attempt already exists.',
        code: 'DUPLICATE_APPLICATION',
      });
    }

    try {
      const sent = await sendGmailMessage({
        to: input.recipient,
        subject: input.subject,
        body: input.body,
        attachment: cvFile.buffer,
        attachmentName: cvFile.record.name,
      });
      const completed = {
        ...application,
        ...sent,
        status: 'sent',
        sentAt: nowIso(),
        updatedAt: nowIso(),
      };
      await saveApplication(completed);
      res.json({ application: completed });
    } catch (error) {
      await saveApplication({
        ...application,
        status: 'failed',
        error: error.message,
        updatedAt: nowIso(),
      });
      throw error;
    }
  }),
);
