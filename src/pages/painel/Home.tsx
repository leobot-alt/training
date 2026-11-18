import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  Clock,
  FileText,
  GraduationCap,
  Mail,
  Send,
  MapPin,
  Phone,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/badge';
import { AgendaGrade } from '@/components/AgendaGrade';
import { Textarea } from '@/components/ui/field';
import { useStore } from '@/lib/store';
import { STATUS_META, type Candidato, type CandidatoStatus } from '@/lib/types';
import { resumoObrigatorio, resumoTrilha } from '@/lib/treinamento';
import { cn, formatDate } from '@/lib/utils';

const FLUXO: CandidatoStatus[] = ['novo', 'triagem', 'entrevista', 'documentacao', 'aprovado', 'ativo'];

const PROXIMOS_PASSOS: Record<CandidatoStatus, string> = {
  novo: 'Recebemos seu cadastro. Nosso time faz a primeira análise em até 3 dias úteis.',
  triagem: 'Seu perfil está em análise pelo time de recrutamento. Nenhuma ação necessária agora.',
  entrevista: 'Vamos agendar uma conversa de 30 minutos. Fique de olho no seu e-mail e WhatsApp.',
  documentacao: 'Envie os documentos pendentes abaixo para concluir a validação.',
  aprovado: 'Você foi aprovado! Conclua o treinamento obrigatório para liberar seus atendimentos.',
  ativo: 'Tudo certo: seu perfil está ativo e recebendo pacientes.',
  reprovado: 'Seu perfil não avançou neste momento. Você pode se candidatar novamente em 90 dias.',
};

function AgendaCard({ candidato, onSave }: { candidato: Candidato; onSave: (patch: Partial<Candidato>) => void }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Minha agenda</CardTitle>
        <p className="text-sm text-muted-foreground">
          {candidato.agendaEditavel
            ? 'A edição da sua disponibilidade está liberada pelo administrador.'
            : 'Sua agenda está bloqueada para edição. Solicite ao administrador que libere a alteração.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AgendaGrade
          agenda={candidato.agenda ?? []}
          observacoes={candidato.observacoesAgenda ?? ''}
          disabled={!candidato.agendaEditavel}
          onChange={(agenda) => onSave({ agenda })}
          onObservacoesChange={(observacoesAgenda) => onSave({ observacoesAgenda })}
        />
      </CardContent>
    </Card>
  );
}

export default function PainelHome() {
  const { user, candidatos, trilhas, progresso, updateCandidato, solicitacoes, criarSolicitacao } = useStore();
  const [tipoSolicitacao, setTipoSolicitacao] = useState<'agenda' | 'mensagem'>('mensagem');
  const [mensagemSolicitacao, setMensagemSolicitacao] = useState('');
  const [agendaSolicitada, setAgendaSolicitada] = useState<import('@/lib/types').AgendaSlot[]>([]);
  const [observacoesSolicitadas, setObservacoesSolicitadas] = useState('');
  const [avisoSolicitacao, setAvisoSolicitacao] = useState('');

  const candidato = candidatos.find((c) => c.id === user?.candidatoId);

  if (!candidato) {
    return (
      <div className="container flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <CircleDashed className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-bold">Nenhum cadastro vinculado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não encontramos um cadastro para <span className="font-medium text-foreground">{user?.email}</span>. Faça
          seu cadastro para acompanhar o processo seletivo por aqui.
        </p>
        <Link to="/cadastro" className="mt-6">
          <Button>Fazer cadastro</Button>
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[candidato.status];
  const fluxoIndex = FLUXO.indexOf(candidato.status);
  const progressoFluxo = candidato.status === 'reprovado' ? 100 : ((fluxoIndex + 1) / FLUXO.length) * 100;
  const docsValidados = candidato.documentos.filter((d) => d.status === 'validado').length;
  const progressoPessoal = progresso[candidato.id] ?? {};
  const onboarding = resumoObrigatorio(trilhas, progressoPessoal);
  const temAulaObrigatoria = trilhas.some((trilha) => trilha.obrigatoria && trilha.aulas.length > 0);
  const minhasSolicitacoes = solicitacoes
    .filter((item) => item.candidatoId === candidato.id)
    .sort((a, b) => +new Date(b.criadaEm) - +new Date(a.criadaEm));

  const enviarSolicitacao = () => {
    if (tipoSolicitacao === 'mensagem' && mensagemSolicitacao.trim().length < 3) {
      setAvisoSolicitacao('Escreva uma mensagem para a equipe.');
      return;
    }
    if (tipoSolicitacao === 'agenda' && agendaSolicitada.length === 0) {
      setAvisoSolicitacao('Selecione pelo menos um horário para solicitar a mudança de agenda.');
      return;
    }
    criarSolicitacao({
      candidatoId: candidato.id,
      tipo: tipoSolicitacao,
      mensagem: tipoSolicitacao === 'mensagem' ? mensagemSolicitacao.trim() : 'Solicitação de alteração da agenda.',
      ...(tipoSolicitacao === 'agenda' ? { agenda: agendaSolicitada, observacoesAgenda: observacoesSolicitadas } : {}),
    });
    setMensagemSolicitacao('');
    setAvisoSolicitacao('Solicitação enviada para análise da equipe.');
  };

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Protocolo {candidato.protocolo}</p>
          <h1 className="text-3xl font-bold">Olá, {candidato.nome.split(' ')[0]}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.badge}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </Badge>
            <span className="text-xs text-muted-foreground">Atualizado {formatDate(candidato.atualizadoEm)}</span>
          </div>
        </div>
        <Link to="/cadastro">
          <Button variant="outline" size="sm">
            Atualizar cadastro
          </Button>
        </Link>
      </div>

      {candidato.solicitacaoAtualizacao && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">Atualização aguardando validação</p>
              <p className="text-xs text-amber-800">Seus dados atuais continuam ativos até a equipe analisar e aprovar a solicitação.</p>
            </div>
            <Badge className="w-fit border-amber-200 bg-white text-amber-800">Em análise</Badge>
          </CardContent>
        </Card>
      )}

      {/* Treinamento obrigatório */}
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
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                onboarding.concluido ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-secondary',
              )}
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-base font-semibold">
                  {onboarding.concluido
                    ? temAulaObrigatoria ? 'Treinamento obrigatório concluído' : 'Nenhuma aula obrigatória no momento'
                    : 'Treinamento obrigatório pendente'}
                </p>
                <Badge className="border-border bg-white/70 text-[10px] text-foreground">
                  {temAulaObrigatoria ? `${onboarding.aulasConcluidas}/${onboarding.totalAulas} aulas` : 'Sem aulas obrigatórias'}
                </Badge>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                {onboarding.concluido
                  ? temAulaObrigatoria
                    ? 'Você liberou o acesso completo à plataforma. As trilhas opcionais continuam disponíveis.'
                    : 'A equipe não configurou aulas obrigatórias neste momento. Você ainda pode acessar as trilhas disponíveis.'
                  : 'Conclua todas as aulas do onboarding para liberar o atendimento de pacientes na plataforma.'}
              </p>
              {temAulaObrigatoria && (
                <div className="flex items-center gap-3 pt-1">
                  <Progress value={onboarding.percentual} className="h-1.5 w-40 bg-white/70" />
                  <span className="text-xs font-medium">{onboarding.percentual}%</span>
                </div>
              )}
            </div>
          </div>
          <Link to={onboarding.proximaAula ? `/painel/treinamentos/${onboarding.proximaAula.trilha.id}/${onboarding.proximaAula.aula.id}` : '/painel/treinamentos'}>
            <Button size="sm" variant={onboarding.concluido ? 'outline' : 'primary'} className="w-full sm:w-auto">
              {onboarding.concluido
                ? temAulaObrigatoria ? 'Rever treinamentos' : 'Ver treinamentos'
                : 'Continuar treinamento'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Seu processo seletivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Progress value={progressoFluxo} />
                <p className="text-xs text-muted-foreground">
                  {candidato.status === 'reprovado' ? 'Processo encerrado' : `Etapa ${fluxoIndex + 1} de ${FLUXO.length}`}
                </p>
              </div>

              <ol className="space-y-0">
                {FLUXO.map((etapa, index) => {
                  const concluida = candidato.status !== 'reprovado' && index < fluxoIndex;
                  const atual = candidato.status === etapa;
                  return (
                    <li key={etapa} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full border',
                            concluida && 'border-secondary bg-secondary text-white',
                            atual && 'border-primary bg-primary text-white',
                            !concluida && !atual && 'border-border bg-card text-muted-foreground',
                          )}
                        >
                          {concluida ? (
                            <CircleCheck className="h-4 w-4" />
                          ) : atual ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-[10px] font-semibold">{index + 1}</span>
                          )}
                        </span>
                        {index < FLUXO.length - 1 && (
                          <span className={cn('my-1 w-px flex-1', concluida ? 'bg-secondary/40' : 'bg-border')} />
                        )}
                      </div>
                      <div className={cn('pb-5', index === FLUXO.length - 1 && 'pb-0')}>
                        <p className={cn('text-sm font-medium', !concluida && !atual && 'text-muted-foreground')}>
                          {STATUS_META[etapa].label}
                        </p>
                        <p className="text-xs text-muted-foreground">{STATUS_META[etapa].description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div
                className={cn(
                  'rounded-md p-4 text-sm leading-relaxed',
                  candidato.status === 'reprovado' ? 'bg-rose-50 text-rose-800' : 'bg-accent text-accent-foreground',
                )}
              >
                <p className="flex items-start gap-2">
                  {candidato.status === 'reprovado' ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {PROXIMOS_PASSOS[candidato.status]}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Documentos</CardTitle>
              <Badge className="border-border bg-muted text-muted-foreground">
                {docsValidados}/{candidato.documentos.length} validados
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {candidato.documentos.map((doc) => (
                <div
                  key={doc.nome}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{doc.nome}</span>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0',
                      doc.status === 'validado' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      doc.status === 'enviado' && 'border-amber-200 bg-amber-50 text-amber-700',
                      doc.status === 'pendente' && 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {doc.status === 'validado' ? 'Validado' : doc.status === 'enviado' ? 'Em análise' : 'Pendente'}
                  </Badge>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Para enviar um documento pendente, responda o e-mail do time de recrutamento com o arquivo em PDF.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Dados do cadastro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: Mail, value: candidato.email },
                { icon: Phone, value: candidato.telefone },
                { icon: MapPin, value: `${candidato.cidade} — ${candidato.uf}` },
                { icon: BadgeCheck, value: `${candidato.profissao} · ${candidato.registro}` },
                { icon: CalendarClock, value: `${candidato.experienciaAnos} anos de experiência` },
              ].map(({ icon: Icon, value }) => (
                <div key={value} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Suas trilhas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trilhas.map((trilha) => {
                const resumo = resumoTrilha(trilha, progressoPessoal);
                return (
                  <Link
                    key={trilha.id}
                    to={`/painel/treinamentos/${trilha.id}`}
                    className="block rounded-md border border-border/70 p-3 transition-colors hover:border-secondary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{trilha.titulo}</p>
                      {trilha.obrigatoria && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                          Obrigatória
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={resumo.percentual} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground">
                        {resumo.concluidas}/{resumo.total}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <AgendaCard candidato={candidato} onSave={(patch) => updateCandidato(candidato.id, patch)} />

          <Card className="border-border/70">
            <CardHeader><CardTitle>Especialidades</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {candidato.especialidades.map((esp) => <Badge key={esp} className="border-border bg-muted text-muted-foreground">{esp}</Badge>)}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Solicitações para a equipe</CardTitle>
              <p className="text-sm text-muted-foreground">Peça uma alteração de agenda ou envie uma mensagem. A equipe analisará seu pedido.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {([
                  ['mensagem', 'Enviar mensagem'],
                  ['agenda', 'Alterar agenda'],
                ] as const).map(([tipo, rotulo]) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { setTipoSolicitacao(tipo); setAvisoSolicitacao(''); }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium',
                      tipoSolicitacao === tipo ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground',
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
                <Link to="/cadastro" className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                  Alterar dados cadastrais
                </Link>
              </div>

              {tipoSolicitacao === 'mensagem' ? (
                <Textarea
                  value={mensagemSolicitacao}
                  onChange={(event) => setMensagemSolicitacao(event.target.value)}
                  placeholder="Escreva sua mensagem ou descreva o que precisa..."
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Selecione a disponibilidade que gostaria de solicitar. A agenda atual só muda após análise.</p>
                  <AgendaGrade
                    agenda={agendaSolicitada}
                    observacoes={observacoesSolicitadas}
                    onChange={setAgendaSolicitada}
                    onObservacoesChange={setObservacoesSolicitadas}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p role="status" className="text-xs text-muted-foreground">{avisoSolicitacao}</p>
                <Button size="sm" onClick={enviarSolicitacao}>
                  <Send className="h-3.5 w-3.5" /> Enviar solicitação
                </Button>
              </div>

              {minhasSolicitacoes.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">Solicitações recentes</p>
                  {minhasSolicitacoes.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/70 p-3">
                      <div>
                        <p className="text-xs font-medium">{item.tipo === 'agenda' ? 'Alteração de agenda' : 'Mensagem à equipe'}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.mensagem}</p>
                        {item.respostaEquipe && (
                          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Resposta da equipe</p>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-emerald-950">{item.respostaEquipe}</p>
                            {item.respondidaEm && <p className="mt-1 text-[10px] text-emerald-800">{formatDate(item.respondidaEm)}</p>}
                          </div>
                        )}
                      </div>
                      <Badge className={cn(
                        item.status === 'pendente' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                          item.status === 'atendida' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
                            'border-border bg-muted text-muted-foreground',
                      )}>
                        {item.status === 'pendente' ? 'Em análise' : item.status === 'atendida' ? 'Atendida' : 'Recusada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-secondary/30 bg-accent/40">
            <CardContent className="space-y-3 p-5">
              <p className="font-display text-sm font-semibold text-accent-foreground">Indique colegas e ganhe bônus</p>
              <p className="text-xs leading-relaxed text-accent-foreground/80">
                A cada profissional aprovado por sua indicação, você recebe um bônus de R$ 300 no próximo repasse.
              </p>
              <Link to="/">
                <Button size="sm" variant="secondary">
                  Ver como <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
