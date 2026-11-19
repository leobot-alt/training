import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Marca Somente.
 * Substitua o bloco <svg> por <img src={logo} alt="Somente" /> caso queira
 * usar o PNG oficial (src/assets/logo-somente.png) do seu projeto.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-9 w-9', className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path
        d="M11 25.5c4.2 0 5.6-2.8 9-2.8s4.8 2.8 9 2.8"
        stroke="#12C2E9"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="14.5" r="3.4" fill="#12C2E9" />
    </svg>
  );
}

export function Logo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="Somente — página inicial">
      <LogoMark className={cn('transition-transform duration-300 group-hover:-rotate-6', dark ? 'text-white' : 'text-primary')} />
      {!compact && (
        <span
          className={cn(
            'font-display text-xl font-extrabold lowercase tracking-tight',
            dark ? 'text-white' : 'brand-wordmark',
          )}
        >
          somente
          <span className="text-brand-cyan">.</span>
        </span>
      )}
    </Link>
  );
}
