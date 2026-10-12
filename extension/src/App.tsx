import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Composer } from './components/Composer';
import { CvManager } from './components/CvManager';
import { CvPicker } from './components/CvPicker';
import { HistoryView } from './components/HistoryView';
import { MatchPanel } from './components/MatchPanel';
import { ReviewModal } from './components/ReviewModal';
import { SettingsView } from './components/SettingsView';
import { Stepper } from './components/Stepper';
import { Toast, type ToastData } from './components/Toast';
import { api, ApiError } from './lib/api';
import { openExternal, scanCurrentJob } from './lib/platform';
import type {
  Analysis,
  ApplicationRecord,
  ChatMessage,
  CvRecord,
  Draft,
  GmailStatus,
  Health,
  Job,
  PreparedSend,
  View,
} from './types';

const emptyGmail: GmailStatus = { configured: false, connected: false, account: '' };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function App() {
  const [view, setView] = useState<View>('workspace');
  const [health, setHealth] = useState<Health | null>(null);
  const [gmail, setGmail] = useState<GmailStatus>(emptyGmail);
  const [cvs, setCvs] = useState<CvRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedCvId, setSelectedCvId] = useState(() => localStorage.getItem('selectedCvId') || '');
  const [job, setJob] = useState<Job | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recipient, setRecipient] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Your email is grounded in the selected CV. Ask me to adjust its tone, length, or emphasis.' },
  ]);
  const [busy, setBusy] = useState('');
  const [prepared, setPrepared] = useState<PreparedSend | null>(null);
  const [duplicate, setDuplicate] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [sent, setSent] = useState<ApplicationRecord | null>(null);

  const selectedCv = cvs.find((cv) => cv.id === selectedCvId) || null;
  const progress = sent ? 4 : draft ? 3 : analysis ? 3 : job ? 2 : 1;

  const showToast = (type: ToastData['type'], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast((current) => (current?.message === message ? null : current)), 5000);
  };

  const refreshCvs = async () => {
    const result = await api.listCvs();
    setCvs(result.cvs);
    setSelectedCvId((current) => {
      const next = result.cvs.some((cv) => cv.id === current) ? current : result.cvs[0]?.id || '';
      if (next) localStorage.setItem('selectedCvId', next);
      else localStorage.removeItem('selectedCvId');
      return next;
    });
  };

  const refreshApplications = async () => {
    const result = await api.listApplications();
    setApplications(result.applications);
  };

  useEffect(() => {
    Promise.all([api.health(), api.listCvs(), api.listApplications()])
      .then(([healthResult, cvResult, appResult]) => {
        setHealth(healthResult);
        setGmail(healthResult.gmail);
        setCvs(cvResult.cvs);
        setApplications(appResult.applications);
        setSelectedCvId((current) => current || cvResult.cvs[0]?.id || '');
      })
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (selectedCvId) localStorage.setItem('selectedCvId', selectedCvId);
  }, [selectedCvId]);

  const scan = async () => {
    setBusy('scan');
    try {
      const result = await scanCurrentJob();
      setJob(result);
      setAnalysis(null);
      setDraft(null);
      setSent(null);
      showToast('success', `Detected ${result.title} at ${result.company}.`);
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const analyze = async () => {
    if (!job || !selectedCvId) return;
    setBusy('analyze');
    try {
      const result = await api.analyze(job, selectedCvId);
      setAnalysis(result.analysis);
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const generateDraft = async () => {
    if (!job || !selectedCvId) return;
    setBusy('draft');
    try {
      const result = await api.draft(job, selectedCvId);
      setDraft(result.draft);
      setMessages((current) => [...current, { role: 'assistant', text: 'I created a concise draft using only evidence from your CV. Review every line before sending.' }]);
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const revise = async (instruction: string) => {
    if (!draft || !selectedCvId) return;
    setMessages((current) => [...current, { role: 'user', text: instruction }]);
    setBusy('revise');
    try {
      const result = await api.chat(selectedCvId, draft.subject, draft.body, instruction);
      setDraft(result.revision);
      setMessages((current) => [...current, { role: 'assistant', text: result.revision.assistantMessage }]);
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const prepareSend = async (allowDuplicate = false) => {
    if (!job || !draft || !selectedCvId) return;
    setBusy('prepare');
    try {
      const result = await api.prepareSend({ job, cvId: selectedCvId, recipient, subject: draft.subject, body: draft.body, allowDuplicate });
      setDuplicate(null);
      setPrepared(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.details.code === 'DUPLICATE_APPLICATION') {
        setDuplicate(error.details);
      } else showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const send = async () => {
    if (!prepared) return;
    setBusy('send');
    try {
      const result = await api.send(prepared.confirmationId);
      setSent(result.application);
      setPrepared(null);
      await refreshApplications();
      showToast('success', 'Application sent through Gmail and recorded in your history.');
    } catch (error) {
      setPrepared(null);
      await refreshApplications().catch(() => undefined);
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const uploadCv = async (file: File) => {
    try {
      const result = await api.uploadCv(file);
      await refreshCvs();
      setSelectedCvId(result.cv.id);
      setAnalysis(null);
      setDraft(null);
      showToast('success', `${result.cv.name} was parsed and saved locally.`);
    } catch (error) {
      showToast('error', errorMessage(error));
      throw error;
    }
  };

  const deleteCv = async (id: string) => {
    const cv = cvs.find((item) => item.id === id);
    if (!window.confirm(`Delete ${cv?.name || 'this CV'} from local storage?`)) return;
    try {
      await api.deleteCv(id);
      await refreshCvs();
      if (id === selectedCvId) {
        setAnalysis(null);
        setDraft(null);
      }
      showToast('success', 'CV deleted.');
    } catch (error) {
      showToast('error', errorMessage(error));
    }
  };

  const connectGmail = async () => {
    setBusy('gmail');
    try {
      const { authorizationUrl } = await api.startGmail();
      await openExternal(authorizationUrl);
      showToast('success', 'Complete Google authorization in the new tab.');
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await api.gmailStatus();
        setGmail(status);
        if (status.connected) {
          showToast('success', `Gmail connected${status.account ? ` as ${status.account}` : ''}.`);
          break;
        }
      }
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const disconnectGmail = async () => {
    setBusy('gmail');
    try {
      await api.disconnectGmail();
      setGmail({ configured: true, connected: false, account: '' });
      showToast('success', 'Gmail disconnected and the local token was removed.');
    } catch (error) {
      showToast('error', errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const workspace = useMemo(() => {
    if (!job) {
      return (
        <div className="workspace landing">
          <Stepper current={1} />
          <section className="hero-card">
            <span className="hero-icon"><Sparkles size={22} /></span>
            <span className="eyebrow">Your job application copilot</span>
            <h1>Apply thoughtfully,<br /><em>in less time.</em></h1>
            <p>Compare each vacancy with your real CV, write a truthful email, and stay in control of every send.</p>
            <button className="scan-button" onClick={scan} disabled={busy === 'scan'}>
              {busy === 'scan' ? <LoaderCircle className="spin" size={19} /> : <ScanSearch size={19} />}
              {busy === 'scan' ? 'Reading this page…' : 'Scan current job page'}
              {!busy && <ArrowRight size={17} />}
            </button>
            <div className="supported-sites"><span>Works with</span><b>LinkedIn</b><b>Indeed</b><b>Greenhouse</b><b>Lever</b></div>
          </section>
          <section className="how-it-works">
            <div><span><FileSearch size={18} /></span><div><strong>Evidence, not guesswork</strong><p>See exactly which CV lines support a match.</p></div></div>
            <div><span><ShieldCheck size={18} /></span><div><strong>You make the final call</strong><p>No auto-submit and no unreviewed emails.</p></div></div>
          </section>
          <div className="mini-stats"><div><strong>{cvs.length}</strong><span>Saved CVs</span></div><div><strong>{applications.filter((item) => item.status === 'sent').length}</strong><span>Sent safely</span></div><div><strong>0</strong><span>Auto-sends</span></div></div>
        </div>
      );
    }

    return (
      <div className="workspace">
        <Stepper current={progress} />
        {sent && (
          <section className="sent-banner"><span><CheckCircle2 size={22} /></span><div><strong>Application sent</strong><p>Gmail message {sent.messageId ? `#${sent.messageId.slice(0, 10)}` : ''} is recorded in History.</p></div><button onClick={() => { setJob(null); setAnalysis(null); setDraft(null); setSent(null); }}>Start another</button></section>
        )}
        <section className="card job-card">
          <div className="job-card-top"><span className="detected-badge"><CheckCircle2 size={13} /> Vacancy detected</span><button className="text-button" onClick={scan} disabled={busy === 'scan'}><RefreshCw size={13} /> Rescan</button></div>
          <div className="job-identity"><span className="company-logo"><BriefcaseBusiness size={21} /></span><div><h2>{job.title}</h2><p>{job.company}</p></div><a href={job.url} target="_blank" rel="noreferrer" title="Open job page"><ExternalLink size={16} /></a></div>
          <div className="job-meta"><span><MapPin size={13} /> {job.location || 'Location not listed'}</span><span>{job.source}</span></div>
        </section>
        <CvPicker cvs={cvs} selectedId={selectedCvId} onSelect={(id) => { setSelectedCvId(id); setAnalysis(null); setDraft(null); }} onManage={() => setView('cvs')} />
        {!analysis && (
          <section className="action-card">
            <div><span className="action-icon"><FileSearch size={20} /></span><div><strong>Compare job with your CV</strong><p>Get a transparent score, skill gaps, and quoted evidence.</p></div></div>
            <button className="primary-button" onClick={analyze} disabled={!selectedCv || busy === 'analyze'}>{busy === 'analyze' ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{selectedCv ? 'Analyze match' : 'Add a CV first'}</button>
          </section>
        )}
        {analysis && <MatchPanel analysis={analysis} />}
        {analysis && !draft && (
          <section className="draft-cta"><span><Sparkles size={20} /></span><div><strong>Ready to write?</strong><p>Generate a factual draft grounded in this CV.</p></div><button onClick={generateDraft} disabled={busy === 'draft'}>{busy === 'draft' ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={17} />}</button></section>
        )}
        {draft && selectedCv && <Composer draft={draft} setDraft={setDraft} recipient={recipient} setRecipient={setRecipient} cv={selectedCv} messages={messages} onRevise={revise} onReview={() => prepareSend(false)} revising={busy === 'revise'} preparing={busy === 'prepare'} gmailConnected={gmail.connected} onOpenSettings={() => setView('settings')} />}
      </div>
    );
  }, [job, progress, sent, busy, cvs, applications, selectedCvId, selectedCv, analysis, draft, recipient, messages, gmail.connected]);

  return (
    <AppShell view={view} setView={setView} online={Boolean(health)}>
      {view === 'workspace' && workspace}
      {view === 'cvs' && <CvManager cvs={cvs} selectedId={selectedCvId} onSelect={setSelectedCvId} onUpload={uploadCv} onDelete={deleteCv} />}
      {view === 'history' && <HistoryView applications={applications} />}
      {view === 'settings' && <SettingsView health={health} gmail={gmail} onConnect={connectGmail} onDisconnect={disconnectGmail} busy={busy === 'gmail'} />}
      {prepared && <ReviewModal prepared={prepared} onClose={() => setPrepared(null)} onSend={send} sending={busy === 'send'} />}
      {duplicate && (
        <div className="modal-backdrop">
          <section className="duplicate-modal" role="dialog" aria-modal="true">
            <button className="icon-button close" onClick={() => setDuplicate(null)}><X size={17} /></button>
            <span className="duplicate-icon"><RefreshCw size={22} /></span>
            <h2>Application already attempted</h2>
            <p>Duplicate protection found the same role, company, recipient, and job URL in your history. Check Gmail before trying again.</p>
            <div className="duplicate-record"><small>Previous attempt</small><strong>{String((duplicate.previous as Record<string, unknown>)?.subject || 'Application email')}</strong><span>{String((duplicate.previous as Record<string, unknown>)?.sentAt || '')}</span></div>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setDuplicate(null)}>Cancel</button><button className="primary-button warning-button" onClick={() => prepareSend(true)}>Review another send</button></div>
          </section>
        </div>
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
