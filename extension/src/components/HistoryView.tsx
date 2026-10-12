import { BriefcaseBusiness, ExternalLink, History } from 'lucide-react';
import type { ApplicationRecord } from '../types';
import { StatusBadge } from './StatusBadge';

export function HistoryView({ applications }: { applications: ApplicationRecord[] }) {
  return (
    <div className="page-stack">
      <div className="page-heading"><span className="eyebrow">Application log</span><h1>History</h1><p>Gmail message IDs and send outcomes are saved locally for duplicate protection.</p></div>
      <div className="history-summary">
        <div><strong>{applications.length}</strong><span>Total</span></div>
        <div><strong>{applications.filter((item) => item.status === 'sent').length}</strong><span>Sent</span></div>
        <div><strong>{applications.filter((item) => item.status === 'failed').length}</strong><span>Needs attention</span></div>
      </div>
      <section>
        <div className="section-heading"><h2>Recent applications</h2></div>
        <div className="history-list">
          {applications.length === 0 && <div className="empty-state"><History size={28} /><strong>No applications yet</strong><p>Nothing is logged until you explicitly confirm a Gmail send.</p></div>}
          {applications.map((item) => (
            <article className="history-item" key={item.id}>
              <span className="company-icon"><BriefcaseBusiness size={18} /></span>
              <div className="history-copy">
                <div><strong>{item.job.title}</strong><StatusBadge status={item.status} /></div>
                <p>{item.job.company} · {item.recipient}</p>
                <small>{new Date(item.sentAt || item.createdAt).toLocaleString()} · {item.cvName}</small>
                {item.error && <span className="item-error">{item.error}</span>}
              </div>
              <a href={item.job.url} target="_blank" rel="noreferrer" className="icon-button" title="Open vacancy"><ExternalLink size={15} /></a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}