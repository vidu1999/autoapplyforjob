export type View = 'workspace' | 'cvs' | 'history' | 'settings';

export interface Job {
  supported: boolean;
  confidence: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
}

export interface CvRecord {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  textLength: number;
  profile: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    preview: string;
    pages?: number | null;
  };
}

export interface Analysis {
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
  evidence: Array<{ skill: string; quote: string }>;
  keywordHits: string[];
  summary: string;
  disclaimer: string;
}

export interface Draft {
  subject: string;
  body: string;
  provider: string;
  warnings: string[];
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  account: string;
  error?: string;
}

export interface Health {
  status: string;
  version: string;
  ai: { provider: string; ready: boolean; model: string | null };
  gmail: GmailStatus;
}

export interface ApplicationRecord {
  id: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  job: Job;
  recipient: string;
  subject: string;
  cvName: string;
  messageId?: string;
  error?: string;
}

export interface PreparedSend {
  confirmationId: string;
  expiresAt: string;
  review: {
    recipient: string;
    subject: string;
    cvName: string;
    jobTitle: string;
    company: string;
    bodyPreview: string;
    duplicateOverride: boolean;
    claimWarnings: string[];
  };
}

export interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}
