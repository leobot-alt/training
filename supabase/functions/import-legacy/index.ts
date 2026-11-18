import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedKeys = new Set([
  "candidatos", "trilhas", "progresso", "pipelineStages", "solicitacoes",
  "homeContent", "trainingFlow",
]);
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const digits = (value: unknown) => typeof value === "string" || typeof value === "number"
  ? String(value).replace(/\D/g, "") : "";
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
function containsCredential(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsCredential);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) =>
    /^(password|senha|access_?token|refresh_?token|authorization|service_?role_?key|session)$/i.test(key) || containsCredential(nested));
}

function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const digit = (sum * 10) % 11;
    return (digit === 10 ? 0 : digit) === Number(cpf[len]);
  };
  return check(9) && check(10);
}

function birthDate(value: unknown): string | null {
  const raw = text(value);
  let year: number, month: number, day: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) [year, month, day] = raw.split("-").map(Number);
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const parts = raw.split("/").map(Number);
    [day, month, year] = parts;
  } else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day || year < 1900 || date >= now) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Método não permitido." });

  const createdUserIds: string[] = [];
  let admin: ReturnType<typeof createClient> | undefined;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !serviceKey || !anonKey) return reply(500, { error: "Não foi possível concluir a importação." });
    if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Sessão necessária." });

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: "Sessão inválida." });

    admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role,active").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile?.active || profile.role !== "admin")
      return reply(403, { error: "Ação não autorizada." });

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !Object.hasOwn(body, "state") ||
        !body.state || typeof body.state !== "object" || Array.isArray(body.state))
      return reply(400, { error: "Formato de importação inválido." });
    const state = body.state as Record<string, unknown>;
    if (Object.keys(state).some((key) => !allowedKeys.has(key)) ||
        ["user", "teamAccounts", "session"].some((key) => Object.hasOwn(state, key)) ||
        !Array.isArray(state.candidatos) || state.candidatos.length > 5000 || containsCredential(state))
      return reply(400, { error: "Formato de importação inválido." });

    const candidates = state.candidatos as unknown[];
    const seenIds = new Set<string>();
    const seenCpfs = new Set<string>();
    const links: Array<{ candidate: Record<string, unknown>; cpf: string; password: string; id: string }> = [];
    let semAcesso = 0;
    for (const item of candidates) {
      if (!item || typeof item !== "object" || Array.isArray(item))
        return reply(400, { error: "Formato de candidato inválido." });
      const candidate = item as Record<string, unknown>;
      const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || seenIds.has(id)) return reply(400, { error: "IDs de candidato inválidos ou duplicados." });
      seenIds.add(id);
      const cpf = digits(candidate.cpf);
      if (cpf && seenCpfs.has(cpf)) return reply(400, { error: "CPFs duplicados na importação." });
      if (cpf) seenCpfs.add(cpf);
      const normalizedBirth = birthDate(candidate.dataNascimento);
      if (!validCpf(cpf) || !normalizedBirth) {
        semAcesso++;
        continue;
      }
      links.push({ candidate, cpf, password: normalizedBirth, id });
    }

    // Check before creating users and again atomically in import_legacy_state.
    const { data: current, error: stateError } = await admin.from("crm_state")
      .select("state").eq("singleton", true).maybeSingle();
    if (stateError || !current || !Array.isArray(current.state?.candidatos) || current.state.candidatos.length !== 0)
      return reply(409, { error: "A importação só pode ocorrer em um CRM sem candidatos." });

    for (const link of links) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `cpf-${link.cpf}@somente.invalid`, password: link.password,
        email_confirm: true, user_metadata: { role: "profissional" },
      });
      if (error || !data.user) throw new Error("auth_create_failed");
      createdUserIds.push(data.user.id);
      const { error: profileUpsertError } = await admin.from("profiles").upsert({
        id: data.user.id, role: "profissional", permissions: {}, candidate_id: link.id,
        active: true, nome: text(link.candidate.nome), email: text(link.candidate.email),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (profileUpsertError) throw new Error("profile_write_failed");
    }

    // Exactly one RPC call, passing the original state object without rewriting it.
    const { error: importError } = await admin.rpc("import_legacy_state", { p_state: state });
    if (importError) throw new Error("state_import_failed");
    return reply(200, { ok: true, importedCandidates: candidates.length, linkedCandidates: links.length, semAcesso });
  } catch {
    if (admin) {
      for (const id of createdUserIds) {
        try { await admin.auth.admin.deleteUser(id); } catch { /* best-effort cleanup; never log identity data */ }
      }
    }
    return reply(400, { error: "Não foi possível concluir a importação. Nenhum dado pessoal foi retornado." });
  }
});
