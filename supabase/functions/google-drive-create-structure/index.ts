/**
 * DubWorks — google-drive-create-structure
 *
 * Proxy seguro para operações de Drive usadas pelo Manager.
 * Frontend -> Supabase Edge Function -> Google Apps Script -> Drive/Sheets.
 *
 * Usa os mesmos secrets do google-forms-proxy:
 * - DUBWORKS_FORMS_WEBAPP_URL
 * - DUBWORKS_FORMS_TOKEN
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = new Set([
  "criar_estrutura_drive",
  "compartilhar_pasta",
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
        { ok: false, error: `Ação não permitida: ${action || "(vazia)"}` },
        400,
      );
    }

    const appsScriptUrl = normalizarUrlAppsScript(
      Deno.env.get("DUBWORKS_FORMS_WEBAPP_URL") || "",
    );
    const token = String(Deno.env.get("DUBWORKS_FORMS_TOKEN") || "").trim();

    if (!appsScriptUrl) {
      return jsonResponse(
        {
          ok: false,
          error:
            "DUBWORKS_FORMS_WEBAPP_URL não está configurado nos Secrets da Supabase.",
        },
        500,
      );
    }

    if (!token) {
      return jsonResponse(
        {
          ok: false,
          error:
            "DUBWORKS_FORMS_TOKEN não está configurado nos Secrets da Supabase.",
        },
        500,
      );
    }

    const upstreamPayload: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
      token,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    try {
      const upstream = await fetch(appsScriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          Accept: "application/json,text/plain,*/*",
        },
        body: JSON.stringify(upstreamPayload),
        redirect: "follow",
        signal: controller.signal,
      });

      const raw = await upstream.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!upstream.ok) {
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
        return jsonResponse(
          {
            ok: false,
            error:
              "O Apps Script respondeu, mas não retornou JSON válido. Confira a implantação /exec.",
          },
          502,
        );
      }

      return jsonResponse(data, data?.ok === false ? 502 : 200);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Tempo limite ao aguardar o Google Apps Script."
        : String((error as Error)?.message || error || "Erro desconhecido.");

    console.error("google-drive-create-structure", error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
