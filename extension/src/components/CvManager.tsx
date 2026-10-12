import { FileCheck2, FileText, LoaderCircle, Plus, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CvRecord } from '../types';

interface Props {
  cvs: CvRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function fileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CvManager({ cvs, selectedId, onSelect, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const choose = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); }
  };
  return (
    <div className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Your profile</span>
        <h1>CV library</h1>
        <p>Choose exactly which PDF is analyzed and attached to each application.</p>
      </div>
      <button className="upload-zone" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <span className="upload-icon">{uploading ? <LoaderCircle className="spin" size={24} /> : <UploadCloud size={24} />}</span>
        <strong>{uploading ? 'Reading your CV…' : 'Upload CV in PDF'}</strong>
        <small>Text-based PDF · Maximum 8 MB · Never sent automatically</small>
        <span className="secondary-button"><Plus size={15} /> Choose file</span>
      </button>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => choose(event.target.files?.[0])} />

      <section>
        <div className="section-heading"><h2>Saved CVs</h2><span>{cvs.length}</span></div>
        <div className="cv-list">
          {cvs.length === 0 && <div className="empty-state compact"><FileText size={24} /><strong>No CVs yet</strong><p>Upload your real CV to unlock evidence-based matching.</p></div>}
          {cvs.map((cv) => (
            <article className={`cv-item ${cv.id === selectedId ? 'selected' : ''}`} key={cv.id}>
              <button className="cv-item-main" onClick={() => onSelect(cv.id)}>
                <span className="pdf-icon"><FileCheck2 size={19} /></span>
                <span><strong>{cv.name}</strong><small>{cv.profile.pages ? `${cv.profile.pages} pages · ` : ''}{fileSize(cv.size)} · {cv.profile.skills.length} detected skills</small></span>
                {cv.id === selectedId && <span className="default-label">Selected</span>}
              </button>
              <div className="cv-skill-preview">
                {cv.profile.skills.slice(0, 5).map((skill) => <span className="tag neutral" key={skill}>{skill}</span>)}
              </div>
              <button className="icon-button danger" onClick={() => onDelete(cv.id)} title="Delete CV" aria-label={`Delete ${cv.name}`}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      </section>
      <div className="notice safe"><ShieldCheck size={17} /><div><strong>Private by design</strong><p>PDFs stay in your local backend data folder. The extension stores only the selected CV ID.</p></div></div>
    </div>
  );
}