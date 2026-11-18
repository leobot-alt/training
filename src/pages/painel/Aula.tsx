import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Lock,
  PartyPopper,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/badge';
import { VideoPlayer, isEmbedVideo } from '@/components/VideoPlayer';
import { useStore } from '@/lib/store';
import { getTrainingVideoUrl } from '@/lib/supabase';
import { aulaLiberada, resumoObrigatorio, resumoTrilha, statusAula } from '@/lib/treinamento';
import { cn } from '@/lib/utils';

export default function Aula() {
  const { trilhaId, aulaId } = useParams();
  const navigate = useNavigate();
  const { user, trilhas, progresso, salvarProgresso, concluirAula } = useStore();

  const trilha = trilhas.find((t) => t.id === trilhaId);
  const aula = trilha?.aulas.find((a) => a.id === aulaId);
  const candidatoId = user?.candidatoId ?? '';
  const progressoPessoal = progresso[candidatoId] ?? {};
  const registro = aula ? progressoPessoal[aula.id] : undefined;

  const [percentual, setPercentual] = useState(registro?.percentual ?? 0);
  const [concluida, setConcluida] = useState(Boolean(registro?.concluida));
  const [videoSource, setVideoSource] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');

  useEffect(() => {
    setPercentual(registro?.percentual ?? 0);
    setConcluida(Boolean(registro?.concluida));
  }, [aulaId, registro?.percentual, registro?.concluida]);

  useEffect(() => {
    let active = true;
    setVideoError('');
    if (!aula?.videoUrl || /^https?:\/\//i.test(aula.videoUrl)) {
      setVideoSource(aula?.videoUrl ?? '');
      setVideoLoading(false);
      return () => { active = false; };
    }
    setVideoSource('');
    setVideoLoading(true);
    void getTrainingVideoUrl(aula.videoUrl).then((url) => {
      if (active) setVideoSource(url);
    }).catch(() => {
      if (active) setVideoError('Não foi possível liberar este vídeo. Avise a equipe de treinamento.');
    }).finally(() => {
      if (active) setVideoLoading(false);
    });
    return () => { active = false; };
  }, [aula?.videoUrl]);

  if (!trilha || !aula) return <Navigate to="/painel/treinamentos" replace />;

  const liberada = aulaLiberada(trilha, aula.id, progressoPessoal);
  const indice = trilha.aulas.findIndex((a) => a.id === aula.id);
  const proxima = trilha.aulas[indice + 1];
  const anterior = trilha.aulas[indice - 1];
  const manual = !aula.videoUrl || isEmbedVideo(aula.videoUrl);
  const onboarding = resumoObrigatorio(trilhas, progressoPessoal);

  if (!liberada) {
    const anteriorPendente = trilha.aulas
      .slice(0, indice)
      .find((a) => !progressoPessoal[a.id]?.concluida);

    return (
      <div className="container max-w-lg py-16 text-center">
        <Lock className="mx-auto h-9 w-9 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Aula bloqueada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          As aulas são liberadas em sequência. Conclua a aula anterior para assistir a esta.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {anteriorPendente && (
            <Button onClick={() => navigate(`/painel/treinamentos/${trilha.id}/${anteriorPendente.id}`)}>
              Ir para “{anteriorPendente.titulo}”
            </Button>
          )}
          <Link to={`/painel/treinamentos/${trilha.id}`} className="text-sm text-secondary hover:underline">
            Ver todas as aulas da trilha
          </Link>
        </div>
      </div>
    );
  }

  const handleProgress = (segundos: number, pct: number) => {
    const arredondado = Math.round(pct);
    setPercentual((prev) => Math.max(prev, arredondado));

    if (pct >= 90 && !concluida) {
      setConcluida(true);
      concluirAula(candidatoId, aula.id);
      return;
    }

    if (!concluida) {
      salvarProgresso(candidatoId, aula.id, {
        segundos: Math.round(segundos),
        percentual: arredondado,
      });
    }
  };

  const marcarConcluida = () => {
    setConcluida(true);
    setPercentual(100);
    concluirAula(candidatoId, aula.id);
  };

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/painel/treinamentos" className="hover:text-foreground">
          Treinamentos
        </Link>
        <span>/</span>
        <Link to={`/painel/treinamentos/${trilha.id}`} className="hover:text-foreground">
          {trilha.titulo}
        </Link>
        <span>/</span>
        <span className="text-foreground">Aula {indice + 1}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-border bg-muted text-muted-foreground">
                Aula {indice + 1} de {trilha.aulas.length}
              </Badge>
              {trilha.obrigatoria && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Obrigatória</Badge>}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" /> {aula.duracaoMin} min
              </span>
              {concluida && (
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Check className="h-3 w-3" /> Concluída
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{aula.titulo}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{aula.descricao}</p>
          </div>

          {videoLoading ? (
            <div className="grid aspect-video place-items-center rounded-lg border bg-muted/40 text-sm text-muted-foreground">Liberando vídeo privado…</div>
          ) : videoError ? (
            <div role="alert" className="grid aspect-video place-items-center rounded-lg border bg-muted/40 p-6 text-center text-sm text-destructive">{videoError}</div>
          ) : (
            <VideoPlayer
              src={videoSource}
              titulo={aula.titulo}
              startAt={registro?.segundos ?? 0}
              onProgress={handleProgress}
              onEnded={marcarConcluida}
            />
          )}

          <div className="space-y-2 rounded-md border bg-card p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso desta aula</span>
              <span className="font-semibold">{Math.round(percentual)}%</span>
            </div>
            <Progress value={percentual} className="h-1.5" />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground">
                {concluida
                  ? 'Aula concluída e registrada no seu histórico.'
                  : percentual >= 90
                    ? 'Você assistiu o suficiente para concluir.'
                    : manual
                      ? 'Marque como concluída ao terminar de assistir.'
                      : 'A aula é concluída automaticamente ao assistir 90% do vídeo.'}
              </p>
              {!concluida && (manual || percentual >= 90) && (
                <Button size="sm" onClick={marcarConcluida}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como concluída
                </Button>
              )}
            </div>
          </div>

          {concluida && (
            <Card className={onboarding.concluido ? 'border-emerald-200 bg-emerald-50/70' : 'border-secondary/30 bg-accent/40'}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {onboarding.concluido ? (
                    <PartyPopper className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {onboarding.concluido ? 'Onboarding obrigatório concluído!' : 'Aula concluída'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {onboarding.concluido
                        ? 'Seu atendimento está liberado. As trilhas opcionais seguem disponíveis.'
                        : `${onboarding.percentual}% do onboarding concluído · ${onboarding.aulasConcluidas} de ${onboarding.totalAulas} aulas`}
                    </p>
                  </div>
                </div>
                {proxima ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/painel/treinamentos/${trilha.id}/${proxima.id}`)}
                  >
                    Próxima aula <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => navigate('/painel/treinamentos')}>
                    Voltar às trilhas
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-4 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              disabled={!anterior}
              onClick={() => anterior && navigate(`/painel/treinamentos/${trilha.id}/${anterior.id}`)}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Aula anterior
            </Button>
            <div className="flex items-center gap-2">
              {concluida && (
                <Button variant="ghost" size="sm" onClick={() => setConcluida(true)} className="text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Rever aula
                </Button>
              )}
              <Button
                size="sm"
                disabled={!proxima}
                onClick={() => proxima && navigate(`/painel/treinamentos/${trilha.id}/${proxima.id}`)}
              >
                Próxima aula <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {aula.materialUrl && (
            <a
              href={aula.materialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm text-secondary hover:bg-muted/40"
            >
              <FileText className="h-4 w-4" /> Material de apoio da aula
              <Download className="ml-auto h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Lista de aulas da trilha */}
        <aside className="space-y-3">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <div className="border-b p-4">
                <p className="text-sm font-semibold">{trilha.titulo}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={resumoTrilha(trilha, progressoPessoal).percentual} className="h-1.5 flex-1" />
                  <span className="text-[11px] text-muted-foreground">
                    {resumoTrilha(trilha, progressoPessoal).concluidas}/{trilha.aulas.length}
                  </span>
                </div>
              </div>

              <ul className="thin-scroll max-h-[420px] divide-y overflow-y-auto">
                {trilha.aulas.map((item, index) => {
                  const status = statusAula(trilha, item.id, progressoPessoal);
                  const ativa = item.id === aula.id;
                  const bloqueada = status === 'bloqueada';

                  const conteudo = (
                    <>
                        <span
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            status === 'concluida' && 'border-emerald-500 bg-emerald-500 text-white',
                            ativa && status !== 'concluida' && 'border-primary bg-primary text-white',
                            !ativa && status !== 'concluida' && 'border-border text-muted-foreground',
                          )}
                        >
                          {status === 'concluida' ? (
                            <Check className="h-3 w-3" />
                          ) : bloqueada ? (
                            <Lock className="h-2.5 w-2.5" />
                          ) : (
                            <span className="text-[9px] font-semibold">{index + 1}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block font-medium', ativa && 'text-foreground')}>{item.titulo}</span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {item.duracaoMin} min
                            {progressoPessoal[item.id] && !progressoPessoal[item.id].concluida
                              ? ` · ${Math.round(progressoPessoal[item.id].percentual)}%`
                              : ''}
                          </span>
                        </span>
                    </>
                  );

                  const classe = cn(
                    'flex items-start gap-3 p-3 text-xs transition-colors',
                    ativa ? 'bg-accent/60' : bloqueada ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/50',
                  );

                  return (
                    <li key={item.id}>
                      {bloqueada ? (
                        <div className={classe} aria-disabled="true">
                          {conteudo}
                        </div>
                      ) : (
                        <Link to={`/painel/treinamentos/${trilha.id}/${item.id}`} className={classe}>
                          {conteudo}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-muted/30">
            <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Precisa de ajuda?</p>
              <p>
                Dúvidas sobre o conteúdo ou problemas para assistir: escreva para{' '}
                <span className="font-medium text-foreground">treinamento@somente.com.br</span>.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
