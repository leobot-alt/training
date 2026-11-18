import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const safe = (p: Record<string, unknown>) => ({ id: p.id, role: p.role, permissions: p.permissions, active: p.active, nome: p.nome, email: p.email, candidate_id: p.candidate_id });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Método não permitido." });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return reply(401, { error: "Sessão necessária." });
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: "Sessão inválida." });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles").select("id,role,permissions,active,nome,email").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile?.active || !(profile.role === "admin" || profile.permissions?.usuarios === true)) return reply(403, { error: "Ação não autorizada." });
    const callerIsAdmin = profile.role === "admin";
    const body = await req.json();
    const action = String(body.action ?? ""), targetId = String(body.id ?? "");
    if (!["create", "update", "deactivate", "delete"].includes(action)) return reply(400, { error: "Ação inválida." });
    if ((action !== "create") && !targetId) return reply(400, { error: "Conta inválida." });
    if (action !== "create") {
      if (targetId === authData.user.id && (["delete", "deactivate"].includes(action) || (!callerIsAdmin && action === "update"))) return reply(403, { error: "Não é possível alterar a própria conta por esta operação." });
      const { data: target, error: targetError } = await admin.from("profiles").select("id,role").eq("id", targetId).maybeSingle();
      if (targetError || !target || target.role !== "equipe") return reply(403, { error: "Ação não autorizada." });
    }
    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) return reply(400, { error: "Não foi possível remover a conta." });
      return reply(200, { ok: true });
    }
    if (action === "deactivate") {
      const { error } = await admin.from("profiles").update({ active: false, updated_at: new Date().toISOString() }).eq("id", targetId);
      if (error) return reply(400, { error: "Não foi possível desativar a conta." });
      const { data: authUser } = await admin.auth.admin.getUserById(targetId);
      if (authUser.user) await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      const { data: changed } = await admin.from("profiles").select("*").eq("id", targetId).maybeSingle();
      return reply(200, { user: changed ? safe(changed) : null });
    }
    const input = body.user ?? {};
    const role = String(input.role ?? "equipe");
    if (role !== "equipe" || typeof input.nome !== "string" || input.nome.trim().length < 2 || input.nome.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email ?? ""))) return reply(400, { error: "Dados inválidos." });
    const permissions = input.permissions && typeof input.permissions === "object" && !Array.isArray(input.permissions) ? input.permissions : {};
    // Prevent a non-admin users manager from escalating another account to admin or delegating usuarios.
    if (!callerIsAdmin && permissions.usuarios === true) return reply(403, { error: "Ação não autorizada." });
    if (!callerIsAdmin && typeof input.password === "string" && input.password.length > 0) return reply(403, { error: "Somente o administrador pode redefinir a senha de outra pessoa." });
    let id = targetId;
    if (action === "create") {
      if (typeof input.password !== "string" || input.password.length < 12) return reply(400, { error: "A senha inicial deve ter pelo menos 12 caracteres." });
      const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, user_metadata: { role } });
      if (error || !data.user) return reply(400, { error: "Não foi possível criar a conta." });
      id = data.user.id;
    } else if (typeof input.password === "string" && input.password.length) {
      if (input.password.length < 12) return reply(400, { error: "Senha inválida." });
      const { error } = await admin.auth.admin.updateUserById(id, { password: input.password, email: input.email });
      if (error) return reply(400, { error: "Não foi possível atualizar a conta." });
    } else {
      const { error } = await admin.auth.admin.updateUserById(id, { email: input.email });
      if (error) return reply(400, { error: "Não foi possível atualizar a conta." });
    }
    const values = { id, role, permissions: role === "admin" ? {} : permissions, candidate_id: role === "profissional" ? (input.candidate_id ?? null) : null, active: input.active !== false, nome: input.nome.trim(), email: String(input.email).trim().toLowerCase(), updated_at: new Date().toISOString() };
    const { data: saved, error: saveError } = await admin.from("profiles").upsert(values).select("*").single();
    if (saveError) { if (action === "create") await admin.auth.admin.deleteUser(id); return reply(400, { error: "Não foi possível salvar a conta." }); }
    if (!saved.active) await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    else await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
    return reply(200, { user: safe(saved) });
  } catch { return reply(400, { error: "Não foi possível concluir a operação." }); }
});
