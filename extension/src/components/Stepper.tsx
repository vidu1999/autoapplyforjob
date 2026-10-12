import { Check } from 'lucide-react';

const steps = ['Scan', 'Match', 'Write', 'Send'];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="Application progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = current > number;
        return (
          <li key={label} className={current >= number ? 'active' : ''}>
            <span>{done ? <Check size={12} strokeWidth={3} /> : number}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}