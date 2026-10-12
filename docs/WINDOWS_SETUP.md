# Windows setup — step by step

These instructions use PowerShell and assume no previous JavaScript setup.

## 1. Install development tools

### Required

1. **Node.js 20.16 or newer (current LTS recommended)** — download from <https://nodejs.org/> and use the default installer options.
2. **Google Chrome** — download from <https://www.google.com/chrome/>.
3. **Git for Windows** — download from <https://git-scm.com/download/win> if you are cloning rather than using a ZIP.

Restart PowerShell after installing Node. Verify:

```powershell
node --version
npm --version
```

`node --version` should report `v20` or newer.

### Optional: free local AI

Install Ollama from <https://ollama.com/download/windows> or run:

```powershell
winget install Ollama.Ollama
```

Ollama is not required. AutoApply AI starts in a deterministic no-cost mode.

## 2. Get and prepare the project

Choose a short path such as `D:\Projects` to avoid Windows path-length issues.

```powershell
cd D:\Projects
git clone https://github.com/vidu1999/autoapplyforjob.git
cd autoapplyforjob
npm install
Copy-Item backend\.env.example backend\.env
```

If PowerShell blocks npm scripts, do **not** disable security globally. Run npm through its command shim:

```powershell
npm.cmd install
```

## 3. Start the backend and UI preview

```powershell
npm run dev
```

Expected output includes:

```text
AutoApply AI backend listening on http://127.0.0.1:8787
```

Open <http://localhost:5173> to inspect the side-panel UI in a normal browser tab. Page scanning is intentionally mocked in this preview; active-tab scanning only works inside Chrome's extension runtime.

To verify the API separately, open <http://127.0.0.1:8787/api/health>. You should see JSON with `"status":"ok"`.

### Use Ollama (optional)

Open a second PowerShell window:

```powershell
ollama pull qwen2.5:3b
```

Edit `backend\.env`:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
```

Stop the running command with **Ctrl+C**, then run `npm run dev` again. If your computer has limited RAM, use a smaller model available in Ollama. AutoApply AI falls back to its safe template whenever Ollama is unavailable.

## 4. Build and load the Chrome extension

Keep the backend running. In another PowerShell window at the project root:

```powershell
npm run build
```

This creates `extension\dist`. Chrome cannot load the TypeScript source folder directly.

1. Enter `chrome://extensions` in Chrome's address bar.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select **`D:\Projects\autoapplyforjob\extension\dist`** (not the project root and not a ZIP).
5. Pin **AutoApply AI** from Chrome's extensions menu if desired.
6. Open a vacancy detail page on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby.
7. Click the AutoApply AI toolbar icon. Chrome opens the side panel.
8. Choose **Scan current job page**.

When extension source changes, run `npm run build` again and click the extension's **Reload** icon on `chrome://extensions`. Refresh the vacancy tab too, because content scripts already injected into an old tab are not automatically replaced.

## 5. Add a real CV

1. Open **CVs** in the side panel.
2. Select a text-based PDF up to 8 MB.
3. Confirm that pages and detected skills appear.
4. Return to **Workspace**, scan a vacancy, choose the CV, and click **Analyze match**.

A scanned image-only PDF has no usable text. Open it in Word/Adobe Acrobat, run OCR, or export a text-based PDF and upload again.

CV PDFs, extracted text, and history are stored in:

```text
backend\.data\
```

This directory and `backend\.env` are excluded from Git. Back them up only to a location you trust.

## 6. Generate and revise an email

1. Review matching and missing skills. Expand **View CV evidence**.
2. Select **Generate factual draft**.
3. Enter a real recipient address and edit the subject/body.
4. Open **AI editor** to ask for tone or length changes.
5. Re-read the result. Local AI is fallible; the score is an estimate, not a hiring prediction.

No email can be sent until Gmail is configured and connected. Follow [GOOGLE_OAUTH.md](GOOGLE_OAUTH.md).

## 7. Package a local build

```powershell
npm run package:extension
```

This creates `autoapply-ai-extension.zip`. For local Developer mode, an unpacked `extension\dist` folder is easier. Chrome Web Store publication has additional policies, privacy disclosures, review, and OAuth verification requirements.

## Troubleshooting

### “Backend is offline”

- Keep `npm run dev:backend` or `npm run dev` open.
- Check <http://127.0.0.1:8787/api/health>.
- Check whether another app uses port 8787: `Get-NetTCPConnection -LocalPort 8787`.
- Do not change the port without also setting `VITE_API_URL` before rebuilding and adding the URL to `manifest.json` CSP/host permissions.

### The page is not recognized

- Open the individual vacancy detail, not a search-results page.
- Wait for the job description to finish loading, then rescan.
- Refresh the page after reloading the extension.
- Restricted pages such as `chrome://`, the Chrome Web Store, local browser pages, and some authenticated iframes cannot be scanned.
- For another public ATS, clicking the extension grants temporary `activeTab` access and the scanner uses JSON-LD/job-language signals.

### Chrome says the manifest is missing

Select `extension\dist`, and make sure `npm run build` succeeded. The selected folder must directly contain `manifest.json` and `sidepanel.html`.

### PDF cannot be read

Use a real PDF (the file must start with the PDF signature), under the configured size, containing selectable text. Run OCR on scanned documents.

### Ollama is unavailable or slow

- Confirm `ollama list` includes the exact model in `OLLAMA_MODEL`.
- Open <http://127.0.0.1:11434/api/tags>.
- Return to `AI_PROVIDER=deterministic` for the lightest and safest mode.

### Gmail remains disconnected

- Ensure `GOOGLE_REDIRECT_URI` exactly matches the URI in Google Cloud.
- Generate `TOKEN_ENCRYPTION_KEY` exactly as documented.
- Keep the backend running during OAuth.
- If Google does not return a refresh token, revoke the test app at <https://myaccount.google.com/permissions> and connect again.

## Stop and restart

Press **Ctrl+C** in each running PowerShell window. Your CV and history persist in `backend\.data`; the UI can be restarted with `npm run dev`, and the already-built extension can be used whenever the backend is running.
