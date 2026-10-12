import { AlertCircle, CheckCircle2, Clock3, FileEdit } from 'lucide-react';

const config = {
  draft: { label: 'Draft', icon: FileEdit },
  sending: { label: 'Sending', icon: Clock3 },
  sent: { label: 'Sent', icon: CheckCircle2 },
  failed: { label: 'Failed', icon: AlertCircle },
};

export function StatusBadge({ status }: { status: keyof typeof config }) {
  const value = config[status] || config.draft;
  const Icon = value.icon;
  return <span className={`status-badge ${status}`}><Icon size={12} />{value.label}</span>;
}