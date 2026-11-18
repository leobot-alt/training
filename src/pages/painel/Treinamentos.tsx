import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Check,
  Circle,
  Clock3,
  GraduationCap,
  Lock,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { formatDuracao, resumoObrigatorio, resumoTrilha, statusAula } from '@/lib/treinamento';
import { cn, formatDate } from '@/lib/utils';

export default function Treinamentos() {
  const { user, trilhas, progresso } = useStore();
  const progressoPessoal = progresso[user?.candidatoId ?? ''] ?? {};
  const onboarding = resumoObrigatorio(trilhas, progressoPessoal);
  const temAulaObrigatoria = trilhas.some((trilha) => trilha.obrigatoria && trilha.aulas.length > 0);
  const ultimaConclusao = Object.values(progressoPessoal)
    .filter((p) => p.concluida)
    .sort((a, b) => +new Date(b.atualizadoEm) - +new Date(a.atualizadoEm))[0];

  return (
    <div className="container space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Desenvolvimento profissional</p>
        <h1 className="text-3xl font-bold">Treinamentos</h1>
        <p className="max-w-2xl text-muted-foreground">
          {temAulaObrigatoria
            ? 'Conclua as aulas obrigatórias antes de iniciar os atendimentos. As demais trilhas ajudam a aprofundar temas clínicos e operacionais.'
            : 'No momento, não há aulas obrigatórias configuradas. As trilhas disponíveis podem ser acessadas para aprofundar temas clínicos e operacionais.'}
        </p>
      </div>

      {/* Resumo obrigatório */}
      <Card
        className={cn(
          'overflow-hidden border',
          onboarding.concluido ? 'border-emerald-200 bg-emerald-50/60' : 'border-secondary/30 bg-accent/50',
        )}
      >
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
                onboarding.concluido ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-secondary',
              )}
            >
              {onboarding.concluido ? <Award className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
            </span>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg font-semibold">
                  {onboarding.concluido
                    ? temAulaObrigatoria ? 'Onboarding concluído' : 'Nenhuma aula obrigatória no momento'
                    : 'Onboarding obrigatório'}
                </p>
                <Badge
                  className={cn(
                    'text-[10px]',
                    onboarding.concluido
                      ? 'border-emerald-200 bg-white text-emerald-700'
                      : 'border-secondary/30 bg-white text-secondary',
                  )}
                >
                  {onboarding.concluido ? 'Liberado' : 'Pendente'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {onboarding.concluido
                  ? temAulaObrigatoria
                    ? `Concluído em ${formatDate(ultimaConclusao?.atualizadoEm ?? new Date().toISOString())}. Você pode revisar as aulas quando quiser.`
                    : 'A equipe não configurou aulas obrigatórias neste momento. As trilhas disponíveis continuam acessíveis.'
                  : `${onboarding.aulasConcluidas} de ${onboarding.totalAulas} aulas concluídas. As aulas são liberadas em sequência.`}
              </p>
              {temAulaObrigatoria && (
                <div className="flex items-center gap-3 pt-1">
                  <Progress value={onboarding.percentual} className="h-1.5 w-48 bg-white/70" />
                  <span className="text-xs font-semibold">{onboarding.percentual}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {onboarding.proximaAula ? (
              <Link to={`/painel/treinamentos/${onboarding.proximaAula.trilha.id}/${onboarding.proximaAula.aula.id}`}>
                <Button className="w-full sm:w-auto">
                  {onboarding.aulasConcluidas === 0 ? 'Começar agora' : 'Continuar de onde parei'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Badge className="border-emerald-200 bg-white px-3 py-1.5 text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Atendimento liberado
              </Badge>
            )}
            <p className="text-[11px] text-muted-foreground">
              {!temAulaObrigatoria
                ? 'Sem aulas obrigatórias configuradas'
                : onboarding.concluido ? 'Certificado disponível no fim da trilha' : 'Certificado ao concluir todas as aulas'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trilhas */}
      <div className="space-y-4">
        {trilhas
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((trilha) => {
            const resumo = resumoTrilha(trilha, progressoPessoal);
            const destino = resumo.proximaAula
              ? `/painel/treinamentos/${trilha.id}/${resumo.proximaAula.id}`
              : `/painel/treinamentos/${trilha.id}/${trilha.aulas[0]?.id ?? ''}`;

            return (
              <Card key={trilha.id} className="border-border/70">
                <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_280px]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">{trilha.titulo}</h2>
                      {trilha.obrigatoria ? (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">Obrigatória</Badge>
                      ) : (
                        <Badge className="border-border bg-muted text-muted-foreground">Opcional</Badge>
                      )}
                      {resumo.concluida && (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          <Check className="h-3 w-3" /> Concluída
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">{trilha.descricao}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5" /> {resumo.total} aulas
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" /> {formatDuracao(resumo.duracaoMin)}
                      </span>
                      <span>
                        {resumo.concluidas}/{resumo.total} concluídas
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={resumo.percentual} className="h-1.5 max-w-xs flex-1" />
                      <span className="text-xs font-medium">{resumo.percentual}%</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Aulas</p>
                    <ul className="space-y-1.5">
                      {trilha.aulas.slice(0, 4).map((aula, index) => {
                        const status = statusAula(trilha, aula.id, progressoPessoal);
                        return (
                          <li key={aula.id} className="flex items-center gap-2 text-xs">
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                status === 'concluida' && 'border-emerald-500 bg-emerald-500 text-white',
                                status === 'atual' && 'border-secondary text-secondary',
                                (status === 'bloqueada' || status === 'disponivel') && 'border-border text-muted-foreground',
                              )}
                            >
                              {status === 'concluida' ? (
                                <Check className="h-3 w-3" />
                              ) : status === 'bloqueada' ? (
                                <Lock className="h-2.5 w-2.5" />
                              ) : (
                                <span className="text-[9px] font-semibold">{index + 1}</span>
                              )}
                            </span>
                            <span
                              className={cn(
                                'truncate',
                                status === 'concluida' ? 'text-muted-foreground line-through' : 'text-foreground',
                              )}
                            >
                              {aula.titulo}
                            </span>
                          </li>
                        );
                      })}
                      {trilha.aulas.length > 4 && (
                        <li className="pl-7 text-[11px] text-muted-foreground">
                          +{trilha.aulas.length - 4} aulas
                        </li>
                      )}
                      {trilha.aulas.length === 0 && (
                        <li className="text-[11px] text-muted-foreground">Nenhuma aula publicada ainda.</li>
                      )}
                    </ul>

                    <Link to={destino} className="block pt-1">
                      <Button size="sm" variant={resumo.concluida ? 'outline' : 'primary'} className="w-full">
                        {resumo.concluida ? 'Revisar trilha' : resumo.concluidas > 0 ? 'Continuar' : 'Iniciar trilha'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Card className="border-border/70 bg-muted/30">
        <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <Circle className="mt-1 h-2 w-2 shrink-0 fill-secondary text-secondary" />
          <p>
            Seu progresso é salvo automaticamente a cada trecho assistido. A aula é marcada como concluída quando você
            assiste a pelo menos 90% do vídeo. Em caso de dúvidas sobre o conteúdo, fale com{' '}
            <span className="font-medium text-foreground">treinamento@somente.com.br</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
