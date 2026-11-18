import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { useStore } from '@/lib/store';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useStore();
  const [tipo, setTipo] = useState<'profissional' | 'admin'>('profissional');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const maskCpf = (value: string) => value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const entrar = async (identificador?: string, senha?: string, perfil = tipo) => {
    const id = identificador ?? (perfil === 'admin' ? emailAdmin : cpf);
    const segredo = senha ?? (perfil === 'admin' ? senhaAdmin : nascimento);
    setBusy(true);
    try {
      const result = await login(id, segredo, perfil);
      if (!result.ok) {
        setErro(result.error ?? 'Não foi possível entrar.');
        return;
      }
      navigate(result.user?.role === 'profissional' ? '/painel' : '/admin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container grid min-h-[calc(100vh-4rem)] items-center gap-12 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-primary p-10 text-white">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-[#6FE3CB]/15 blur-3xl" />
          <div className="relative space-y-6">
            <Sparkles className="h-8 w-8 text-[#6FE3CB]" />
            <h2 className="text-3xl font-bold leading-tight">Um painel só seu, com sua agenda, seus documentos e seu repasse.</h2>
            <p className="text-sm leading-relaxed text-white/70">
              Acompanhe cada etapa do seu pré-cadastro, envie documentos e mantenha sua agenda conforme as liberações da equipe.
            </p>
            <div className="space-y-3 pt-4">
              {[
                'Status do pré-cadastro atualizado pela equipe',
                'Documentos enviados com validação',
                'Treinamentos e solicitações em um só lugar',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6FE3CB]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold">Entrar na conta</h1>
          <p className="text-muted-foreground">
            {tipo === 'profissional' ? 'Acesse com seu CPF e data de nascimento.' : 'A equipe acessa com o e-mail e a senha definidos pelo administrador.'}{' '}
            Ainda não tem cadastro?{' '}
            <Link to="/pre-cadastro" className="font-medium text-secondary hover:underline">Faça seu pré-cadastro</Link>.
          </p>
        </div>

        <Card className="border-border/70 shadow-soft">
          <CardContent className="space-y-5 p-6">
            <div className="grid grid-cols-2 rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => { setTipo('profissional'); setErro(''); }}
                className={`rounded px-3 py-2 text-xs font-medium transition-colors ${tipo === 'profissional' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Profissional
              </button>
              <button
                type="button"
                onClick={() => { setTipo('admin'); setErro(''); }}
                className={`rounded px-3 py-2 text-xs font-medium transition-colors ${tipo === 'admin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Equipe
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); void entrar(); }}
            >
              {tipo === 'profissional' ? (
                <>
                  <Field label="CPF" required>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={cpf}
                        onChange={(e) => { setCpf(maskCpf(e.target.value)); setErro(''); }}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        autoComplete="username"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                  <Field label="Senha — data de nascimento" required hint="Selecione a mesma data informada no pré-cadastro.">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={nascimento}
                        onChange={(e) => { setNascimento(e.target.value); setErro(''); }}
                        autoComplete="current-password"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="E-mail" required>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" autoComplete="username" value={emailAdmin} onChange={(e) => { setEmailAdmin(e.target.value); setErro(''); }} placeholder="nome@empresa.com" className="pl-9" />
                    </div>
                  </Field>
                  <Field label="Senha" required>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" value={senhaAdmin} onChange={(e) => { setSenhaAdmin(e.target.value); setErro(''); }} placeholder="••••••••" className="pl-9" />
                    </div>
                  </Field>
                </>
              )}

              {erro && <p className="text-xs font-medium text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={busy || loading}>{busy ? 'Conectando…' : 'Entrar'} <ArrowRight className="h-4 w-4" /></Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
