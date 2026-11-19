export type CandidatoStatus =
  | 'novo'
  | 'triagem'
  | 'entrevista'
  | 'documentacao'
  | 'aprovado'
  | 'ativo'
  | 'reprovado';

export interface PipelineStage {
  status: CandidatoStatus;
  label: string;
  enabled: boolean;
  order: number;
}

export const PIPELINE_DEFAULTS: PipelineStage[] = [
  { status: 'novo', label: 'Novo', enabled: true, order: 0 },
  { status: 'triagem', label: 'Triagem', enabled: true, order: 1 },
  { status: 'entrevista', label: 'Entrevista', enabled: true, order: 2 },
  { status: 'documentacao', label: 'Documentação', enabled: true, order: 3 },
  { status: 'aprovado', label: 'Aprovado', enabled: true, order: 4 },
  { status: 'ativo', label: 'Ativo', enabled: true, order: 5 },
  { status: 'reprovado', label: 'Não aprovado', enabled: true, order: 6 },
];

export type DocumentoStatus = 'pendente' | 'enviado' | 'validado';

export interface Documento {
  nome: string;
  status: DocumentoStatus;
  arquivoId?: string;
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoTamanho?: number;
  enviadoEm?: string;
}

export interface Nota {
  id: string;
  autor: string;
  texto: string;
  em: string;
}

export interface AgendaSlot {
  dia: string;
  inicio: string;
  fim: string;
}

export const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const ABORDAGENS = [
  'Análise do Comportamento Aplicada',
  'Psicofarmacologia',
  'Psicologia Analítica',
  'Psiquiatria clínica',
  'Terapia Cognitivo-Comportamental',
  'Terapia de Casal e Família',
  'Terapia do Esquema',
  'Terapia Existencial',
  'Terapia Sistêmica',
  'Outra',
];

export interface Candidato {
  id: string;
  protocolo: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  profissao: 'Psicólogo' | 'Psiquiatra';
  registro: string;
  especialidades: string[];
  abordagem: string;
  experienciaAnos: number | null;
  modalidade?: 'Online' | 'Presencial' | 'Híbrido';
  turnos?: string[];
  valorSessao?: number;
  agenda?: AgendaSlot[];
  observacoesAgenda?: string;
  agendaEditavel?: boolean;
  status: CandidatoStatus;
  origem: string;
  criadoEm: string;
  atualizadoEm: string;
  notas: Nota[];
  documentos: Documento[];
  tags: string[];
  lgpd: boolean;
  bio?: string;
  cpf?: string;
  rg?: string;
  sexo?: string;
  dataNascimento?: string;
  emailTeams?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  chavePix?: string;
  solicitacaoAtualizacao?: SolicitacaoAtualizacao;
}

export type DadosPerfilCandidato = Pick<
  Candidato,
  | 'nome'
  | 'cpf'
  | 'rg'
  | 'sexo'
  | 'dataNascimento'
  | 'email'
  | 'emailTeams'
  | 'telefone'
  | 'cep'
  | 'endereco'
  | 'numero'
  | 'chavePix'
  | 'cidade'
  | 'uf'
  | 'profissao'
  | 'registro'
  | 'especialidades'
  | 'abordagem'
  | 'experienciaAnos'
  | 'bio'
> & { agenda: AgendaSlot[]; observacoesAgenda: string };

export interface SolicitacaoAtualizacao {
  dados: DadosPerfilCandidato;
  solicitadaEm: string;
}

export type TipoSolicitacao = 'agenda' | 'mensagem';
export type StatusSolicitacao = 'pendente' | 'atendida' | 'recusada';

export interface SolicitacaoProfissional {
  id: string;
  candidatoId: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  mensagem: string;
  respostaEquipe?: string;
  agenda?: AgendaSlot[];
  observacoesAgenda?: string;
  criadaEm: string;
  respondidaEm?: string;
}

export const TEAM_PERMISSION_KEYS = [
  'dashboard',
  'candidatos',
  'solicitacoes',
  'pipeline',
  'treinamentos',
  'fluxo-treinamento',
  'conteudo-home',
  'ajustes',
  'usuarios',
] as const;

export type TeamPermission = (typeof TEAM_PERMISSION_KEYS)[number];

export interface TeamAccount {
  id: string;
  nome: string;
  email: string;
  permissoes: TeamPermission[];
  ativo: boolean;
  criadoEm: string;
}

export interface SessionUser {
  id?: string;
  nome: string;
  email: string;
  role: 'admin' | 'equipe' | 'profissional';
  candidatoId?: string;
  teamUserId?: string;
  permissoes?: TeamPermission[];
}

export const STATUS_ORDER: CandidatoStatus[] = [
  'novo',
  'triagem',
  'entrevista',
  'documentacao',
  'aprovado',
  'ativo',
  'reprovado',
];

export const STATUS_META: Record<
  CandidatoStatus,
  { label: string; description: string; badge: string; dot: string; column: string }
> = {
  novo: {
    label: 'Novo',
    description: 'Cadastro recebido, ainda sem contato',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    column: 'border-t-sky-400',
  },
  triagem: {
    label: 'Triagem',
    description: 'Currículo em análise pelo time',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    column: 'border-t-indigo-400',
  },
  entrevista: {
    label: 'Entrevista',
    description: 'Conversa agendada ou realizada',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    column: 'border-t-amber-400',
  },
  documentacao: {
    label: 'Documentação',
    description: 'Aguardando ou validando documentos',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    column: 'border-t-orange-400',
  },
  aprovado: {
    label: 'Aprovado',
    description: 'Aprovado, aguardando primeiros pacientes',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    column: 'border-t-teal-400',
  },
  ativo: {
    label: 'Ativo',
    description: 'Atendendo pacientes na plataforma',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    column: 'border-t-emerald-500',
  },
  reprovado: {
    label: 'Não aprovado',
    description: 'Fora do perfil neste momento',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    column: 'border-t-rose-400',
  },
};

export const ESPECIALIDADES = [
  'Ansiedade',
  'Depressão',
  'Terapia de Casal',
  'Infantojuvenil',
  'TDAH',
  'TEA',
  'Luto',
  'Burnout',
  'Transtornos Alimentares',
  'Dependência Química',
  'Sexualidade',
  'Gerontologia',
];

export const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Fins de semana'];

export const ORIGENS = ['Instagram', 'Indicação', 'Google', 'LinkedIn', 'Site', 'Evento'];

export const DOCUMENTOS_PADRAO: Documento[] = [
  { nome: 'Registro profissional (CRP/CRM)', status: 'pendente' },
  { nome: 'Diploma de graduação', status: 'pendente' },
  { nome: 'Comprovante de residência', status: 'pendente' },
  { nome: 'Documento de identidade (RG/CNH)', status: 'pendente' },
  { nome: 'Certificado de especialização', status: 'pendente' },
];

/* ------------------------------ Treinamentos ------------------------------ */

export interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  /** URL do vídeo: arquivo .mp4 direto, YouTube ou Vimeo. Vazio = aguardando envio. */
  videoUrl: string;
  duracaoMin: number;
  materialUrl?: string;
}

export interface Trilha {
  id: string;
  titulo: string;
  descricao: string;
  obrigatoria: boolean;
  ordem: number;
  aulas: Aula[];
}

export interface ProgressoAula {
  aulaId: string;
  segundos: number;
  percentual: number;
  concluida: boolean;
  atualizadoEm: string;
}

/** aulaId -> progresso */
export type ProgressoCandidato = Record<string, ProgressoAula>;

/** candidatoId -> progresso */
export type ProgressoMap = Record<string, ProgressoCandidato>;
