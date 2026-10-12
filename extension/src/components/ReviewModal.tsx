import { AlertTriangle, Check, FileText, LoaderCircle, LockKeyhole, Mail, Send, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import type { PreparedSend } from '../types';

interface Props {
  prepared: PreparedSend;
  onClose: () => void;
  onSend: () => Promise<void>;
  sending: boolean;
}

export function ReviewModal({ prepared, onClose, onSend, sending }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const review = prepared.review;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <header><div><span className="modal-icon"><ShieldCheck size={20} /></span><div><small>Final confirmation</small><h2 id="review-title">Review before sending</h2></div></div><button className="icon-button" onClick={onClose} disabled={sending} aria-label="Close"><X size={18} /></button></header>
        <div className="review-body">
          {review.duplicateOverride && <div className="modal-warning"><AlertTriangle size={17} /><span><strong>Duplicate override</strong>This role was sent before. You explicitly chose to prepare another send.</span></div>}
          {review.claimWarnings.length > 0 && <div className="modal-warning"><AlertTriangle size={17} /><span><strong>Check possible unsupported claims</strong>{review.claimWarnings[0]}</span></div>}
          <div className="review-job"><span><Mail size={18} /></span><div><strong>{review.jobTitle}</strong><p>{review.company}</p></div></div>
          <dl className="review-details"><div><dt>Recipient</dt><dd>{review.recipient}</dd></div><div><dt>Subject</dt><dd>{review.subject}</dd></div><div><dt>Attachment</dt><dd><FileText size={14} /> {review.cvName}</dd></div></dl>
          <div className="message-preview"><span>Message preview</span><p>{review.bodyPreview}</p></div>
          <label className={`confirmation-check ${confirmed ? 'checked' : ''}`}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span className="custom-check">{confirmed && <Check size={14} />}</span><span><strong>I reviewed every detail</strong><small>I confirm the recipient, claims, message, and attached CV are correct.</small></span></label>
          <div className="consent-note"><LockKeyhole size={13} /> Confirmation expires at {new Date(prepared.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and can be used once.</div>
        </div>
        <footer><button className="secondary-button" onClick={onClose} disabled={sending}>Go back</button><button className="send-button" disabled={!confirmed || sending} onClick={onSend}>{sending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />} {sending ? 'Sending securely…' : 'Confirm & send email'}</button></footer>
      </section>
    </div>
  );
}