import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, ExternalLink, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Benefícios', href: '/#beneficios' },
  { label: 'Requisitos', href: '/#requisitos' },
  { label: 'Dúvidas', href: '/#faq' },
];

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <NavLink
            to="/login"
            className={cn(
              'rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted',
              location.pathname === '/login' ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            Entrar
          </NavLink>
          <Link to="/pre-cadastro">
            <Button size="sm">
              Quero me cadastrar
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <button
          className="rounded-full border p-2 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-background px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium">
              Entrar
            </Link>
            <Link to="/pre-cadastro" onClick={() => setOpen(false)}>
              <Button className="mt-2 w-full" size="sm">
                Quero me cadastrar
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="mt-20 bg-sidebar text-white/80">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo dark />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Plataforma de saúde mental que conecta pacientes a psicólogos e psiquiatras em todo o Brasil.
            Atendimento 100% online, com cuidado de verdade.
          </p>
          <a
            href="https://www.somente.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
          >
            somente.com.br <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-display text-sm font-semibold text-white">Para profissionais</p>
          {[
            ['Pré-cadastro profissional', '/pre-cadastro'],
            ['Entrar no painel', '/login'],
            ['Requisitos', '/#requisitos'],
            ['Dúvidas frequentes', '/#faq'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="block text-white/60 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-display text-sm font-semibold text-white">Institucional</p>
          {['Sobre a Somente', 'Política de privacidade', 'Termos de uso', 'Canal de ética'].map((label) => (
            <span key={label} className="block cursor-default text-white/60">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Somente Saúde Mental. Todos os direitos reservados.</p>
          <p>CNPJ 00.000.000/0001-00 · São Paulo, SP</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
