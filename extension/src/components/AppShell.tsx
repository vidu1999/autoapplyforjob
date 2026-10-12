import {
  BriefcaseBusiness,
  FileText,
  History,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { View } from '../types';

const navigation: Array<{ id: View; label: string; icon: typeof BriefcaseBusiness }> = [
  { id: 'workspace', label: 'Workspace', icon: BriefcaseBusiness },
  { id: 'cvs', label: 'CVs', icon: FileText },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  children: ReactNode;
  view: View;
  setView: (view: View) => void;
  online: boolean;
}

export function AppShell({ children, view, setView, online }: Props) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('workspace')} aria-label="Go to workspace">
          <span className="brand-mark"><BriefcaseBusiness size={18} strokeWidth={2.4} /></span>
          <span>
            <strong>AutoApply</strong><b> AI</b>
            <small>Career copilot</small>
          </span>
        </button>
        <div className={`connection-pill ${online ? 'online' : 'offline'}`} title={online ? 'Backend connected' : 'Backend offline'}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{online ? 'Secure local' : 'Offline'}</span>
        </div>
      </header>
      <div className="privacy-strip"><ShieldCheck size={14} /> Your draft is never sent without final confirmation.</div>
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}