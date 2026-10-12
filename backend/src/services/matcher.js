import { extractSkills } from './cv.js';
import { normalizeSpace } from '../utils.js';

const STOP_WORDS = new Set(
  'the a an and or but for to of in on at by with from as is are be this that you your our we will can job role work working experience years have has required preferred plus about into using who their they'.split(
    ' ',
  ),
);

function significantTerms(text) {
  const terms = String(text)
    .toLowerCase()
    .match(/[a-z][a-z+#.-]{2,}/g) || [];
  const counts = new Map();
  for (const term of terms) {
    const cleaned = term.replace(/^[.-]+|[.-]+$/g, '');
    if (!STOP_WORDS.has(cleaned) && cleaned.length > 2) counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term);
}

function evidenceFor(text, skill) {
  const sentences = String(text)
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map(normalizeSpace)
    .filter((item) => item.length > 15 && item.length < 320);
  const words = skill.toLowerCase().replace(/[^a-z0-9+#. ]/g, '').split(/\s+/);
  const match = sentences.find((sentence) => words.some((word) => sentence.toLowerCase().includes(word)));
  return (match || '').slice(0, 240);
}

export function matchCvToJob(cvText, job) {
  const description = `${job.title || ''}\n${job.description || ''}`;
  const jobSkills = extractSkills(description);
  const cvSkills = extractSkills(cvText);
  const cvSet = new Set(cvSkills);
  const matchingSkills = jobSkills.filter((skill) => cvSet.has(skill));
  const missingSkills = jobSkills.filter((skill) => !cvSet.has(skill));

  const cvTerms = new Set(significantTerms(cvText));
  const roleTerms = significantTerms(description).slice(0, 30);
  const keywordHits = roleTerms.filter((term) => cvTerms.has(term));
  const skillScore = jobSkills.length ? matchingSkills.length / jobSkills.length : 0.55;
  const keywordScore = roleTerms.length ? Math.min(keywordHits.length / Math.min(roleTerms.length, 12), 1) : 0.5;
  const score = Math.round(Math.max(18, Math.min(96, (skillScore * 0.72 + keywordScore * 0.28) * 100)));

  const evidence = matchingSkills.slice(0, 6).map((skill) => ({
    skill,
    quote: evidenceFor(cvText, skill) || `“${skill}” is listed in the CV.`,
  }));

  return {
    score,
    matchingSkills,
    missingSkills,
    evidence,
    keywordHits: keywordHits.slice(0, 8),
    summary:
      matchingSkills.length > 0
        ? `The CV demonstrates ${matchingSkills.length} of ${Math.max(jobSkills.length, matchingSkills.length)} detected role skills. Review the evidence before using the draft.`
        : 'No direct skill overlap was confidently detected. Review the job and CV text before drafting.',
    disclaimer: 'Automated estimate based only on the uploaded CV and extracted job text; it is not a hiring prediction.',
  };
}
