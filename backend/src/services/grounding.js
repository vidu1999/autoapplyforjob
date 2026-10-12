const NUMBER_CLAIM = /\b(?:increased|reduced|grew|improved|saved|managed|led|delivered)[^.!?]{0,80}?\b(\d+(?:\.\d+)?%?|\$\d+[\d,.]*|\d+\+?)(?=\s|[.,;!?]|$)/gi;

export function unsupportedClaims(text, sourceCv) {
  const source = sourceCv.toLowerCase().replace(/\s+/g, ' ');
  const findings = [];
  for (const match of String(text).matchAll(NUMBER_CLAIM)) {
    const number = match[1].toLowerCase();
    if (!source.includes(number)) findings.push(match[0].trim());
  }
  return findings.slice(0, 5);
}

export function stripUnsupportedClaims(text, sourceCv) {
  const unsupported = unsupportedClaims(text, sourceCv);
  let safe = String(text);
  for (const claim of unsupported) safe = safe.replace(claim, 'contributed to relevant outcomes');
  return { text: safe, unsupported };
}
