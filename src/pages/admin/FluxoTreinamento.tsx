import { ArrowDown, ArrowUp, ClipboardCheck, Clock3, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/field';

export default function FluxoTreinamento() {
  const { trainingFlow, addTrainingFlowStage, updateTrainingFlowStage, removeTrainingFlowStage, moveTrainingFlowStage, resetTrainingFlow } = useStore();

  return <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Guia interno da equipe</p>
        <h1 className="mt-1 text-2xl font-bold">Fluxo de treinamento e integração</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Veja o caminho do profissional desde o pré-cadastro até a liberação para atendimento. Edite responsáveis, prazos e checklist para orientar a equipe em cada etapa.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { if (window.confirm('Restaurar as etapas padrão? As alterações atuais do fluxo serão substituídas.')) resetTrainingFlow(); }}><RotateCcw className="mr-2 h-4 w-4"/>Restaurar padrão</Button>
        <Button onClick={addTrainingFlowStage}><Plus className="mr-2 h-4 w-4"/>Adicionar etapa</Button>
      </div>
    </header>

    <div className="rounded-md border border-secondary/20 bg-secondary/5 p-4 text-sm text-muted-foreground">
      Este fluxo é um roteiro interno para a equipe. O treinamento em vídeo realizado pelo profissional continua sendo administrado separadamente na seção <strong className="font-semibold text-foreground">Treinamentos</strong>.
    </div>

    {trainingFlow.length === 0 ? <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada. Adicione uma etapa para montar o fluxo.</p></Card> : <div className="space-y-0">
      {trainingFlow.map((stage, index) => <div key={stage.id} className="relative grid gap-3 sm:grid-cols-[56px_1fr]">
        <div className="flex flex-col items-center">
          <div className="z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-secondary bg-background font-display text-sm font-bold text-secondary">{String(index + 1).padStart(2, '0')}</div>
          {index < trainingFlow.length - 1 && <div className="min-h-8 w-px flex-1 bg-border"/>}
        </div>
        <Card className="mb-4 space-y-4 border-border/70 p-4 sm:p-5">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Nome da etapa</span><Input value={stage.title} onChange={(event) => updateTrainingFlowStage(stage.id, { title: event.target.value })}/></label>
              <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Prazo / momento sugerido</span><div className="relative"><Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={stage.timing} placeholder="Ex.: até 3 dias úteis" onChange={(event) => updateTrainingFlowStage(stage.id, { timing: event.target.value })}/></div></label>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" aria-label="Mover etapa para cima" title="Mover para cima" disabled={index === 0} onClick={() => moveTrainingFlowStage(stage.id, -1)}><ArrowUp className="h-4 w-4"/></Button>
              <Button size="icon" variant="ghost" aria-label="Mover etapa para baixo" title="Mover para baixo" disabled={index === trainingFlow.length - 1} onClick={() => moveTrainingFlowStage(stage.id, 1)}><ArrowDown className="h-4 w-4"/></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir etapa" title="Excluir etapa" onClick={() => { if (window.confirm(`Excluir a etapa “${stage.title || 'sem título'}”?`)) removeTrainingFlowStage(stage.id); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
          </div>
          <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">O que acontece nesta etapa</span><Textarea rows={2} value={stage.description} placeholder="Descreva o objetivo e os principais passos..." onChange={(event) => updateTrainingFlowStage(stage.id, { description: event.target.value })}/></label>
          <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
            <label className="block space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Users className="h-3.5 w-3.5"/>Responsável</span><Input value={stage.owner} placeholder="Ex.: Recrutamento" onChange={(event) => updateTrainingFlowStage(stage.id, { owner: event.target.value })}/></label>
            <label className="block space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ClipboardCheck className="h-3.5 w-3.5"/>Checklist — um item por linha</span><Textarea rows={Math.max(3, Math.min(6, stage.checklist.length + 1))} value={stage.checklist.join('\n')} placeholder={'Conferir os documentos\nAtualizar etapa no pipeline'} onChange={(event) => updateTrainingFlowStage(stage.id, { checklist: event.target.value.split('\n').filter((item) => item.trim()) })}/></label>
          </div>
        </Card>
      </div>)}
    </div>}
    <div className="flex justify-end"><Button variant="outline" onClick={addTrainingFlowStage}><Plus className="mr-2 h-4 w-4"/>Adicionar próxima etapa</Button></div>
  </div>;
}
