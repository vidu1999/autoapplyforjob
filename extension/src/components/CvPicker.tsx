import { Check, ChevronDown, FileText, Plus } from 'lucide-react';
import type { CvRecord } from '../types';

interface Props {
  cvs: CvRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export function CvPicker({ cvs, selectedId, onSelect, onManage }: Props) {
  const selected = cvs.find((cv) => cv.id === selectedId);
  if (!cvs.length) {
    return (
      <button className="empty-cv-card" onClick={onManage}>
        <span><Plus size={18} /></span>
        <div><strong>Add your CV</strong><small>Upload a text-based PDF to compare real experience.</small></div>
      </button>
    );
  }
  return (
    <label className="cv-select">
      <span className="file-icon"><FileText size={18} /></span>
      <span className="cv-select-copy"><small>CV for this application</small><strong>{selected?.name || 'Choose a CV'}</strong></span>
      <select value={selectedId} onChange={(event) => onSelect(event.target.value)} aria-label="Selected CV">
        {cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
      </select>
      {selected ? <Check className="select-check" size={16} /> : <ChevronDown size={16} />}
    </label>
  );
}