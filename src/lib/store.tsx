import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildTrilhas } from './seed-treinamentos';
import { DEFAULT_HOME_CONTENT, type HomeContent } from './home-content';
import { DEFAULT_TRAINING_FLOW, type TrainingFlowStage } from './training-flow';
import { SUPABASE_CONFIGURED, cpfAuthEmail, requireSupabase, supabase } from './supabase';
import { buildServerPatch, normalizeRemoteState, type CrmSnapshot } from './supabase-state';
import {
  DOCUMENTOS_PADRAO,
  type Aula,
  type AgendaSlot,
  type Candidato,
  type CandidatoStatus,
  type DadosPerfilCandidato,
  type Documento,
  type Nota,
  type ProgressoMap,
  type PipelineStage,
  type SessionUser,
  type TeamAccount,
  type TeamPermission,
  TEAM_PERMISSION_KEYS,
  type SolicitacaoProfissional,
  type StatusSolicitacao,
  type Trilha,
  PIPELINE_DEFAULTS,
} from './types';

type PersistedState = CrmSnapshot;

export interface NovoCadastroInput {
  origem?: string;
  nome: string;
  cpf: string;
  rg: string;
  sexo: string;
  dataNascimento: string;
  email: string;
  emailTeams: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  chavePix: string;
  cidade: string;
  uf: string;
  profissao: 'Psicólogo' | 'Psiquiatra';
  registro: string;
  especialidades: string[];
  abordagem: string;
  experienciaAnos: number | null;
  agenda: AgendaSlot[];
  observacoesAgenda?: string;
  bio?: string;
  lgpd: boolean;
}

export interface ProgressoInput {
  segundos: number;
  percentual: number;
  concluida?: boolean;
}

interface StoreValue extends PersistedState {
  loading: boolean;
  syncError: string;
  addCandidato: (input: NovoCadastroInput) => Promise<Candidato>;
  updateCandidateDocuments: (id: string, documentos: Documento[]) => Promise<void>;
  updateStatus: (id: string, status: CandidatoStatus) => void;
  updateCandidato: (id: string, patch: Partial<Candidato>) => void;
  solicitarAtualizacaoCandidato: (id: string, dados: DadosPerfilCandidato) => void;
  aprovarAtualizacaoCandidato: (id: string) => void;
  recusarAtualizacaoCandidato: (id: string) => void;
  updateDocumento: (id: string, nome: string, status: Documento['status']) => void;
  addNota: (id: string, texto: string) => void;
  criarSolicitacao: (input: Omit<SolicitacaoProfissional, 'id' | 'status' | 'criadaEm' | 'respondidaEm'>) => void;
  responderSolicitacao: (id: string, respostaEquipe: string) => void;
  resolverSolicitacao: (id: string, status: Exclude<StatusSolicitacao, 'pendente'>) => void;
  updateHomeContent: (content: HomeContent) => void;
  resetHomeContent: () => void;
  addTrainingFlowStage: () => void;
  updateTrainingFlowStage: (id: string, patch: Partial<TrainingFlowStage>) => void;
  removeTrainingFlowStage: (id: string) => void;
  moveTrainingFlowStage: (id: string, direction: -1 | 1) => void;
  resetTrainingFlow: () => void;
  createTeamAccount: (account: Omit<TeamAccount, 'id' | 'criadoEm' | 'ativo'> & { senha: string }) => Promise<{ ok: boolean; error?: string }>;
  updateTeamAccount: (id: string, patch: Partial<Pick<TeamAccount, 'nome' | 'email' | 'permissoes' | 'ativo'>>) => Promise<void>;
  deleteTeamAccount: (id: string) => Promise<void>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  removeCandidato: (id: string) => void;
  login: (identificador: string, senha: string, tipo?: 'profissional' | 'admin') => Promise<{ ok: boolean; error?: string; user?: SessionUser }>;
  logout: () => Promise<void>;
  getCandidato: (id: string) => Candidato | undefined;
  /* treinamentos */
  salvarProgresso: (candidatoId: string, aulaId: string, input: ProgressoInput) => void;
  concluirAula: (candidatoId: string, aulaId: string) => void;
  resetarProgresso: (candidatoId: string) => void;
  updateTrilha: (trilhaId: string, patch: Partial<Omit<Trilha, 'aulas'>>) => void;
  updateAula: (trilhaId: string, aulaId: string, patch: Partial<Aula>) => void;
  addAula: (trilhaId: string) => void;
  removeAula: (trilhaId: string, aulaId: string) => void;
  moverAula: (trilhaId: string, aulaId: string, direcao: -1 | 1) => void;
  addTrilha: () => string;
  removeTrilha: (trilhaId: string) => void;
  updatePipelineStage: (status: CandidatoStatus, patch: Partial<PipelineStage>) => void;
  moverPipelineStage: (status: CandidatoStatus, direcao: -1 | 1) => void;
  desativarPipelineStage: (status: CandidatoStatus, destino: CandidatoStatus) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadState(): PersistedState {
  return {
    candidatos: [],
    user: null,
    trilhas: buildTrilhas(),
    progresso: {},
    pipelineStages: PIPELINE_DEFAULTS,
    solicitacoes: [],
    homeContent: DEFAULT_HOME_CONTENT,
    trainingFlow: DEFAULT_TRAINING_FLOW,
    teamAccounts: [],
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const hydrated = useRef(false);
  const baseline = useRef<PersistedState>(loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshFromSupabase = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) throw new Error('O Supabase ainda não foi configurado.');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const { data, error } = session
      ? await supabase.rpc('get_my_state')
      : await supabase.rpc('get_public_state');
    if (error) throw error;
    const next = normalizeRemoteState(data, loadState());
    baseline.current = next;
    hydrated.current = true;
    setState(next);
    setSyncError('');
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    if (!SUPABASE_CONFIGURED) {
      hydrated.current = true;
      setLoading(false);
      return () => { active = false; };
    }
    void refreshFromSupabase().catch((error: unknown) => {
      if (!active) return;
      setSyncError(error instanceof Error ? error.message : 'Não foi possível sincronizar com o Supabase.');
      hydrated.current = true;
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshFromSupabase]);

  useEffect(() => {
    if (!hydrated.current || loading || !state.user || !SUPABASE_CONFIGURED) return;
    const snapshot = JSON.parse(JSON.stringify(state)) as PersistedState;
    const patch = buildServerPatch(snapshot, baseline.current);
    if (!Object.keys(patch).length) return;
    const timer = window.setTimeout(() => {
      void Promise.resolve(supabase.rpc('save_my_state', { p_patch: patch })).then(({ error }) => {
        if (error) throw error;
        baseline.current = snapshot;
        setSyncError('');
      }).catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : 'Não foi possível salvar as alterações no Supabase.');
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state, loading]);

  const addCandidato = useCallback(async (input: NovoCadastroInput) => {
    if (!SUPABASE_CONFIGURED) throw new Error('O sistema ainda não está conectado ao Supabase.');
    const { data, error } = await supabase.functions.invoke('candidate-register', { body: input });
    if (error || !data?.candidateId) throw new Error(data?.error ?? error?.message ?? 'Não foi possível enviar o pré-cadastro.');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: cpfAuthEmail(input.cpf), password: input.dataNascimento });
    if (signInError) throw new Error('Pré-cadastro recebido, mas não foi possível abrir sua sessão. Entre com CPF e data de nascimento.');
    const remote = await refreshFromSupabase();
    const existing = remote.candidatos.find((candidate) => candidate.id === String(data.candidateId));
    if (existing) return existing;
    const now = new Date().toISOString();
    const novo: Candidato = {
      ...input,
      id: String(data.candidateId),
      protocolo: String(data.protocolo ?? ''),
      status: 'novo',
      origem: input.origem ?? 'Site',
      agendaEditavel: false,
      criadoEm: now,
      atualizadoEm: now,
      notas: [],
      documentos: DOCUMENTOS_PADRAO.map((doc) => ({ ...doc })),
      tags: [],
    };
    setState((prev) => ({ ...prev, candidatos: [novo, ...prev.candidatos] }));
    return novo;
  }, [refreshFromSupabase]);

  const updateCandidateDocuments = useCallback(async (id: string, documentos: Documento[]) => {
    const { error } = await supabase.rpc('update_candidate_documents', { p_candidate_id: id, p_documents: documentos });
    if (error) throw error;
    setState((prev) => ({ ...prev, candidatos: prev.candidatos.map((candidate) => candidate.id === id ? { ...candidate, documentos } : candidate) }));
  }, []);

  const updateStatus = useCallback((id: string, status: CandidatoStatus) => {
    setState((prev) => ({
      ...prev,
      candidatos: prev.candidatos.map((c) =>
        c.id === id ? { ...c, status, atualizadoEm: new Date().toISOString() } : c,
      ),
    }));
  }, []);

  const updateCandidato = useCallback((id: string, patch: Partial<Candidato>) => {
    setState((prev) => ({
      ...prev,
      candidatos: prev.candidatos.map((c) =>
        c.id === id ? { ...c, ...patch, atualizadoEm: new Date().toISOString() } : c,
      ),
    }));
  }, []);

  const solicitarAtualizacaoCandidato = useCallback((id: string, dados: DadosPerfilCandidato) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const current = prev.candidatos.find((candidate) => candidate.id === id);
      if (!current) return prev;
      const changes = Object.fromEntries(Object.entries(dados).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify((current as unknown as Record<string, unknown>)[key]))) as DadosPerfilCandidato;
      const requestData = Object.keys(changes).length ? changes : dados;
      return {
        ...prev,
        candidatos: prev.candidatos.map((candidate) => candidate.id === id
          ? { ...candidate, solicitacaoAtualizacao: { dados: requestData, solicitadaEm: now } }
          : candidate),
      };
    });
  }, []);

  const aprovarAtualizacaoCandidato = useCallback(async (id: string) => {
    try {
      requireSupabase();
      const { error } = await supabase.rpc('review_candidate_update', { p_candidate_id: id, p_approved: true });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível aprovar a solicitação.');
    }
  }, [refreshFromSupabase]);

  const recusarAtualizacaoCandidato = useCallback(async (id: string) => {
    try {
      requireSupabase();
      const { error } = await supabase.rpc('review_candidate_update', { p_candidate_id: id, p_approved: false });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível recusar a solicitação.');
    }
  }, [refreshFromSupabase]);

  const updateDocumento = useCallback((id: string, nome: string, status: Documento['status']) => {
    setState((prev) => ({
      ...prev,
      candidatos: prev.candidatos.map((c) =>
        c.id === id
          ? {
              ...c,
              atualizadoEm: new Date().toISOString(),
              documentos: c.documentos.map((doc) => (doc.nome === nome ? { ...doc, status } : doc)),
            }
          : c,
      ),
    }));
  }, []);

  const addNota = useCallback((id: string, texto: string) => {
    const nota: Nota = {
      id: `nota-${uid()}`,
      autor: 'Você',
      texto,
      em: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      candidatos: prev.candidatos.map((c) =>
        c.id === id ? { ...c, notas: [nota, ...c.notas], atualizadoEm: new Date().toISOString() } : c,
      ),
    }));
  }, []);

  const criarSolicitacao = useCallback((input: Omit<SolicitacaoProfissional, 'id' | 'status' | 'criadaEm' | 'respondidaEm'>) => {
    const solicitacao: SolicitacaoProfissional = {
      ...input,
      id: `sol-${uid()}`,
      status: 'pendente',
      criadaEm: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, solicitacoes: [solicitacao, ...prev.solicitacoes] }));
  }, []);

  const resolverSolicitacao = useCallback(async (id: string, status: Exclude<StatusSolicitacao, 'pendente'>) => {
    try {
      requireSupabase();
      const { error } = await supabase.rpc('resolve_solicitation', { p_ticket_id: id, p_outcome: status, p_resposta_equipe: null });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível atualizar a solicitação.');
    }
  }, [refreshFromSupabase]);

  const responderSolicitacao = useCallback(async (id: string, respostaEquipe: string) => {
    try {
      requireSupabase();
      const { error } = await supabase.rpc('resolve_solicitation', { p_ticket_id: id, p_outcome: 'atendida', p_resposta_equipe: respostaEquipe.trim() });
      if (error) throw error;
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível responder à solicitação.');
    }
  }, [refreshFromSupabase]);

  const updateHomeContent = useCallback((homeContent: HomeContent) => {
    setState((prev) => ({ ...prev, homeContent }));
  }, []);

  const resetHomeContent = useCallback(() => {
    setState((prev) => ({ ...prev, homeContent: DEFAULT_HOME_CONTENT }));
  }, []);

  const addTrainingFlowStage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      trainingFlow: [...prev.trainingFlow, {
        id: `fluxo-${uid()}`,
        title: 'Nova etapa',
        description: '',
        owner: '',
        timing: '',
        checklist: [],
      }],
    }));
  }, []);

  const updateTrainingFlowStage = useCallback((id: string, patch: Partial<TrainingFlowStage>) => {
    setState((prev) => ({ ...prev, trainingFlow: prev.trainingFlow.map((stage) => stage.id === id ? { ...stage, ...patch } : stage) }));
  }, []);

  const removeTrainingFlowStage = useCallback((id: string) => {
    setState((prev) => ({ ...prev, trainingFlow: prev.trainingFlow.filter((stage) => stage.id !== id) }));
  }, []);

  const moveTrainingFlowStage = useCallback((id: string, direction: -1 | 1) => {
    setState((prev) => {
      const index = prev.trainingFlow.findIndex((stage) => stage.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.trainingFlow.length) return prev;
      const trainingFlow = [...prev.trainingFlow];
      [trainingFlow[index], trainingFlow[nextIndex]] = [trainingFlow[nextIndex], trainingFlow[index]];
      return { ...prev, trainingFlow };
    });
  }, []);

  const resetTrainingFlow = useCallback(() => {
    setState((prev) => ({ ...prev, trainingFlow: DEFAULT_TRAINING_FLOW }));
  }, []);

  const createTeamAccount = useCallback(async (account: Omit<TeamAccount, 'id' | 'criadoEm' | 'ativo'> & { senha: string }) => {
    try {
      requireSupabase();
      const email = account.email.trim().toLowerCase();
      const permissions = Object.fromEntries(TEAM_PERMISSION_KEYS.map((key) => [key, account.permissoes.includes(key)]));
      const { data, error } = await supabase.functions.invoke('team-users', {
        body: { action: 'create', user: { role: 'equipe', nome: account.nome, email, password: account.senha, permissions } },
      });
      if (error || data?.error || !data?.user) return { ok: false, error: data?.error ?? error?.message ?? 'Não foi possível criar a conta.' };
      await refreshFromSupabase();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível criar a conta.' };
    }
  }, [refreshFromSupabase]);

  const updateTeamAccount = useCallback(async (id: string, patch: Partial<Pick<TeamAccount, 'nome' | 'email' | 'permissoes' | 'ativo'>>) => {
    try {
      requireSupabase();
      const existing = stateRef.current.teamAccounts.find((account) => account.id === id);
      if (!existing) throw new Error('Conta da equipe não encontrada.');
      const updated = { ...existing, ...patch, email: patch.email?.trim().toLowerCase() ?? existing.email };
      const permissions = Object.fromEntries(TEAM_PERMISSION_KEYS.map((key) => [key, updated.permissoes.includes(key)]));
      const { data, error } = await supabase.functions.invoke('team-users', {
        body: { action: 'update', id, user: { role: 'equipe', nome: updated.nome, email: updated.email, active: updated.ativo, permissions } },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Não foi possível atualizar a conta.');
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível atualizar a conta.');
    }
  }, [refreshFromSupabase]);

  const deleteTeamAccount = useCallback(async (id: string) => {
    try {
      requireSupabase();
      const { data, error } = await supabase.functions.invoke('team-users', { body: { action: 'delete', id } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Não foi possível remover a conta.');
      await refreshFromSupabase();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível remover a conta.');
    }
  }, [refreshFromSupabase]);

  const changeOwnPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state.user || state.user.role === 'profissional') return { ok: false, error: 'A alteração de senha está disponível para contas da equipe.' };
    if (newPassword.length < 12) return { ok: false, error: 'A nova senha precisa ter pelo menos 12 caracteres.' };
    try {
      requireSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) return { ok: false, error: 'Não foi possível validar sua sessão.' };
      const { error: currentError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (currentError) return { ok: false, error: 'A senha atual não confere.' };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível alterar a senha.' };
    }
  }, [state.user]);

  const removeCandidato = useCallback((id: string) => {
    setState((prev) => ({ ...prev, candidatos: prev.candidatos.filter((c) => c.id !== id) }));
  }, []);

  const login = useCallback(async (identificador: string, senha: string, tipo: 'profissional' | 'admin' = 'profissional') => {
    try {
      requireSupabase();
      const email = tipo === 'profissional' ? cpfAuthEmail(identificador) : identificador.trim().toLowerCase();
      const password = tipo === 'profissional' && /^\d{2}\/\d{2}\/\d{4}$/.test(senha)
        ? `${senha.slice(6, 10)}-${senha.slice(3, 5)}-${senha.slice(0, 2)}`
        : senha;
      if (tipo === 'profissional' && !/^\d{4}-\d{2}-\d{2}$/.test(password)) return { ok: false, error: 'Informe a data de nascimento no formato correto.' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: tipo === 'profissional' ? 'CPF ou data de nascimento não conferem com o pré-cadastro.' : 'Confira o e-mail e a senha.' };
      const remote = await refreshFromSupabase();
      if (!remote.user || (tipo === 'profissional' && remote.user.role !== 'profissional') || (tipo === 'admin' && remote.user.role === 'profissional')) {
        await supabase.auth.signOut();
        await refreshFromSupabase();
        return { ok: false, error: 'Esta conta não possui acesso a esta área.' };
      }
      return { ok: true, user: remote.user };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível entrar.' };
    }
  }, [refreshFromSupabase]);

  const logout = useCallback(async () => {
    if (SUPABASE_CONFIGURED) await supabase.auth.signOut();
    const next = loadState();
    next.homeContent = stateRef.current.homeContent;
    baseline.current = next;
    setState(next);
    setSyncError('');
  }, []);

  const getCandidato = useCallback(
    (id: string) => state.candidatos.find((c) => c.id === id),
    [state.candidatos],
  );

  /* ------------------------------- Treinamentos ------------------------------ */

  const salvarProgresso = useCallback((candidatoId: string, aulaId: string, input: ProgressoInput) => {
    setState((prev) => {
      const atual = prev.progresso[candidatoId]?.[aulaId];
      const concluida = input.concluida ?? atual?.concluida ?? false;
      const registro = {
        aulaId,
        segundos: input.segundos,
        percentual: input.percentual,
        concluida,
        atualizadoEm: new Date().toISOString(),
      };
      return {
        ...prev,
        progresso: {
          ...prev.progresso,
          [candidatoId]: { ...(prev.progresso[candidatoId] ?? {}), [aulaId]: registro },
        },
      };
    });
  }, []);

  const concluirAula = useCallback((candidatoId: string, aulaId: string) => {
    setState((prev) => {
      const atual = prev.progresso[candidatoId]?.[aulaId];
      return {
        ...prev,
        progresso: {
          ...prev.progresso,
          [candidatoId]: {
            ...(prev.progresso[candidatoId] ?? {}),
            [aulaId]: {
              aulaId,
              segundos: atual?.segundos ?? 0,
              percentual: 100,
              concluida: true,
              atualizadoEm: new Date().toISOString(),
            },
          },
        },
      };
    });
  }, []);

  const resetarProgresso = useCallback((candidatoId: string) => {
    setState((prev) => {
      const next = { ...prev.progresso };
      delete next[candidatoId];
      return { ...prev, progresso: next };
    });
  }, []);

  const updateTrilha = useCallback((trilhaId: string, patch: Partial<Omit<Trilha, 'aulas'>>) => {
    setState((prev) => ({
      ...prev,
      trilhas: prev.trilhas.map((trilha) => (trilha.id === trilhaId ? { ...trilha, ...patch } : trilha)),
    }));
  }, []);

  const updateAula = useCallback((trilhaId: string, aulaId: string, patch: Partial<Aula>) => {
    setState((prev) => ({
      ...prev,
      trilhas: prev.trilhas.map((trilha) =>
        trilha.id === trilhaId
          ? { ...trilha, aulas: trilha.aulas.map((aula) => (aula.id === aulaId ? { ...aula, ...patch } : aula)) }
          : trilha,
      ),
    }));
  }, []);

  const addAula = useCallback((trilhaId: string) => {
    setState((prev) => ({
      ...prev,
      trilhas: prev.trilhas.map((trilha) =>
        trilha.id === trilhaId
          ? {
              ...trilha,
              aulas: [
                ...trilha.aulas,
                {
                  id: `aula-${uid()}`,
                  titulo: 'Nova aula',
                  descricao: 'Descreva o objetivo desta aula.',
                  videoUrl: '',
                  duracaoMin: 10,
                },
              ],
            }
          : trilha,
      ),
    }));
  }, []);

  const removeAula = useCallback((trilhaId: string, aulaId: string) => {
    setState((prev) => ({
      ...prev,
      trilhas: prev.trilhas.map((trilha) =>
        trilha.id === trilhaId ? { ...trilha, aulas: trilha.aulas.filter((aula) => aula.id !== aulaId) } : trilha,
      ),
    }));
  }, []);

  const moverAula = useCallback((trilhaId: string, aulaId: string, direcao: -1 | 1) => {
    setState((prev) => ({
      ...prev,
      trilhas: prev.trilhas.map((trilha) => {
        if (trilha.id !== trilhaId) return trilha;
        const index = trilha.aulas.findIndex((aula) => aula.id === aulaId);
        const destino = index + direcao;
        if (index < 0 || destino < 0 || destino >= trilha.aulas.length) return trilha;
        const aulas = [...trilha.aulas];
        [aulas[index], aulas[destino]] = [aulas[destino], aulas[index]];
        return { ...trilha, aulas };
      }),
    }));
  }, []);

  const addTrilha = useCallback(() => {
    const id = `trilha-${uid()}`;
    setState((prev) => ({
      ...prev,
      trilhas: [
        ...prev.trilhas,
        {
          id,
          titulo: 'Nova trilha',
          descricao: 'Descreva para quem esta trilha é indicada.',
          obrigatoria: false,
          ordem: prev.trilhas.reduce((max, trilha) => Math.max(max, trilha.ordem), 0) + 1,
          aulas: [],
        },
      ],
    }));
    return id;
  }, []);

  const removeTrilha = useCallback((trilhaId: string) => {
    setState((prev) => {
      const removida = prev.trilhas.find((trilha) => trilha.id === trilhaId);
      if (!removida) return prev;
      const aulaIds = new Set(removida.aulas.map((aula) => aula.id));
      const progresso = Object.fromEntries(
        Object.entries(prev.progresso).map(([candidatoId, aulas]) => [
          candidatoId,
          Object.fromEntries(Object.entries(aulas).filter(([aulaId]) => !aulaIds.has(aulaId))),
        ]),
      );
      return {
        ...prev,
        trilhas: prev.trilhas.filter((trilha) => trilha.id !== trilhaId),
        progresso,
      };
    });
  }, []);

  const updatePipelineStage = useCallback((status: CandidatoStatus, patch: Partial<PipelineStage>) => {
    setState((prev) => ({
      ...prev,
      pipelineStages: prev.pipelineStages.map((stage) => (stage.status === status ? { ...stage, ...patch } : stage)),
    }));
  }, []);

  const moverPipelineStage = useCallback((status: CandidatoStatus, direcao: -1 | 1) => {
    setState((prev) => {
      const active = [...prev.pipelineStages].filter((stage) => stage.enabled).sort((a, b) => a.order - b.order);
      const from = active.findIndex((stage) => stage.status === status);
      const to = from + direcao;
      if (from < 0 || to < 0 || to >= active.length) return prev;
      const current = active[from];
      const adjacent = active[to];
      return {
        ...prev,
        pipelineStages: prev.pipelineStages.map((stage) =>
          stage.status === current.status ? { ...stage, order: adjacent.order }
            : stage.status === adjacent.status ? { ...stage, order: current.order }
            : stage,
        ),
      };
    });
  }, []);

  const desativarPipelineStage = useCallback((status: CandidatoStatus, destino: CandidatoStatus) => {
    setState((prev) => ({
      ...prev,
      pipelineStages: prev.pipelineStages.map((stage) => stage.status === status ? { ...stage, enabled: false } : stage),
      candidatos: prev.candidatos.map((candidate) => candidate.status === status
        ? { ...candidate, status: destino, atualizadoEm: new Date().toISOString() }
        : candidate),
    }));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      loading,
      syncError,
      addCandidato,
      updateCandidateDocuments,
      updateStatus,
      updateCandidato,
      solicitarAtualizacaoCandidato,
      aprovarAtualizacaoCandidato,
      recusarAtualizacaoCandidato,
      updateDocumento,
      addNota,
      criarSolicitacao,
      responderSolicitacao,
      resolverSolicitacao,
      updateHomeContent,
      resetHomeContent,
      addTrainingFlowStage,
      updateTrainingFlowStage,
      removeTrainingFlowStage,
      moveTrainingFlowStage,
      resetTrainingFlow,
      createTeamAccount,
      updateTeamAccount,
      deleteTeamAccount,
      changeOwnPassword,
      removeCandidato,
      login,
      logout,
      getCandidato,
      salvarProgresso,
      concluirAula,
      resetarProgresso,
      updateTrilha,
      updateAula,
      addAula,
      removeAula,
      moverAula,
      addTrilha,
      removeTrilha,
      updatePipelineStage,
      moverPipelineStage,
      desativarPipelineStage,
    }),
    [
      state,
      loading,
      syncError,
      addCandidato,
      updateCandidateDocuments,
      updateStatus,
      updateCandidato,
      solicitarAtualizacaoCandidato,
      aprovarAtualizacaoCandidato,
      recusarAtualizacaoCandidato,
      updateDocumento,
      addNota,
      criarSolicitacao,
      responderSolicitacao,
      resolverSolicitacao,
      updateHomeContent,
      resetHomeContent,
      addTrainingFlowStage,
      updateTrainingFlowStage,
      removeTrainingFlowStage,
      moveTrainingFlowStage,
      resetTrainingFlow,
      createTeamAccount,
      updateTeamAccount,
      deleteTeamAccount,
      changeOwnPassword,
      removeCandidato,
      login,
      logout,
      getCandidato,
      salvarProgresso,
      concluirAula,
      resetarProgresso,
      updateTrilha,
      updateAula,
      addAula,
      removeAula,
      moverAula,
      addTrilha,
      removeTrilha,
      updatePipelineStage,
      moverPipelineStage,
      desativarPipelineStage,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>');
  return ctx;
}
