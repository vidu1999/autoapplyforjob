(() => {
  if (globalThis.__autoApplyScannerLoaded) return;
  globalThis.__autoApplyScannerLoaded = true;

  const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const meta = (name) =>
    document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute('content')?.trim() || '';

  function jsonLdJobs() {
    const entries = [];
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const value = JSON.parse(script.textContent || '{}');
        const values = Array.isArray(value) ? value : value['@graph'] || [value];
        entries.push(...values.filter((item) => item?.['@type'] === 'JobPosting'));
      } catch {
        // Ignore malformed structured data from the host page.
      }
    }
    return entries;
  }

  function htmlToText(value) {
    const node = document.createElement('div');
    node.innerHTML = value || '';
    return node.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function sourceName() {
    const host = location.hostname;
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('indeed')) return 'Indeed';
    if (host.includes('greenhouse')) return 'Greenhouse';
    if (host.includes('lever.co')) return 'Lever';
    if (host.includes('workday')) return 'Workday';
    if (host.includes('ashbyhq')) return 'Ashby';
    return host.replace(/^www\./, '');
  }

  function extractJob() {
    const structured = jsonLdJobs()[0];
    const title =
      structured?.title ||
      text('h1') ||
      meta('og:title').split(/[|–—-]/)[0] ||
      document.title.split(/[|–—]/)[0].trim();
    const company =
      structured?.hiringOrganization?.name ||
      text('[data-testid="inlineHeader-companyName"]') ||
      text('.job-details-jobs-unified-top-card__company-name') ||
      text('[class*="companyName"]') ||
      text('[class*="company-name"]') ||
      meta('og:site_name') ||
      sourceName();
    const locationText = structured?.jobLocation?.address;
    const location =
      (typeof locationText === 'string'
        ? locationText
        : [locationText?.addressLocality, locationText?.addressRegion, locationText?.addressCountry]
            .filter(Boolean)
            .join(', ')) ||
      text('[data-testid="job-location"]') ||
      text('[class*="job-location"]') ||
      text('[class*="location"]');
    const description =
      htmlToText(structured?.description) ||
      text('[data-testid="jobsearch-JobComponent-description"]') ||
      text('.jobs-description__content') ||
      text('#job-details') ||
      text('[class*="jobDescription"]') ||
      text('[class*="job-description"]') ||
      text('main') ||
      text('article');

    const bodySample = document.body?.innerText?.slice(0, 5000) || '';
    const signals = [
      Boolean(structured),
      /job|career|vacanc|position|role|opening/i.test(location.pathname),
      /responsibilit|qualifications|requirements|apply for|about the role/i.test(description || bodySample),
    ];
    const confidence = signals.filter(Boolean).length;
    return {
      supported: confidence >= 2 && title.length > 1 && description.length >= 80,
      confidence,
      title: title.slice(0, 300),
      company: company.slice(0, 300),
      location: location.slice(0, 300),
      description: description.slice(0, 100000),
      url: location.href,
      source: sourceName(),
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'AUTOAPPLY_SCAN_PAGE') sendResponse(extractJob());
  });
})();
