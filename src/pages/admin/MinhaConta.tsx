import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';

export default function MinhaConta() {
  const { user, changeOwnPassword } = useStore();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const alterar = async (event: FormEvent) => {
    event.preventDefault(); setErro(''); setSucesso('');
    if (novaSenha !== confirmacao) return setErro('A nova senha e a confirmação não conferem.');
    setSalvando(true);
    try {
      const result = await changeOwnPassword(senhaAtual, novaSenha);
      if (!result.ok) return setErro(result.error ?? 'Não foi possível alterar a senha.');
      setSenhaAtual(''); setNovaSenha(''); setConfirmacao(''); setSucesso('Senha alterada com sucesso. Use a nova senha no próximo acesso.');
    } finally {
      setSalvando(false);
    }
  };

  return <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-secondary">Conta da equipe</p><h1 className="mt-1 text-2xl font-bold">Minha conta</h1><p className="mt-1 text-sm text-muted-foreground">Confira seu perfil e atualize sua senha de acesso.</p></header>
    <Card className="flex items-center gap-4 border-border/70 p-5"><div className="rounded-full bg-accent p-3 text-secondary"><UserRound className="h-5 w-5"/></div><div><p className="font-semibold">{user?.nome}</p><p className="text-sm text-muted-foreground">{user?.email}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5"/>{user?.role === 'admin' ? 'Administrador principal' : 'Membro da equipe'}</p></div></Card>
    {user?.role !== 'profissional' ? <Card className="space-y-4 border-border/70 p-5"><div><h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-secondary"/>Alterar senha</h2><p className="mt-1 text-xs text-muted-foreground">Informe a senha atual e escolha uma nova senha com pelo menos 12 caracteres.</p></div><form onSubmit={(event) => { void alterar(event); }} className="max-w-lg space-y-3"><label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Senha atual</span><Input required type="password" autoComplete="current-password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)}/></label><label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Nova senha</span><Input required type="password" minLength={12} autoComplete="new-password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)}/></label><label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Confirmar nova senha</span><Input required type="password" minLength={12} autoComplete="new-password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)}/></label>{erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}{sucesso && <p role="status" className="text-sm text-emerald-700">{sucesso}</p>}<Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar nova senha'}</Button></form></Card> : <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">A troca de senha por esta tela está disponível para a equipe; o acesso profissional permanece por CPF e data de nascimento.</div>}
  </div>;
}
