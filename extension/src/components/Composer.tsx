import { Bot, Check, FileText, LoaderCircle, Mail, MessageSquareText, Send, ShieldCheck, Sparkles, User } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { ChatMessage, CvRecord, Draft } from '../types';

interface Props {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  recipient: string;
  setRecipient: (value: string) => void;
  cv: CvRecord;
  messages: ChatMessage[];
  onRevise: (instruction: string) => Promise<void>;
  onReview: () => Promise<void>;
  revising: boolean;
  preparing: boolean;
  gmailConnected: boolean;
  onOpenSettings: () => void;
}

const prompts = ['Make it concise', 'More professional', 'Warmer opening'];

export function Composer({ draft, setDraft, recipient, setRecipient, cv, messages, onRevise, onReview, revising, preparing, gmailConnected, onOpenSettings }: Props) {
  const [tab, setTab] = useState<'email' | 'chat'>('email');
  const [instruction, setInstruction] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!instruction.trim() || revising) return;
    const value = instruction;
    setInstruction('');
    await onRevise(value);
  };
  return (
    <section className="card composer-card">
      <div className="composer-header">
        <div><span className="eyebrow"><Sparkles size={13} /> Writing workspace</span><h3>Application email</h3></div>
        <span className="draft-chip"><span /> Draft</span>
      </div>
      <div className="segmented-control">
        <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}><Mail size={15} /> Email</button>
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}><MessageSquareText size={15} /> AI editor</button>
      </div>
      {tab === 'email' ? (
        <div className="email-editor">
          <label><span>To</span><input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="hiring@company.com" autoComplete="email" /></label>
          <label><span>Subject</span><input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
          <label className="body-field"><span>Message</span><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={13} /></label>
          <div className="attachment-row"><span className="pdf-mini"><FileText size={15} /></span><div><small>Attachment</small><strong>{cv.name}</strong></div><Check size={15} /></div>
          {draft.warnings?.map((warning) => <p className="inline-warning" key={warning}>{warning}</p>)}
        </div>
      ) : (
        <div className="chat-workspace">
          <div className="chat-intro"><span><Bot size={17} /></span><div><strong>Grounded AI editor</strong><p>I can change tone and structure, but I may only use claims found in your selected CV.</p></div></div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}</span><p>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="quick-prompts">{prompts.map((prompt) => <button onClick={() => onRevise(prompt)} key={prompt} disabled={revising}>{prompt}</button>)}</div>
          <form className="chat-input" onSubmit={submit}>
            <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Ask for a revision…" />
            <button disabled={!instruction.trim() || revising} aria-label="Send revision request">{revising ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}</button>
          </form>
        </div>
      )}
      <div className="send-footer">
        <div><ShieldCheck size={14} /><span>Review required before send</span></div>
        {gmailConnected ? (
          <button className="primary-button" onClick={onReview} disabled={preparing || !recipient || !draft.subject || !draft.body}>{preparing ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} Review & send</button>
        ) : (
          <button className="primary-button secondary-primary" onClick={onOpenSettings}><Mail size={16} /> Connect Gmail</button>
        )}
      </div>
    </section>
  );
}