import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Info, Settings2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { CandidatoDrawer } from '@/components/CandidatoDrawer';
import { useStore } from '@/lib/store';
import { STATUS_META, type CandidatoStatus } from '@/lib/types';
import { cn, initials, relativeTime } from '@/lib/utils';

export default function Pipeline() {
  const { candidatos, updateStatus, pipelineStages, updatePipelineStage, moverPipelineStage, desativarPipelineStage } = useStore();
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<CandidatoStatus | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [editandoEtapas, setEditandoEtapas] = useState(false);
  const etapasAtivas = useMemo(() => pipelineStages.filter((stage) => stage.enabled).sort((a, b) => a.order - b.order), [pipelineStages]);

  const candidato = candidatos.find((c) => c.id === selecionado) ?? null;

  const handleDrop = (status: CandidatoStatus) => {
    if (dragging) updateStatus(dragging, status);
    setDragging(null);
    setHoverColumn(null);
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col p-5 sm:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de recrutamento</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões para mover candidatos entre etapas. As mudanças são salvas automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-border bg-card text-muted-foreground">
            <Info className="h-3 w-3" /> {candidatos.length} candidatos
          </Badge>
          <Button variant={editandoEtapas ? 'secondary' : 'outline'} size="sm" onClick={() => setEditandoEtapas((open) => !open)}>
            {editandoEtapas ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
            {editandoEtapas ? 'Fechar' : 'Editar etapas'}
          </Button>
        </div>
      </div>

      {editandoEtapas && (
        <section className="mb-4 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Configurar etapas do pipeline</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Renomeie, reordene ou desative etapas. Ao desativar uma etapa com candidatos, eles serão movidos para a primeira etapa ativa.
            </p>
          </div>
          <div className="space-y-2">
            {pipelineStages.slice().sort((a, b) => a.order - b.order).map((stage) => {
              const ativos = etapasAtivas;
              const indexAtivo = ativos.findIndex((item) => item.status === stage.status);
              const total = candidatos.filter((candidate) => candidate.status === stage.status).length;
              return (
                <div key={stage.status} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_META[stage.status].dot)} />
                  <Input
                    aria-label={`Nome da etapa ${stage.label}`}
                    value={stage.label}
                    onChange={(e) => updatePipelineStage(stage.status, { label: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        updatePipelineStage(stage.status, { label: STATUS_META[stage.status].label });
                      }
                    }}
                    className="max-w-xs"
                  />
                  <span className="mr-auto text-xs text-muted-foreground">{total} candidato(s)</span>
                  <Button size="icon" variant="ghost" aria-label="Mover etapa para cima" disabled={!stage.enabled || indexAtivo <= 0}
                    onClick={() => moverPipelineStage(stage.status, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Mover etapa para baixo" disabled={!stage.enabled || indexAtivo === ativos.length - 1}
                    onClick={() => moverPipelineStage(stage.status, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <label className="flex cursor-pointer items-center gap-2 px-2 text-xs">
                    <input
                      type="checkbox"
                      checked={stage.enabled}
                      disabled={stage.enabled && etapasAtivas.length === 1}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const ultimaOrdem = Math.max(-1, ...etapasAtivas.map((item) => item.order));
                          updatePipelineStage(stage.status, { enabled: true, order: ultimaOrdem + 1 });
                        }
                        else {
                          const destino = etapasAtivas.find((item) => item.status !== stage.status);
                          if (destino && (!total || window.confirm(`Desativar “${stage.label}” e mover ${total} candidato(s) para “${destino.label}”?`))) {
                            desativarPipelineStage(stage.status, destino.status);
                          }
                        }
                      }}
                      className="h-4 w-4 accent-[hsl(var(--secondary))]"
                    />
                    Usar
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="thin-scroll -mx-1 flex flex-1 gap-4 overflow-x-auto px-1 pb-4">
        {etapasAtivas.map(({ status, label }) => {
          const items = candidatos.filter((c) => c.status === status);
          const meta = STATUS_META[status];
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverColumn(status);
              }}
              onDragLeave={() => setHoverColumn((prev) => (prev === status ? null : prev))}
              onDrop={() => handleDrop(status)}
              className={cn(
                'flex w-[280px] shrink-0 flex-col rounded-lg border border-t-[3px] bg-card transition-colors',
                meta.column,
                hoverColumn === status && 'bg-accent/40 ring-2 ring-secondary/30',
              )}
            >
              <div className="flex items-center justify-between border-b px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </div>

              <div className="thin-scroll flex-1 space-y-2 overflow-y-auto p-2.5">
                {items.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={() => setDragging(c.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setHoverColumn(null);
                    }}
                    onClick={() => setSelecionado(c.id)}
                    className={cn(
                      'group cursor-pointer rounded-md border border-border/70 bg-card p-3 shadow-sm transition-all hover:border-secondary/40 hover:shadow-soft',
                      dragging === c.id && 'opacity-40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {initials(c.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{c.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {c.profissao} · {c.cidade}/{c.uf}
                        </p>
                      </div>
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-border transition-colors group-hover:text-muted-foreground" />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {c.especialidades.slice(0, 2).map((esp) => (
                        <span key={esp} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {esp}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                      <span>{c.agenda?.length ?? 0} {(c.agenda?.length ?? 0) === 1 ? 'horário disponível' : 'horários disponíveis'}</span>
                      <span>{relativeTime(c.atualizadoEm)}</span>
                    </div>
                  </article>
                ))}

                {items.length === 0 && (
                  <div className="rounded-md border border-dashed py-8 text-center text-[11px] text-muted-foreground">
                    Solte um cartão aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CandidatoDrawer candidato={candidato} onClose={() => setSelecionado(null)} />
    </div>
  );
}
