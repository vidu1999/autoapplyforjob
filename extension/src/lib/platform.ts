import type { Job } from '../types';

const demoJob: Job = {
  supported: true,
  confidence: 3,
  title: 'Senior Product Designer',
  company: 'Northstar Labs',
  location: 'London · Hybrid',
  source: 'Preview vacancy',
  url: 'https://example.com/careers/senior-product-designer',
  description:
    'We are looking for a Senior Product Designer to lead end-to-end product design across our B2B platform. You will work in Figma, partner with product and engineering, conduct user research, communicate with stakeholders, and contribute to an agile product team. Experience with design systems, analytics, and project management is preferred.',
};

export function isChromeExtension() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

export async function scanCurrentJob(): Promise<Job> {
  if (!isChromeExtension()) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return demoJob;
  }
  const response = (await chrome.runtime.sendMessage({ type: 'AUTOAPPLY_SCAN_ACTIVE_TAB' })) as Job & { error?: string };
  if (response?.error) throw new Error(response.error);
  if (!response?.supported) {
    throw new Error('This does not look like a supported vacancy page. Open the job detail page and try again.');
  }
  return response;
}

export async function openExternal(url: string) {
  if (isChromeExtension()) {
    await chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
