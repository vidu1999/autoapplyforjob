import { Bot, CheckCircle2, ExternalLink, KeyRound, Link2, LockKeyhole, Mail, Server, Unplug } from 'lucide-react';
import type { GmailStatus, Health } from '../types';

interface Props {
  health: Health | null;
  gmail: GmailStatus;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  busy: boolean;
}

export function SettingsView({ health, gmail, onConnect, onDisconnect, busy }: Props) {
  return (
    <div className="page-stack">
      <div className="page-heading"><span className="eyebrow">Connections & privacy</span><h1>Settings</h1><p>External credentials live in the backend, never in the extension bundle.</p></div>
      <section className="card settings-card">
        <div className="settings-row">
          <span className="service-icon gmail"><Mail size={20} /></span>
          <div><strong>Gmail</strong><p>{gmail.connected ? gmail.account || 'Google account connected' : gmail.configured ? 'Ready to connect' : 'OAuth setup required'}</p></div>
          <span className={`service-state ${gmail.connected ? 'connected' : ''}`}>{gmail.connected ? <><CheckCircle2 size={13} /> Connected</> : 'Not connected'}</span>
        </div>
        <div className="settings-actions">
          {gmail.connected ? (
            <button className="secondary-button danger-text" onClick={onDisconnect} disabled={busy}><Unplug size={15} /> Disconnect</button>
          ) : (
            <button className="primary-button" onClick={onConnect} disabled={busy || !gmail.configured}><Link2 size={15} /> Connect Gmail</button>
          )}
          {!gmail.configured && <a href="https://github.com/vidu1999/autoapplyforjob/blob/main/docs/GOOGLE_OAUTH.md" target="_blank" rel="noreferrer">Setup guide <ExternalLink size={12} /></a>}
        </div>
      </section>
      <section className="card settings-card">
        <div className="settings-row">
          <span className="service-icon ai"><Bot size={20} /></span>
          <div><strong>AI writing</strong><p>{health?.ai.provider === 'ollama' ? `${health.ai.model} via local Ollama` : 'Safe no-cost templates'}</p></div>
          <span className={`service-state ${health?.ai.ready ? 'connected' : ''}`}>{health?.ai.ready ? 'Ready' : 'Unavailable'}</span>
        </div>
        <div className="settings-note">Switch <code>AI_PROVIDER=ollama</code> in <code>backend/.env</code> for local chat editing. No API key required.</div>
      </section>
      <section className="security-list">
        <h2>Security controls</h2>
        <div><LockKeyhole size={17} /><span><strong>Encrypted OAuth tokens</strong><small>AES-256-GCM at rest in the local backend.</small></span></div>
        <div><KeyRound size={17} /><span><strong>Minimal Gmail scope</strong><small>Send access only; no inbox-reading permission.</small></span></div>
        <div><Server size={17} /><span><strong>Backend trust boundary</strong><small>Provider secrets are not exposed to page scripts or Chrome storage.</small></span></div>
      </section>
      <p className="version-line">AutoApply AI v{health?.version || '0.1.0'} · Local development build</p>
    </div>
  );
}