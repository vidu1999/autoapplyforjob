import crypto from 'node:crypto';

export const nowIso = () => new Date().toISOString();
export const createId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

export function normalizeSpace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function normalizeEmail(value = '') {
  return normalizeSpace(value).toLowerCase();
}

export function jobFingerprint(job, recipient = '') {
  const canonical = [
    normalizeSpace(job?.url || '').replace(/[?#].*$/, '').toLowerCase(),
    normalizeSpace(job?.company || '').toLowerCase(),
    normalizeSpace(job?.title || '').toLowerCase(),
    normalizeEmail(recipient),
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safeFilename(value = 'cv.pdf') {
  const sanitized = String(value)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized || 'cv'}.pdf`;
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
