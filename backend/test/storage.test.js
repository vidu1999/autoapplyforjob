import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autoapply-storage-'));
process.env.DATA_DIR = dataDir;
const { reserveApplication } = await import('../src/services/storage.js');

const base = {
  id: 'app_first',
  fingerprint: 'same-job-fingerprint',
  status: 'sending',
  subject: 'Application',
  updatedAt: new Date().toISOString(),
};

test('application reservation atomically blocks a duplicate unless explicitly overridden', async (context) => {
  context.after(async () => fs.rm(dataDir, { recursive: true, force: true }));
  const first = await reserveApplication(base, false);
  const blocked = await reserveApplication({ ...base, id: 'app_second' }, false);
  const overridden = await reserveApplication({ ...base, id: 'app_third' }, true);

  assert.equal(first.reserved, true);
  assert.equal(blocked.reserved, false);
  assert.equal(blocked.previous.id, 'app_first');
  assert.equal(overridden.reserved, true);
});
