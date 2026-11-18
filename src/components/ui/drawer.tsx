import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-primary/25 backdrop-blur-[2px] animate-fade-in"
      />
      <aside
        className={cn(
          'relative z-10 flex h-full w-full max-w-xl flex-col bg-card shadow-lift animate-slide-in',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="space-y-1">
            <div className="text-lg font-semibold font-display leading-tight">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
            aria-label="Fechar detalhes"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t bg-muted/40 px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}
