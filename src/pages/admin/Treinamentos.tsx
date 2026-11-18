import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Film,
  GraduationCap,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/field';
import { useStore } from '@/lib/store';
import { STATUS_META } from '@/lib/types';
import { formatDuracao, resumoObrigatorio, resumoTrilha } from '@/lib/treinamento';
import { uploadTrainingVideo } from '@/lib/supabase';
import { cn, formatDate, initials, relativeTime } from '@/lib/utils';

export default function AdminTreinamentos() {
  const { trilhas, progresso, candidatos, pipelineStages, updateTrilha, updateAula, addAula, removeAula, moverAula, addTrilha, removeTrilha } =
    useStore();
  const [trilhaAtiva, setTrilhaAtiva] = useState(trilhas[0]?.id ?? '');
  const [aulaAberta, setAulaAberta] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const trilha = trilhas.find((t) => t.id === trilhaAtiva) ?? trilhas[0];

  const criarTrilha = () => {
    const id = addTrilha();
    setTrilhaAtiva(id);
    setAulaAberta(null);
  };

  const excluirTrilha = (id: string) => {
    const selecionada = trilhas.find((item) => item.id === id);
    if (!selecionada) return;
    const confirmar = window.confirm(
      `Excluir a trilha “${selecionada.titulo}” e todas as suas aulas? O progresso associado também será removido. Esta ação não pode ser desfeita.`,
    );
    if (!confirmar) return;
    removeTrilha(id);
    if (trilhaAtiva === id) {
      setTrilhaAtiva(trilhas.find((item) => item.id !== id)?.id ?? '');
      setAulaAberta(null);
    }
  };

  const ranking = candidatos
    .map((c) => {
      const resumo = resumoObrigatorio(trilhas, progresso[c.id] ?? {});
      const ultima = Object.values(progresso[c.id] ?? {}).sort(
        (a, b) => +new Date(b.atualizadoEm) - +new Date(a.atualizadoEm),
      )[0];
      return { candidato: c, resumo, ultima };
    })
    .sort((a, b) => a.resumo.percentual - b.resumo.percentual);

  const totalConcluidos = ranking.filter((r) => r.resumo.concluido).length;

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Treinamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as trilhas, publique vídeos e acompanhe quem concluiu o onboarding obrigatório.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={criarTrilha}>
          <Plus className="h-3.5 w-3.5" /> Nova trilha
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trilhas publicadas</p>
            <p className="mt-2 font-display text-3xl font-bold">{trilhas.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {trilhas.filter((t) => t.obrigatoria).length} obrigatória(s)
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Onboarding concluído</p>
            <p className="mt-2 font-display text-3xl font-bold">
              {totalConcluidos}
              <span className="text-base font-medium text-muted-foreground">/{candidatos.length}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round((totalConcluidos / Math.max(1, candidatos.length)) * 100)}% da base
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aulas publicadas</p>
            <p className="mt-2 font-display text-3xl font-bold">
              {trilhas.reduce((acc, t) => acc + t.aulas.length, 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {trilhas.reduce((acc, t) => acc + t.aulas.filter((a) => a.videoUrl).length, 0)} com vídeo enviado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <Card className="border-border/70">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-secondary" /> Conteúdo das trilhas
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {trilhas.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTrilhaAtiva(item.id);
                  setAulaAberta(null);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  item.id === trilha?.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-secondary/50',
                )}
              >
                {item.titulo}
              </button>
            ))}
          </div>
        </CardHeader>

        {trilha ? (
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Título da trilha">
                <Input value={trilha.titulo} onChange={(e) => updateTrilha(trilha.id, { titulo: e.target.value })} />
              </Field>
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={trilha.obrigatoria}
                    onChange={(e) => updateTrilha(trilha.id, { obrigatoria: e.target.checked })}
                    className="h-4 w-4 accent-[hsl(var(--secondary))]"
                  />
                  Trilha obrigatória
                </label>
                <div className="pb-2 text-xs text-muted-foreground">
                  {formatDuracao(resumoTrilha(trilha).duracaoMin)} · {trilha.aulas.length} aulas
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto text-destructive hover:bg-destructive/10"
                  onClick={() => excluirTrilha(trilha.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir trilha
                </Button>
              </div>
              <Field label="Descrição" className="md:col-span-2">
                <Textarea
                  value={trilha.descricao}
                  onChange={(e) => updateTrilha(trilha.id, { descricao: e.target.value })}
                  className="min-h-[72px]"
                />
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Aulas</p>
                <Button size="sm" variant="outline" onClick={() => addAula(trilha.id)}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar aula
                </Button>
              </div>

              <div className="divide-y rounded-md border">
                {trilha.aulas.map((aula, index) => {
                  const aberta = aulaAberta === aula.id;
                  return (
                    <div key={aula.id}>
                      <div className="flex flex-wrap items-center gap-2 p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => setAulaAberta(aberta ? null : aula.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="truncate text-sm font-medium">{aula.titulo}</span>
                          {aula.videoUrl ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                              <Film className="h-2.5 w-2.5" /> vídeo ok
                            </Badge>
                          ) : (
                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">sem vídeo</Badge>
                          )}
                          <ChevronDown
                            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aberta && 'rotate-180')}
                          />
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Mover para cima"
                            disabled={index === 0}
                            onClick={() => moverAula(trilha.id, aula.id, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Mover para baixo"
                            disabled={index === trilha.aulas.length - 1}
                            onClick={() => moverAula(trilha.id, aula.id, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Excluir aula"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => removeAula(trilha.id, aula.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {aberta && (
                        <div className="grid gap-4 border-t bg-muted/20 p-4 md:grid-cols-2">
                          <Field label="Título" className="md:col-span-2">
                            <Input
                              value={aula.titulo}
                              onChange={(e) => updateAula(trilha.id, aula.id, { titulo: e.target.value })}
                            />
                          </Field>
                          <Field label="Descrição" className="md:col-span-2">
                            <Textarea
                              value={aula.descricao}
                              onChange={(e) => updateAula(trilha.id, aula.id, { descricao: e.target.value })}
                              className="min-h-[70px]"
                            />
                          </Field>
                          <Field
                            label="URL do vídeo"
                            hint="Link do YouTube/Vimeo ou arquivo .mp4/.webm. O upload privado aceita até 50 MB."
                            className="md:col-span-2"
                          >
                            <Input
                              value={aula.videoUrl}
                              onChange={(e) => updateAula(trilha.id, aula.id, { videoUrl: e.target.value })}
                              placeholder="https://.../aula-01.mp4"
                            />
                          </Field>
                          <Field label="Duração (minutos)">
                            <Input
                              type="number"
                              min={1}
                              value={aula.duracaoMin}
                              onChange={(e) =>
                                updateAula(trilha.id, aula.id, { duracaoMin: Number(e.target.value) || 1 })
                              }
                            />
                          </Field>
                          <Field label="Material de apoio (URL)">
                            <Input
                              value={aula.materialUrl ?? ''}
                              onChange={(e) => updateAula(trilha.id, aula.id, { materialUrl: e.target.value })}
                              placeholder="https://.../material.pdf"
                            />
                          </Field>

                          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                            <input
                              ref={(el) => {
                                fileInputs.current[aula.id] = el;
                              }}
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              className="hidden"
                              onChange={async (e) => {
                                const input = e.currentTarget;
                                const file = input.files?.[0];
                                input.value = '';
                                if (!file) return;
                                setUploadError('');
                                setUploading((current) => ({ ...current, [aula.id]: true }));
                                try {
                                  const path = await uploadTrainingVideo(trilha.id, aula.id, file);
                                  updateAula(trilha.id, aula.id, { videoUrl: path });
                                } catch (error) {
                                  setUploadError(error instanceof Error ? error.message : 'Não foi possível enviar o vídeo.');
                                } finally {
                                  setUploading((current) => ({ ...current, [aula.id]: false }));
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(uploading[aula.id])}
                              onClick={() => fileInputs.current[aula.id]?.click()}
                            >
                              <Upload className="h-3.5 w-3.5" /> {uploading[aula.id] ? 'Enviando…' : 'Enviar arquivo de vídeo'}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">
                              O arquivo fica em armazenamento privado e é liberado ao profissional por link temporário.
                            </p>
                          </div>
                          {uploadError && <p role="alert" className="text-xs text-destructive md:col-span-2">{uploadError}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {trilha.aulas.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma aula nesta trilha. Clique em “Adicionar aula”.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma trilha de treinamento cadastrada.</p>
            <Button className="mt-4" variant="outline" size="sm" onClick={criarTrilha}>
              <Plus className="h-3.5 w-3.5" /> Criar primeira trilha
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Progresso dos profissionais */}
      <Card className="overflow-hidden border-border/70">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary" /> Progresso dos profissionais
          </CardTitle>
          <Badge className="border-border bg-muted text-muted-foreground">
            {totalConcluidos} de {candidatos.length} concluíram
          </Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Profissional</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Onboarding</th>
                <th className="px-4 py-2.5 font-medium">Aulas</th>
                <th className="px-4 py-2.5 font-medium">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(({ candidato, resumo, ultima }) => (
                <tr key={candidato.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {initials(candidato.nome)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{candidato.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{candidato.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_META[candidato.status].badge}>
                      {pipelineStages.find((stage) => stage.status === candidato.status)?.label ?? STATUS_META[candidato.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={resumo.percentual} className="h-1.5 w-20" />
                      <span
                        className={cn(
                          'text-xs font-medium',
                          resumo.concluido ? 'text-emerald-600' : 'text-muted-foreground',
                        )}
                      >
                        {resumo.percentual}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {resumo.aulasConcluidas}/{resumo.totalAulas}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {ultima ? relativeTime(ultima.atualizadoEm) : 'nunca acessou'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
          Base atualizada em {formatDate(new Date().toISOString())} · o progresso é recalculado a cada aula concluída.
        </div>
      </Card>
    </div>
  );
}
