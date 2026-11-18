import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  GraduationCap,
  TrendingUp,
  Users,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { STATUS_META, STATUS_ORDER, type CandidatoStatus } from '@/lib/types';
import { resumoObrigatorio } from '@/lib/treinamento';
import { cn, formatDate, initials, relativeTime } from '@/lib/utils';

const ATIVOS: CandidatoStatus[] = ['aprovado', 'ativo'];

export default function Dashboard() {
  const { candidatos, trilhas, progresso, pipelineStages } = useStore();

  const total = candidatos.length;
  const ativos = candidatos.filter((c) => ATIVOS.includes(c.status)).length;
  const emProcesso = candidatos.filter((c) => !['aprovado', 'ativo', 'reprovado'].includes(c.status)).length;
  const onboardingPendentes = candidatos.filter(
    (c) => ATIVOS.includes(c.status) && !resumoObrigatorio(trilhas, progresso[c.id] ?? {}).concluido,
  ).length;
  const novos7d = candidatos.filter((c) => Date.now() - new Date(c.criadoEm).getTime() < 7 * 86_400_000).length;
  const taxaAprovacao = total ? Math.round((ativos / total) * 100) : 0;

  const etapasAtivas = pipelineStages.filter((stage) => stage.enabled).sort((a, b) => a.order - b.order);
  const porStatus = etapasAtivas.map(({ status, label }) => ({
    status,
    label,
    count: candidatos.filter((c) => c.status === status).length,
  }));
  const maxStatus = Math.max(...porStatus.map((s) => s.count), 1);

  const porEspecialidade = Object.entries(
    candidatos.reduce<Record<string, number>>((acc, c) => {
      c.especialidades.forEach((esp) => {
        acc[esp] = (acc[esp] ?? 0) + 1;
      });
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const recentes = [...candidatos]
    .sort((a, b) => +new Date(b.criadoEm) - +new Date(a.criadoEm))
    .slice(0, 6);

  const kpis = [
    { label: 'Candidaturas', value: total, hint: `+${novos7d} nos últimos 7 dias`, icon: Users, tone: 'bg-accent text-secondary' },
    { label: 'Em processo', value: emProcesso, hint: 'Triagem, entrevista e docs', icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Aprovados / ativos', value: ativos, hint: `${taxaAprovacao}% de conversão`, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600' },
    {
      label: 'Onboarding pendente',
      value: onboardingPendentes,
      hint: 'Entre aprovados e ativos',
      icon: GraduationCap,
      tone: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o funil de recrutamento e o status da base de profissionais.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/pipeline">
            <Button variant="outline" size="sm">
              Ver pipeline
            </Button>
          </Link>
          <Link to="/admin/candidatos">
            <Button size="sm">
              Gerenciar candidatos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/70">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{kpi.value}</p>
                </div>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', kpi.tone)}>
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Funil por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {porStatus.map(({ status, label, count }) => (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', STATUS_META[status].dot)} />
                    {label}
                  </span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', STATUS_META[status].dot)}
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Especialidades mais buscadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porEspecialidade.map(([esp, count]) => (
              <div key={esp} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{esp}</span>
                <Badge className="border-border bg-muted text-foreground">{count}</Badge>
              </div>
            ))}
            <div className="mt-4 rounded-md bg-accent/50 p-3 text-xs leading-relaxed text-accent-foreground">
              <TrendingUp className="mb-1 h-3.5 w-3.5" />
              Ansiedade e TDAH concentram a maior demanda de pacientes na plataforma.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Candidaturas recentes</CardTitle>
          <Link to="/admin/candidatos" className="text-xs font-medium text-secondary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentes.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {initials(c.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.profissao} · {c.cidade}/{c.uf} · {c.especialidades.join(', ')}
                </p>
              </div>
              <Badge className={STATUS_META[c.status].badge}>
                {pipelineStages.find((stage) => stage.status === c.status)?.label ?? STATUS_META[c.status].label}
              </Badge>
              <span className="w-20 text-right text-[11px] text-muted-foreground">{relativeTime(c.criadoEm)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="border-border/70">
          <CardContent className="flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-secondary">
              <BadgeCheck className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-medium">Tempo médio de aprovação</p>
              <p className="mt-1 text-2xl font-bold font-display">9 dias</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meta do time: fechar o processo em até 12 dias.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-medium">Origem que mais converte</p>
              <p className="mt-1 text-2xl font-bold font-display">Indicação</p>
              <p className="mt-1 text-xs text-muted-foreground">
                62% das indicações chegam à etapa de entrevista.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Dados de demonstração · base atualizada em {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}
