import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleCheck,
  ClipboardList,
  FileText,
  Loader2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/badge';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { AgendaGrade } from '@/components/AgendaGrade';
import { useStore } from '@/lib/store';
import { deleteDocumentFile } from '@/lib/document-storage';
import { uploadCandidateDocument } from '@/lib/supabase';
import { ABORDAGENS, DOCUMENTOS_PADRAO, ESPECIALIDADES, type AgendaSlot, type Candidato, type Documento } from '@/lib/types';
import { cn } from '@/lib/utils';
import { normalizeRegistrationFields } from '@/lib/registration-fields';

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const FIELD_STEP_BY_KEY: Record<string, number> = {
  nome: 0, cpf: 0, rg: 0, sexo: 0, dataNascimento: 0, email: 0, emailTeams: 0,
  telefone: 0, cep: 0, endereco: 0, numero: 0, cidade: 0, uf: 0, chavePix: 0,
  profissao: 1, registro: 1, experienciaAnos: 1, abordagem: 1, especialidades: 1, bio: 1,
  agenda: 3, lgpd: 4,
};

function getFieldErrors(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') return {};
  const value = (error as { fieldErrors?: unknown }).fieldErrors;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

const ETAPAS = [
  { titulo: 'Dados pessoais', descricao: 'Como podemos falar com você', icon: UserRound },
  { titulo: 'Formação', descricao: 'Registro e especialidades', icon: BadgeCheck },
  { titulo: 'Documentação', descricao: 'Anexe seus documentos', icon: FileText },
  { titulo: 'Minha agenda', descricao: 'Dias e horários disponíveis', icon: CalendarClock },
  { titulo: 'Revisão', descricao: 'Confira antes de enviar', icon: ClipboardList },
];

interface FormState {
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
  experienciaAnos: string;
  abordagem: string[];
  especialidades: string[];
  bio: string;
  agenda: AgendaSlot[];
  observacoesAgenda: string;
  lgpd: boolean;
}

const initialState: FormState = {
  nome: '',
  cpf: '',
  rg: '',
  sexo: '',
  dataNascimento: '',
  email: '',
  emailTeams: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  chavePix: '',
  cidade: '',
  uf: '',
  profissao: 'Psicólogo',
  registro: '',
  experienciaAnos: '',
  abordagem: [],
  especialidades: [],
  bio: '',
  agenda: [],
  observacoesAgenda: '',
  lgpd: false,
};

function formFromCandidate(candidate: Candidato): FormState {
  const saved = candidate.solicitacaoAtualizacao?.dados ?? candidate;
  return {
    nome: saved.nome ?? '',
    cpf: saved.cpf ?? '',
    rg: saved.rg ?? '',
    sexo: saved.sexo ?? '',
    dataNascimento: saved.dataNascimento ?? '',
    email: saved.email ?? '',
    emailTeams: saved.emailTeams ?? '',
    telefone: saved.telefone ?? '',
    cep: saved.cep ?? '',
    endereco: saved.endereco ?? '',
    numero: saved.numero ?? '',
    chavePix: saved.chavePix ?? '',
    cidade: saved.cidade ?? '',
    uf: saved.uf ?? '',
    profissao: saved.profissao,
    registro: saved.registro ?? '',
    experienciaAnos: String(saved.experienciaAnos ?? ''),
    abordagem: (saved.abordagem ?? '').split(' · ').filter(Boolean),
    especialidades: saved.especialidades ?? [],
    bio: saved.bio ?? '',
    agenda: saved.agenda ?? [],
    observacoesAgenda: saved.observacoesAgenda ?? '',
    lgpd: candidate.lgpd,
  };
}

function maskCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCep(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function validCpf(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export default function Cadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreCadastro = location.pathname === '/pre-cadastro';
  const { addCandidato, candidatos, user, homeContent, solicitarAtualizacaoCandidato, updateCandidateDocuments } = useStore();
  const requiredFields = useMemo(
    () => normalizeRegistrationFields(homeContent.registrationFields),
    [homeContent.registrationFields],
  );
  const candidatoAtual = !isPreCadastro && user?.role === 'profissional'
    ? candidatos.find((item) => item.id === user.candidatoId)
    : undefined;
  const isUpdate = Boolean(candidatoAtual);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => candidatoAtual ? formFromCandidate(candidatoAtual) : initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [confirmacaoAtualizacao, setConfirmacaoAtualizacao] = useState(false);
  const [arquivos, setArquivos] = useState<Record<string, File>>({});
  const [erroUpload, setErroUpload] = useState('');
  const [registeredCandidateId, setRegisteredCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (candidatoAtual) setForm(formFromCandidate(candidatoAtual));
  }, [candidatoAtual?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setErroUpload('');
  };

  const toggleArray = (key: 'abordagem' | 'especialidades', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setErroUpload('');
  };

  const selecionarArquivo = (nomeDocumento: string, arquivo?: File): boolean => {
    if (!arquivo) return true;
    if (arquivo.size > MAX_DOCUMENT_SIZE) {
      removerArquivoSelecionado(nomeDocumento);
      setErroUpload('Cada documento pode ter no máximo 10 MB.');
      return false;
    }
    if (!/\.(pdf|jpe?g|png)$/i.test(arquivo.name)) {
      removerArquivoSelecionado(nomeDocumento);
      setErroUpload('Envie os documentos em PDF, JPG ou PNG.');
      return false;
    }
    setArquivos((anteriores) => ({ ...anteriores, [nomeDocumento]: arquivo }));
    setErroUpload('');
    return true;
  };

  const removerArquivoSelecionado = (nomeDocumento: string) => {
    setArquivos((anteriores) => {
      const novos = { ...anteriores };
      delete novos[nomeDocumento];
      return novos;
    });
    setErroUpload('');
  };

  const progress = useMemo(() => ((step + 1) / ETAPAS.length) * 100, [step]);
  const approachOptions = Array.from(new Set([
    ...ABORDAGENS,
    ...form.abordagem.filter((item) => !ABORDAGENS.includes(item)),
  ]));

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    setErrors((prev) => ({ ...prev, cep: '' }));
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('Falha na consulta');
      const data = await response.json();
      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: 'CEP não encontrado. Confira o número e tente novamente.' }));
      } else {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
        }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, cep: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.' }));
    } finally {
      setBuscandoCep(false);
    }
  };

  const validate = (current: number) => {
    const next: Record<string, string> = {};
    if (current === 0) {
      if (form.nome.trim().length < 5) next.nome = 'Informe seu nome completo.';
      if ((!isUpdate || form.cpf !== candidatoAtual?.cpf) && !validCpf(form.cpf)) next.cpf = 'Informe um CPF válido.';
      if ((requiredFields.rg || form.rg.trim()) && form.rg.trim().length < 5) next.rg = 'Informe um RG válido.';
      const sexOptions = ['Feminino', 'Masculino', 'Não binário', 'Prefiro não informar'];
      if ((requiredFields.sexo && !form.sexo) || (form.sexo && !sexOptions.includes(form.sexo))) next.sexo = 'Selecione uma opção válida.';
      if (!form.dataNascimento || new Date(form.dataNascimento) >= new Date()) next.dataNascimento = 'Informe uma data de nascimento válida.';
      if ((requiredFields.email || form.email.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
      if ((requiredFields.emailTeams || form.emailTeams.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailTeams)) next.emailTeams = 'Informe um e-mail válido para o Teams.';
      const phoneDigits = form.telefone.replace(/\D/g, '').length;
      if ((requiredFields.telefone || form.telefone.trim()) && (phoneDigits < 10 || phoneDigits > 15)) next.telefone = 'Informe um telefone válido com DDD.';
      const cepDigits = form.cep.replace(/\D/g, '').length;
      if ((requiredFields.cep || form.cep.trim()) && cepDigits !== 8) next.cep = 'Informe um CEP válido.';
      if (requiredFields.endereco && !form.endereco.trim()) next.endereco = 'Informe o endereço.';
      if (requiredFields.numero && !form.numero.trim()) next.numero = 'Informe o número.';
      if (requiredFields.cidade && !form.cidade.trim()) next.cidade = 'Informe a cidade.';
      if ((requiredFields.uf && !form.uf) || (form.uf && !UFS.includes(form.uf))) next.uf = 'Selecione uma UF válida.';
      if ((requiredFields.chavePix || form.chavePix.trim()) && form.chavePix.trim().length < 3) next.chavePix = 'Informe uma chave Pix válida.';
    }
    if (current === 1) {
      const registrationLength = form.registro.trim().length;
      if ((requiredFields.registro || registrationLength > 0) && (registrationLength < 5 || registrationLength > 80)) next.registro = 'Informe um registro válido (CRP ou CRM).';
      const hasExperience = form.experienciaAnos.trim() !== '';
      const experience = Number(form.experienciaAnos);
      if ((requiredFields.experienciaAnos && !hasExperience) || (hasExperience && (!Number.isFinite(experience) || experience < 0 || experience > 80))) next.experienciaAnos = 'Informe um número válido de anos de experiência.';
      if (requiredFields.abordagem && form.abordagem.length === 0) next.abordagem = 'Selecione ao menos uma abordagem.';
      if (requiredFields.especialidades && form.especialidades.length === 0) next.especialidades = 'Selecione ao menos uma especialidade.';
      if (requiredFields.bio && !form.bio.trim()) next.bio = 'Informe seu resumo profissional.';
      if (form.bio.length > 2000) next.bio = 'O resumo deve ter no máximo 2.000 caracteres.';
    }
    if (current === 3) {
      if (requiredFields.agenda && form.agenda.length === 0) next.agenda = 'Adicione pelo menos um horário disponível.';
    }
    if (current === 4 && isUpdate && !confirmacaoAtualizacao) {
      next.confirmacaoAtualizacao = 'Confirme o envio para validação da equipe.';
    }
    if (current === 4 && !isUpdate && !form.lgpd) {
      next.lgpd = 'É necessário aceitar o tratamento de dados para continuar.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    if (step < ETAPAS.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validate(4)) return;
    setSubmitting(true);
    setErroUpload('');
    let candidatoCriadoId: string | null = registeredCandidateId;
    const arquivosSalvos: string[] = [];

    const dados = {
      nome: form.nome.trim(),
      cpf: form.cpf,
      rg: form.rg.trim(),
      sexo: form.sexo,
      dataNascimento: form.dataNascimento,
      email: form.email.trim().toLowerCase(),
      emailTeams: form.emailTeams.trim().toLowerCase(),
      telefone: form.telefone,
      cep: form.cep,
      endereco: form.endereco.trim(),
      numero: form.numero.trim(),
      chavePix: form.chavePix.trim(),
      cidade: form.cidade,
      uf: form.uf,
      profissao: form.profissao,
      registro: form.registro,
      especialidades: form.especialidades,
      abordagem: form.abordagem.join(' · ') || 'Não informada',
      experienciaAnos: form.experienciaAnos.trim() ? Number(form.experienciaAnos) : null,
      agenda: form.agenda,
      observacoesAgenda: form.observacoesAgenda,
      bio: form.bio.trim() || undefined,
    };

    try {
      let candidato: Candidato;
      if (isUpdate && candidatoAtual) {
        candidato = candidatoAtual;
      } else {
        const existente = registeredCandidateId ? candidatos.find((item) => item.id === registeredCandidateId) : undefined;
        if (existente) {
          candidato = existente;
        } else {
          candidato = await addCandidato({
            ...dados,
            origem: isPreCadastro ? 'Pré-cadastro' : 'Site',
            lgpd: form.lgpd,
          });
          candidatoCriadoId = candidato.id;
          setRegisteredCandidateId(candidato.id);
        }
      }

      const documentosAtualizados: Documento[] = [];
      for (const [index, documento] of candidato.documentos.entries()) {
        const arquivo = arquivos[documento.nome];
        if (!arquivo) {
          documentosAtualizados.push(documento);
          continue;
        }
        const arquivoId = await uploadCandidateDocument(candidato.id, `${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, arquivo);
        arquivosSalvos.push(arquivoId);
        documentosAtualizados.push({
          ...documento,
          status: 'enviado' as const,
          arquivoId,
          arquivoNome: arquivo.name,
          arquivoTipo: arquivo.type || 'application/octet-stream',
          arquivoTamanho: arquivo.size,
          enviadoEm: new Date().toISOString(),
        });
      }

      if (arquivosSalvos.length > 0) {
        await updateCandidateDocuments(candidato.id, documentosAtualizados);
        const documentosSubstituidos = candidato.documentos
          .map((documento) => arquivos[documento.nome] ? documento.arquivoId : undefined)
          .filter((id): id is string => Boolean(id));
        await Promise.allSettled(documentosSubstituidos.map((id) => deleteDocumentFile(id)));
      }

      if (isUpdate && candidatoAtual) {
        solicitarAtualizacaoCandidato(candidatoAtual.id, dados);
      }
      setProtocolo(candidato.protocolo);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      await Promise.allSettled(arquivosSalvos.map((id) => deleteDocumentFile(id)));
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setErroUpload('Confira os campos destacados. Seus anexos continuam selecionados para uma nova tentativa.');
        setStep(Math.min(...Object.keys(fieldErrors).map((field) => FIELD_STEP_BY_KEY[field] ?? 2)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErroUpload(isUpdate
          ? 'Não foi possível salvar os anexos. Tente novamente; nenhuma solicitação de alteração foi enviada.'
          : candidatoCriadoId
            ? 'Seu pré-cadastro foi recebido, mas não foi possível concluir o envio dos documentos. Revise os arquivos e tente novamente; o sistema continuará o mesmo protocolo.'
            : error instanceof Error ? error.message : 'Não foi possível enviar o pré-cadastro. Tente novamente.');
        setStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (protocolo) {
    return (
      <div className="container flex min-h-[70vh] max-w-xl flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <CircleCheck className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">
          {isUpdate ? 'Solicitação de atualização enviada' : isPreCadastro ? 'Pré-cadastro enviado!' : 'Cadastro enviado!'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isUpdate
            ? 'Recebemos sua solicitação. Os dados atuais continuam valendo até a equipe revisar e aprovar as alterações.'
            : 'Recebemos suas informações. Nosso time vai analisar seu perfil e entrar em contato em até 3 dias úteis.'}
        </p>
        <div className="mt-6 w-full rounded-lg border bg-card p-5 text-left">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{isUpdate ? 'Protocolo do cadastro' : 'Seu protocolo'}</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{protocolo}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {isUpdate
              ? 'Acompanhe a análise da solicitação no painel do profissional.'
              : 'Guarde este número. Você também pode acompanhar o status no painel do profissional usando o e-mail informado.'}
          </p>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate(isUpdate || !isPreCadastro ? '/painel' : '/painel')}>{isUpdate ? 'Voltar ao meu painel' : 'Acessar meu painel'}</Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-12">
      <div className="mb-8 space-y-2">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="text-3xl font-bold">
          {isUpdate ? 'Solicitar atualização cadastral' : isPreCadastro ? 'Pré-cadastro de profissional' : 'Cadastro de profissional'}
        </h1>
        <p className="text-muted-foreground">
          {isUpdate
            ? 'Revise os dados e envie as alterações para validação. Seu perfil atual não muda até a equipe aprovar.'
            : 'Preencha as etapas abaixo. Leva cerca de 6 minutos e você pode voltar a qualquer momento.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Stepper */}
        <aside className="space-y-1">
          {ETAPAS.map((etapa, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <button
                key={etapa.titulo}
                onClick={() => index < step && setStep(index)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors',
                  active && 'bg-card shadow-soft',
                  index < step && 'cursor-pointer hover:bg-muted',
                  index > step && 'cursor-default opacity-60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                    done && 'border-secondary bg-secondary text-white',
                    active && 'border-primary bg-primary text-white',
                    !done && !active && 'border-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">{etapa.titulo}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {etapa.descricao}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* Formulário */}
        <Card className="border-border/70 shadow-soft">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Etapa {step + 1} de {ETAPAS.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            {erroUpload && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {erroUpload}
              </p>
            )}

            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2 animate-fade-in">
                <Field label="Nome completo" required error={errors.nome} className="sm:col-span-2">
                  <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Seu nome completo" />
                </Field>
                <Field label="CPF" required error={errors.cpf}>
                  <Input value={form.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
                </Field>
                <Field label="RG" required={requiredFields.rg} optional={!requiredFields.rg} error={errors.rg}>
                  <Input value={form.rg} onChange={(e) => set('rg', e.target.value)} placeholder="Número do RG" />
                </Field>
                <Field label="Sexo" required={requiredFields.sexo} optional={!requiredFields.sexo} error={errors.sexo}>
                  <Select value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Não binário">Não binário</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </Select>
                </Field>
                <Field label="Data de nascimento" required error={errors.dataNascimento}>
                  <Input type="date" value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
                </Field>
                <Field label="E-mail" required={requiredFields.email} optional={!requiredFields.email} error={errors.email}>
                  <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="voce@email.com" />
                </Field>
                <Field label="E-mail Microsoft Teams" required={requiredFields.emailTeams} optional={!requiredFields.emailTeams} error={errors.emailTeams}>
                  <Input type="email" value={form.emailTeams} onChange={(e) => set('emailTeams', e.target.value)} placeholder="voce@empresa.com" />
                </Field>
                <Field label="Telefone" required={requiredFields.telefone} optional={!requiredFields.telefone} error={errors.telefone}>
                  <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
                </Field>
                <Field label="CEP" required={requiredFields.cep} optional={!requiredFields.cep} error={errors.cep} hint={buscandoCep ? 'Consultando CEP…' : 'O endereço será preenchido após informar o CEP.'}>
                  <Input value={form.cep} onChange={(e) => set('cep', maskCep(e.target.value))} onBlur={buscarCep} placeholder="00000-000" inputMode="numeric" />
                </Field>
                <Field label="Endereço" required={requiredFields.endereco} optional={!requiredFields.endereco} error={errors.endereco} className="sm:col-span-2">
                  <Input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Preenchido automaticamente pelo CEP" />
                </Field>
                <Field label="Número" required={requiredFields.numero} optional={!requiredFields.numero} error={errors.numero}>
                  <Input value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Número e complemento" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cidade" required={requiredFields.cidade} optional={!requiredFields.cidade} error={errors.cidade}>
                    <Input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Cidade" />
                  </Field>
                  <Field label="UF" required={requiredFields.uf} optional={!requiredFields.uf} error={errors.uf}>
                    <Select value={form.uf} onChange={(e) => set('uf', e.target.value)}>
                      <option value="">Selecione</option>
                      {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Chave Pix" required={requiredFields.chavePix} optional={!requiredFields.chavePix} error={errors.chavePix} className="sm:col-span-2">
                  <Input value={form.chavePix} onChange={(e) => set('chavePix', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2 animate-fade-in">
                <Field label="Profissão" required error={errors.profissao}>
                  <Select
                    value={form.profissao}
                    onChange={(e) => set('profissao', e.target.value as FormState['profissao'])}
                  >
                    <option value="Psicólogo">Psicólogo(a)</option>
                    <option value="Psiquiatra">Psiquiatra</option>
                  </Select>
                </Field>
                <Field label="Registro profissional" required={requiredFields.registro} optional={!requiredFields.registro} error={errors.registro} hint="CRP para psicólogos, CRM para psiquiatras">
                  <Input
                    value={form.registro}
                    onChange={(e) => set('registro', e.target.value)}
                    placeholder="CRP 06/123456"
                  />
                </Field>
                <Field label="Anos de experiência clínica" required={requiredFields.experienciaAnos} optional={!requiredFields.experienciaAnos} error={errors.experienciaAnos}>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    value={form.experienciaAnos}
                    onChange={(e) => set('experienciaAnos', e.target.value)}
                    placeholder="5"
                  />
                </Field>
                <Field label="Abordagens clínicas" required={requiredFields.abordagem} optional={!requiredFields.abordagem} error={errors.abordagem} hint="Marque uma ou mais opções" className="sm:col-span-2">
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    {approachOptions.map((item) => (
                      <label key={item} className="flex cursor-pointer items-center gap-3 rounded-md border border-border/70 bg-card px-3 py-2.5 text-sm hover:border-secondary/50">
                        <input
                          type="checkbox"
                          checked={form.abordagem.includes(item)}
                          onChange={() => toggleArray('abordagem', item)}
                          className="h-4 w-4 accent-secondary"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Especialidades"
                  required={requiredFields.especialidades}
                  optional={!requiredFields.especialidades}
                  error={errors.especialidades}
                  hint="Selecione tudo com que você trabalha"
                  className="sm:col-span-2"
                >
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ESPECIALIDADES.map((esp) => {
                      const active = form.especialidades.includes(esp);
                      return (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => toggleArray('especialidades', esp)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            active
                              ? 'border-secondary bg-secondary text-white'
                              : 'border-input bg-card text-muted-foreground hover:border-secondary/50 hover:text-foreground',
                          )}
                        >
                          {esp}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Resumo profissional"
                  required={requiredFields.bio}
                  optional={!requiredFields.bio}
                  error={errors.bio}
                  hint="Aparece para o time de recrutamento"
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={form.bio}
                    onChange={(e) => set('bio', e.target.value)}
                    placeholder="Conte brevemente sua experiência e público que costuma atender."
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Anexe os documentos disponíveis para agilizar a análise. Os itens não enviados continuarão pendentes.
                </p>
                <div className="space-y-3">
                  {DOCUMENTOS_PADRAO.map((documento) => {
                    const arquivo = arquivos[documento.nome];
                    const existente = candidatoAtual?.documentos.find((item) => item.nome === documento.nome);
                    const idCampo = `documento-${documento.nome.replace(/[^a-z0-9]/gi, '-')}`;
                    return (
                      <div key={documento.nome} className="grid gap-3 rounded-md border border-border/70 bg-background p-4 sm:grid-cols-[1fr_1fr] sm:items-center">
                        <div>
                          <label htmlFor={idCampo} className="text-sm font-medium">{documento.nome}</label>
                          <p className="mt-1 text-xs text-muted-foreground">PDF, JPG ou PNG · máximo 10 MB</p>
                          {!arquivo && existente?.arquivoNome && (
                            <p className="mt-1 truncate text-xs text-emerald-700">Já enviado: {existente.arquivoNome}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Input
                            key={`${idCampo}-${Boolean(arquivo)}`}
                            id={idCampo}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            onChange={(e) => {
                              const selecionado = e.currentTarget.files?.[0];
                              if (selecionado && !selecionarArquivo(documento.nome, selecionado)) e.currentTarget.value = '';
                            }}
                          />
                          {arquivo && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-muted-foreground">Selecionado: {arquivo.name}</span>
                              <button
                                type="button"
                                className="shrink-0 font-medium text-destructive hover:underline"
                                onClick={() => removerArquivoSelecionado(documento.nome)}
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="rounded-md border border-border/70 bg-accent/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  Os anexos selecionados são enviados ao armazenamento privado do Supabase ao concluir o cadastro. Mantenha esta página aberta; se houver erro, eles continuam selecionados para uma nova tentativa.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-xs font-medium text-muted-foreground">Preenchimento da agenda: {requiredFields.agenda ? 'obrigatório' : 'opcional'}.</p>
                {errors.agenda && <p className="text-xs font-medium text-destructive">{errors.agenda}</p>}
                <AgendaGrade
                  agenda={form.agenda}
                  observacoes={form.observacoesAgenda}
                  onChange={(agenda) => set('agenda', agenda)}
                  onObservacoesChange={(value) => set('observacoesAgenda', value)}
                />
                <p className="text-xs text-muted-foreground">Após o envio, a edição da agenda no painel ficará bloqueada até o administrador liberar.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 animate-fade-in">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Nome', form.nome],
                    ['CPF', form.cpf],
                    ['RG', form.rg.trim() || 'Não informado'],
                    ['Sexo', form.sexo || 'Não informado'],
                    ['Data de nascimento', form.dataNascimento],
                    ['E-mail', form.email.trim() || 'Não informado'],
                    ['E-mail Microsoft Teams', form.emailTeams.trim() || 'Não informado'],
                    ['Telefone', form.telefone.trim() || 'Não informado'],
                    ['CEP', form.cep.trim() || 'Não informado'],
                    ['Endereço', [form.endereco.trim(), form.numero.trim()].filter(Boolean).join(', ') || 'Não informado'],
                    ['Cidade', [form.cidade.trim(), form.uf].filter(Boolean).join(' — ') || 'Não informado'],
                    ['Chave Pix', form.chavePix.trim() || 'Não informado'],
                    ['Profissão', form.profissao],
                    ['Registro', form.registro.trim() || 'Não informado'],
                    ['Experiência', form.experienciaAnos.trim() ? `${form.experienciaAnos} anos` : 'Não informado'],
                    ['Abordagem', form.abordagem.join(' · ') || 'Não informada'],
                    ['Agenda disponível', form.agenda.length ? form.agenda.map((slot) => `${slot.dia} ${slot.inicio}–${slot.fim}`).join(' · ') : 'Não informada'],
                    ['Especialidades', form.especialidades.join(', ') || 'Não informadas'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-border/70 bg-background p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-0.5 text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {form.observacoesAgenda && (
                  <div className="rounded-md border border-border/70 bg-background p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Observações sobre a disponibilidade</p>
                    <p className="mt-1 text-sm leading-relaxed">{form.observacoesAgenda}</p>
                  </div>
                )}

                {form.bio && (
                  <div className="rounded-md border border-border/70 bg-background p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resumo</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{form.bio}</p>
                  </div>
                )}

                <div className="rounded-md border border-border/70 bg-background p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Documentação</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {DOCUMENTOS_PADRAO.map((documento) => {
                      const arquivo = arquivos[documento.nome];
                      const existente = candidatoAtual?.documentos.find((item) => item.nome === documento.nome);
                      return (
                        <li key={documento.nome} className="flex flex-wrap justify-between gap-x-3">
                          <span>{documento.nome}</span>
                          <span className="text-muted-foreground">
                            {arquivo?.name ?? existente?.arquivoNome ?? 'Não anexado — ficará pendente'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-4">
                  <input
                    type="checkbox"
                    checked={isUpdate ? confirmacaoAtualizacao : form.lgpd}
                    onChange={(e) => isUpdate
                      ? setConfirmacaoAtualizacao(e.target.checked)
                      : set('lgpd', e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--secondary))]"
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {isUpdate
                      ? 'Confirmo que esta solicitação deve ser analisada pela equipe. Sei que meus dados só serão alterados após aprovação.'
                      : 'Autorizo o tratamento dos meus dados pessoais pela Somente, conforme a LGPD, para fins de avaliação do processo seletivo e contato futuro.'}{' '}
                    <span className="font-medium text-foreground">Obrigatório.</span>
                  </span>
                </label>
                {(errors.lgpd || errors.confirmacaoAtualizacao) && (
                  <p className="text-xs font-medium text-destructive">{errors.lgpd || errors.confirmacaoAtualizacao}</p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-5 sm:flex-row">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>

              {step < ETAPAS.length - 1 ? (
                <Button onClick={handleNext} className="w-full sm:w-auto">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      {isUpdate ? 'Enviar solicitação' : 'Enviar cadastro'} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
