const envFlag = (value: unknown, fallback: boolean) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

/**
 * Esta cópia do projeto é, por padrão, um ambiente de teste somente-leitura.
 * Para evitar acidentes, gravações só são liberadas quando as duas flags abaixo
 * forem configuradas explicitamente para produção.
 */
export const IS_TEST_MODE = envFlag(import.meta.env.VITE_TEST_MODE, true);
export const ALLOW_PRODUCTION_WRITES = envFlag(
  import.meta.env.VITE_ALLOW_PRODUCTION_WRITES,
  false
);

export const READ_ONLY_MODE = IS_TEST_MODE || !ALLOW_PRODUCTION_WRITES;

export const APP_ENV_LABEL = READ_ONLY_MODE
  ? "TESTE — SOMENTE LEITURA"
  : "PRODUÇÃO";

export const ALLOW_WHATSAPP_SEND = envFlag(
  import.meta.env.VITE_ALLOW_WHATSAPP_SEND,
  false
);

export const WHATSAPP_SEND_ENABLED = !READ_ONLY_MODE && ALLOW_WHATSAPP_SEND;
