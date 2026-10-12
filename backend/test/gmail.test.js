import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMimeMessage } from '../src/services/gmail.js';

test('MIME builder creates a base64url multipart message with a PDF attachment', () => {
  const raw = buildMimeMessage({
    to: 'hiring@example.com',
    subject: 'Application — Taylor',
    body: 'Hello\n\nPlease find my CV attached.',
    attachment: Buffer.from('%PDF-test'),
    attachmentName: 'Taylor CV.pdf',
  });
  assert.doesNotMatch(raw, /[+/=]/);
  const decoded = Buffer.from(raw, 'base64url').toString('utf8');
  assert.match(decoded, /To: hiring@example.com/);
  assert.match(decoded, /multipart\/mixed/);
  assert.match(decoded, /application\/pdf/);
  assert.match(decoded, /Taylor-CV.pdf/);
});
