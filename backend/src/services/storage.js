import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { createId, nowIso, safeFilename } from '../utils.js';

const cvDir = path.join(config.dataDir, 'cvs');
const cvIndexPath = path.join(config.dataDir, 'cvs.json');
const applicationsPath = path.join(config.dataDir, 'applications.json');

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(temporary, file);
}

let writeQueue = Promise.resolve();
function serializedWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

export async function ensureStorage() {
  await fs.mkdir(cvDir, { recursive: true, mode: 0o700 });
}

export async function listCvs() {
  const records = await readJson(cvIndexPath, []);
  return records.map(({ extractedText: _privateText, storedName: _stored, ...publicRecord }) => publicRecord);
}

export async function getCv(id, includeText = true) {
  const records = await readJson(cvIndexPath, []);
  const record = records.find((item) => item.id === id);
  if (!record) return null;
  if (includeText) return record;
  const { extractedText: _privateText, storedName: _stored, ...publicRecord } = record;
  return publicRecord;
}

export async function saveCv({ originalName, buffer, extractedText, profile }) {
  return serializedWrite(async () => {
    await ensureStorage();
    const id = createId('cv');
    const storedName = `${id}.pdf`;
    const record = {
      id,
      name: safeFilename(originalName),
      storedName,
      size: buffer.length,
      uploadedAt: nowIso(),
      textLength: extractedText.length,
      extractedText,
      profile,
    };
    await fs.writeFile(path.join(cvDir, storedName), buffer, { mode: 0o600 });
    const records = await readJson(cvIndexPath, []);
    records.unshift(record);
    await writeJsonAtomic(cvIndexPath, records);
    const { extractedText: _privateText, storedName: _stored, ...publicRecord } = record;
    return publicRecord;
  });
}

export async function deleteCv(id) {
  return serializedWrite(async () => {
    const records = await readJson(cvIndexPath, []);
    const record = records.find((item) => item.id === id);
    if (!record) return false;
    await fs.rm(path.join(cvDir, record.storedName), { force: true });
    await writeJsonAtomic(
      cvIndexPath,
      records.filter((item) => item.id !== id),
    );
    return true;
  });
}

export async function getCvFile(id) {
  const records = await readJson(cvIndexPath, []);
  const record = records.find((item) => item.id === id);
  if (!record) return null;
  return {
    record,
    buffer: await fs.readFile(path.join(cvDir, record.storedName)),
  };
}

export async function listApplications() {
  return readJson(applicationsPath, []);
}

export async function saveApplication(application) {
  return serializedWrite(async () => {
    const records = await readJson(applicationsPath, []);
    const index = records.findIndex((item) => item.id === application.id);
    if (index >= 0) records[index] = application;
    else records.unshift(application);
    await writeJsonAtomic(applicationsPath, records.slice(0, 1000));
    return application;
  });
}

export async function findApplicationByFingerprint(fingerprint) {
  const records = await readJson(applicationsPath, []);
  return records.find((item) => item.fingerprint === fingerprint && ['sending', 'sent', 'failed'].includes(item.status)) || null;
}

export async function reserveApplication(application, allowDuplicate = false) {
  return serializedWrite(async () => {
    const records = await readJson(applicationsPath, []);
    const previous = records.find(
      (item) => item.fingerprint === application.fingerprint && ['sending', 'sent', 'failed'].includes(item.status),
    );
    if (previous && !allowDuplicate) return { reserved: false, previous };
    records.unshift(application);
    await writeJsonAtomic(applicationsPath, records.slice(0, 1000));
    return { reserved: true, application };
  });
}
