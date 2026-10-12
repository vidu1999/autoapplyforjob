import { z } from 'zod';

export const jobSchema = z.object({
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().min(1).max(300),
  location: z.string().trim().max(300).default(''),
  description: z.string().trim().min(40).max(100_000),
  url: z.string().url().max(3000),
  source: z.string().trim().max(100).default('Job page'),
});

export const analyzeSchema = z.object({ job: jobSchema, cvId: z.string().min(4).max(100) });

export const draftSchema = analyzeSchema.extend({ analysis: z.record(z.unknown()).optional() });

export const chatSchema = z.object({
  cvId: z.string().min(4).max(100),
  subject: z.string().max(180),
  body: z.string().min(1).max(10_000),
  instruction: z.string().trim().min(2).max(1000),
});

export const prepareSchema = z.object({
  job: jobSchema,
  cvId: z.string().min(4).max(100),
  recipient: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(10).max(10_000),
  allowDuplicate: z.boolean().default(false),
});

export const sendSchema = z.object({ confirmationText: z.literal('SEND') });
