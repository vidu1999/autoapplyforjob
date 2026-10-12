# AutoApply AI

A consent-first Chrome side-panel assistant that compares a job vacancy with a **real CV**, explains the match, drafts and chat-edits a factual application email, attaches the selected PDF, and sends through Gmail only after explicit review.

![Status](https://img.shields.io/badge/status-MVP%20foundation-2563EB) ![Manifest](https://img.shields.io/badge/Chrome-Manifest%20V3-4F46E5) ![AI](https://img.shields.io/badge/AI-Ollama%20or%20no--cost%20templates-059669)

## What is implemented

- **Professional React side panel** with a compact four-step Scan → Match → Write → Send workflow.
- **MV3 job scanner** for LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, structured `JobPosting` pages, and user-initiated generic pages.
- **Real PDF CV library** with server-side text extraction, profile/skill detection, selectable attachments, and local private storage.
- **Evidence-based matching** with explainable score, matched/missing skills, and quotations from the CV.
- **Grounded application writing** using deterministic free templates or local Ollama (`qwen2.5:3b` by default).
- **AI-style chat editing** with factual guardrails and basic unsupported numeric-claim checks.
- **Gmail OAuth + API sending** from the backend, MIME PDF attachment support, encrypted token storage, and minimal `gmail.send` access.
- **Mandatory final review**, a five-minute one-use confirmation, duplicate fingerprint protection, and local application history.
- **Graceful no-cost mode**: matching and safe draft/tone edits work without an AI key or model.

> This is a local-development MVP, not an unattended auto-applier. It intentionally does not submit website forms or send without a human confirmation.

## Architecture

```text
Chrome side panel (React + TypeScript)
  ├─ service worker: side-panel and active-tab events
  ├─ content script: JobPosting/ATS extraction
  └─ UI: CV, evidence, editor, review, history
                  │ localhost HTTP (development)
                  ▼
Node/Express backend
  ├─ PDF parser + deterministic evidence matcher
  ├─ grounded prompt builder + optional Ollama
  ├─ local CV/application repository
  ├─ encrypted OAuth token vault
  └─ duplicate guard + one-use confirmation + Gmail API
```

Read [ARCHITECTURE.md](ARCHITECTURE.md) for trust boundaries, route design, data flow, and the production migration plan.

## Repository structure

```text
.
├── extension/                 # Vite + React + MV3 side-panel app
│   ├── public/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── content.js
│   └── src/
├── backend/                   # Express API and security-sensitive integrations
│   ├── .env.example
│   ├── src/routes/
│   └── src/services/
├── docs/
│   ├── WINDOWS_SETUP.md
│   ├── GOOGLE_OAUTH.md
│   └── SECURITY.md
└── ARCHITECTURE.md
```

## Quick start

Requires Node.js 20.16+ (current LTS recommended) and Chrome.

```bash
npm install
cp backend/.env.example backend/.env       # PowerShell: Copy-Item backend/.env.example backend/.env
npm run dev
```

Then build the extension:

```bash
npm run build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select:

```text
<project>\extension\dist
```

The Vite browser preview is useful for UI work, but only the loaded Chrome extension can scan the active tab.

For complete Windows instructions, troubleshooting, Ollama setup, and every reload step, see **[docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md)**.

## AI choices and cost

| Mode | Cost | Privacy | Capability |
|---|---:|---|---|
| `AI_PROVIDER=deterministic` | Free | Fully local | Matching, safe draft template, concise/formal/warm edits |
| `AI_PROVIDER=ollama` | Free | Fully local | Flexible draft and chat revisions; requires local RAM/disk |
| Hosted provider adapter | Usage-based | Provider-dependent | Future interface; keys must remain in backend env/secrets |

Start with deterministic mode. If you want richer local editing:

```powershell
winget install Ollama.Ollama
ollama pull qwen2.5:3b
```

Then set `AI_PROVIDER=ollama` in `backend/.env` and restart the backend. The API falls back to a safe template if Ollama is unavailable.

## Gmail setup

Gmail sending is disabled until you configure a Google Cloud OAuth client and a 32-byte token-encryption key. Follow **[docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md)**. No Google client secret or refresh token is placed in the extension.

The send flow is deliberately strict:

1. User edits recipient, subject, body, and selected CV.
2. `POST /api/applications/prepare` validates all fields, checks CV-grounding warnings and duplicate history, then returns a five-minute one-use confirmation ID.
3. The UI displays a final review and requires a confirmation checkbox.
4. `POST /api/applications/:id/send` consumes the confirmation before calling Gmail.
5. Gmail's message ID or failure status is recorded locally.

## Commands

```bash
npm run dev                 # backend + Vite UI
npm run dev:backend         # API only
npm run dev:extension       # web UI preview only
npm run check               # Node syntax + TypeScript
npm test                    # backend unit tests
npm run build               # production extension in extension/dist
npm run package:extension   # creates autoapply-ai-extension.zip
```

## Security and product constraints

- Email/AI provider secrets are backend-only.
- OAuth tokens use AES-256-GCM at rest; `.env` and `.data` are gitignored.
- Gmail scope is send-only; AutoApply AI cannot read the inbox.
- CV text is the factual source. Missing skills are labeled, never silently added.
- The backend blocks duplicate role/company/URL/recipient fingerprints by default.
- This local API is for one trusted user. A hosted release must add user authentication, per-user authorization, TLS, managed encrypted storage, CSRF/session protections, audit logging, and Google verification.

See [docs/SECURITY.md](docs/SECURITY.md) before hosting this project.
