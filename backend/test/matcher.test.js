import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCvToJob } from '../src/services/matcher.js';
import { jobFingerprint } from '../src/utils.js';
import { unsupportedClaims } from '../src/services/grounding.js';

const job = {
  title: 'Frontend Engineer',
  company: 'Example Co',
  url: 'https://example.com/jobs/123?source=feed',
  description: 'Build React and TypeScript applications. Docker and AWS experience are preferred.',
};

test('matcher separates evidenced and missing skills', () => {
  const cv = 'Taylor Smith\nFrontend Engineer\nBuilt React interfaces with TypeScript and JavaScript for customer products.';
  const result = matchCvToJob(cv, job);
  assert.ok(result.matchingSkills.includes('React'));
  assert.ok(result.matchingSkills.includes('TypeScript'));
  assert.ok(result.missingSkills.includes('Docker'));
  assert.ok(result.missingSkills.includes('AWS'));
  assert.ok(result.evidence.some((item) => item.quote.includes('React')));
  assert.ok(result.score >= 18 && result.score <= 96);
});

test('job fingerprint normalizes tracking parameters and case', () => {
  const first = jobFingerprint(job, ' Hiring@Example.com ');
  const second = jobFingerprint({ ...job, company: 'example co', url: 'https://example.com/jobs/123' }, 'hiring@example.com');
  assert.equal(first, second);
});

test('numeric outcome claims not present in CV are flagged', () => {
  const findings = unsupportedClaims('I increased conversion by 42% and led the redesign.', 'I led a product redesign.');
  assert.equal(findings.length, 1);
  assert.match(findings[0], /42%/);
});
