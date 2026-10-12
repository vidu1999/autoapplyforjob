import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { loading?: boolean; children: ReactNode }
export function LoadingButton({ loading, children, disabled, ...props }: Props) {
  return <button {...props} disabled={disabled || loading}>{loading && <LoaderCircle className="spin" size={16} />}{children}</button>;
}