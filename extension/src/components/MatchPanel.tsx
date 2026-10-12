import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import type { Analysis } from '../types';

export function MatchPanel({ analysis }: { analysis: Analysis }) {
  const tone = analysis.score >= 75 ? 'strong' : analysis.score >= 50 ? 'medium' : 'low';
  return (
    <section className="card match-card">
      <div className="match-hero">
        <div className={`score-ring ${tone}`} style={{ '--score': `${analysis.score * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{analysis.score}</strong><span>%</span><small>match</small></div>
        </div>
        <div>
          <span className="eyebrow"><Sparkles size={13} /> CV match</span>
          <h3>{analysis.score >= 75 ? 'Strong foundation' : analysis.score >= 50 ? 'Good potential' : 'Review carefully'}</h3>
          <p>{analysis.summary}</p>
        </div>
      </div>
      <div className="skill-columns">
        <div>
          <h4><CheckCircle2 size={15} /> Matching skills</h4>
          <div className="tag-list">
            {analysis.matchingSkills.length ? analysis.matchingSkills.map((skill) => <span className="tag positive" key={skill}>{skill}</span>) : <span className="empty-copy">No direct matches detected</span>}
          </div>
        </div>
        <div>
          <h4><AlertTriangle size={15} /> Not found in CV</h4>
          <div className="tag-list">
            {analysis.missingSkills.length ? analysis.missingSkills.map((skill) => <span className="tag warning" key={skill}>{skill}</span>) : <span className="empty-copy">No detected gaps</span>}
          </div>
        </div>
      </div>
      {analysis.evidence.length > 0 && (
        <details className="evidence">
          <summary>View CV evidence <span>{analysis.evidence.length}</span></summary>
          <div className="evidence-list">
            {analysis.evidence.map((item) => (
              <div key={item.skill}><strong>{item.skill}</strong><blockquote>{item.quote}</blockquote></div>
            ))}
          </div>
        </details>
      )}
      <p className="disclaimer"><Info size={13} /> {analysis.disclaimer}</p>
    </section>
  );
}