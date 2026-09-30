import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Supabase da função não configurado." }, 500);
    }
    if (!token) {
      return json({ ok: false, error: "Sessão não informada." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const callerEmail = String(authData?.user?.email || "").trim().toLowerCase();

    if (authError || !callerEmail) {
      return json({ ok: false, error: "Sessão inválida." }, 401);
    }

    const { data: caller, error: callerError } = await admin
      .from("usuarios")
      .select("login,cargo,acesso_usuarios")
      .eq("login", callerEmail)
      .maybeSingle();

    if (callerError) {
      return json({ ok: false, error: callerError.message }, 500);
    }

    const autorizado =
      caller?.cargo === "diretoria" ||
      caller?.cargo === "adm" ||
      caller?.acesso_usuarios === true;

    if (!autorizado) {
      return json({ ok: false, error: "Você não tem permissão para criar usuários." }, 403);
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const perfil = body?.perfil || {};

    if (!email || !email.includes("@")) {
      return json({ ok: false, error: "E-mail inválido." }, 400);
    }
    if (password.length < 8) {
      return json({ ok: false, error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: String(perfil?.nome || "") },
    });

    if (createError || !created.user) {
      return json({ ok: false, error: createError?.message || "Falha ao criar acesso." }, 400);
    }

    const perfilPayload = {
      ...perfil,
      login: email,
      senha: null,
      criado_por: callerEmail,
    };

    const { error: profileError } = await admin.from("usuarios").insert([perfilPayload]);

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ ok: false, error: profileError.message }, 400);
    }

    return json({
      ok: true,
      user_id: created.user.id,
      email,
      email_confirmado: true,
    });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
});
