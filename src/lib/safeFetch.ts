import { READ_ONLY_MODE } from "../config/runtimeConfig";

const READ_ONLY_EDGE_ACTIONS = new Set([
  "ler_respostas_selecao",
  "ler_respostas_entregas",
]);

function requestUrl(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method || (input instanceof Request ? input.method : "GET"))
    .trim()
    .toUpperCase();
}

async function requestJsonBody(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof init?.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return null;
    }
  }

  if (input instanceof Request) {
    try {
      const body = await input.clone().text();
      return body ? JSON.parse(body) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function blockedResponse(reason: string) {
  console.warn(`[DubWorks modo teste] ${reason}`);
  return new Response(
    JSON.stringify({
      message: reason,
      error: reason,
      code: "DUBWORKS_TEST_READ_ONLY",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json;charset=utf-8" },
    }
  );
}

function isSupabaseUrl(url: URL) {
  return url.hostname.endsWith(".supabase.co");
}

function isWriteMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

/**
 * Fetch protegido usado pelo cliente Supabase e pelas integrações sensíveis.
 * No build de teste, leituras continuam funcionando, mas operações com efeito
 * colateral são bloqueadas antes de sair do navegador.
 */
export async function guardedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!READ_ONLY_MODE) {
    return globalThis.fetch(input, init);
  }

  const urlString = requestUrl(input);
  const method = requestMethod(input, init);
  let url: URL;

  try {
    url = new URL(urlString, globalThis.location?.origin || "http://localhost");
  } catch {
    return globalThis.fetch(input, init);
  }

  // Login/refresh/logout são permitidos para que o teste possa carregar o
  // perfil real. Recuperação de senha é bloqueada para não gerar e-mails reais.
  if (isSupabaseUrl(url) && url.pathname.startsWith("/auth/v1/")) {
    const authReadOrSession =
      method === "GET" ||
      url.pathname.includes("/token") ||
      url.pathname.includes("/logout");

    if (authReadOrSession) {
      return globalThis.fetch(input, init);
    }

    return blockedResponse(
      "Modo de teste: alterações no Supabase Auth estão bloqueadas."
    );
  }

  if (isSupabaseUrl(url) && url.pathname.startsWith("/rest/v1/")) {
    if (isWriteMethod(method)) {
      return blockedResponse(
        "Modo de teste: INSERT/UPDATE/UPSERT/DELETE/RPC no Supabase original foram bloqueados."
      );
    }
    return globalThis.fetch(input, init);
  }

  if (isSupabaseUrl(url) && url.pathname.startsWith("/storage/v1/")) {
    // createSignedUrl usa POST, mas não altera arquivos; é necessário para
    // visualizar anexos existentes no chat durante o teste.
    const signedUrlRead =
      method === "POST" && url.pathname.includes("/object/sign/");

    if (isWriteMethod(method) && !signedUrlRead) {
      return blockedResponse(
        "Modo de teste: uploads e alterações no Storage original foram bloqueados."
      );
    }
    return globalThis.fetch(input, init);
  }

  if (isSupabaseUrl(url) && url.pathname.startsWith("/functions/v1/")) {
    if (!isWriteMethod(method)) return globalThis.fetch(input, init);

    const body = await requestJsonBody(input, init);
    if (READ_ONLY_EDGE_ACTIONS.has(String(body?.action || ""))) {
      return globalThis.fetch(input, init);
    }

    return blockedResponse(
      "Modo de teste: Edge Function com possível efeito colateral foi bloqueada."
    );
  }

  if (
    method !== "GET" &&
    (url.pathname === "/api/forms-copy" ||
      url.pathname === "/api/project-finalize")
  ) {
    return blockedResponse(
      "Modo de teste: automações de criação/finalização no Google Drive foram bloqueadas."
    );
  }

  return globalThis.fetch(input, init);
}

export function assertWritable(action = "Esta alteração") {
  if (READ_ONLY_MODE) {
    throw new Error(
      `${action} foi bloqueada porque esta cópia está em MODO DE TESTE / SOMENTE LEITURA.`
    );
  }
}
