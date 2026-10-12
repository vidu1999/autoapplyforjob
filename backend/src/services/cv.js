import { PDFParse } from 'pdf-parse';
import { normalizeSpace } from '../utils.js';

const SKILL_ALIASES = {
  JavaScript: ['javascript', 'js', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  React: ['react', 'react.js', 'reactjs'],
  'Node.js': ['node.js', 'nodejs', 'node js'],
  Python: ['python'],
  Java: ['java'],
  'C#': ['c#', '.net', 'dotnet'],
  SQL: ['sql', 'postgresql', 'mysql', 'sqlite'],
  AWS: ['aws', 'amazon web services'],
  Azure: ['azure'],
  GCP: ['gcp', 'google cloud'],
  Docker: ['docker', 'containers'],
  Kubernetes: ['kubernetes', 'k8s'],
  Git: ['git', 'github', 'gitlab'],
  REST: ['rest api', 'restful', 'rest'],
  GraphQL: ['graphql'],
  Agile: ['agile', 'scrum', 'kanban'],
  Figma: ['figma'],
  Excel: ['excel', 'spreadsheets'],
  Salesforce: ['salesforce'],
  SEO: ['seo', 'search engine optimization'],
  Analytics: ['analytics', 'google analytics'],
  'Project management': ['project management', 'project manager'],
  Leadership: ['leadership', 'team lead', 'managed a team', 'led a team'],
  Communication: ['communication', 'communicated', 'stakeholder', 'presentations'],
};

function hasAlias(text, aliases) {
  return aliases.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
  });
}

export function extractSkills(text = '') {
  return Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) => hasAlias(text, aliases))
    .map(([skill]) => skill);
}

function extractName(lines) {
  return (
    lines.find(
      (line) =>
        line.length >= 3 &&
        line.length <= 60 &&
        !/@|https?:|linkedin|curriculum|resume|\d{3,}/i.test(line),
    ) || 'Candidate'
  );
}

export function profileFromText(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map(normalizeSpace)
    .filter(Boolean);
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || '';
  return {
    name: extractName(lines),
    email,
    phone: normalizeSpace(phone),
    skills: extractSkills(text),
    preview: normalizeSpace(text).slice(0, 260),
  };
}

export async function parsePdf(buffer) {
  if (buffer.subarray(0, 5).toString() !== '%PDF-') {
    const error = new Error('The uploaded file is not a valid PDF.');
    error.status = 400;
    throw error;
  }
  const parser = new PDFParse({ data: buffer });
  let parsed;
  try {
    parsed = await parser.getText();
  } catch {
    const error = new Error('The PDF could not be read. Try exporting it as a text-based PDF.');
    error.status = 422;
    throw error;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
  const text = String(parsed.text || '').trim();
  if (text.length < 80) {
    const error = new Error('Very little text was found. Scanned PDFs need OCR before upload.');
    error.status = 422;
    throw error;
  }
  return { text: text.slice(0, 120_000), pages: parsed.total || null, profile: profileFromText(text) };
}

export { SKILL_ALIASES };
