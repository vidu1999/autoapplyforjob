# Gmail API and Google OAuth setup

AutoApply AI uses Google's OAuth 2.0 authorization code flow on the Node backend. The extension never contains a Google client secret or refresh token.

## Before you begin

For a personal local build, keep the OAuth app in **Testing** and add your own Google account as a test user. For public distribution, review Google's user-data policy, OAuth verification requirements, branding review, privacy policy requirements, and Chrome Web Store rules.

The requested scopes are:

- `https://www.googleapis.com/auth/gmail.send` — create and send messages only.
- `openid` and `email` — show which account was connected.

The app does not request inbox read, modify, or broad mail access.

## 1. Create a Google Cloud project

1. Open <https://console.cloud.google.com/>.
2. Use the project picker → **New project**.
3. Name it `AutoApply AI Local`, create it, and select it.
4. Open **APIs & Services → Library**.
5. Search for **Gmail API** and click **Enable**.

## 2. Configure the OAuth consent screen

Google Cloud's menu names can change; look for **Google Auth Platform** or **APIs & Services → OAuth consent screen**.

1. Choose **External** unless you are using a managed Workspace organization that supports Internal apps.
2. Enter an app name, user-support email, and developer email.
3. Add the Gmail send scope. OpenID/email may be added automatically at authorization time.
4. Keep publishing status as **Testing** for local development.
5. Add your Gmail address under **Test users**.

Do not invite unrelated users to a development app.

## 3. Create a Web application OAuth client

1. Open **Credentials → Create credentials → OAuth client ID**.
2. Choose **Web application**.
3. Name it `AutoApply AI local backend`.
4. Add this exact authorized redirect URI:

```text
http://127.0.0.1:8787/oauth2/callback
```

5. Create the client, then copy the **Client ID** and **Client secret**.

A Web application client is intentional: its secret stays in the trusted backend. Do not put it in `manifest.json`, React environment variables, or Chrome storage.

## 4. Configure backend secrets

In PowerShell at the project root:

```powershell
Copy-Item backend\.env.example backend\.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated 64-character hex string. Edit `backend\.env`:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8787/oauth2/callback
TOKEN_ENCRYPTION_KEY=paste-the-64-character-hex-value
```

Treat `.env` and the encryption key like passwords. They are ignored by Git. If the key is lost, delete `backend\.data\gmail-token.enc` and reconnect; tokens encrypted with the old key cannot be recovered.

## 5. Connect Gmail

1. Restart the backend after changing `.env`.
2. Open the extension side panel → **Settings**.
3. Click **Connect Gmail**.
4. Choose the test account and approve the listed permissions.
5. Return to the side panel. It polls the backend and displays the connected account.

Google may show an “app not verified” warning for a test app. Only continue for a project you created and understand. Do not tell public users to bypass warnings.

## 6. Test safely

Use an address you control. Create a draft, inspect the final-review screen, verify the recipient and attached PDF, check the confirmation checkbox, then click **Confirm & send email** once.

The backend:

1. Validates recipient, subject, body, CV ID, and job payload.
2. Checks duplicate fingerprints and unsupported numeric-claim warnings.
3. Issues a five-minute single-use confirmation.
4. Consumes it before contacting Gmail.
5. Builds a UTF-8 MIME multipart message with the selected PDF.
6. Base64url-encodes it and calls Gmail `users.messages.send`.
7. Stores success/message ID or failure in local history.

## Disconnect and revoke

Click **Disconnect** in Settings. The backend attempts to revoke the Google credential, then always deletes its encrypted local token. You can also revoke access from <https://myaccount.google.com/permissions>.

## Production requirements

Before hosting for multiple users:

- Use HTTPS and a production redirect URI.
- Add user login/session authentication and bind OAuth state/tokens to that user.
- Store tokens in a KMS-backed secret store; never in a shared local file.
- Add CSRF/session controls, strict CORS, security headers, request audit IDs, and redacted logs.
- Keep `gmail.send` as the narrow Gmail scope.
- Publish a clear privacy policy and deletion path.
- Complete all applicable Google OAuth verification/security-assessment steps.
- Add idempotency/queue reconciliation around Gmail sends.

The provided local token vault is suitable for a trusted, single-user development machine—not a public multi-tenant deployment.
