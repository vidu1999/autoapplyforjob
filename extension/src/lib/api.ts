import type {
  Analysis,
  ApplicationRecord,
  CvRecord,
  Draft,
  GmailStatus,
  Health,
  Job,
  PreparedSend,
} from '../types';

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
const API_BASE = import.meta.env.VITE_API_URL ?? (isExtension ? 'http://127.0.0.1:8787' : '');

export class ApiError extends Error {
  status: number;
  details: Record<string, unknown>;

  constructor(message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError('Backend is offline. Start it with npm run dev:backend.', 0);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : {};
  if (!response.ok) throw new ApiError(payload.error || 'Request failed.', response.status, payload);
  return payload as T;
}

const json = (body?: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});

export const api = {
  health: () => request<Health>('/api/health'),
  listCvs: () => request<{ cvs: CvRecord[] }>('/api/cvs'),
  uploadCv: (file: File) => {
    const form = new FormData();
    form.append('cv', file);
    return request<{ cv: CvRecord }>('/api/cvs', { method: 'POST', body: form });
  },
  deleteCv: (id: string) => request<void>(`/api/cvs/${id}`, { method: 'DELETE' }),
  analyze: (job: Job, cvId: string) => request<{ analysis: Analysis }>('/api/analyze', json({ job, cvId })),
  draft: (job: Job, cvId: string) => request<{ draft: Draft }>('/api/drafts', json({ job, cvId })),
  chat: (cvId: string, subject: string, body: string, instruction: string) =>
    request<{ revision: Draft & { assistantMessage: string } }>('/api/chat', json({ cvId, subject, body, instruction })),
  gmailStatus: () => request<GmailStatus>('/api/auth/gmail/status'),
  startGmail: () => request<{ authorizationUrl: string }>('/api/auth/gmail/start', json()),
  disconnectGmail: () => request<void>('/api/auth/gmail/disconnect', json()),
  listApplications: () => request<{ applications: ApplicationRecord[] }>('/api/applications'),
  prepareSend: (input: {
    job: Job;
    cvId: string;
    recipient: string;
    subject: string;
    body: string;
    allowDuplicate?: boolean;
  }) => request<PreparedSend>('/api/applications/prepare', json(input)),
  send: (confirmationId: string) =>
    request<{ application: ApplicationRecord }>(`/api/applications/${confirmationId}/send`, json({ confirmationText: 'SEND' })),
};
