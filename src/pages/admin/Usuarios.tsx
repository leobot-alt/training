import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { TEAM_PERMISSION_KEYS, type TeamPermission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';

const PERMISSION_LABELS: Record<TeamPermission, string> = {
  dashboard: 'Visão geral',
  candidatos: 'Candidatos',
  solicitacoes: 'Solicitações',
  pipeline: 'Pipeline',
  treinamentos: 'Treinamentos',
  'fluxo-treinamento': 'Fluxo de treinamento',
  'conteudo-home': 'Conteúdo da home',
  ajustes: 'Ajustes e exportação',
  usuarios: 'Gestão de usuários (somente administrador)',
};

export default function Usuarios() {
  const { teamAccounts, createTeamAccount, updateTeamAccount, deleteTeamAccount } = useStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [permissoes, setPermissoes] = useState<TeamPermission[]>(['dashboard', 'candidatos']);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const criar = async (event: FormEvent) => {
    event.preventDefault(); setErro(''); setSucesso('');
    if (!nome.trim() || !email.trim()) return setErro('Preencha o nome e o e-mail.');
    if (senha.length < 12) return setErro('A senha inicial deve ter pelo menos 12 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não conferem.');
    setSalvando(true);
    try {
      const result = await createTeamAccount({ nome: nome.trim(), email: email.trim(), senha, permissoes: permissoes.filter((item) => item !== 'usuarios') });
      if (!result.ok) return setErro(result.error ?? 'Não foi possível criar a conta.');
      setNome(''); setEmail(''); setSenha(''); setConfirmacao(''); setPermissoes(['dashboard', 'candidatos']);
      setSucesso('Conta criada. Compartilhe a senha inicial por um canal seguro e peça que a pessoa a altere ao entrar.');
    } finally {
      setSalvando(false);
    }
  };

  const alternarPermissao = (accountId: string, accountPermissions: TeamPermission[], permission: TeamPermission) => {
    if (permission === 'usuarios') return;
    const next = accountPermissions.includes(permission) ? accountPermissions.filter((item) => item !== permission) : [...accountPermissions, permission];
    void updateTeamAccount(accountId, { permissoes: next });
  };

  return <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-secondary">Administração</p><h1 className="mt-1 text-2xl font-bold">Usuários da equipe</h1><p className="mt-1 text-sm text-muted-foreground">Crie contas individuais e defina quais áreas do CRM cada pessoa pode acessar.</p></header>

    <Card className="space-y-4 border-border/70 p-5">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-secondary"/><div><h2 className="font-semibold">Cadastrar usuário</h2><p className="text-xs text-muted-foreground">A pessoa entrará usando e-mail e senha.</p></div></div>
      <form onSubmit={criar} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Nome completo</span><div className="relative"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome da pessoa" className="pl-9"/></div></label>
          <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">E-mail</span><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.com" className="pl-9"/></div></label>
          <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Senha inicial (mínimo 12 caracteres)</span><div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input required type="password" autoComplete="new-password" minLength={12} value={senha} onChange={(event) => setSenha(event.target.value)} className="pl-9"/></div></label>
          <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Confirmar senha</span><Input required type="password" autoComplete="new-password" minLength={12} value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)}/></label>
        </div>
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Permissões iniciais</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{TEAM_PERMISSION_KEYS.filter((key) => key !== 'usuarios').map((key) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded border p-2.5 text-sm"><input type="checkbox" checked={permissoes.includes(key)} onChange={() => setPermissoes((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key])} className="h-4 w-4 accent-secondary"/>{PERMISSION_LABELS[key]}</label>)}</div></div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}{sucesso && <p role="status" className="text-sm text-emerald-700">{sucesso}</p>}
        <Button type="submit" disabled={salvando}><Plus className="mr-2 h-4 w-4"/>{salvando ? 'Criando…' : 'Criar conta'}</Button>
      </form>
    </Card>

    <section className="space-y-3">
      <div className="flex items-center gap-2"><Users className="h-4 w-4 text-secondary"/><h2 className="font-semibold">Contas cadastradas ({teamAccounts.length})</h2></div>
      {teamAccounts.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">Ainda não há contas cadastradas. Crie a primeira conta da equipe acima.</Card> : teamAccounts.map((account) => <Card key={account.id} className="space-y-4 border-border/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="rounded-full bg-accent p-2 text-secondary"><UserRound className="h-4 w-4"/></div><div><p className="font-semibold">{account.nome}</p><p className="text-sm text-muted-foreground">{account.email}</p><p className="mt-1 text-xs text-muted-foreground">Criada em {new Date(account.criadoEm).toLocaleDateString('pt-BR')}</p></div></div>
          <div className="flex gap-2"><Button size="sm" variant={account.ativo ? 'outline' : 'primary'} onClick={() => void updateTeamAccount(account.id, { ativo: !account.ativo })}>{account.ativo ? 'Desativar' : 'Ativar'}</Button><Button size="icon" variant="ghost" aria-label={`Excluir ${account.nome}`} onClick={() => { if (window.confirm(`Excluir a conta de ${account.nome}? A pessoa perderá o acesso ao CRM.`)) void deleteTeamAccount(account.id); }}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
        </div>
        <div className="border-t pt-3"><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5"/>Permissões de acesso</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{TEAM_PERMISSION_KEYS.filter((key) => key !== 'usuarios').map((key) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded border p-2.5 text-sm"><input type="checkbox" checked={account.permissoes.includes(key)} onChange={() => alternarPermissao(account.id, account.permissoes, key)} className="h-4 w-4 accent-secondary"/>{PERMISSION_LABELS[key]}</label>)}</div><p className="mt-2 text-xs text-muted-foreground">A gestão de usuários fica reservada ao administrador principal.</p></div>
      </Card>)}
    </section>
    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-950">As contas são autenticadas pelo Supabase. Senhas não são exibidas nem salvas pelo CRM; as permissões são verificadas também no banco de dados. Compartilhe a senha inicial somente por canal seguro.</div>
  </div>;
}
