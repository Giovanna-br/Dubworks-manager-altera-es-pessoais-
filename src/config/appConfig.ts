import type { ChavePermissao } from "../types";

export const LOGO_URL = "/Logo_dubworks.png";
// Google Forms agora é acessado sempre pelo backend (Supabase Edge Function).
// A URL e o token do Apps Script NÃO ficam mais no frontend.
export const FORMS_PROXY_FUNCTION_NAME = String(
  import.meta.env.VITE_DUBWORKS_FORMS_PROXY_FUNCTION || "google-forms-proxy"
).trim();

export const FORMS_PROXY_ENABLED =
  String(import.meta.env.VITE_DUBWORKS_FORMS_PROXY_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";

export const DRIVE_PROXY_FUNCTION_NAME = String(
  import.meta.env.VITE_DUBWORKS_DRIVE_PROXY_FUNCTION || "google-drive-create-structure"
).trim();

export const permissoesDisponiveis: { chave: ChavePermissao; label: string }[] = [
  { chave: "acesso_projetos", label: "Projetos" },
  { chave: "acesso_membros", label: "Membros / Central de RR" },
  { chave: "acesso_usuarios", label: "Usuários" },
  { chave: "acesso_advertencias", label: "Central de Advertências" },
  { chave: "acesso_eventos", label: "Central de Eventos" },
  { chave: "acesso_aprovacao_eventos", label: "Aprovar eventos" },
  {
    chave: "acesso_projetos_finalizados",
    label: "Marketing / projetos finalizados",
  },
  { chave: "acesso_relatorios_projetos", label: "Relatório de projetos" },
  { chave: "acesso_relatorios_elenco", label: "Relatório de elenco" },
  { chave: "acesso_relatorios_membros", label: "Relatório de membros" },
  { chave: "acesso_relatorios_entrada_saida", label: "Entrada e saída" },
  { chave: "acesso_exportacoes", label: "Exportações" },
  { chave: "acesso_treinamentos", label: "Treinamentos" },
];

export const estilos = {
  azul: "#38bdf8",
  azulEscuro: "#dbeafe",
  azulClaro: "rgba(56, 189, 248, 0.14)",
  borda: "rgba(148, 163, 184, 0.24)",
  texto: "#f8fafc",
  textoSuave: "#cbd5e1",
  fundo: "#050816",
  branco: "rgba(15, 23, 42, 0.94)",
};
