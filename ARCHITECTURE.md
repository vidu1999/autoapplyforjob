# AutoApply AI architecture

## Design principles

1. **Consent before automation.** Scanning, drafting, and sending are separate actions. The backend will not send from draft data alone; it requires a short-lived, single-use confirmation ID created by the review screen.
2. **CV-grounded writing.** Matching evidence is quoted from the selected CV. AI prompts explicitly prohibit invented employers, dates, qualifications, or metrics. The UI marks unmatched requirements rather than hiding them.
3. **Secrets stay out of Chrome.** The extension contains no AI provider key, Google client secret, or refresh token. OAuth and AI calls terminate at the Node backend.
4. **Local first.** The default backend, file storage, deterministic matcher, and Ollama option work on one computer. Storage interfaces can later be replaced by a hosted database and object store.
5. **Least privilege.** Gmail requests `gmail.send` plus identity scopes, never inbox-read access. Page extraction runs only on supported ATS/job URLs, with a user-initiated generic-page fallback.

## Runtime topology

```text
Job page                         Local/hosted Node backend
┌──────────────────────┐        ┌────────────────────────────────────┐
│ content.js           │        │ Validation + rate/size limits      │
│ JSON-LD / DOM parser │        │ CV PDF parser + evidence matcher   │
└──────────┬───────────┘        │ Prompt builder + Ollama adapter    │
           │                    │ OAuth token vault + Gmail adapter  │
┌──────────▼───────────┐ HTTPS  │ Confirmation + duplicate guard     │
│ MV3 side panel       ├───────►│ Local JSON metadata / PDF files    │
│ React + TypeScript   │        └──────────────┬─────────────────────┘
│ review + chat UI     │                       │
└──────────┬───────────┘                       │ OAuth 2.0 / REST
           │                    ┌──────────────▼─────────────┐
┌──────────▼───────────┐        │ Ollama (default) / Gmail   │
│ MV3 service worker   │        │ Google OAuth + Gmail API   │
│ tab + panel events   │        └────────────────────────────┘
└──────────────────────┘
```

## Trust boundaries and data flow

- `content.js` reads visible job data and JobPosting JSON-LD. It returns plain structured data; it cannot send mail.
- The side panel stores only UI preferences and the selected IDs in `chrome.storage.local`. PDFs, OAuth tokens, and application records remain behind the backend API.
- Uploaded PDFs are size/type checked, assigned random IDs, and parsed server-side. Their extracted text is used as the sole factual source for claims.
- A draft can be generated deterministically for no cost or revised by a local Ollama model. Provider output is treated as untrusted and rechecked against obvious unsupported numeric claims.
- Review creates a five-minute confirmation. Send requires the matching confirmation ID and the exact word `SEND`. Confirmation is consumed before the Gmail call so double-clicks cannot send twice.
- A SHA-256 fingerprint of normalized job URL/company/title/recipient is stored. Previously sent fingerprints are blocked by default; the user must create an explicit override confirmation to resend.

## Packages

```text
autoapply-ai/
├── extension/                 # MV3 React side-panel application
│   ├── public/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── content.js
│   └── src/
│       ├── components/        # cards, navigation, send review
│       ├── lib/               # backend and Chrome adapters
│       └── App.tsx
├── backend/
│   ├── src/
│   │   ├── services/          # storage, AI, matching, Gmail
│   │   ├── routes/            # CV, application, auth APIs
│   │   └── server.js
│   └── test/                  # matcher and duplicate tests
├── docs/
│   ├── WINDOWS_SETUP.md
│   └── GOOGLE_OAUTH.md
└── scripts/package-extension.mjs
```

## API surface

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend and provider readiness |
| `POST` | `/api/cvs` | Upload and parse one PDF |
| `GET/DELETE` | `/api/cvs[/:id]` | Manage CVs |
| `POST` | `/api/analyze` | Evidence-based CV/job comparison |
| `POST` | `/api/drafts` | Create a grounded email draft |
| `POST` | `/api/chat` | Revise an existing draft |
| `GET/POST` | `/api/auth/gmail/*` | OAuth status/start/disconnect |
| `GET` | `/oauth2/callback` | Google OAuth redirect target |
| `POST` | `/api/applications/prepare` | Validate and create confirmation |
| `POST` | `/api/applications/:id/send` | Consume confirmation and send |
| `GET` | `/api/applications` | Local application history |

## Production evolution

For a public multi-user product, put the backend behind TLS, authenticate every API request, bind each resource to a user ID, use a managed encrypted database/object store, place OAuth tokens in a KMS-backed secrets service, add queues and idempotency keys for sends, redact logs, and complete Google's OAuth verification/security requirements. Do not expose a hosted backend with the development CORS defaults or local file store.
