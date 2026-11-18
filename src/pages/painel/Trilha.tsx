import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock3, Lock, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { formatDuracao, resumoTrilha, statusAula } from '@/lib/treinamento';
import { cn } from '@/lib/utils';

export default function TrilhaPage() {
  const { trilhaId } = useParams();
  const { user, trilhas, progresso } = useStore();
  const trilha = trilhas.find((t) => t.id === trilhaId);

  if (!trilha) return <Navigate to="/painel/treinamentos" replace />;

  const progressoPessoal = progresso[user?.candidatoId ?? ''] ?? {};
  const resumo = resumoTrilha(trilha, progressoPessoal);
  const destino = resumo.proximaAula ?? trilha.aulas[0];

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <Link
        to="/painel/treinamentos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os treinamentos
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">{trilha.titulo}</h1>
          {trilha.obrigatoria && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Obrigatória</Badge>}
          {resumo.concluida && (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              <Check className="h-3 w-3" /> Concluída
            </Badge>
          )}
        </div>
        <p className="max-w-2xl text-muted-foreground">{trilha.descricao}</p>
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
          <Progress value={resumo.percentual} className="h-2 max-w-sm flex-1" />
          <span className="text-sm font-semibold">{resumo.percentual}%</span>
        </div>
      </div>

      {destino && (
        <Link to={`/painel/treinamentos/${trilha.id}/${destino.id}`}>
          <Button>
            {resumo.concluidas === 0 ? 'Iniciar primeira aula' : resumo.concluida ? 'Rever primeira aula' : 'Continuar'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}

      <Card className="border-border/70">
        <CardContent className="divide-y p-0">
          {trilha.aulas.map((aula, index) => {
            const status = statusAula(trilha, aula.id, progressoPessoal);
            const bloqueada = status === 'bloqueada';
            const registro = progressoPessoal[aula.id];

            const conteudo = (
              <div className="flex items-center gap-4 p-4">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    status === 'concluida' && 'border-emerald-500 bg-emerald-500 text-white',
                    status === 'atual' && 'border-secondary bg-accent text-secondary',
                    !bloqueada && status !== 'concluida' && status !== 'atual' && 'border-border text-muted-foreground',
                    bloqueada && 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {status === 'concluida' ? (
                    <Check className="h-4 w-4" />
                  ) : bloqueada ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', bloqueada && 'text-muted-foreground')}>{aula.titulo}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {aula.duracaoMin} min
                    {registro && !registro.concluida ? ` · ${Math.round(registro.percentual)}% assistido` : ''}
                    {bloqueada ? ' · conclua a aula anterior para liberar' : ''}
                  </p>
                </div>

                {status === 'concluida' ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Concluída</Badge>
                ) : bloqueada ? (
                  <Badge className="border-border bg-muted text-muted-foreground">Bloqueada</Badge>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );

            return bloqueada ? (
              <div key={aula.id} className="cursor-not-allowed opacity-70">
                {conteudo}
              </div>
            ) : (
              <Link
                key={aula.id}
                to={`/painel/treinamentos/${trilha.id}/${aula.id}`}
                className="block transition-colors hover:bg-muted/40"
              >
                {conteudo}
              </Link>
            );
          })}
          {trilha.aulas.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma aula publicada nesta trilha ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
