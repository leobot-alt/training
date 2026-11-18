import { useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Download,
  FileText,
  GraduationCap,
  Mail,
  LockKeyhole,
  MapPin,
  Phone,
  RotateCcw,
  Sparkles,
  Trash2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import { Drawer } from './ui/drawer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AgendaGrade } from './AgendaGrade';
import { AdminCandidateEdit } from './AdminCandidateEdit';
import { useStore } from '@/lib/store';
import { downloadDocumentFile } from '@/lib/document-storage';
import { resumoObrigatorio, resumoTrilha } from '@/lib/treinamento';
import {
  STATUS_META,
  STATUS_ORDER,
  type Candidato,
  type CandidatoStatus,
  type Documento,
  type DadosPerfilCandidato,
} from '@/lib/types';
import { cn, formatDate, formatDateTime, initials, relativeTime } from '@/lib/utils';

const tabs = ['Resumo', 'Editar cadastro', 'Solicitação', 'Documentos', 'Treinamento'] as const;
type Tab = (typeof tabs)[number];

const CAMPOS_PERFIL: { key: keyof DadosPerfilCandidato; label: string }[] = [
  { key: 'nome', label: 'Nome completo' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'dataNascimento', label: 'Data de nascimento' },
  { key: 'email', label: 'E-mail' },
  { key: 'emailTeams', label: 'E-mail Microsoft Teams' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cep', label: 'CEP' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'numero', label: 'Número / complemento' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'chavePix', label: 'Chave Pix' },
  { key: 'profissao', label: 'Profissão' },
  { key: 'registro', label: 'Registro profissional' },
  { key: 'especialidades', label: 'Especialidades' },
  { key: 'abordagem', label: 'Abordagem' },
  { key: 'experienciaAnos', label: 'Anos de experiência' },
  { key: 'bio', label: 'Resumo profissional' },
  { key: 'agenda', label: 'Agenda semanal' },
  { key: 'observacoesAgenda', label: 'Observações da agenda' },
];

function valorPerfil(campo: keyof DadosPerfilCandidato, valor: unknown) {
  if (campo === 'agenda' && Array.isArray(valor)) {
    return valor.length ? valor.map((slot) => `${slot.dia} ${slot.inicio}–${slot.fim}`).join(' · ') : 'Nenhum horário';
  }
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : '—';
  if (campo === 'dataNascimento' && typeof valor === 'string' && valor) {
    const data = new Date(`${valor}T12:00:00`);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR');
  }
  return valor === undefined || valor === null || valor === '' ? '—' : String(valor);
}

function iguaisParaRevisao(a: unknown, b: unknown, campo: keyof DadosPerfilCandidato) {
  const valorAtual = campo === 'agenda' ? a ?? [] : a ?? '';
  const valorSolicitado = campo === 'agenda' ? b ?? [] : b ?? '';
  return JSON.stringify(valorAtual) === JSON.stringify(valorSolicitado);
}

const docLabel: Record<Documento['status'], string> = {
  pendente: 'Pendente',
  enviado: 'Em análise',
  validado: 'Validado',
};

export function CandidatoDrawer({
  candidato,
  onClose,
}: {
  candidato: Candidato | null;
  onClose: () => void;
}) {
  const {
    user,
    updateStatus,
    updateDocumento,
    updateCandidato,
    aprovarAtualizacaoCandidato,
    recusarAtualizacaoCandidato,
    removeCandidato,
    trilhas,
    progresso,
    resetarProgresso,
    pipelineStages,
    solicitacoes,
  } = useStore();
  const [tab, setTab] = useState<Tab>('Resumo');

  if (!candidato) return null;

  const isAdmin = user?.role === 'admin';
  const canViewDetails = isAdmin || user?.permissoes?.includes('candidatos') === true;
  const canManageRequests = isAdmin || user?.permissoes?.includes('solicitacoes') === true;
  const canManagePipeline = canViewDetails || user?.permissoes?.includes('pipeline') === true;
  const canViewTraining = isAdmin || user?.permissoes?.includes('treinamentos') === true;
  const visibleTabs: Tab[] = [
    ...(canViewDetails || (!canManageRequests && !canViewTraining) ? ['Resumo' as const] : []),
    ...(canViewDetails ? ['Editar cadastro' as const, 'Documentos' as const] : []),
    ...(canManageRequests ? ['Solicitação' as const] : []),
    ...(canViewTraining ? ['Treinamento' as const] : []),
  ];
  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? 'Resumo';

  const meta = STATUS_META[candidato.status];
  const metaLabel = pipelineStages.find((stage) => stage.status === candidato.status)?.label ?? meta.label;
  const progressoPessoal = progresso[candidato.id] ?? {};
  const onboarding = resumoObrigatorio(trilhas, progressoPessoal);
  const solicitacao = candidato.solicitacaoAtualizacao;
  const solicitacoesCandidato = solicitacoes
    .filter((item) => item.candidatoId === candidato.id)
    .sort((a, b) => +new Date(b.criadaEm) - +new Date(a.criadaEm));
  const camposAlterados = solicitacao
    ? CAMPOS_PERFIL.filter(({ key }) => Object.prototype.hasOwnProperty.call(solicitacao.dados, key) && (!canViewDetails || !iguaisParaRevisao(candidato[key], solicitacao.dados[key], key)))
    : [];

  return (
    <Drawer
      open={Boolean(candidato)}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initials(candidato.nome)}
          </div>
          <div>
            <p className="leading-tight">{candidato.nome}</p>
            {canViewDetails && <p className="text-xs font-normal text-muted-foreground">{candidato.profissao} · {candidato.registro}</p>}
          </div>
        </div>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={meta.badge}>
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
            {metaLabel}
          </Badge>
          {canViewDetails && candidato.protocolo && <><span>Protocolo {candidato.protocolo}</span><span>·</span></>}
          {canViewDetails && candidato.criadoEm && <span>Cadastro {relativeTime(candidato.criadoEm)}</span>}
        </div>
      }
      footer={
        canViewDetails ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus(candidato.id, 'aprovado')}
              disabled={candidato.status === 'aprovado' || candidato.status === 'ativo'}
            >
              <Check className="h-3.5 w-3.5" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus(candidato.id, 'reprovado')}
              disabled={candidato.status === 'reprovado'}
            >
              <X className="h-3.5 w-3.5" /> Não aprovar
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              removeCandidato(candidato.id);
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Status */}
        {canManagePipeline && <div className="rounded-md border bg-muted/40 p-3.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Etapa no pipeline
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pipelineStages.filter((stage) => stage.enabled).sort((a, b) => a.order - b.order).map(({ status }) => (
              <button
                key={status}
                onClick={() => updateStatus(candidato.id, status as CandidatoStatus)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  candidato.status === status
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-secondary/50',
                )}
              >
                {pipelineStages.find((stage) => stage.status === status)?.label ?? STATUS_META[status].label}
              </button>
            ))}
          </div>
        </div>}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {visibleTabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === item
                  ? 'border-secondary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item}
              {item === 'Solicitação' && (solicitacao ? 1 : 0) + solicitacoesCandidato.filter((request) => request.status === 'pendente').length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{(solicitacao ? 1 : 0) + solicitacoesCandidato.filter((request) => request.status === 'pendente').length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'Resumo' && !canViewDetails && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Acesso limitado a este resumo</p>
            <p className="mt-1">Esta conta não tem acesso ao cadastro completo nem aos documentos. A área de solicitações mostra somente as informações enviadas pelo profissional para validação.</p>
          </div>
        )}

        {activeTab === 'Resumo' && canViewDetails && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Mail, label: 'E-mail', value: candidato.email },
                { icon: Mail, label: 'E-mail Microsoft Teams', value: candidato.emailTeams || '—' },
                { icon: Phone, label: 'Telefone', value: candidato.telefone },
                { icon: MapPin, label: 'Cidade', value: `${candidato.cidade} — ${candidato.uf}` },
                { icon: CalendarClock, label: 'Experiência', value: `${candidato.experienciaAnos} anos` },
                { icon: BadgeCheck, label: 'Abordagem', value: candidato.abordagem },
                { icon: Sparkles, label: 'Origem', value: candidato.origem },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-md border border-border/70 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3 w-3" /> {label}
                  </p>
                  <p className="mt-1 text-sm font-medium break-words">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border/70 p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dados pessoais e pagamento</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['CPF', candidato.cpf || '—'],
                  ['RG', candidato.rg || '—'],
                  ['Sexo', candidato.sexo || '—'],
                  ['Data de nascimento', candidato.dataNascimento
                    ? new Date(`${candidato.dataNascimento}T12:00:00`).toLocaleDateString('pt-BR')
                    : '—'],
                  ['CEP', candidato.cep || '—'],
                  ['Endereço', candidato.endereco ? `${candidato.endereco}, ${candidato.numero || 's/n'}` : '—'],
                  ['Chave Pix', candidato.chavePix || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {candidato.bio && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resumo profissional</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{candidato.bio}</p>
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Especialidades</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidato.especialidades.map((esp) => (
                  <Badge key={esp} className="border-border bg-muted text-muted-foreground">
                    {esp}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Agenda recorrente</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edição pelo profissional: {candidato.agendaEditavel ? 'liberada' : 'bloqueada'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={candidato.agendaEditavel ? 'outline' : 'primary'}
                  onClick={() => updateCandidato(candidato.id, { agendaEditavel: !candidato.agendaEditavel })}
                >
                  {candidato.agendaEditavel ? <LockKeyhole className="h-3.5 w-3.5" /> : <UnlockKeyhole className="h-3.5 w-3.5" />}
                  {candidato.agendaEditavel ? 'Bloquear edição' : 'Liberar edição'}
                </Button>
              </div>
              <AgendaGrade
                agenda={candidato.agenda ?? []}
                observacoes={candidato.observacoesAgenda ?? ''}
                disabled
                onChange={() => undefined}
                onObservacoesChange={() => undefined}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Última atualização em {formatDateTime(candidato.atualizadoEm)}
            </p>
          </div>
        )}

        {activeTab === 'Editar cadastro' && canViewDetails && (
          <AdminCandidateEdit
            key={candidato.id}
            candidato={candidato}
            onSave={(dados) => updateCandidato(candidato.id, dados)}
          />
        )}

        {activeTab === 'Solicitação' && canManageRequests && (
          <div className="space-y-4 animate-fade-in">
            {solicitacao ? (
              <>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-950">Atualização cadastral aguardando validação</p>
                  <p className="mt-1 text-xs text-amber-900">Enviada em {formatDateTime(solicitacao.solicitadaEm)}. Os dados atuais permanecem ativos até a aprovação.</p>
                </div>

                {camposAlterados.length ? (
                  <div className="space-y-3">
                    {camposAlterados.map(({ key, label }) => (
                      <div key={key} className="rounded-md border border-border/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                        {canViewDetails && <p className="mt-2 break-words text-xs text-muted-foreground"><span className="font-medium text-foreground">Atual:</span> {valorPerfil(key, candidato[key])}</p>}
                        <p className="mt-1 break-words text-sm"><span className="font-medium">Solicitado:</span> {valorPerfil(key, solicitacao.dados[key])}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">A solicitação não contém alterações em relação aos dados atuais.</p>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button size="sm" onClick={() => void aprovarAtualizacaoCandidato(candidato.id)}>
                    <Check className="h-3.5 w-3.5" /> Aprovar alterações
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void recusarAtualizacaoCandidato(candidato.id)}>
                    <X className="h-3.5 w-3.5" /> Recusar solicitação
                  </Button>
                </div>
              </>
            ) : <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Não há atualização cadastral pendente.</div>}

            <div className="space-y-3 border-t pt-4">
              <div><h3 className="text-sm font-semibold">Histórico de solicitações</h3><p className="text-xs text-muted-foreground">Mensagens e pedidos de alteração de agenda enviados por este profissional.</p></div>
              {solicitacoesCandidato.length === 0 ? <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhuma solicitação ou mensagem registrada.</div> : solicitacoesCandidato.map((request) => (
                <div key={request.id} className="space-y-2 rounded-md border border-border/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{request.tipo === 'agenda' ? 'Alteração de agenda' : 'Mensagem'}</p>
                    <Badge className={request.status === 'pendente' ? 'border-amber-200 bg-amber-50 text-amber-800' : request.status === 'atendida' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{request.status === 'pendente' ? 'Pendente' : request.status === 'atendida' ? 'Atendida' : 'Recusada'}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Enviada em {formatDateTime(request.criadaEm)}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{request.mensagem}</p>
                  {request.tipo === 'agenda' && request.agenda && <div className="rounded bg-muted/60 p-2 text-xs"><span className="font-medium">Agenda solicitada: </span>{request.agenda.length ? request.agenda.map((slot) => `${slot.dia} ${slot.inicio}–${slot.fim}`).join(' · ') : 'Nenhum horário informado'}{request.observacoesAgenda && <p className="mt-1"><span className="font-medium">Observação: </span>{request.observacoesAgenda}</p>}</div>}
                  {request.respostaEquipe && <div className="rounded-md border-l-2 border-secondary bg-muted/50 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resposta da equipe{request.respondidaEm ? ` · ${formatDateTime(request.respondidaEm)}` : ''}</p><p className="mt-1 whitespace-pre-wrap text-sm">{request.respostaEquipe}</p></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Documentos' && canViewDetails && (
          <div className="space-y-2 animate-fade-in">
            {candidato.documentos.map((doc) => (
              <div
                key={doc.nome}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="block truncate text-sm">{doc.nome}</span>
                    {doc.arquivoNome && <span className="block truncate text-[10px] text-muted-foreground">{doc.arquivoNome}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {doc.arquivoId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await downloadDocumentFile(doc.arquivoId!, doc.arquivoNome ?? `${doc.nome}.pdf`);
                        } catch {
                          window.alert('O arquivo não está disponível neste navegador.');
                        }
                      }}
                    >
                      <Download className="h-3 w-3" /> Baixar
                    </Button>
                  )}
                  {(['pendente', 'enviado', 'validado'] as Documento['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateDocumento(candidato.id, doc.nome, status)}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                        doc.status === status
                          ? status === 'validado'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'enviado'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-muted-foreground'
                          : 'text-muted-foreground/60 hover:bg-muted',
                      )}
                    >
                      {docLabel[status]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Treinamento' && canViewTraining && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-secondary" />
                  <p className="text-sm font-medium">Onboarding obrigatório</p>
                </div>
                <Badge
                  className={
                    onboarding.concluido
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }
                >
                  {onboarding.concluido ? 'Concluído' : 'Pendente'}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${onboarding.percentual}%` }} />
                </div>
                <span className="text-xs font-semibold">{onboarding.percentual}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {onboarding.aulasConcluidas} de {onboarding.totalAulas} aulas obrigatórias concluídas
              </p>
            </div>

            {trilhas.map((trilha) => {
              const resumo = resumoTrilha(trilha, progressoPessoal);
              return (
                <div key={trilha.id} className="rounded-md border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{trilha.titulo}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {resumo.concluidas}/{resumo.total}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${resumo.percentual}%` }} />
                  </div>
                  <ul className="mt-2.5 space-y-1">
                    {trilha.aulas.map((aula) => {
                      const registro = progressoPessoal[aula.id];
                      return (
                        <li key={aula.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span
                            className={registro?.concluida ? 'text-muted-foreground line-through' : 'text-foreground'}
                          >
                            {aula.titulo}
                          </span>
                          <span className={registro?.concluida ? 'text-emerald-600' : 'text-muted-foreground'}>
                            {registro?.concluida ? 'concluída' : registro ? `${Math.round(registro.percentual)}%` : '—'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            <Button size="sm" variant="outline" onClick={() => resetarProgresso(candidato.id)}>
              <RotateCcw className="h-3.5 w-3.5" /> Resetar progresso deste profissional
            </Button>
          </div>
        )}

      </div>
    </Drawer>
  );
}
