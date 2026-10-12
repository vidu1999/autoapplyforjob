import { config } from '../config.js';
import { stripUnsupportedClaims } from './grounding.js';
import { normalizeSpace } from '../utils.js';

function firstName(fullName = 'Candidate') {
  return normalizeSpace(fullName).split(' ')[0] || 'Candidate';
}

function deterministicDraft({ job, cv, analysis }) {
  const name = cv.profile?.name || 'Candidate';
  const strengths = analysis.matchingSkills.slice(0, 3);
  const skillLine = strengths.length
    ? `My background includes ${strengths.join(', ')}, which aligns with the role's priorities.`
    : 'My experience includes transferable skills that I would welcome the opportunity to discuss in relation to this role.';
  const evidence = analysis.evidence[0]?.quote;
  const evidenceLine = evidence ? `One relevant example from my CV is: ${evidence}` : '';
  return {
    subject: `Application for ${job.title} — ${name}`,
    body: [
      'Hello Hiring Team,',
      `I am writing to apply for the ${job.title} position at ${job.company}.`,
      skillLine,
      evidenceLine,
      'I have attached my CV for your review. I would be glad to discuss how my experience could contribute to your team.',
      'Kind regards,',
      name,
    ]
      .filter(Boolean)
      .join('\n\n'),
    provider: 'deterministic',
  };
}

function promptForDraft({ job, cv, analysis }) {
  return `You are editing a concise job application email. Use ONLY facts in the CV SOURCE. Never invent employers, dates, qualifications, years, metrics, tools, or achievements. Missing job skills are not candidate skills. Return strict JSON with keys "subject" and "body" only. Keep body under 180 words.\n\nJOB: ${JSON.stringify({ title: job.title, company: job.company, description: job.description.slice(0, 7000) })}\n\nMATCH: ${JSON.stringify(analysis)}\n\nCV SOURCE:\n${cv.extractedText.slice(0, 14000)}`;
}

async function ollamaGenerate(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.ollamaModel, prompt, stream: false, format: 'json' }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createDraft(input) {
  const fallback = deterministicDraft(input);
  if (config.aiProvider !== 'ollama') return { ...fallback, warnings: [] };
  try {
    const generated = await ollamaGenerate(promptForDraft(input));
    if (!generated.subject || !generated.body) throw new Error('Model returned an incomplete draft.');
    const grounded = stripUnsupportedClaims(generated.body, input.cv.extractedText);
    return {
      subject: normalizeSpace(generated.subject).slice(0, 180),
      body: grounded.text.slice(0, 10_000),
      provider: `ollama/${config.ollamaModel}`,
      warnings: grounded.unsupported.length
        ? ['Potentially unsupported numeric claims were removed. Please review the draft.']
        : [],
    };
  } catch (error) {
    return { ...fallback, warnings: [`Local AI was unavailable, so a safe template was used (${error.message}).`] };
  }
}

function deterministicEdit({ instruction, subject, body }) {
  const request = instruction.toLowerCase();
  let nextBody = body;
  let note = 'No model is enabled. The existing factual draft was preserved.';
  if (/short|concise|brief/.test(request)) {
    const paragraphs = body.split(/\n\s*\n/).filter(Boolean);
    nextBody = paragraphs.filter((_, index) => index < 4 || index >= paragraphs.length - 2).join('\n\n');
    note = 'I shortened the message while preserving its claims.';
  } else if (/enthusias|warmer|friendly/.test(request)) {
    nextBody = body.replace('I am writing to apply', 'I am excited to apply');
    note = 'I made the opening warmer without adding new claims.';
  } else if (/formal|professional/.test(request)) {
    nextBody = body.replace('Hello Hiring Team,', 'Dear Hiring Team,').replace('I am excited to apply', 'I am writing to apply');
    note = 'I adjusted the tone to be more formal.';
  }
  return { subject, body: nextBody, assistantMessage: note, provider: 'deterministic', warnings: [] };
}

export async function reviseDraft(input) {
  if (config.aiProvider !== 'ollama') return deterministicEdit(input);
  const prompt = `Revise an application email according to the instruction. Use ONLY facts in CV SOURCE. Do not add employers, dates, qualifications, years, metrics, tools, or achievements. Return strict JSON with "subject", "body", and "assistantMessage".\nINSTRUCTION: ${input.instruction}\nCURRENT SUBJECT: ${input.subject}\nCURRENT BODY:\n${input.body}\nCV SOURCE:\n${input.cv.extractedText.slice(0, 14000)}`;
  try {
    const generated = await ollamaGenerate(prompt);
    const grounded = stripUnsupportedClaims(generated.body || input.body, input.cv.extractedText);
    return {
      subject: normalizeSpace(generated.subject || input.subject).slice(0, 180),
      body: grounded.text.slice(0, 10_000),
      assistantMessage: normalizeSpace(generated.assistantMessage || 'I revised the draft using only the CV source.'),
      provider: `ollama/${config.ollamaModel}`,
      warnings: grounded.unsupported.length ? ['Unsupported numeric claims were removed.'] : [],
    };
  } catch (error) {
    const fallback = deterministicEdit(input);
    return { ...fallback, warnings: [`Local AI was unavailable (${error.message}).`] };
  }
}

export async function getAiStatus() {
  if (config.aiProvider !== 'ollama') return { provider: 'deterministic', ready: true, model: null };
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error();
    const data = await response.json();
    const models = (data.models || []).map((item) => item.name);
    return { provider: 'ollama', ready: models.some((name) => name.startsWith(config.ollamaModel)), model: config.ollamaModel };
  } catch {
    return { provider: 'ollama', ready: false, model: config.ollamaModel };
  }
}

export { firstName };
