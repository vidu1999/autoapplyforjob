import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastData { type: 'success' | 'error'; message: string }

export function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  return <div className={`toast ${toast.type}`} role="status">{toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{toast.message}</span><button onClick={onClose} aria-label="Dismiss"><X size={15} /></button></div>;
}