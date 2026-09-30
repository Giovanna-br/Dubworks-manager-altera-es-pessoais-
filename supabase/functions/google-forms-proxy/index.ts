/**
 * DubWorks — google-forms-proxy
 *
 * Motivo desta função:
 * O Google Apps Script Web App não envia os headers CORS necessários para
 * chamadas fetch feitas diretamente pelo navegador. Em vez de usar
 * frontend -> script.google.com, o Manager usa:
 *
 * frontend -> Supabase Edge Function -> Apps Script -> Google Forms
 *
 * A URL e o token do Apps Script ficam somente nos Secrets da Supabase.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = new Set([
  "ping",
  "diagnostico",
  "preparar_formularios_projeto",
  "sincronizar_form_entregas",
  "sincronizar_form_selecao",
  "ler_respostas_selecao",
  "ler_respostas_entregas",
]);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizarUrlAppsScript(value: string) {
  const url = String(value || "").trim();
  if (!url) return "";

  // Evita transformar esta função em proxy aberto para URLs arbitrárias.
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com") {
      return "";
    }
    if (!parsed.pathname.includes("/macros/s/") || !parsed.pathname.endsWith("/exec")) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}


async function chamarAppsScript(
  appsScriptUrl: string,
  payload: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    return { response, raw, data };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ ok: false, error: "Payload JSON inválido." }, 400);
    }

    const action = String((body as Record<string, unknown>).action || "").trim();
    if (!ALLOWED_ACTIONS.has(action)) {
      return jsonResponse(
        { ok: false, error: `Ação não permitida no proxy: ${action || "(vazia)"}` },
        400,
      );
    }

    const configuredUrl = normalizarUrlAppsScript(
      Deno.env.get("DUBWORKS_FORMS_WEBAPP_URL") || "",
    );
    const appsScriptUrl = configuredUrl;
    const token = String(Deno.env.get("DUBWORKS_FORMS_TOKEN") || "").trim();

    if (!appsScriptUrl) {
      return jsonResponse(
        {
          ok: false,
          error:
            "A URL do Google Forms não está configurada no backend (DUBWORKS_FORMS_WEBAPP_URL).",
        },
        500,
      );
    }

    const upstreamPayload: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };

    // Nunca confia em token vindo do navegador. Se houver token configurado,
    // ele é injetado apenas aqui no backend.
    delete upstreamPayload.token;
    if (token) upstreamPayload.token = token;

    let resultado = await chamarAppsScript(appsScriptUrl, upstreamPayload);

    const { response: upstream, raw, data } = resultado;

    if (!upstream.ok) {
      console.error("Apps Script HTTP error", upstream.status, raw.slice(0, 2000));
      return jsonResponse(
        {
          ok: false,
          error:
            data?.error ||
            data?.message ||
            `Apps Script retornou HTTP ${upstream.status}.`,
          upstreamStatus: upstream.status,
        },
        502,
      );
    }

    if (!data) {
      console.error("Apps Script sem JSON válido", raw.slice(0, 2000));
      return jsonResponse(
        {
          ok: false,
          error:
            "O Apps Script respondeu, mas não retornou JSON válido. Confira a implantação /exec e as permissões do Web App.",
        },
        502,
      );
    }

    // O Apps Script pode retornar HTTP 200 com {ok:false}; preservamos isso
    // para o Manager exibir o erro real sem mascarar a causa.
    return jsonResponse(data, data?.ok === false ? 502 : 200);
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Tempo limite ao aguardar o Google Apps Script."
        : String((error as Error)?.message || error || "Erro desconhecido.");

    console.error("google-forms-proxy", error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
