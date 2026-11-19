import type { Candidato, SessionUser, TeamAccount, TeamPermission, Trilha, ProgressoMap, PipelineStage, SolicitacaoProfissional } from './types';
import type { HomeContent } from './home-content';
import type { TrainingFlowStage } from './training-flow';
import { normalizeRegistrationFields } from './registration-fields';

export interface CrmSnapshot {
  candidatos: Candidato[];
  user: SessionUser | null;
  trilhas: Trilha[];
  progresso: ProgressoMap;
  pipelineStages: PipelineStage[];
  solicitacoes: SolicitacaoProfissional[];
  homeContent: HomeContent;
  trainingFlow: TrainingFlowStage[];
  teamAccounts: TeamAccount[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function permissionList(value: unknown): TeamPermission[] {
  if (Array.isArray(value)) return value.filter((key): key is TeamPermission => typeof key === 'string') as TeamPermission[];
  return Object.entries(asRecord(value)).filter(([, enabled]) => enabled === true).map(([key]) => key as TeamPermission);
}

export function sessionUserFromRemote(value: unknown): SessionUser | null {
  const user = asRecord(value);
  if (!['admin', 'equipe', 'profissional'].includes(String(user.role ?? ''))) return null;
  const role = user.role as SessionUser['role'];
  return {
    id: String(user.id ?? ''),
    nome: String(user.nome ?? user.full_name ?? ''),
    email: String(user.email ?? ''),
    role,
    ...(role === 'profissional' ? { candidatoId: String(user.candidatoId ?? user.candidateId ?? user.candidate_id ?? '') } : {}),
    ...(role !== 'profissional' ? { teamUserId: String(user.teamUserId ?? user.id ?? '') } : {}),
    permissoes: permissionList(user.permissions ?? user.permissoes),
  };
}

function teamAccountFromRemote(value: unknown): TeamAccount | null {
  const item = asRecord(value);
  if (!item.id) return null;
  return {
    id: String(item.id),
    nome: String(item.nome ?? item.name ?? ''),
    email: String(item.email ?? ''),
    permissoes: permissionList(item.permissions ?? item.permissoes),
    ativo: (item.ativo ?? item.active) !== false,
    criadoEm: String(item.criadoEm ?? item.created_at ?? new Date().toISOString()),
  };
}

export function normalizeRemoteState(value: unknown, fallback: CrmSnapshot): CrmSnapshot {
  const remote = asRecord(value);
  const teamAccounts = Array.isArray(remote.teamAccounts)
    ? remote.teamAccounts.map(teamAccountFromRemote).filter((item): item is TeamAccount => Boolean(item))
    : [];
  const homeContent = asRecord(remote.homeContent);
  const normalizedHomeContent = {
    ...fallback.homeContent,
    ...homeContent,
    registrationFields: normalizeRegistrationFields(homeContent.registrationFields),
  } as unknown as HomeContent;
  return {
    ...fallback,
    ...remote,
    user: sessionUserFromRemote(remote.user),
    candidatos: Array.isArray(remote.candidatos) ? remote.candidatos as Candidato[] : [],
    trilhas: Array.isArray(remote.trilhas) ? remote.trilhas as Trilha[] : fallback.trilhas,
    progresso: asRecord(remote.progresso) as ProgressoMap,
    pipelineStages: Array.isArray(remote.pipelineStages) ? remote.pipelineStages as PipelineStage[] : fallback.pipelineStages,
    solicitacoes: Array.isArray(remote.solicitacoes) ? remote.solicitacoes as SolicitacaoProfissional[] : [],
    homeContent: normalizedHomeContent,
    trainingFlow: Array.isArray(remote.trainingFlow) ? remote.trainingFlow as TrainingFlowStage[] : fallback.trainingFlow,
    teamAccounts,
  } as CrmSnapshot;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function candidateChanges(current: Candidato[], baseline: Candidato[]): Record<string, unknown>[] {
  const previous = new Map(baseline.map((candidate) => [candidate.id, candidate]));
  const updates: Record<string, unknown>[] = [];
  for (const candidate of current) {
    const old = previous.get(candidate.id);
    if (!old) continue;
    const change: Record<string, unknown> = { id: candidate.id };
    for (const [key, value] of Object.entries(candidate)) {
      if (key !== 'id' && !same(value, (old as unknown as Record<string, unknown>)[key])) change[key] = value;
    }
    if (Object.keys(change).length > 1) updates.push(change);
  }
  return updates;
}

export function buildServerPatch(state: CrmSnapshot, baseline: CrmSnapshot): Record<string, unknown> {
  const user = state.user;
  if (!user) return {};
  const patch: Record<string, unknown> = {};

  if (user.role === 'admin') {
    const updates = candidateChanges(state.candidatos, baseline.candidatos);
    if (updates.length) patch.candidatos = updates;
    const currentIds = new Set(state.candidatos.map((candidate) => candidate.id));
    const deleted = baseline.candidatos.filter((candidate) => !currentIds.has(candidate.id)).map((candidate) => candidate.id);
    if (deleted.length) patch.candidateDeletes = deleted;
    for (const key of ['trilhas', 'progresso', 'pipelineStages', 'solicitacoes', 'homeContent', 'trainingFlow'] as const) {
      if (!same(state[key], baseline[key])) patch[key] = state[key];
    }
    return patch;
  }

  const permissions = new Set(user.permissoes ?? []);
  if (user.role === 'equipe') {
    if (permissions.has('candidatos')) {
      const updates = candidateChanges(state.candidatos, baseline.candidatos);
      if (updates.length) patch.candidatos = updates;
      const currentIds = new Set(state.candidatos.map((candidate) => candidate.id));
      const deleted = baseline.candidatos.filter((candidate) => !currentIds.has(candidate.id)).map((candidate) => candidate.id);
      if (deleted.length) patch.candidateDeletes = deleted;
    }
    if (permissions.has('pipeline')) {
      if (!same(state.pipelineStages, baseline.pipelineStages)) patch.pipelineStages = state.pipelineStages;
      const previous = new Map(baseline.candidatos.map((candidate) => [candidate.id, candidate.status]));
      const pipelineUpdates = state.candidatos
        .filter((candidate) => previous.has(candidate.id) && previous.get(candidate.id) !== candidate.status)
        .map((candidate) => ({ id: candidate.id, status: candidate.status }));
      if (pipelineUpdates.length) patch.pipelineUpdates = pipelineUpdates;
    }
    if (permissions.has('treinamentos')) {
      if (!same(state.trilhas, baseline.trilhas)) patch.trilhas = state.trilhas;
      if (!same(state.progresso, baseline.progresso)) patch.progresso = state.progresso;
    }
    if (permissions.has('fluxo-treinamento') && !same(state.trainingFlow, baseline.trainingFlow)) patch.trainingFlow = state.trainingFlow;
    if (permissions.has('conteudo-home') && !same(state.homeContent, baseline.homeContent)) patch.homeContent = state.homeContent;
    return patch;
  }

  // O RPC valida novamente no servidor que o progresso e o pedido pertencem ao profissional.
  const candidateId = user.candidatoId;
  if (!candidateId) return {};
  if (!same(state.progresso[candidateId], baseline.progresso[candidateId])) {
    patch.progresso = { [candidateId]: state.progresso[candidateId] ?? {} };
  }
  const candidate = state.candidatos.find((item) => item.id === candidateId);
  const oldCandidate = baseline.candidatos.find((item) => item.id === candidateId);
  if (candidate && !same(candidate.solicitacaoAtualizacao, oldCandidate?.solicitacaoAtualizacao)) {
    patch.candidatos = [{ id: candidate.id, solicitacaoAtualizacao: candidate.solicitacaoAtualizacao }];
  }
  const oldTicketIds = new Set(baseline.solicitacoes.map((item) => item.id));
  const newTickets = state.solicitacoes.filter((item) => item.candidatoId === candidateId && !oldTicketIds.has(item.id));
  if (newTickets.length) {
    patch.solicitacoes = newTickets.map(({ status: _status, respostaEquipe: _reply, respondidaEm: _responded, ...ticket }) => ticket);
  }
  return patch;
}
