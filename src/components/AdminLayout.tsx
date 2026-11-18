import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  GraduationCap,
  KanbanSquare,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  MessageSquareText,
  PanelsTopLeft,
  Settings2,
  ShieldCheck,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { useStore } from '@/lib/store';
import { cn, initials } from '@/lib/utils';
import type { TeamPermission } from '@/lib/types';

const items: Array<{ to: string; label: string; icon: typeof Users; end: boolean; permission?: TeamPermission; adminOnly?: boolean }> = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true, permission: 'dashboard' },
  { to: '/admin/candidatos', label: 'Candidatos', icon: Users, end: false, permission: 'candidatos' },
  { to: '/admin/solicitacoes', label: 'Solicitações', icon: MessageSquareText, end: false, permission: 'solicitacoes' },
  { to: '/admin/pipeline', label: 'Pipeline', icon: KanbanSquare, end: false, permission: 'pipeline' },
  { to: '/admin/treinamentos', label: 'Treinamentos', icon: GraduationCap, end: false, permission: 'treinamentos' },
  { to: '/admin/fluxo-treinamento', label: 'Fluxo de treinamento', icon: ListOrdered, end: false, permission: 'fluxo-treinamento' },
  { to: '/admin/conteudo-home', label: 'Conteúdo da home', icon: PanelsTopLeft, end: false, permission: 'conteudo-home' },
  { to: '/admin/ajustes', label: 'Ajustes', icon: Settings2, end: false, permission: 'ajustes' },
  { to: '/admin/usuarios', label: 'Usuários da equipe', icon: ShieldCheck, end: false, permission: 'usuarios', adminOnly: true },
  { to: '/admin/minha-conta', label: 'Minha conta', icon: UserRound, end: false },
];

export function AdminLayout() {
  const { user, logout, candidatos, solicitacoes, loading, syncError } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Validando acesso…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'profissional') return <Navigate to="/painel" replace />;

  const permitted = (item: typeof items[number]) => user.role === 'admin' || (!item.adminOnly && (!item.permission || user.permissoes?.includes(item.permission)));
  const visibleItems = items.filter(permitted);
  const currentItem = items.find((item) => item.to === pathname);
  if (currentItem && !permitted(currentItem)) {
    const destination = visibleItems.find((item) => item.to !== '/admin/minha-conta')?.to ?? '/admin/minha-conta';
    return <Navigate to={destination} replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
            isActive ? 'bg-white/12 text-white shadow-sm' : 'text-white/60 hover:bg-white/8 hover:text-white',
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.to === '/admin/candidatos' && <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">{candidatos.length}</span>}
          {item.to === '/admin/solicitacoes' && <span className="rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{solicitacoes.filter((request) => request.status === 'pendente').length + candidatos.filter((candidate) => candidate.solicitacaoAtualizacao).length}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-5 lg:flex">
        <Logo dark />
        <div className="mt-8 flex-1">{nav}</div>
        <Link to="/" className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/8 hover:text-white">Ver portal público <ArrowUpRight className="h-3 w-3" /></Link>
        <div className="rounded-md bg-white/8 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{initials(user.nome)}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{user.nome}</p><p className="truncate text-[11px] text-white/50">{user.email}</p></div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Sair da conta</button>
        </div>
      </aside>

      <div className="flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden"><Logo dark /><button className="rounded-full p-2 text-white" onClick={() => setMobileOpen((value) => !value)} aria-label="Menu">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      {mobileOpen && <div className="border-b bg-sidebar p-4 lg:hidden">{nav}<button onClick={() => { logout(); navigate('/login'); }} className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-white/60"><LogOut className="h-3.5 w-3.5" /> Sair</button></div>}
      <main className="min-w-0 flex-1">
        {syncError && <div role="alert" className="m-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Não foi possível sincronizar uma alteração. Verifique sua conexão e tente novamente; se persistir, contate a administração.</div>}
        <Outlet />
      </main>
    </div>
  );
}
