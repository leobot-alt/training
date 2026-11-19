import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const DEFAULT_REQUIRED_FIELDS = {
  rg: true,
  sexo: true,
  email: true,
  emailTeams: true,
  telefone: true,
  cep: true,
  endereco: true,
  numero: true,
  cidade: true,
  uf: true,
  chavePix: true,
  registro: true,
  experienciaAnos: true,
  abordagem: true,
  especialidades: true,
  bio: false,
  agenda: true,
} as const;
type ConfigurableField = keyof typeof DEFAULT_REQUIRED_FIELDS;

function registrationRules(value: unknown): Record<ConfigurableField, boolean> {
  const source = asRecord(value);
  return Object.fromEntries(
    Object.entries(DEFAULT_REQUIRED_FIELDS).map(([key, defaultRequired]) => [
      key,
      typeof source[key] === "boolean" ? source[key] : defaultRequired,
    ]),
  ) as Record<ConfigurableField, boolean>;
}

function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const digit = (sum * 10) % 11;
    return (digit === 10 ? 0 : digit) === Number(cpf[length]);
  };
  return check(9) && check(10);
}

function validBirth(value: unknown) {
  const input = String(value ?? "");
  let year: number, month: number, day: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) [year, month, day] = input.split("-").map(Number);
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const parts = input.split("/").map(Number);
    [day, month, year] = parts;
  } else return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date < new Date() && year >= 1900;
}

function validAgenda(value: unknown): value is Array<Record<string, unknown>> {
  const days = new Set(["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]);
  if (!Array.isArray(value) || value.length === 0 || value.length > 84) return false;
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const slot = raw as Record<string, unknown>;
    const day = str(slot.dia), start = str(slot.inicio), end = str(slot.fim);
    const validTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!days.has(day) || !validTime(start) || !validTime(end)) return false;
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const startMinute = minutes(start), endMinute = minutes(end);
    if (startMinute < 480 || endMinute > 1260 || endMinute - startMinute !== 60 || (day === "Sábado" && startMinute >= 840)) return false;
    const key = `${day}|${start}|${end}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response(405, { error: "Não foi possível concluir o cadastro." });

  let createdId: string | undefined;
  let admin: ReturnType<typeof createClient> | undefined;
  try {
    const input = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return response(400, { error: "Confira os dados informados." });

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !serviceKey || !publicKey) throw new Error("Server configuration unavailable");

    admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const publicClient = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
    // This public RPC returns only homeContent, not candidate records or other personal data.
    const { data: publicState, error: publicStateError } = await publicClient.rpc("get_public_state");
    if (publicStateError) throw publicStateError;
    const homeContent = asRecord(asRecord(publicState).homeContent);
    const rules = registrationRules(homeContent.registrationFields);
    const required = (field: ConfigurableField) => rules[field];

    const cpf = digits(input.cpf);
    const dob = str(input.dataNascimento);
    const nome = str(input.nome);
    const email = str(input.email).toLowerCase();
    const emailTeams = str(input.emailTeams).toLowerCase();
    const telefone = str(input.telefone);
    const phoneDigits = digits(telefone);
    const cep = digits(input.cep);
    const rg = str(input.rg);
    const sexo = str(input.sexo);
    const endereco = str(input.endereco);
    const numero = str(input.numero);
    const cidade = str(input.cidade);
    const uf = str(input.uf).toUpperCase();
    const chavePix = str(input.chavePix);
    const registro = str(input.registro);
    const abordagemInput = str(input.abordagem);
    const abordagem = abordagemInput === "Não informada" ? "" : abordagemInput;
    const bio = str(input.bio);
    const profissao = str(input.profissao);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    const emailTeamsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTeams) && emailTeams.length <= 254;
    const sexOptions = ["Feminino", "Masculino", "Não binário", "Prefiro não informar"];
    const ufOptions = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

    const hasExperience = input.experienciaAnos !== null && input.experienciaAnos !== undefined && String(input.experienciaAnos).trim() !== "";
    const experienciaAnos = hasExperience ? Number(input.experienciaAnos) : null;
    const experienceValid = required("experienciaAnos")
      ? hasExperience && Number.isFinite(experienciaAnos) && experienciaAnos! >= 0 && experienciaAnos! <= 80
      : !hasExperience || (Number.isFinite(experienciaAnos) && experienciaAnos! >= 0 && experienciaAnos! <= 80);

    const rawEspecialidades = input.especialidades;
    const hasEspecialidadesArray = Array.isArray(rawEspecialidades);
    const especialidades = hasEspecialidadesArray ? rawEspecialidades as unknown[] : [];
    const specialtiesValidInput = hasEspecialidadesArray || (!required("especialidades") && (rawEspecialidades === null || rawEspecialidades === undefined));
    const specialtiesValid = specialtiesValidInput
      && (especialidades.length > 0 || !required("especialidades"))
      && especialidades.length <= 20
      && especialidades.every((value) => typeof value === "string" && value.trim().length > 0 && value.length <= 100);

    const rawAgenda = input.agenda;
    const agendaIsArray = Array.isArray(rawAgenda);
    const agenda = agendaIsArray ? rawAgenda as Array<Record<string, unknown>> : [];
    const agendaValidInput = agendaIsArray || (!required("agenda") && (rawAgenda === null || rawAgenda === undefined));
    const agendaValid = agendaValidInput && (agenda.length === 0 ? !required("agenda") : validAgenda(agenda));

    const optionalValueValid = (field: ConfigurableField, value: string, valid: boolean) =>
      required(field) ? value.length > 0 && valid : value.length === 0 || valid;
    const emailOk = required("email") ? emailValid : !email || emailValid;
    const emailTeamsOk = required("emailTeams") ? emailTeamsValid : !emailTeams || emailTeamsValid;
    const phoneOk = required("telefone")
      ? phoneDigits.length >= 10 && phoneDigits.length <= 15 && telefone.length <= 40
      : !telefone || (phoneDigits.length >= 10 && phoneDigits.length <= 15 && telefone.length <= 40);
    const cepOk = required("cep") ? cep.length === 8 : !str(input.cep) || cep.length === 8;
    const sexOk = required("sexo") ? sexOptions.includes(sexo) : !sexo || sexOptions.includes(sexo);
    const ufOk = required("uf") ? ufOptions.includes(uf) : !uf || ufOptions.includes(uf);
    const pixOk = optionalValueValid("chavePix", chavePix, chavePix.length >= 3 && chavePix.length <= 200);
    const registrationOk = required("registro")
      ? registro.length >= 5 && registro.length <= 80
      : !registro || (registro.length >= 5 && registro.length <= 80);
    const approachOk = required("abordagem")
      ? abordagem.length >= 2 && abordagem.length <= 400
      : !abordagem || (abordagem.length >= 2 && abordagem.length <= 400);

    const fieldErrors: Record<string, string> = {};
    if (!validCpf(cpf)) fieldErrors.cpf = "Informe um CPF válido.";
    if (!validBirth(dob)) fieldErrors.dataNascimento = "Informe uma data de nascimento válida.";
    if (nome.length < 5 || nome.length > 150) fieldErrors.nome = "Informe seu nome completo.";
    if (!optionalValueValid("rg", rg, rg.length >= 5 && rg.length <= 80)) fieldErrors.rg = "Informe um RG válido.";
    if (!sexOk) fieldErrors.sexo = "Selecione uma opção válida.";
    if (!emailOk) fieldErrors.email = "Informe um e-mail válido.";
    if (!emailTeamsOk) fieldErrors.emailTeams = "Informe um e-mail válido para o Teams.";
    if (!phoneOk) fieldErrors.telefone = "Informe um telefone válido com DDD.";
    if (!cepOk) fieldErrors.cep = "Informe um CEP válido.";
    if ((required("endereco") && !endereco) || endereco.length > 200) fieldErrors.endereco = "Informe um endereço válido.";
    if ((required("numero") && !numero) || numero.length > 80) fieldErrors.numero = "Informe um número válido.";
    if ((required("cidade") && !cidade) || cidade.length > 120) fieldErrors.cidade = "Informe uma cidade válida.";
    if (!ufOk) fieldErrors.uf = "Selecione uma UF válida.";
    if (!pixOk) fieldErrors.chavePix = "Informe uma chave Pix válida.";
    if (input.lgpd !== true) fieldErrors.lgpd = "É necessário aceitar o tratamento de dados para continuar.";
    if (!specialtiesValid) fieldErrors.especialidades = "Selecione especialidades válidas.";
    if (!agendaValid) fieldErrors.agenda = "Informe horários disponíveis válidos.";
    if (!experienceValid) fieldErrors.experienciaAnos = "Informe um número válido de anos de experiência.";
    if (!["Psicólogo", "Psiquiatra"].includes(profissao)) fieldErrors.profissao = "Selecione uma profissão válida.";
    if (!registrationOk) fieldErrors.registro = "Informe um registro profissional válido.";
    if (!approachOk) fieldErrors.abordagem = "Selecione uma abordagem válida.";
    if (bio.length > 2000 || (required("bio") && !bio)) fieldErrors.bio = "Informe um resumo válido, com até 2.000 caracteres.";
    if (Object.keys(fieldErrors).length > 0) {
      return response(400, {
        error: "Revise os campos destacados e tente novamente.",
        fieldErrors,
      });
    }

    const birthPassword = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : `${dob.slice(6, 10)}-${dob.slice(3, 5)}-${dob.slice(0, 2)}`;
    const syntheticEmail = `cpf-${cpf}@somente.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: birthPassword,
      email_confirm: true,
      user_metadata: { role: "profissional" },
    });
    if (error || !data.user) return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados ou contate a equipe." });
    createdId = data.user.id;

    const now = new Date().toISOString();
    const candidate = {
      id: crypto.randomUUID(),
      protocolo: `SOM-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      nome,
      cpf,
      rg,
      sexo,
      dataNascimento: dob,
      email,
      emailTeams,
      telefone,
      cep: str(input.cep),
      endereco,
      numero,
      chavePix,
      cidade,
      uf,
      profissao,
      registro,
      especialidades: especialidades as string[],
      abordagem: abordagem || "Não informada",
      experienciaAnos,
      agenda,
      observacoesAgenda: str(input.observacoesAgenda),
      bio,
      lgpd: true,
      status: "novo",
      origem: str(input.origem) || "Site",
      criadoEm: now,
      atualizadoEm: now,
      agendaEditavel: false,
      notas: [],
      tags: [],
      documentos: [
        { nome: "Registro profissional (CRP/CRM)", status: "pendente" },
        { nome: "Diploma de graduação", status: "pendente" },
        { nome: "Comprovante de residência", status: "pendente" },
        { nome: "Documento de identidade (RG/CNH)", status: "pendente" },
        { nome: "Certificado de especialização", status: "pendente" },
      ],
    };

    const { data: candidateId, error: rpcError } = await admin.rpc("register_candidate_record", {
      p_candidate: candidate,
      p_profile: { id: createdId },
    });
    if (rpcError || !candidateId) {
      await admin.auth.admin.deleteUser(createdId);
      createdId = undefined;
      return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados ou contate a equipe." });
    }

    return response(200, {
      candidateId,
      protocolo: candidate.protocolo,
      message: "Cadastro recebido. Use CPF e data de nascimento para acessar sua conta.",
    });
  } catch {
    if (createdId && admin) {
      try {
        await admin.auth.admin.deleteUser(createdId);
      } catch {
        // Best effort: remove the temporary Auth account if the record operation fails.
      }
    }
    return response(400, { error: "Não foi possível concluir o cadastro." });
  }
});
