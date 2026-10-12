# Security model

## Protected assets

- CV PDFs and extracted CV text
- Google access/refresh tokens
- Google client secret and token-encryption key
- Application recipients, message contents, and history
- Any future hosted AI provider key

## Current controls

- Secrets are read from `backend/.env`, excluded from Git, and never returned to the extension.
- OAuth tokens are encrypted at rest using AES-256-GCM with a random nonce per write.
- Gmail access uses `gmail.send`; there is no inbox-reading feature.
- OAuth `state` is cryptographically random, expires after ten minutes, and is one-use.
- PDF type/signature and size are checked; filenames are sanitized; server-generated IDs determine disk paths.
- API bodies are schema-validated and length-limited.
- CV text never becomes a filesystem path or command.
- AI prompts identify the CV as the only claims source. Basic unsupported numeric-result claims are detected or stripped.
- Sending requires a single-use server-side confirmation that expires in five minutes.
- Duplicate fingerprint checks occur both before review and immediately before send.
- Confirmation is consumed before the network call, limiting double-click/replay sends.
- Local metadata writes use an atomic temp-file rename and serialized write queue.
- Extension CSP permits only self-hosted scripts and the local backend connection.

## Known local-MVP limits

- The local API does not authenticate its single user. Any process or allowed Chrome extension origin on the same machine may call it.
- Chrome-extension origins are accepted dynamically in local CORS because unpacked IDs differ by installation.
- Local JSON/file storage is not a multi-user authorization boundary.
- A deterministic matcher and AI model can be wrong; neither is a hiring prediction.
- Prompt grounding reduces hallucinations but cannot mathematically prove every natural-language claim.
- A process crash after Gmail accepts a message but before history is updated can leave uncertain status. Gmail should be checked manually before retrying.
- The token encryption key and encrypted token are on the same development computer. Encryption protects backups/accidental reads, not a fully compromised host.

## Hosting checklist

Do not expose this backend publicly until all of the following exist:

- [ ] TLS and HSTS at every public endpoint
- [ ] User authentication, secure cookies/sessions, CSRF protection
- [ ] Per-record authorization for CVs, tokens, confirmations, and history
- [ ] Exact production CORS allowlist (remove wildcard Chrome-origin behavior)
- [ ] Managed SQL database and private object storage with encryption and retention
- [ ] KMS/secret-manager token encryption and rotation
- [ ] Malware scanning/sandboxing for uploaded PDFs
- [ ] Structured redacted logs and security monitoring
- [ ] Send queue with idempotency keys and Gmail result reconciliation
- [ ] Rate limits by authenticated user and abuse controls
- [ ] Privacy policy, export/deletion flow, retention schedule, and consent records
- [ ] Google OAuth verification and any required security assessment
- [ ] Chrome Web Store policy and permission review
- [ ] Dependency, SAST, and penetration testing in CI/release process

## Reporting a vulnerability

Do not open a public issue containing CVs, tokens, client secrets, email addresses, or exploit details. Revoke exposed Google credentials immediately, rotate the client secret/encryption key, disconnect the app, and remove compromised local data.
