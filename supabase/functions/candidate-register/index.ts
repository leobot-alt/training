import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (len: number) => { let sum = 0; for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i); const d = (sum * 10) % 11; return (d === 10 ? 0 : d) === Number(cpf[len]); };
  return check(9) && check(10);
}
function validBirth(value: unknown) {
  const s = String(value ?? ""); let y: number, m: number, d: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) [y, m, d] = s.split("-").map(Number);
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const a = s.split("/").map(Number); [d, m, y] = a; }
  else return false;
  const date = new Date(Date.UTC(y, m - 1, d)); const now = new Date();
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && date < now && y >= 1900;
}
const str = (v: unknown) => typeof v === "string" ? v.trim() : "";
function validAgenda(value: unknown): boolean {
  const days = new Set(["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]);
  if (!Array.isArray(value) || value.length === 0 || value.length > 84) return false;
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const slot = raw as Record<string, unknown>;
    const day = str(slot.dia), start = str(slot.inicio), end = str(slot.fim);
    const matchTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!days.has(day) || !matchTime(start) || !matchTime(end)) return false;
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
    const cpf = digits(input.cpf), dob = str(input.dataNascimento), nome = str(input.nome), email = str(input.email).toLowerCase();
    const telefone = str(input.telefone), uf = str(input.uf).toUpperCase();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    const emailTeams = str(input.emailTeams).toLowerCase();
    const emailTeamsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTeams) && emailTeams.length <= 254;
    const phoneDigits = digits(telefone);
    const birthPassword = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : `${dob.slice(6, 10)}-${dob.slice(3, 5)}-${dob.slice(0, 2)}`;
    const sex = ["Feminino", "Masculino", "Não binário", "Prefiro não informar"];
    const cep = digits(input.cep);
    if (!validCpf(cpf) || !validBirth(dob) || nome.length < 5 || nome.length > 150 || str(input.rg).length < 5 || !sex.includes(str(input.sexo)) || !emailValid || !emailTeamsValid || telefone.length > 40 || phoneDigits.length < 10 || phoneDigits.length > 15 || cep.length !== 8 || !str(input.endereco) || !str(input.numero) || !str(input.chavePix) || str(input.chavePix).length < 3 || !str(input.cidade) || input.lgpd !== true) return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados e o consentimento informado." });
    const especialidades = Array.isArray(input.especialidades) && input.especialidades.every((x: unknown) => typeof x === "string") ? input.especialidades : null;
    const agenda = validAgenda(input.agenda) ? input.agenda : null;
    const experienciaAnos = Number(input.experienciaAnos);
    if (!especialidades || especialidades.length === 0 || especialidades.length > 20 || especialidades.some((x: string) => !x.trim() || x.length > 100) || !agenda || !Number.isFinite(experienciaAnos) || experienciaAnos < 0 || experienciaAnos > 80 || !["Psicólogo", "Psiquiatra"].includes(input.profissao) || str(input.registro).length < 5 || str(input.registro).length > 80 || str(input.abordagem).length < 2 || str(input.abordagem).length > 400 || !["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].includes(uf)) return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados informados." });

    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Server configuration unavailable");
    admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const syntheticEmail = `cpf-${cpf}@somente.invalid`;
    const { data, error } = await admin.auth.admin.createUser({ email: syntheticEmail, password: birthPassword, email_confirm: true, user_metadata: { role: "profissional" } });
    if (error || !data.user) return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados ou contate a equipe." });
    createdId = data.user.id;
    const now = new Date().toISOString();
    const candidate = {
      id: crypto.randomUUID(), protocolo: `SOM-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      nome, cpf, rg: str(input.rg), sexo: str(input.sexo), dataNascimento: dob, email, emailTeams, telefone,
      cep: str(input.cep), endereco: str(input.endereco), numero: str(input.numero), chavePix: str(input.chavePix), cidade: str(input.cidade), uf,
      profissao: input.profissao, registro: str(input.registro), especialidades, abordagem: str(input.abordagem), experienciaAnos,
      agenda, observacoesAgenda: str(input.observacoesAgenda), bio: str(input.bio), lgpd: true,
      status: "novo", origem: str(input.origem) || "Site", criadoEm: now, atualizadoEm: now, agendaEditavel: false,
      notas: [], tags: [], documentos: [
        { nome: "Registro profissional (CRP/CRM)", status: "pendente" },
        { nome: "Diploma de graduação", status: "pendente" },
        { nome: "Comprovante de residência", status: "pendente" },
        { nome: "Documento de identidade (RG/CNH)", status: "pendente" },
        { nome: "Certificado de especialização", status: "pendente" },
      ],
    };
    const { data: candidateId, error: rpcError } = await admin.rpc("register_candidate_record", { p_candidate: candidate, p_profile: { id: createdId } });
    if (rpcError || !candidateId) {
      await admin.auth.admin.deleteUser(createdId); createdId = undefined;
      return response(400, { error: "Não foi possível concluir o cadastro. Confira os dados ou contate a equipe." });
    }
    return response(200, { candidateId, protocolo: candidate.protocolo, message: "Cadastro recebido. Use CPF e data de nascimento para acessar sua conta." });
  } catch {
    if (createdId && admin) { try { await admin.auth.admin.deleteUser(createdId); } catch { /* best-effort rollback */ } }
    return response(400, { error: "Não foi possível concluir o cadastro." });
  }
});
