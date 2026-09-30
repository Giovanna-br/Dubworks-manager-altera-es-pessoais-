import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { guardedFetch, assertWritable } from "../lib/safeFetch";
import { DRIVE_PROXY_FUNCTION_NAME, FORMS_PROXY_ENABLED, FORMS_PROXY_FUNCTION_NAME, permissoesDisponiveis } from "../config/appConfig";
import type {
  AtendimentoMembro,
  AvaliacaoSelecao,
  Cargo,
  ChavePermissao,
  ElencoItem,
  EntregaProducao,
  HistoricoMembroEvento,
  Membro,
  Projeto,
  ProjetoSemana,
  RelatorioMes,
  RespostaSelecao,
  RespostaTreinamento,
  StatusMembro,
  StatusSelecao,
  TrainingStatus,
  Usuario,
  DriveStructureResult,
} from "../types";



export {
  permissaoPadraoPorCargo,
  temAcesso,
  permissoesPadraoUsuario,
  podeVerProjeto,
  podeEditarProjeto,
  podeCriarProjeto,
  podeSubirVideoEditor,
  podeGerenciarUsuarios,
  podeGerenciarMembros,
  podeGerenciarTreinamentos,
  podeVerNotificacoesGerais,
  podeExcluirUsuario,
  cargosPermitidosParaCriar,
} from "../security/permissions";

// =========================================================
// ADVERTÊNCIAS — GOOGLE FORMS / PLANILHA GESTÃO DUBWORKS
// =========================================================

export interface AdvertenciaPlanilha {
  id: string;
  linha: number;
  timestamp: string;
  origem: "planilha" | "sistema";
  moderador_nome?: string;
  moderador_telefone: string;
  advertido_telefone: string;
  descricao: string;
  valor: string;
  provas: string[];
  data_ocorrencia: string;
  status: "pendente" | "aprovado" | "rejeitado";
  criado_por_uid: string | null;
  criado_por_login: string;
  decidido_por: string;
  decidido_em: string | null;
  motivo_decisao: string;
}

export interface AdvertenciaInternaInput {
  advertido_telefone: string;
  descricao: string;
  valor?: number;
  provas?: string[];
  data_ocorrencia: string;
  moderador_nome?: string;
  moderador_telefone?: string;
  criado_por_login?: string;
}

export const ADVERTENCIAS_FORM_URL =
  "https://forms.gle/pnBftWpBD5CaXX6b9";


export function normalizarTelefoneAdvertencia(valor?: string | null) {
  let digitos = String(valor || "").replace(/\D/g, "");

  // 00 + DDI (ex.: 005511999999999)
  if (digitos.startsWith("00")) {
    digitos = digitos.slice(2);
  }

  // DDI do Brasil.
  if (digitos.startsWith("55") && digitos.length >= 12) {
    digitos = digitos.slice(2);
  }

  // Alguns cadastros antigos usam 0 antes do DDD.
  if (digitos.startsWith("0") && digitos.length === 12) {
    digitos = digitos.slice(1);
  }

  return digitos;
}

function variantesTelefoneAdvertencia(valor?: string | null) {
  const telefone = normalizarTelefoneAdvertencia(valor);
  const variantes = new Set<string>();

  if (!telefone) return variantes;

  variantes.add(telefone);

  // Celular brasileiro atual: DDD (2) + 9 dígitos.
  // Os registros antigos do formulário podem estar sem o 9º dígito.
  if (telefone.length === 11) {
    const ddd = telefone.slice(0, 2);
    const numero = telefone.slice(2);

    if (numero.length === 9 && numero.startsWith("9")) {
      variantes.add(`${ddd}${numero.slice(1)}`);
    }
  }

  // Formato antigo: DDD (2) + 8 dígitos.
  // Só cria a versão com 9 quando o número tem perfil de celular,
  // evitando transformar telefone fixo em celular por engano.
  if (telefone.length === 10) {
    const ddd = telefone.slice(0, 2);
    const numero = telefone.slice(2);

    if (/^[6-9]/.test(numero)) {
      variantes.add(`${ddd}9${numero}`);
    }
  }

  return variantes;
}

export function telefonesAdvertenciaEquivalentes(
  telefoneA?: string | null,
  telefoneB?: string | null
) {
  const variantesA = variantesTelefoneAdvertencia(telefoneA);
  const variantesB = variantesTelefoneAdvertencia(telefoneB);

  if (!variantesA.size || !variantesB.size) return false;

  for (const variante of variantesA) {
    if (variantesB.has(variante)) {
      return true;
    }
  }

  return false;
}

export async function carregarAdvertenciasPlanilha(): Promise<
  AdvertenciaPlanilha[]
> {
  const apiUrl = String(
    import.meta.env.VITE_ADVERTENCIAS_API_URL || ""
  ).trim();

  if (!apiUrl) {
    throw new Error(
      "A integração de advertências ainda não foi configurada. Defina VITE_ADVERTENCIAS_API_URL no .env do Vite."
    );
  }

  const {
    data: { session },
    error: erroSessao,
  } = await supabase.auth.getSession();

  if (erroSessao) {
    console.error("Erro ao obter sessão para advertências:", erroSessao);
    throw new Error("Não consegui confirmar sua sessão.");
  }

  const accessToken = session?.access_token || "";

  if (!accessToken) {
    throw new Error("Sua sessão expirou. Entre novamente no DubWorks Manager.");
  }

  const response = await guardedFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "listar_advertencias",
      access_token: accessToken,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Integração de advertências retornou HTTP ${response.status}.`
    );
  }

  if (!data) {
    throw new Error("A integração de advertências não retornou dados.");
  }

  if (data.error || data.ok === false) {
    throw new Error(
      String(data.error || "Não foi possível carregar as advertências.")
    );
  }

  return (data.advertencias || []).map((item: any, index: number) => ({
    id: String(item.id || item.linha || index + 2),
    linha: Number(item.linha || index + 2),
    timestamp: String(item.timestamp || ""),
    origem: "planilha" as const,
    moderador_nome: String(item.moderador_nome || ""),
    moderador_telefone: String(item.moderador_telefone || ""),
    advertido_telefone: String(item.advertido_telefone || ""),
    descricao: String(item.descricao || ""),
    valor: String(item.valor ?? ""),
    provas: Array.isArray(item.provas)
      ? item.provas.map((url: any) => String(url || "")).filter(Boolean)
      : String(item.provas || "")
          .split(/\s*,\s*/)
          .map((url) => url.trim())
          .filter(Boolean),
    data_ocorrencia: String(item.data_ocorrencia || ""),
    status: "aprovado" as const,
    criado_por_uid: null,
    criado_por_login: "Formulário antigo",
    decidido_por: "",
    decidido_em: null,
    motivo_decisao: "",
  }));
}

function mapAdvertenciaInternaDb(item: any): AdvertenciaPlanilha {
  return {
    id: `sistema-${String(item.id)}`,
    linha: Number(item.id),
    timestamp: String(item.criado_em || ""),
    origem: "sistema",
    moderador_nome: String(item.moderador_nome || ""),
    moderador_telefone: String(item.moderador_telefone || ""),
    advertido_telefone: String(item.advertido_telefone || ""),
    descricao: String(item.descricao || ""),
    valor: String(item.valor ?? "0"),
    provas: Array.isArray(item.provas)
      ? item.provas.map((url: any) => String(url || "").trim()).filter(Boolean)
      : [],
    data_ocorrencia: String(item.data_ocorrencia || ""),
    status: ["pendente", "aprovado", "rejeitado"].includes(item.status)
      ? item.status
      : "pendente",
    criado_por_uid: item.criado_por_uid || null,
    criado_por_login: String(item.criado_por_login || ""),
    decidido_por: String(item.decidido_por || ""),
    decidido_em: item.decidido_em || null,
    motivo_decisao: String(item.motivo_decisao || ""),
  };
}

export async function carregarAdvertenciasInternasBanco(): Promise<
  AdvertenciaPlanilha[]
> {
  const { data, error } = await supabase
    .from("advertencias_internas")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar advertências internas:", error);
    throw new Error(
      error.message || "Não foi possível carregar as advertências internas."
    );
  }

  return (data || []).map(mapAdvertenciaInternaDb);
}

export async function criarAdvertenciaInternaBanco(
  advertencia: AdvertenciaInternaInput
): Promise<AdvertenciaPlanilha> {
  const payload = {
    advertido_telefone: advertencia.advertido_telefone.trim(),
    descricao: advertencia.descricao.trim(),
    valor: Math.max(0, Math.trunc(Number(advertencia.valor) || 0)),
    provas: (advertencia.provas || [])
      .map((url) => String(url || "").trim())
      .filter(Boolean),
    data_ocorrencia: advertencia.data_ocorrencia,
    moderador_nome: advertencia.moderador_nome?.trim() || null,
    moderador_telefone: advertencia.moderador_telefone?.trim() || null,
    criado_por_login: advertencia.criado_por_login?.trim() || null,
    status: "pendente",
    enviado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("advertencias_internas")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar advertência interna:", error);
    throw new Error(error.message || "Não foi possível criar a advertência.");
  }

  return mapAdvertenciaInternaDb(data);
}

export async function decidirAdvertenciaInternaBanco(
  id: number,
  decisao: "aprovado" | "rejeitado",
  decididoPor: string,
  motivo = ""
): Promise<AdvertenciaPlanilha> {
  const { data, error } = await supabase
    .from("advertencias_internas")
    .update({
      status: decisao,
      decidido_por: decididoPor.trim() || null,
      decidido_em: new Date().toISOString(),
      motivo_decisao: motivo.trim() || null,
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao decidir advertência:", error);
    throw new Error(
      error.message || "Não foi possível concluir a aprovação da advertência."
    );
  }

  return mapAdvertenciaInternaDb(data);
}

// =========================================================
// CHAT INTERNO DUBWORKS
// =========================================================

export type ChatCanalTipo =
  | "geral"
  | "diretoria"
  | "lideres"
  | "projeto"
  | "direta";

export interface ChatCanal {
  id: string;
  tipo: ChatCanalTipo;
  nome: string;
  projeto_id: number | null;
  criado_por: string | null;
  created_at: string;
}

export interface ChatParticipante {
  id?: number;
  canal_id: string;
  usuario_login: string;
  created_at?: string;
}

export interface ChatMensagem {
  id: number;
  canal_id: string;
  usuario_login: string;
  usuario_nome: string;
  usuario_cargo: string | null;
  mensagem: string;
  resposta_a_id: number | null;
  created_at: string;
  editado_em: string | null;
  excluido_em: string | null;
}

export interface ChatLeitura {
  canal_id: string;
  usuario_login: string;
  ultimo_lido_em: string;
}

export interface ChatAnexo {
  id: number;
  mensagem_id: number;
  canal_id: string;
  usuario_login: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string;
  tamanho_bytes: number;
  created_at: string;
  url_temporaria: string;
}

export interface ChatPreferencia {
  canal_id: string;
  usuario_login: string;
  silenciado: boolean;
  updated_at: string;
}

export type TipoNotificacaoChat = "mensagem" | "mencao" | "resposta";

export interface ChatMencao {
  id?: number;
  mensagem_id: number;
  usuario_login: string;
  created_at?: string;
}

export interface NotificacaoChat {
  id: number;
  destinatario_login: string;
  tipo: TipoNotificacaoChat;
  canal_id: string | null;
  mensagem_id: number | null;
  autor_login: string;
  autor_nome: string;
  titulo: string;
  texto_preview: string;
  lida: boolean;
  created_at: string;
  lida_em: string | null;
}

export function normalizar(valor?: string) {
  return (valor || "").trim().toLowerCase();
}

export function cargoLabel(cargo: Cargo) {
  const labels: Record<Cargo, string> = {
    diretoria: "Diretoria",
    adm: "ADM",
    adm_treinamento: "ADM Treinamento",
    moderador: "Moderador",
    analista_rr: "Analista de RR",
    marketing: "Marketing",
    eventos: "Eventos",
    lider: "Líder",
    lider_treinamento: "Líder em treinamento",
    editor: "Editor",
    membro: "Membro",
  };
  return labels[cargo] || cargo;
}

export function statusTreinamentoLabel(status?: TrainingStatus) {
  const labels: Record<TrainingStatus, string> = {
    nao_aplicavel: "Não aplicável",
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    reprovado: "Reprovado",
  };
  return labels[status || "nao_aplicavel"];
}

export function statusMembroLabel(status?: StatusMembro) {
  const labels: Record<StatusMembro, string> = {
    nao_definido: "Não definido",
    na_comunidade: "Comunidade",
    somente_canais: "Canais",
    saiu: "Saiu",
    banido: "Ban",
    pausado: "Pausado",
  };
  return labels[status || "nao_definido"];
}

export function corStatusMembro(status?: StatusMembro) {
  const s = status || "nao_definido";
  if (s === "na_comunidade")
    return { bg: "rgba(59,130,246,0.18)", color: "#93c5fd" };
  if (s === "somente_canais")
    return { bg: "rgba(125,211,252,0.18)", color: "#7dd3fc" };
  if (s === "saiu")
    return { bg: "rgba(248,113,113,0.18)", color: "#fca5a5" };
  if (s === "banido")
    return { bg: "rgba(239,68,68,0.22)", color: "#fecaca" };
  if (s === "pausado")
    return { bg: "rgba(168,85,247,0.16)", color: "#d8b4fe" };
  return { bg: "rgba(148,163,184,0.14)", color: "#cbd5e1" };
}

export function atendimentoMembroLabel(status?: AtendimentoMembro | string | null) {
  const s = String(status || "chamar").toLowerCase();
  if (s === "01" || s === "1") return "01";
  if (s === "02" || s === "2") return "02";
  if (s === "concluido" || s === "concluído") return "Concluído";
  if (s === "erro") return "Erro";
  return "Chamar";
}

export function corAtendimentoMembro(status?: AtendimentoMembro | string | null) {
  const s = String(status || "chamar").toLowerCase();
  if (s === "01" || s === "1")
    return { bg: "rgba(253,230,138,0.18)", color: "#fde68a" };
  if (s === "02" || s === "2")
    return { bg: "rgba(254,240,138,0.14)", color: "#fef3c7" };
  if (s === "concluido" || s === "concluído")
    return { bg: "rgba(34,197,94,0.16)", color: "#86efac" };
  if (s === "erro")
    return { bg: "rgba(239,68,68,0.16)", color: "#fca5a5" };
  return { bg: "rgba(245,158,11,0.16)", color: "#fde68a" };
}

export function statusPadraoPorCargo(cargo: Cargo): TrainingStatus {
  return cargo === "lider_treinamento" ? "em_andamento" : "nao_aplicavel";
}

export function corStatus(status: string) {
  const s = normalizar(status);
  if (s.indexOf("conclu") !== -1 || s.indexOf("final") !== -1) {
    return { bg: "rgba(8,116,67,0.22)", color: "#087443" };
  }
  if (s.indexOf("exec") !== -1 || s.indexOf("andamento") !== -1) {
    return { bg: "rgba(37,99,235,0.20)", color: "#93c5fd" };
  }
  if (s.indexOf("interromp") !== -1 || s.indexOf("paus") !== -1) {
    return { bg: "rgba(194,65,12,0.22)", color: "#fb7185" };
  }
  if (s.indexOf("stand") !== -1) {
    return { bg: "rgba(37,99,235,0.20)", color: "#93c5fd" };
  }
  return { bg: "rgba(30,41,59,0.80)", color: "#cbd5e1" };
}

export function numeroSemanaEntrega(valor?: string | number | null) {
  const texto = String(valor || "").trim();
  if (!texto) return 1;

  const match = texto.match(/\d+/);
  if (!match) return 1;

  const numero = Number(match[0]);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

export function labelSemana(numero: number) {
  return `Semana ${String(numero).padStart(2, "0")}`;
}

export function escaparCSV(valor?: string) {
  const texto = String(valor || "").replace(/"/g, '""');
  return `"${texto}"`;
}

export function mapUsuarioDb(item: any): Usuario {
  return {
    id: item.id,
    nome: item.nome || "",
    login: item.login || "",
    cargo: normalizar(item.cargo) as Cargo,
    vinculo: item.vinculo || "",
    training_status: (item.training_status ||
      "nao_aplicavel") as TrainingStatus,
    criado_por: item.criado_por || null,
    data_criacao: item.data_criacao || null,
    acesso_projetos: item.acesso_projetos ?? null,
    acesso_membros: item.acesso_membros ?? null,
    acesso_usuarios: item.acesso_usuarios ?? null,
    acesso_advertencias: item.acesso_advertencias ?? null,
    acesso_aprovacao_advertencias:
      item.acesso_aprovacao_advertencias ?? null,
    acesso_eventos: item.acesso_eventos ?? null,
    acesso_aprovacao_eventos: item.acesso_aprovacao_eventos ?? null,
    acesso_projetos_finalizados:
      item.acesso_projetos_finalizados ?? null,
    acesso_relatorios_projetos: item.acesso_relatorios_projetos ?? null,
    acesso_relatorios_elenco: item.acesso_relatorios_elenco ?? null,
    acesso_relatorios_membros: item.acesso_relatorios_membros ?? null,
    acesso_relatorios_entrada_saida:
      item.acesso_relatorios_entrada_saida ?? null,
    acesso_exportacoes: item.acesso_exportacoes ?? null,
    acesso_treinamentos: item.acesso_treinamentos ?? null,
  };
}

export function mapProjetoDb(item: any, elenco: ElencoItem[]): Projeto {
  return {
    ID: String(item.id),
    Projeto: item.projeto || "",
    Tipo: item.tipo || "",
    Genero: item.genero || "",
    Prioridade: item.prioridade || "",
    Dupla: item.dupla || "",
    Lider: item.lider || "",
    Telefone_Lider: item.telefone_lider || "",
    Editor: item.editor || "",
    Telefone_Editor: item.telefone_editor || "",
    Status: item.status || "",
    Data_Inicio: item.data_inicio || "",
    Video_Editor_Link: item.video_editor_link || "",
    Registro_Semanal: item.registro_semanal || "",
    Observacoes: item.observacoes || "",
    Capa_URL: item.capa_url || "",
    Drive_Pasta_Link: item.drive_pasta_link || item.Drive_Pasta_Link || "",
    Drive_Videos_Link: item.drive_videos_link || item.Drive_Videos_Link || "",
    Drive_Cortes_Link: item.drive_cortes_link || item.Drive_Cortes_Link || "",
    Drive_Final_Link: item.drive_final_link || item.Drive_Final_Link || "",
    Arquivado: Boolean(item.arquivado),
    Elenco: elenco,
  };
}

export function mapMembroDb(item: any): Membro {
  return {
    id: item.id,
    nome: item.nome || "",
    telefone: item.telefone || "",
    email: item.email || "",
    data_nascimento: item.data_nascimento || null,
    idade: item.idade ?? null,
    faixa_etaria: item.faixa_etaria || "",
    idade_inconsistente: Boolean(item.idade_inconsistente),
    habilidades: item.habilidades || "",
    motivacao: item.motivacao || "",
    status: (item.participacao ||
      item.status_comunidade ||
      item.status ||
      "nao_definido") as StatusMembro,
    atendimento: item.atendimento || "chamar",
    movimentacao: item.movimentacao || "",
    data_ficha: item.data_ficha || item.timestamp || null,
    data_entrada: item.data_entrada || null,
    data_saida: item.data_saida || null,
    observacao: item.observacao || "",
  };
}



function mapChatCanalDb(item: any): ChatCanal {
  return {
    id: String(item.id || ""),
    tipo: String(item.tipo || "geral") as ChatCanalTipo,
    nome: item.nome || "",
    projeto_id:
      item.projeto_id === null || item.projeto_id === undefined
        ? null
        : Number(item.projeto_id),
    criado_por: item.criado_por || null,
    created_at: item.created_at || "",
  };
}

function mapChatMensagemDb(item: any): ChatMensagem {
  return {
    id: Number(item.id),
    canal_id: String(item.canal_id || ""),
    usuario_login: item.usuario_login || "",
    usuario_nome: item.usuario_nome || "",
    usuario_cargo: item.usuario_cargo || null,
    mensagem: item.mensagem || "",
    resposta_a_id:
      item.resposta_a_id === null || item.resposta_a_id === undefined
        ? null
        : Number(item.resposta_a_id),
    created_at: item.created_at || "",
    editado_em: item.editado_em || null,
    excluido_em: item.excluido_em || null,
  };
}

function mapChatParticipanteDb(item: any): ChatParticipante {
  return {
    id: item.id === null || item.id === undefined ? undefined : Number(item.id),
    canal_id: String(item.canal_id || ""),
    usuario_login: item.usuario_login || "",
    created_at: item.created_at || undefined,
  };
}

export async function carregarCanaisChat(): Promise<ChatCanal[]> {
  const { data, error } = await supabase
    .from("chat_canais")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar canais do chat:", error);
    return [];
  }

  return (data || []).map(mapChatCanalDb);
}

export async function carregarMensagensChat(
  canalId: string,
  limite = 100
): Promise<ChatMensagem[]> {
  const id = String(canalId || "").trim();

  if (!id) return [];

  const quantidade = Math.max(1, Math.min(Number(limite) || 100, 300));

  const { data, error } = await supabase
    .from("chat_mensagens")
    .select("*")
    .eq("canal_id", id)
    .order("created_at", { ascending: false })
    .limit(quantidade);

  if (error) {
    console.error("Erro ao carregar mensagens do chat:", error);
    return [];
  }

  // A consulta busca as mais recentes primeiro para respeitar o limite.
  // A interface recebe em ordem cronológica para renderizar de cima para baixo.
  return (data || [])
    .map(mapChatMensagemDb)
    .reverse();
}

export async function enviarMensagemChat(
  canalId: string,
  usuario: Usuario,
  mensagem: string,
  respostaAId?: number | null
): Promise<ChatMensagem | null> {
  const id = String(canalId || "").trim();
  const textoMensagem = String(mensagem || "").trim();
  const login = normalizar(usuario?.login);

  if (!id || !textoMensagem || !login) return null;

  const { data, error } = await supabase
    .from("chat_mensagens")
    .insert([
      {
        canal_id: id,
        usuario_login: login,
        usuario_nome: usuario.nome || usuario.login || "Usuário",
        usuario_cargo: usuario.cargo || null,
        mensagem: textoMensagem,
        resposta_a_id:
          respostaAId === null || respostaAId === undefined
            ? null
            : Number(respostaAId),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao enviar mensagem no chat:", error);
    return null;
  }

  return mapChatMensagemDb(data);
}


export async function editarMensagemChat(
  mensagemId: number,
  usuario: Usuario,
  novoTexto: string
): Promise<ChatMensagem | null> {
  const id = Number(mensagemId);
  const login = normalizar(usuario?.login);
  const mensagem = String(novoTexto || "").trim();

  if (!Number.isFinite(id) || !login || !mensagem) return null;

  const { data, error } = await supabase
    .from("chat_mensagens")
    .update({
      mensagem,
      editado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("usuario_login", login)
    .is("excluido_em", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Erro ao editar mensagem do chat:", error);
    return null;
  }

  return data ? mapChatMensagemDb(data) : null;
}

export async function excluirMensagemChat(
  mensagemId: number,
  usuario: Usuario
): Promise<ChatMensagem | null> {
  const id = Number(mensagemId);
  const login = normalizar(usuario?.login);

  if (!Number.isFinite(id) || !login) return null;

  const { data: anexos, error: erroBuscarAnexos } = await supabase
    .from("chat_anexos")
    .select("id,storage_path")
    .eq("mensagem_id", id);

  if (erroBuscarAnexos) {
    console.warn(
      "Não foi possível listar anexos antes da exclusão da mensagem:",
      erroBuscarAnexos
    );
  }

  const caminhos = (anexos || [])
    .map((item: any) => String(item.storage_path || "").trim())
    .filter(Boolean);

  if (caminhos.length) {
    const { error: erroStorage } = await supabase.storage
      .from("chat-anexos")
      .remove(caminhos);

    if (erroStorage) {
      console.warn("Erro ao apagar arquivos anexados:", erroStorage);
    }
  }

  if ((anexos || []).length) {
    const { error: erroMetadata } = await supabase
      .from("chat_anexos")
      .delete()
      .eq("mensagem_id", id);

    if (erroMetadata) {
      console.warn("Erro ao apagar metadados dos anexos:", erroMetadata);
    }
  }

  const { data, error } = await supabase
    .from("chat_mensagens")
    .update({
      mensagem: "",
      excluido_em: new Date().toISOString(),
      editado_em: null,
    })
    .eq("id", id)
    .eq("usuario_login", login)
    .is("excluido_em", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Erro ao excluir mensagem do chat:", error);
    return null;
  }

  return data ? mapChatMensagemDb(data) : null;
}

export async function substituirMencoesMensagem(
  mensagemId: number,
  usuariosLogins: string[]
): Promise<boolean> {
  const id = Number(mensagemId);

  if (!Number.isFinite(id)) return false;

  const { error: erroDelete } = await supabase
    .from("chat_mencoes")
    .delete()
    .eq("mensagem_id", id);

  if (erroDelete) {
    console.error("Erro ao limpar menções anteriores:", erroDelete);
    return false;
  }

  return salvarMencoesMensagem(id, usuariosLogins);
}

export async function carregarPreferenciasChat(
  usuarioLogin: string
): Promise<ChatPreferencia[]> {
  const login = normalizar(usuarioLogin);

  if (!login) return [];

  const { data, error } = await supabase
    .from("chat_preferencias")
    .select("*")
    .eq("usuario_login", login);

  if (error) {
    console.error("Erro ao carregar preferências do chat:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    canal_id: String(item.canal_id || ""),
    usuario_login: item.usuario_login || "",
    silenciado: Boolean(item.silenciado),
    updated_at: item.updated_at || "",
  }));
}

export async function definirChatSilenciado(
  canalId: string,
  usuarioLogin: string,
  silenciado: boolean
): Promise<boolean> {
  const id = String(canalId || "").trim();
  const login = normalizar(usuarioLogin);

  if (!id || !login) return false;

  const { error } = await supabase
    .from("chat_preferencias")
    .upsert(
      {
        canal_id: id,
        usuario_login: login,
        silenciado: Boolean(silenciado),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "canal_id,usuario_login",
      }
    );

  if (error) {
    console.error("Erro ao alterar preferência de notificações:", error);
    return false;
  }

  return true;
}

export async function marcarCanalComoLido(
  canalId: string,
  usuarioLogin: string
): Promise<boolean> {
  const id = String(canalId || "").trim();
  const login = normalizar(usuarioLogin);

  if (!id || !login) return false;

  const { error } = await supabase
    .from("chat_leituras")
    .upsert(
      {
        canal_id: id,
        usuario_login: login,
        ultimo_lido_em: new Date().toISOString(),
      },
      {
        onConflict: "canal_id,usuario_login",
      }
    );

  if (error) {
    console.error("Erro ao marcar canal como lido:", error);
    return false;
  }

  return true;
}

export async function carregarLeiturasChat(
  usuarioLogin: string
): Promise<ChatLeitura[]> {
  const login = normalizar(usuarioLogin);

  if (!login) return [];

  const { data, error } = await supabase
    .from("chat_leituras")
    .select("*")
    .eq("usuario_login", login);

  if (error) {
    console.error("Erro ao carregar leituras do chat:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    canal_id: String(item.canal_id || ""),
    usuario_login: item.usuario_login || "",
    ultimo_lido_em: item.ultimo_lido_em || "",
  }));
}

export async function carregarParticipantesChat(
  canalId?: string
): Promise<ChatParticipante[]> {
  let consulta = supabase
    .from("chat_participantes")
    .select("*")
    .order("created_at", { ascending: true });

  const id = String(canalId || "").trim();

  if (id) {
    consulta = consulta.eq("canal_id", id);
  }

  const { data, error } = await consulta;

  if (error) {
    console.error("Erro ao carregar participantes do chat:", error);
    return [];
  }

  return (data || []).map(mapChatParticipanteDb);
}

export async function adicionarParticipantesChat(
  canalId: string,
  usuariosLogin: string[]
): Promise<boolean> {
  const id = String(canalId || "").trim();

  const logins = Array.from(
    new Set(
      (usuariosLogin || [])
        .map((login) => normalizar(login))
        .filter(Boolean)
    )
  );

  if (!id || !logins.length) return false;

  const payload = logins.map((login) => ({
    canal_id: id,
    usuario_login: login,
  }));

  const { error } = await supabase
    .from("chat_participantes")
    .upsert(payload, {
      onConflict: "canal_id,usuario_login",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("Erro ao adicionar pessoas ao chat:", error);
    return false;
  }

  return true;
}

export async function buscarCanalPadraoChat(
  tipo: "geral" | "diretoria" | "lideres"
): Promise<ChatCanal | null> {
  const { data, error } = await supabase
    .from("chat_canais")
    .select("*")
    .eq("tipo", tipo)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao localizar canal ${tipo}:`, error);
    return null;
  }

  return data ? mapChatCanalDb(data) : null;
}

export async function garantirCanalProjeto(
  projetoId: string | number,
  nomeProjeto: string,
  criadoPor = "Sistema"
): Promise<ChatCanal | null> {
  const idProjeto = Number(projetoId);
  const nome = String(nomeProjeto || "").trim();

  if (!Number.isFinite(idProjeto) || !nome) return null;

  const { data: existente, error: erroBusca } = await supabase
    .from("chat_canais")
    .select("*")
    .eq("tipo", "projeto")
    .eq("projeto_id", idProjeto)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao procurar canal do projeto:", erroBusca);
    return null;
  }

  if (existente) {
    return mapChatCanalDb(existente);
  }

  const { data, error } = await supabase
    .from("chat_canais")
    .insert([
      {
        tipo: "projeto",
        nome,
        projeto_id: idProjeto,
        criado_por: normalizar(criadoPor) || criadoPor || "Sistema",
      },
    ])
    .select("*")
    .single();

  if (!error && data) {
    return mapChatCanalDb(data);
  }

  // Se dois usuários abrirem o mesmo projeto ao mesmo tempo, o índice único
  // pode fazer uma das inserções falhar. Nesse caso buscamos o canal já criado.
  if (error) {
    console.warn(
      "Não foi possível inserir o canal do projeto; tentando localizar novamente:",
      error
    );
  }

  const { data: criadoPorOutro, error: erroNovaBusca } = await supabase
    .from("chat_canais")
    .select("*")
    .eq("tipo", "projeto")
    .eq("projeto_id", idProjeto)
    .maybeSingle();

  if (erroNovaBusca || !criadoPorOutro) {
    console.error("Erro ao confirmar canal do projeto:", erroNovaBusca || error);
    return null;
  }

  return mapChatCanalDb(criadoPorOutro);
}

export async function abrirConversaDireta(
  usuarioAtual: Usuario,
  outroUsuario: Usuario
): Promise<ChatCanal | null> {
  const loginAtual = normalizar(usuarioAtual?.login);
  const loginOutro = normalizar(outroUsuario?.login);

  if (!loginAtual || !loginOutro) return null;

  if (loginAtual === loginOutro) {
    console.warn("Não é possível abrir conversa direta consigo mesmo.");
    return null;
  }

  const { data: canaisDiretos, error: erroCanais } = await supabase
    .from("chat_canais")
    .select("*")
    .eq("tipo", "direta")
    .order("created_at", { ascending: true });

  if (erroCanais) {
    console.error("Erro ao buscar conversas diretas:", erroCanais);
    return null;
  }

  const idsDiretos = (canaisDiretos || []).map((item: any) => String(item.id));

  if (idsDiretos.length) {
    const { data: participantes, error: erroParticipantes } = await supabase
      .from("chat_participantes")
      .select("*")
      .in("canal_id", idsDiretos);

    if (erroParticipantes) {
      console.error(
        "Erro ao buscar participantes das conversas diretas:",
        erroParticipantes
      );
      return null;
    }

    const participantesPorCanal = new Map<string, Set<string>>();

    (participantes || []).forEach((item: any) => {
      const canalId = String(item.canal_id);
      const login = normalizar(item.usuario_login);

      if (!participantesPorCanal.has(canalId)) {
        participantesPorCanal.set(canalId, new Set<string>());
      }

      if (login) {
        participantesPorCanal.get(canalId)!.add(login);
      }
    });

    const existente = (canaisDiretos || []).find((canal: any) => {
      const conjunto = participantesPorCanal.get(String(canal.id));

      return (
        conjunto?.size === 2 &&
        conjunto.has(loginAtual) &&
        conjunto.has(loginOutro)
      );
    });

    if (existente) {
      return mapChatCanalDb(existente);
    }
  }

  const { data: novoCanal, error: erroNovoCanal } = await supabase
    .from("chat_canais")
    .insert([
      {
        tipo: "direta",
        nome: "Conversa direta",
        projeto_id: null,
        criado_por: loginAtual,
      },
    ])
    .select("*")
    .single();

  if (erroNovoCanal || !novoCanal) {
    console.error("Erro ao criar conversa direta:", erroNovoCanal);
    return null;
  }

  const canalCriado = mapChatCanalDb(novoCanal);

  const { error: erroInserirParticipantes } = await supabase
    .from("chat_participantes")
    .insert([
      {
        canal_id: canalCriado.id,
        usuario_login: loginAtual,
      },
      {
        canal_id: canalCriado.id,
        usuario_login: loginOutro,
      },
    ]);

  if (erroInserirParticipantes) {
    console.error(
      "Erro ao adicionar participantes à conversa direta:",
      erroInserirParticipantes
    );

    // Evita deixar uma conversa direta vazia caso a criação dos participantes falhe.
    const { error: erroLimpeza } = await supabase
      .from("chat_canais")
      .delete()
      .eq("id", canalCriado.id);

    if (erroLimpeza) {
      console.error("Erro ao limpar conversa direta incompleta:", erroLimpeza);
    }

    return null;
  }

  return canalCriado;
}

export function assinarMensagensChat(
  canalId: string,
  aoReceber: (mensagem: ChatMensagem) => void
): () => void {
  const id = String(canalId || "").trim();

  if (!id) {
    return () => {};
  }

  const canalRealtime = supabase
    .channel(`chat-mensagens-${id}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_mensagens",
        filter: `canal_id=eq.${id}`,
      },
      (payload: any) => {
        if (!payload?.new) return;
        aoReceber(mapChatMensagemDb(payload.new));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_mensagens",
        filter: `canal_id=eq.${id}`,
      },
      (payload: any) => {
        if (!payload?.new) return;
        aoReceber(mapChatMensagemDb(payload.new));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canalRealtime);
  };
}


function mapChatAnexoDb(item: any, urlTemporaria = ""): ChatAnexo {
  return {
    id: Number(item.id),
    mensagem_id: Number(item.mensagem_id),
    canal_id: String(item.canal_id || ""),
    usuario_login: item.usuario_login || "",
    nome_arquivo: item.nome_arquivo || "arquivo",
    storage_path: item.storage_path || "",
    mime_type: item.mime_type || "application/octet-stream",
    tamanho_bytes: Number(item.tamanho_bytes || 0),
    created_at: item.created_at || "",
    url_temporaria: urlTemporaria,
  };
}

async function criarUrlTemporariaChatAnexo(
  storagePath: string
): Promise<string> {
  const caminho = String(storagePath || "").trim();

  if (!caminho) return "";

  const { data, error } = await supabase.storage
    .from("chat-anexos")
    .createSignedUrl(caminho, 60 * 60);

  if (error) {
    console.error("Erro ao gerar URL temporária do anexo:", error);
    return "";
  }

  return data?.signedUrl || "";
}

export async function carregarAnexosChat(
  canalId: string
): Promise<ChatAnexo[]> {
  const id = String(canalId || "").trim();

  if (!id) return [];

  const { data, error } = await supabase
    .from("chat_anexos")
    .select("*")
    .eq("canal_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar anexos do chat:", error);
    return [];
  }

  return Promise.all(
    (data || []).map(async (item: any) => {
      const url = await criarUrlTemporariaChatAnexo(item.storage_path);
      return mapChatAnexoDb(item, url);
    })
  );
}

function limparNomeArquivoChat(nome: string) {
  const original = String(nome || "arquivo").trim() || "arquivo";

  return original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-140);
}

function gerarIdArquivoChat() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Usa o fallback abaixo.
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function enviarAnexosChat(
  mensagemId: number,
  canalId: string,
  usuario: Usuario,
  arquivos: File[]
): Promise<ChatAnexo[]> {
  const idMensagem = Number(mensagemId);
  const idCanal = String(canalId || "").trim();
  const login = normalizar(usuario?.login);
  const lista = Array.from(arquivos || []);

  if (!Number.isFinite(idMensagem) || !idCanal || !login || !lista.length) {
    return [];
  }

  if (lista.length > 5) {
    throw new Error("Envie no máximo 5 anexos por mensagem.");
  }

  const limitePorArquivo = 25 * 1024 * 1024;
  const limiteTotal = 50 * 1024 * 1024;

  if (
    lista.reduce((total, arquivo) => total + Number(arquivo.size || 0), 0) >
    limiteTotal
  ) {
    throw new Error("Os anexos desta mensagem ultrapassam 50 MB no total.");
  }

  for (const arquivo of lista) {
    if (arquivo.size > limitePorArquivo) {
      throw new Error(
        `${arquivo.name} ultrapassa o limite de 25 MB por arquivo.`
      );
    }
  }

  const anexosCriados: ChatAnexo[] = [];

  for (const arquivo of lista) {
    const nomeSeguro = limparNomeArquivoChat(arquivo.name);
    const storagePath =
      `${idCanal}/${login}/${gerarIdArquivoChat()}-${nomeSeguro}`;

    const { error: erroUpload } = await supabase.storage
      .from("chat-anexos")
      .upload(storagePath, arquivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: arquivo.type || "application/octet-stream",
      });

    if (erroUpload) {
      console.error("Erro ao subir anexo do chat:", erroUpload);
      throw new Error(
        `Não consegui enviar ${arquivo.name}: ${erroUpload.message}`
      );
    }

    const { data: metadata, error: erroMetadata } = await supabase
      .from("chat_anexos")
      .insert([
        {
          mensagem_id: idMensagem,
          canal_id: idCanal,
          usuario_login: login,
          nome_arquivo: arquivo.name,
          storage_path: storagePath,
          mime_type: arquivo.type || "application/octet-stream",
          tamanho_bytes: arquivo.size || 0,
        },
      ])
      .select("*")
      .single();

    if (erroMetadata || !metadata) {
      console.error("Erro ao registrar anexo do chat:", erroMetadata);

      await supabase.storage
        .from("chat-anexos")
        .remove([storagePath]);

      throw new Error(
        `O arquivo ${arquivo.name} foi enviado, mas não consegui vinculá-lo à mensagem.`
      );
    }

    const url = await criarUrlTemporariaChatAnexo(storagePath);
    anexosCriados.push(mapChatAnexoDb(metadata, url));
  }

  return anexosCriados;
}

export function assinarAnexosChat(
  canalId: string,
  aoReceber: (anexo: ChatAnexo) => void
): () => void {
  const id = String(canalId || "").trim();

  if (!id) return () => {};

  const canalRealtime = supabase
    .channel(`chat-anexos-${id}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_anexos",
        filter: `canal_id=eq.${id}`,
      },
      async (payload: any) => {
        if (!payload?.new) return;

        const url = await criarUrlTemporariaChatAnexo(
          payload.new.storage_path
        );

        aoReceber(mapChatAnexoDb(payload.new, url));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canalRealtime);
  };
}


function mapNotificacaoChatDb(item: any): NotificacaoChat {
  return {
    id: Number(item.id),
    destinatario_login: item.destinatario_login || "",
    tipo: String(item.tipo || "mensagem") as TipoNotificacaoChat,
    canal_id:
      item.canal_id === null || item.canal_id === undefined
        ? null
        : String(item.canal_id),
    mensagem_id:
      item.mensagem_id === null || item.mensagem_id === undefined
        ? null
        : Number(item.mensagem_id),
    autor_login: item.autor_login || "",
    autor_nome: item.autor_nome || "",
    titulo: item.titulo || "",
    texto_preview: item.texto_preview || "",
    lida: Boolean(item.lida),
    created_at: item.created_at || "",
    lida_em: item.lida_em || null,
  };
}

export async function carregarNotificacoes(
  usuarioLogin: string,
  limite = 80
): Promise<NotificacaoChat[]> {
  const login = normalizar(usuarioLogin);

  if (!login) return [];

  const quantidade = Math.max(1, Math.min(Number(limite) || 80, 200));

  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("destinatario_login", login)
    .order("created_at", { ascending: false })
    .limit(quantidade);

  if (error) {
    console.error("Erro ao carregar notificações:", error);
    return [];
  }

  return (data || []).map(mapNotificacaoChatDb);
}

export async function contarNotificacoesNaoLidas(
  usuarioLogin: string
): Promise<number> {
  const login = normalizar(usuarioLogin);

  if (!login) return 0;

  const { count, error } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("destinatario_login", login)
    .eq("lida", false);

  if (error) {
    console.error("Erro ao contar notificações não lidas:", error);
    return 0;
  }

  return count || 0;
}

export async function marcarNotificacaoComoLida(
  notificacaoId: number
): Promise<boolean> {
  if (!Number.isFinite(Number(notificacaoId))) return false;

  const { error } = await supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    })
    .eq("id", Number(notificacaoId));

  if (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return false;
  }

  return true;
}

export async function marcarTodasNotificacoesComoLidas(
  usuarioLogin: string
): Promise<boolean> {
  const login = normalizar(usuarioLogin);

  if (!login) return false;

  const { error } = await supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    })
    .eq("destinatario_login", login)
    .eq("lida", false);

  if (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    return false;
  }

  return true;
}

export async function salvarMencoesMensagem(
  mensagemId: number,
  usuariosLogins: string[]
): Promise<boolean> {
  const id = Number(mensagemId);

  if (!Number.isFinite(id)) return false;

  const logins = Array.from(
    new Set(
      (usuariosLogins || [])
        .map((login) => normalizar(login))
        .filter(Boolean)
    )
  );

  if (!logins.length) return true;

  const payload = logins.map((usuarioLogin) => ({
    mensagem_id: id,
    usuario_login: usuarioLogin,
  }));

  const { error } = await supabase
    .from("chat_mencoes")
    .upsert(payload, {
      onConflict: "mensagem_id,usuario_login",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("Erro ao salvar menções da mensagem:", error);
    return false;
  }

  return true;
}

export function assinarNotificacoes(
  usuarioLogin: string,
  aoReceber: (notificacao: NotificacaoChat) => void
): () => void {
  const login = normalizar(usuarioLogin);

  if (!login) {
    return () => {};
  }

  const canalRealtime = supabase
    .channel(`notificacoes-${login}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notificacoes",
        filter: `destinatario_login=eq.${login}`,
      },
      (payload: any) => {
        if (!payload?.new) return;
        aoReceber(mapNotificacaoChatDb(payload.new));
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notificacoes",
        filter: `destinatario_login=eq.${login}`,
      },
      (payload: any) => {
        if (!payload?.new) return;
        aoReceber(mapNotificacaoChatDb(payload.new));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canalRealtime);
  };
}

export async function criarEstruturaDriveViaFunction(
  projetoNome: string,
  leaderEmail = "",
  editorEmail = ""
): Promise<DriveStructureResult> {
  const { data, error } = await supabase.functions.invoke(
    DRIVE_PROXY_FUNCTION_NAME,
    {
      body: {
        action: "criar_estrutura_drive",
        projectName: projetoNome,
        leaderEmail,
        editorEmail,
        folders: ["1 | Seleção", "2 | Projeto", "3 | Finalizado"],
      },
    }
  );

  if (error) {
    const detalhe = await extrairMensagemErroFunctions(error);
    console.error("Erro da Edge Function Google Drive:", error, detalhe);
    throw new Error(
      `Não foi possível criar a estrutura do Drive: ${detalhe}`
    );
  }

  if (!data) {
    throw new Error("A Edge Function do Drive não retornou dados.");
  }

  if (data.ok === false || data.error) {
    console.error("Erro retornado pela Edge Function do Drive:", data);
    throw new Error(
      String(data.error || data.message || "Erro na integração Google Drive")
    );
  }

  return data as DriveStructureResult;
}

export async function compartilharPastaDriveComUsuario(
  pastaIdOuUrl: string,
  email: string
): Promise<boolean> {
  const folderId = extrairGoogleFolderId(pastaIdOuUrl);
  const emailNormalizado = String(email || "").trim().toLowerCase();

  if (!folderId || !emailNormalizado) return false;

  const { data, error } = await supabase.functions.invoke(
    DRIVE_PROXY_FUNCTION_NAME,
    {
      body: {
        action: "compartilhar_pasta",
        folderId,
        email: emailNormalizado,
        role: "writer",
      },
    }
  );

  if (error) {
    const detalhe = await extrairMensagemErroFunctions(error);
    console.error("Erro ao compartilhar a pasta do projeto no Drive:", error, detalhe);
    throw new Error(
      `Não foi possível liberar acesso à pasta: ${detalhe}`
    );
  }

  if (data?.ok === false || data?.error) {
    throw new Error(
      String(data.error || data.message || "Não foi possível liberar acesso à pasta.")
    );
  }

  return true;
}

export type OpcoesFormulariosProjeto = {
  projectId?: string;
  projectType?: string;
  mainFolderId?: string;
  formSelecao?: string;
  formEntregas?: string;
  semanasAbertas?: string[];
};

function integracaoFormsNovaConfigurada() {
  return FORMS_PROXY_ENABLED && Boolean(FORMS_PROXY_FUNCTION_NAME);
}

async function extrairMensagemErroFunctions(error: any): Promise<string> {
  let detalhe = String(error?.message || "Falha desconhecida ao chamar o backend.");

  // O SDK da Supabase guarda a Response HTTP em error.context.
  // Tentamos ler uma cópia para mostrar o erro real retornado pela Edge Function.
  try {
    const context = error?.context;
    if (context && typeof context.clone === "function") {
      const cloned = context.clone();
      const corpo = await cloned.json().catch(() => null);
      detalhe = String(corpo?.error || corpo?.message || detalhe);
    }
  } catch {
    // Mantém a mensagem original do SDK.
  }

  return detalhe;
}

async function chamarAppsScriptFormularios(
  payload: Record<string, unknown>
): Promise<any> {
  if (!integracaoFormsNovaConfigurada()) {
    throw new Error(
      "A integração Google Forms está desativada. Ative VITE_DUBWORKS_FORMS_PROXY_ENABLED e implante a função google-forms-proxy."
    );
  }

  // IMPORTANTE: o navegador NÃO chama mais script.google.com diretamente.
  // Frontend -> Supabase Edge Function -> Apps Script -> Google Forms.
  // Isso elimina o bloqueio CORS do Apps Script no localhost e na produção.
  const { data, error } = await supabase.functions.invoke(
    FORMS_PROXY_FUNCTION_NAME,
    {
      body: payload,
    }
  );

  if (error) {
    const detalhe = await extrairMensagemErroFunctions(error);
    console.error("Erro no proxy dos formulários (Supabase):", error, detalhe);
    throw new Error(
      `Não foi possível acessar a integração Google Forms pelo backend: ${detalhe}`
    );
  }

  if (!data) {
    throw new Error("O proxy do Google Forms não retornou dados.");
  }

  if (data.ok === false || data.error) {
    console.error("Erro retornado pela integração Google Forms:", data);
    throw new Error(
      String(data.error || data.message || "Erro na integração Google Forms")
    );
  }

  return data;
}

export async function copiarFormulariosViaAppsScript(
  projetoNome: string,
  respostasSelecaoFolderId?: string,
  entregasFolderId?: string,
  personagens: string[] = [],
  opcoes: OpcoesFormulariosProjeto = {}
): Promise<Partial<DriveStructureResult>> {
  if (!respostasSelecaoFolderId || !entregasFolderId) {
    console.warn("Pastas para formulários ausentes:", {
      respostasSelecaoFolderId,
      entregasFolderId,
    });
    return {};
  }

  const payload: Record<string, unknown> = integracaoFormsNovaConfigurada()
    ? {
        action: "preparar_formularios_projeto",
        projectId: opcoes.projectId || "",
        projectName: projetoNome,
        projectType: opcoes.projectType || "Projeto",
        mainFolderId: opcoes.mainFolderId || "",
        respostasSelecaoFolderId,
        entregasFolderId,
        existingSelectionFormId: extrairGoogleFileId(opcoes.formSelecao || ""),
        existingDeliveriesFormId: extrairGoogleFileId(opcoes.formEntregas || ""),
        personagens,
        personagensSelecao: personagens,
        // Entregas não depende de personagem; a identificação é telefone + semana.
        semanasAbertas: opcoes.semanasAbertas || [],
      }
    : {
        // Compatibilidade com o Apps Script antigo enquanto a nova implantação
        // ainda não estiver configurada no .env.local.
        projectName: projetoNome,
        respostasSelecaoFolderId,
        entregasFolderId,
        personagens,
        personagensSelecao: personagens,
        personagensEntregas: personagens,
      };

  const data = await chamarAppsScriptFormularios(payload);

  return {
    formSelecao: data.formSelecao?.editUrl || data.formSelecao?.viewUrl || "",
    formSelecaoId: data.formSelecao?.id || "",
    formEntregas:
      data.formEntregas?.editUrl || data.formEntregas?.viewUrl || "",
    formEntregasId: data.formEntregas?.id || "",
    planilhaSelecao: data.planilhaSelecao?.url || "",
    planilhaSelecaoId: data.planilhaSelecao?.id || "",
    planilhaEntregas: data.planilhaEntregas?.url || "",
    planilhaEntregasId: data.planilhaEntregas?.id || "",
  };
}

export async function sincronizarFormularioEntregasViaAppsScript(
  formIdOuUrl: string,
  semanasAbertas: string[]
): Promise<boolean> {
  if (!integracaoFormsNovaConfigurada()) return false;
  const formId = extrairGoogleFileId(formIdOuUrl);
  if (!formId) return false;

  await chamarAppsScriptFormularios({
    action: "sincronizar_form_entregas",
    formId,
    semanasAbertas,
  });
  return true;
}

export async function sincronizarFormularioSelecaoViaAppsScript(
  formIdOuUrl: string,
  personagens: string[]
): Promise<boolean> {
  if (!integracaoFormsNovaConfigurada()) return false;
  const formId = extrairGoogleFileId(formIdOuUrl);
  if (!formId) return false;

  await chamarAppsScriptFormularios({
    action: "sincronizar_form_selecao",
    formId,
    personagens,
    personagensSelecao: personagens,
  });
  return true;
}

export type TelefoneProjetoNormalizado = {
  original: string;
  completo: string;
  local: string;
  possuiDDD: boolean;
};

export function normalizarTelefoneProjeto(
  valor?: string | null
): TelefoneProjetoNormalizado {
  const original = String(valor || "").trim();
  let digitos = original.replace(/\D/g, "");

  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (
    (digitos.length === 12 || digitos.length === 13) &&
    digitos.startsWith("55")
  ) {
    digitos = digitos.slice(2);
  }
  if (digitos.length === 12 && digitos.startsWith("0")) {
    digitos = digitos.slice(1);
  }

  if (digitos.length === 10 || digitos.length === 11) {
    return {
      original,
      completo: digitos,
      local: digitos.slice(2),
      possuiDDD: true,
    };
  }

  if (digitos.length === 8 || digitos.length === 9) {
    return {
      original,
      completo: "",
      local: digitos,
      possuiDDD: false,
    };
  }

  return {
    original,
    completo: digitos.length >= 10 ? digitos : "",
    local: digitos.length > 9 ? digitos.slice(-9) : digitos,
    possuiDDD: digitos.length >= 10,
  };
}

function variantesNumeroLocal(numero: string) {
  const base = String(numero || "").replace(/\D/g, "");
  const variantes = new Set<string>();
  if (!base) return variantes;
  variantes.add(base);

  // Compatibilidade com cadastros antigos sem o nono dígito.
  if (base.length === 9 && base.startsWith("9")) {
    variantes.add(base.slice(1));
  }
  if (base.length === 8 && /^[6-9]/.test(base)) {
    variantes.add(`9${base}`);
  }
  return variantes;
}

export type ResolucaoTelefoneEntrega = {
  status: "vinculado" | "nao_encontrado" | "ambiguo" | "telefone_invalido";
  participante?: ParticipanteSemanaProjeto;
  candidatos: ParticipanteSemanaProjeto[];
  telefoneNormalizado: string;
  detalhe: string;
};

export function resolverParticipanteEntregaPorTelefone(
  telefone: string,
  participantes: ParticipanteSemanaProjeto[]
): ResolucaoTelefoneEntrega {
  const entrada = normalizarTelefoneProjeto(telefone);
  const dedupe = (lista: ParticipanteSemanaProjeto[]) => {
    const mapa = new Map<string, ParticipanteSemanaProjeto>();
    lista.forEach((item) => {
      const chave = [
        normalizar(item.personagem),
        normalizar(item.dublador),
        normalizarTelefoneProjeto(item.telefone_dublador).completo ||
          normalizarTelefoneProjeto(item.telefone_dublador).local,
      ].join("|");
      if (!mapa.has(chave)) mapa.set(chave, item);
    });
    return Array.from(mapa.values());
  };

  if (!entrada.completo && !entrada.local) {
    return {
      status: "telefone_invalido",
      candidatos: [],
      telefoneNormalizado: "",
      detalhe: "O telefone informado não possui dígitos suficientes.",
    };
  }

  let candidatos: ParticipanteSemanaProjeto[] = [];

  if (entrada.completo) {
    candidatos = participantes.filter((item) => {
      const cadastrado = normalizarTelefoneProjeto(item.telefone_dublador);
      if (cadastrado.completo === entrada.completo) return true;

      // Caso um cadastro antigo tenha 8 dígitos e o outro 9, compara também
      // as variantes locais, mas mantém o mesmo DDD.
      if (
        cadastrado.completo &&
        cadastrado.completo.slice(0, 2) === entrada.completo.slice(0, 2)
      ) {
        const locaisEntrada = variantesNumeroLocal(entrada.local);
        const locaisCadastrado = variantesNumeroLocal(cadastrado.local);
        return Array.from(locaisEntrada).some((v) => locaisCadastrado.has(v));
      }
      return false;
    });
  } else {
    const locaisEntrada = variantesNumeroLocal(entrada.local);
    candidatos = participantes.filter((item) => {
      const cadastrado = normalizarTelefoneProjeto(item.telefone_dublador);
      const locaisCadastrado = variantesNumeroLocal(cadastrado.local);
      return Array.from(locaisEntrada).some((v) => locaisCadastrado.has(v));
    });
  }

  candidatos = dedupe(candidatos);

  if (!candidatos.length) {
    return {
      status: "nao_encontrado",
      candidatos: [],
      telefoneNormalizado: entrada.completo || entrada.local,
      detalhe: entrada.possuiDDD
        ? "Nenhum participante da semana possui este telefone."
        : "Nenhum participante da semana possui este número local.",
    };
  }

  if (candidatos.length > 1) {
    return {
      status: "ambiguo",
      candidatos,
      telefoneNormalizado: entrada.completo || entrada.local,
      detalhe: entrada.possuiDDD
        ? "O mesmo telefone está associado a mais de um personagem nesta semana."
        : "O número foi informado sem DDD e corresponde a mais de uma pessoa/personagem nesta semana.",
    };
  }

  return {
    status: "vinculado",
    participante: candidatos[0],
    candidatos,
    telefoneNormalizado: entrada.completo || entrada.local,
    detalhe: entrada.possuiDDD
      ? "Participante localizado pelo telefone."
      : "Participante localizado pelo número local sem DDD; havia uma única correspondência na semana.",
  };
}

export function extrairGoogleFileId(urlOuId?: string) {
  const texto = String(urlOuId || "").trim();
  if (!texto) return "";

  const matchD = texto.match(/\/d\/([^/]+)/);
  if (matchD?.[1]) return matchD[1];

  const matchId = texto.match(/[?&]id=([^&]+)/);
  if (matchId?.[1]) return matchId[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;

  return "";
}

export function extrairGoogleFolderId(urlOuId?: string) {
  const texto = String(urlOuId || "").trim();
  if (!texto) return "";

  const matchFolders = texto.match(/\/folders\/([^/?]+)/);
  if (matchFolders?.[1]) return matchFolders[1];

  const matchId = texto.match(/[?&]id=([^&]+)/);
  if (matchId?.[1]) return matchId[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;

  return "";
}

export function converterDriveParaPreview(url?: string) {
  const id = extrairGoogleFileId(url);
  if (!id) return String(url || "");
  return `https://drive.google.com/file/d/${id}/preview`;
}

export async function lerRespostasSelecaoViaAppsScript(
  planilhaSelecaoIdOuUrl: string,
  pastaRespostasSelecaoIdOuUrl = ""
): Promise<RespostaSelecao[]> {
  const spreadsheetId = extrairGoogleFileId(planilhaSelecaoIdOuUrl);
  const folderId = extrairGoogleFolderId(pastaRespostasSelecaoIdOuUrl);

  if (!spreadsheetId && !folderId) {
    throw new Error(
      "Não encontrei a planilha de seleção nem a pasta de respostas neste projeto."
    );
  }

  if (spreadsheetId && integracaoFormsNovaConfigurada()) {
    try {
      const direto = await chamarAppsScriptFormularios({
        action: "ler_respostas_selecao",
        spreadsheetId,
      });
      return (direto.respostas || []).map((item: any, index: number) => ({
        id: String(item.id || item.linha || index + 1),
        linha: Number(item.linha || index + 2),
        timestamp: item.timestamp || item.data || "",
        nome: item.nome || item.membro || "",
        telefone: item.telefone || item.numero || item.whatsapp || "",
        personagem: item.personagem || "",
        semana: item.semana || "Semana 01",
        videoUrl: item.videoUrl || item.video || item.envio || item.link || "",
        comentario: item.comentario || item.observacao || "",
        status: (item.status || "pendente") as StatusSelecao,
      }));
    } catch (erro) {
      console.warn(
        "Leitura direta pelo Apps Script falhou; tentando Edge Function antiga.",
        erro
      );
    }
  }

  const { data, error } = await supabase.functions.invoke(
    DRIVE_PROXY_FUNCTION_NAME,
    {
      body: {
        action: "ler_respostas_selecao",
        spreadsheetId,
        folderId,
      },
    }
  );

  if (error) {
    const detalhe = await extrairMensagemErroFunctions(error);
    throw new Error(`Não foi possível ler respostas da Seleção: ${detalhe}`);
  }
  if (!data) throw new Error("A integração de Seleção não retornou dados.");
  if (data.ok === false || data.error) {
    throw new Error(String(data.error || data.message || "Erro ao ler respostas da Seleção."));
  }

  return (data.respostas || []).map((item: any, index: number) => ({
    id: String(item.id || item.linha || index + 1),
    linha: Number(item.linha || index + 2),
    timestamp: item.timestamp || item.data || "",
    nome: item.nome || item.membro || "",
    telefone: item.telefone || item.numero || item.whatsapp || "",
    personagem: item.personagem || "",
    semana: item.semana || "Semana 01",
    videoUrl: item.videoUrl || item.video || item.envio || item.link || "",
    comentario: item.comentario || item.observacao || "",
    status: (item.status || "pendente") as StatusSelecao,
  }));
}

export async function salvarAvaliacaoSelecaoBanco(
  avaliacao: AvaliacaoSelecao
): Promise<boolean> {
  const payload = {
    projeto_id: avaliacao.projeto_id,
    resposta_id: avaliacao.resposta_id,
    linha: avaliacao.linha ?? null,
    nome: avaliacao.nome,
    telefone: avaliacao.telefone,
    personagem: avaliacao.personagem,
    semana: avaliacao.semana,
    video_url: avaliacao.video_url,
    comentario_membro: avaliacao.comentario_membro,
    status: avaliacao.status,
    comentario_lider: avaliacao.comentario_lider,
    avaliado_por: avaliacao.avaliado_por,
  };

  const { error } = await supabase.from("selecao_avaliacoes").upsert(payload, {
    onConflict: "projeto_id,resposta_id",
  });

  if (error) {
    console.error("Erro ao salvar avaliação da seleção:", error);
    return false;
  }

  return true;
}

export async function carregarAvaliacoesSelecaoBanco(
  projetoId: string
): Promise<AvaliacaoSelecao[]> {
  const { data, error } = await supabase
    .from("selecao_avaliacoes")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("Erro ao carregar avaliações da seleção:", error);
    return [];
  }

  return (data || []) as AvaliacaoSelecao[];
}

export async function lerRespostasEntregasViaEdge(
  planilhaEntregasIdOuUrl: string,
  pastaEntregasIdOuUrl = ""
): Promise<EntregaProducao[]> {
  const spreadsheetId = extrairGoogleFileId(planilhaEntregasIdOuUrl);
  const folderId = extrairGoogleFolderId(pastaEntregasIdOuUrl);

  if (!spreadsheetId && !folderId) {
    throw new Error(
      "Não encontrei a planilha nem a pasta de entregas neste projeto."
    );
  }

  if (spreadsheetId && integracaoFormsNovaConfigurada()) {
    try {
      const direto = await chamarAppsScriptFormularios({
        action: "ler_respostas_entregas",
        spreadsheetId,
      });
      return (direto.respostas || []).map((item: any, index: number) => ({
        projeto_id: 0,
        resposta_id: String(item.id || item.linha || index + 1),
        linha: Number(item.linha || index + 2),
        personagem: item.personagem || "",
        dublador: item.dublador || item.nome || item.membro || "",
        telefone: item.telefone || item.numero || item.whatsapp || "",
        semana: item.semana || "Semana 01",
        video_url: item.videoUrl || item.video || item.envio || item.link || "",
        comentario: item.comentario || item.observacao || "",
        status: (item.status || "pendente") as
          | "pendente"
          | "aprovado"
          | "regravacao",
        data_envio: item.timestamp || item.data || "",
      }));
    } catch (erro) {
      console.warn(
        "Leitura direta de entregas pelo Apps Script falhou; tentando Edge Function antiga.",
        erro
      );
    }
  }

  const { data, error } = await supabase.functions.invoke(
    DRIVE_PROXY_FUNCTION_NAME,
    {
      body: {
        action: "ler_respostas_entregas",
        spreadsheetId,
        folderId,
      },
    }
  );

  if (error) {
    const detalhe = await extrairMensagemErroFunctions(error);
    throw new Error(`Não foi possível ler respostas de Entregas: ${detalhe}`);
  }
  if (!data) throw new Error("A integração de Entregas não retornou dados.");
  if (data.ok === false || data.error) {
    throw new Error(String(data.error || data.message || "Erro ao ler respostas de Entregas."));
  }

  return (data.respostas || []).map((item: any, index: number) => ({
    projeto_id: 0,
    resposta_id: String(item.id || item.linha || index + 1),
    linha: Number(item.linha || index + 2),
    personagem: item.personagem || "",
    dublador: item.dublador || item.nome || item.membro || "",
    telefone: item.telefone || item.numero || item.whatsapp || "",
    semana: item.semana || "Semana 01",
    video_url: item.videoUrl || item.video || item.envio || item.link || "",
    comentario: item.comentario || item.observacao || "",
    status: (item.status || "pendente") as
      | "pendente"
      | "aprovado"
      | "regravacao",
    data_envio: item.timestamp || item.data || "",
  }));
}

export async function salvarEntregasProducaoBanco(
  projetoId: string,
  entregas: EntregaProducao[]
): Promise<boolean> {
  if (!entregas.length) return true;

  const payload = entregas.map((item) => ({
    projeto_id: Number(projetoId),
    resposta_id: item.resposta_id,
    linha: item.linha ?? null,
    personagem: item.personagem,
    dublador: item.dublador,
    telefone: item.telefone,
    semana: item.semana,
    video_url: item.video_url,
    comentario: item.comentario,
    status: item.status || "pendente",
    data_envio: item.data_envio || "",
  }));

  const { error } = await supabase
    .from("entregas_producao")
    .upsert(payload, { onConflict: "projeto_id,resposta_id" });

  if (error) {
    console.error("Erro ao salvar entregas de produção:", error);
    return false;
  }

  return true;
}

export async function carregarEntregasProducaoBanco(
  projetoId: string
): Promise<EntregaProducao[]> {
  const { data, error } = await supabase
    .from("entregas_producao")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar entregas de produção:", error);
    return [];
  }

  return (data || []) as EntregaProducao[];
}

export async function atualizarStatusEntregaBanco(
  entregaId: number,
  status: "pendente" | "aprovado" | "regravacao",
  avaliadoPor: string
): Promise<boolean> {
  const { error } = await supabase
    .from("entregas_producao")
    .update({
      status,
      avaliado_por: avaliadoPor,
      data_avaliacao: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", entregaId);

  if (error) {
    console.error("Erro ao atualizar status da entrega:", error);
    return false;
  }

  return true;
}

export async function carregarSemanasProjetoBanco(
  projetoId: string
): Promise<ProjetoSemana[]> {
  const { data, error } = await supabase
    .from("projeto_semanas")
    .select("*")
    .eq("projeto_id", Number(projetoId))
    .order("semana", { ascending: true });

  if (error) {
    console.error("Erro ao carregar semanas do projeto:", error);
    return [];
  }

  return (data || []) as ProjetoSemana[];
}

export async function garantirSemanaProjetoBanco(
  projetoId: string,
  semana = 1,
  usuario = "Sistema"
): Promise<boolean> {
  const { error } = await supabase.from("projeto_semanas").upsert(
    {
      projeto_id: Number(projetoId),
      semana,
      status: "aberta",
      liberada_por: usuario,
    },
    { onConflict: "projeto_id,semana" }
  );

  if (error) {
    console.error("Erro ao garantir semana do projeto:", error);
    return false;
  }

  return true;
}

export async function concluirSemanaProjetoBanco(
  projetoId: string,
  semana: number,
  usuario = "Sistema"
): Promise<boolean> {
  const { error: erroFechar } = await supabase
    .from("projeto_semanas")
    .update({
      status: "concluida",
      fechada_em: new Date().toISOString(),
      liberada_por: usuario,
    })
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana);

  if (erroFechar) {
    console.error("Erro ao concluir semana:", erroFechar);
    return false;
  }

  const { error: erroAbrir } = await supabase.from("projeto_semanas").upsert(
    {
      projeto_id: Number(projetoId),
      semana: semana + 1,
      status: "aberta",
      liberada_por: usuario,
    },
    { onConflict: "projeto_id,semana" }
  );

  if (erroAbrir) {
    console.error("Erro ao liberar próxima semana:", erroAbrir);
    return false;
  }

  return true;
}


// =========================================================
// BANCO DO PROJETO + PARTICIPANTES POR SEMANA
// =========================================================

export interface ParticipanteSemanaProjeto {
  id: number;
  projeto_semana_id: number;
  elenco_id: number;
  personagem: string;
  dublador: string;
  telefone_dublador: string;
  funcao: string;
  adicionado_por: string;
  criado_em: string;
}

export type SituacaoAtividadeSemanal =
  | "normal"
  | "atencao"
  | "critico"
  | "aguardando_analise"
  | "regravacao"
  | "sem_dados"
  | "concluida";

export interface ParticipanteAtividadeSemanal {
  personagem: string;
  dublador: string;
  telefone: string;
  status: "nao_entregou" | "aguardando_analise" | "aprovado" | "regravacao";
  data_envio?: string | null;
  data_avaliacao?: string | null;
  comentario?: string | null;
}

export interface AtividadeSemanalProjeto {
  projetoId: string;
  projeto: string;
  lider: string;
  editor: string;
  statusProjeto: string;
  semana: number | null;
  semanaStatus: "aberta" | "concluida" | null;
  abertaEm?: string | null;
  prazoEm?: string | null;
  ultimaAtividade?: string | null;
  previstos: number;
  entregaram: number;
  naoEntregaram: number;
  pendentes: number;
  aprovados: number;
  regravacoes: number;
  progressoRecebimento: number;
  progressoAprovacao: number;
  situacao: SituacaoAtividadeSemanal;
  participantes: ParticipanteAtividadeSemanal[];
}

function telefoneRelatorio(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function timestampRelatorio(valor?: string | null) {
  if (!valor) return 0;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

function dataMaisRecenteRelatorio(valores: Array<string | null | undefined>) {
  const validos = valores
    .filter((valor): valor is string => Boolean(valor))
    .map((valor) => ({ valor, tempo: timestampRelatorio(valor) }))
    .filter((item) => item.tempo > 0)
    .sort((a, b) => b.tempo - a.tempo);
  return validos[0]?.valor || null;
}

export async function carregarAtividadeSemanalProjetosBanco(
  projetos: Projeto[]
): Promise<AtividadeSemanalProjeto[]> {
  const projetosValidos = projetos.filter((projeto) => {
    const id = Number(projeto.ID);
    return Number.isFinite(id) && id > 0;
  });

  if (!projetosValidos.length) return [];

  const projetoIds = projetosValidos.map((projeto) => Number(projeto.ID));

  const [{ data: semanasRaw, error: erroSemanas }, { data: entregasRaw, error: erroEntregas }] =
    await Promise.all([
      supabase
        .from("projeto_semanas")
        .select("*")
        .in("projeto_id", projetoIds)
        .order("semana", { ascending: false }),
      supabase
        .from("entregas_producao")
        .select("*")
        .in("projeto_id", projetoIds),
    ]);

  if (erroSemanas) {
    console.error("Erro ao carregar semanas para atividade semanal:", erroSemanas);
  }
  if (erroEntregas) {
    console.error("Erro ao carregar entregas para atividade semanal:", erroEntregas);
  }

  const semanas = (semanasRaw || []) as Array<ProjetoSemana & { prazo_em?: string | null }>;
  const entregas = (entregasRaw || []) as Array<EntregaProducao & {
    criado_em?: string | null;
    atualizado_em?: string | null;
  }>;

  const semanaAtualPorProjeto = new Map<number, ProjetoSemana & { prazo_em?: string | null }>();

  for (const projeto of projetosValidos) {
    const id = Number(projeto.ID);
    const candidatas = semanas
      .filter((semana) => Number(semana.projeto_id) === id)
      .sort((a, b) => Number(b.semana || 0) - Number(a.semana || 0));

    const escolhida = candidatas.find((semana) => semana.status === "aberta") || candidatas[0];
    if (escolhida) semanaAtualPorProjeto.set(id, escolhida);
  }

  const semanaIds = Array.from(semanaAtualPorProjeto.values())
    .map((semana) => Number(semana.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  let participantesRaw: any[] = [];
  if (semanaIds.length) {
    const { data, error } = await supabase
      .from("projeto_semana_elenco")
      .select("*")
      .in("projeto_semana_id", semanaIds)
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao carregar participantes para atividade semanal:", error);
    } else {
      participantesRaw = data || [];
    }
  }

  const agora = Date.now();

  return projetosValidos.map((projeto) => {
    const projetoId = Number(projeto.ID);
    const semana = semanaAtualPorProjeto.get(projetoId) || null;

    if (!semana?.id) {
      return {
        projetoId: projeto.ID,
        projeto: projeto.Projeto || `Projeto #${projeto.ID}`,
        lider: projeto.Lider || "",
        editor: projeto.Editor || "",
        statusProjeto: projeto.Status || "",
        semana: null,
        semanaStatus: null,
        abertaEm: null,
        prazoEm: null,
        ultimaAtividade: null,
        previstos: 0,
        entregaram: 0,
        naoEntregaram: 0,
        pendentes: 0,
        aprovados: 0,
        regravacoes: 0,
        progressoRecebimento: 0,
        progressoAprovacao: 0,
        situacao: "sem_dados" as const,
        participantes: [],
      };
    }

    const participantes = participantesRaw
      .filter((item) => Number(item.projeto_semana_id) === Number(semana.id))
      .map((item) => ({
        personagem: String(item.personagem_snapshot || ""),
        dublador: String(item.dublador_snapshot || ""),
        telefone: String(item.telefone_snapshot || ""),
        criadoEm: String(item.criado_em || ""),
      }));

    const entregasSemana = entregas
      .filter(
        (entrega) =>
          Number(entrega.projeto_id) === projetoId &&
          numeroSemanaEntrega(entrega.semana) === Number(semana.semana)
      )
      .sort((a, b) => {
        const dataA = Math.max(
          timestampRelatorio(a.data_avaliacao),
          timestampRelatorio(a.data_envio),
          timestampRelatorio(a.atualizado_em),
          timestampRelatorio(a.criado_em)
        );
        const dataB = Math.max(
          timestampRelatorio(b.data_avaliacao),
          timestampRelatorio(b.data_envio),
          timestampRelatorio(b.atualizado_em),
          timestampRelatorio(b.criado_em)
        );
        return dataB - dataA;
      });

    const detalhes: ParticipanteAtividadeSemanal[] = participantes.map((participante) => {
      const telefone = telefoneRelatorio(participante.telefone);
      const personagem = normalizar(participante.personagem);
      const dublador = normalizar(participante.dublador);

      const entrega = entregasSemana.find((item) => {
        const telefoneEntrega = telefoneRelatorio(item.telefone);
        const personagemEntrega = normalizar(item.personagem);
        const dubladorEntrega = normalizar(item.dublador);
        if (personagem && personagemEntrega !== personagem) return false;
        if (telefone && telefoneEntrega && telefone === telefoneEntrega) return true;
        return Boolean(dublador && dubladorEntrega === dublador);
      });

      const status: ParticipanteAtividadeSemanal["status"] = !entrega
        ? "nao_entregou"
        : entrega.status === "aprovado"
        ? "aprovado"
        : entrega.status === "regravacao"
        ? "regravacao"
        : "aguardando_analise";

      return {
        personagem: participante.personagem,
        dublador: participante.dublador,
        telefone: participante.telefone,
        status,
        data_envio: entrega?.data_envio || null,
        data_avaliacao: entrega?.data_avaliacao || null,
        comentario: entrega?.comentario || null,
      };
    });

    const previstos = detalhes.length;
    const naoEntregaram = detalhes.filter((item) => item.status === "nao_entregou").length;
    const entregaram = previstos - naoEntregaram;
    const pendentes = detalhes.filter((item) => item.status === "aguardando_analise").length;
    const aprovados = detalhes.filter((item) => item.status === "aprovado").length;
    const regravacoes = detalhes.filter((item) => item.status === "regravacao").length;
    const progressoRecebimento = previstos ? Math.round((entregaram / previstos) * 100) : 0;
    const progressoAprovacao = previstos ? Math.round((aprovados / previstos) * 100) : 0;

    const ultimaAtividade = dataMaisRecenteRelatorio([
      semana.aberta_em,
      semana.fechada_em,
      ...participantes.map((item) => item.criadoEm),
      ...entregasSemana.flatMap((item) => [
        item.data_envio,
        item.data_avaliacao,
        item.atualizado_em,
        item.criado_em,
      ]),
    ]);

    const prazoTs = timestampRelatorio(semana.prazo_em);
    const prazoVencido =
      semana.status === "aberta" && prazoTs > 0 && prazoTs < agora;

    let situacao: SituacaoAtividadeSemanal = "normal";
    if (semana.status === "concluida") {
      situacao = "concluida";
    } else if (!previstos) {
      situacao = "sem_dados";
    } else if (prazoVencido && (naoEntregaram > 0 || aprovados < previstos)) {
      situacao = "critico";
    } else if (regravacoes > 0) {
      situacao = "regravacao";
    } else if (pendentes > 0) {
      situacao = "aguardando_analise";
    } else if (naoEntregaram > 0) {
      situacao = "atencao";
    }

    return {
      projetoId: projeto.ID,
      projeto: projeto.Projeto || `Projeto #${projeto.ID}`,
      lider: projeto.Lider || "",
      editor: projeto.Editor || "",
      statusProjeto: projeto.Status || "",
      semana: Number(semana.semana) || 1,
      semanaStatus: semana.status || null,
      abertaEm: semana.aberta_em || null,
      prazoEm: semana.prazo_em || null,
      ultimaAtividade,
      previstos,
      entregaram,
      naoEntregaram,
      pendentes,
      aprovados,
      regravacoes,
      progressoRecebimento,
      progressoAprovacao,
      situacao,
      participantes: detalhes,
    };
  });
}

export async function criarProximaSemanaProjetoBanco(
  projetoId: string,
  usuario = "Sistema"
): Promise<ProjetoSemana | null> {
  const projetoNumero = Number(projetoId);

  if (!Number.isFinite(projetoNumero)) return null;

  const { data: ultimaSemana, error: erroUltima } = await supabase
    .from("projeto_semanas")
    .select("*")
    .eq("projeto_id", projetoNumero)
    .order("semana", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroUltima) {
    console.error("Erro ao localizar a última semana:", erroUltima);
    return null;
  }

  const proximaSemana = Number(ultimaSemana?.semana || 0) + 1;
  const prazo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("projeto_semanas")
    .insert([
      {
        projeto_id: projetoNumero,
        semana: proximaSemana,
        status: "aberta",
        liberada_por: usuario,
        prazo_em: prazo,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar próxima semana:", error);
    return null;
  }

  return data as ProjetoSemana;
}

export async function fecharSemanaProjetoBanco(
  projetoId: string,
  semana: number,
  usuario = "Sistema"
): Promise<boolean> {
  const { error } = await supabase
    .from("projeto_semanas")
    .update({
      status: "concluida",
      fechada_em: new Date().toISOString(),
      liberada_por: usuario,
    })
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana);

  if (error) {
    console.error("Erro ao concluir semana:", error);
    return false;
  }

  return true;
}

export async function reabrirSemanaProjetoBanco(
  projetoId: string,
  semana: number,
  usuario = "Sistema"
): Promise<boolean> {
  const { error } = await supabase
    .from("projeto_semanas")
    .update({
      status: "aberta",
      fechada_em: null,
      liberada_por: usuario,
    })
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana);

  if (error) {
    console.error("Erro ao reabrir semana:", error);
    return false;
  }

  return true;
}

export async function excluirSemanaProjetoBanco(
  projetoId: string,
  semana: number
): Promise<boolean> {
  const projetoNumero = Number(projetoId);

  if (!Number.isFinite(projetoNumero) || !Number.isFinite(semana)) {
    return false;
  }

  const { data: semanaDb, error: erroSemana } = await supabase
    .from("projeto_semanas")
    .select("id")
    .eq("projeto_id", projetoNumero)
    .eq("semana", semana)
    .maybeSingle();

  if (erroSemana) {
    console.error("Erro ao localizar semana para exclusão:", erroSemana);
    return false;
  }

  if (!semanaDb?.id) return true;

  const { error: erroParticipantes } = await supabase
    .from("projeto_semana_elenco")
    .delete()
    .eq("projeto_semana_id", Number(semanaDb.id));

  if (erroParticipantes) {
    console.error("Erro ao excluir participantes da semana:", erroParticipantes);
    return false;
  }

  const { error } = await supabase
    .from("projeto_semanas")
    .delete()
    .eq("id", Number(semanaDb.id));

  if (error) {
    console.error("Erro ao excluir semana do projeto:", error);
    return false;
  }

  return true;
}

export async function carregarParticipantesSemanaBanco(
  projetoId: string,
  semana: number
): Promise<ParticipanteSemanaProjeto[]> {
  const { data: semanaDb, error: erroSemana } = await supabase
    .from("projeto_semanas")
    .select("id")
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana)
    .maybeSingle();

  if (erroSemana) {
    console.error("Erro ao localizar semana do projeto:", erroSemana);
    return [];
  }

  if (!semanaDb?.id) return [];

  const { data, error } = await supabase
    .from("projeto_semana_elenco")
    .select("*")
    .eq("projeto_semana_id", Number(semanaDb.id))
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao carregar participantes da semana:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: Number(item.id),
    projeto_semana_id: Number(item.projeto_semana_id),
    elenco_id: Number(item.elenco_id),
    personagem: String(item.personagem_snapshot || ""),
    dublador: String(item.dublador_snapshot || ""),
    telefone_dublador: String(item.telefone_snapshot || ""),
    funcao: String(item.funcao_snapshot || ""),
    adicionado_por: String(item.adicionado_por || ""),
    criado_em: String(item.criado_em || ""),
  }));
}

export async function adicionarElencoSemanaBanco(
  projetoId: string,
  semana: number,
  elencoId: string | number,
  usuario = "Sistema"
): Promise<boolean> {
  const { data: semanaDb, error: erroSemana } = await supabase
    .from("projeto_semanas")
    .select("id,status")
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana)
    .maybeSingle();

  if (erroSemana || !semanaDb?.id) {
    console.error(
      "A semana precisa existir antes de adicionar participantes:",
      erroSemana
    );
    return false;
  }

  if (semanaDb.status === "concluida") {
    console.error("Não é possível adicionar participante a uma semana concluída.");
    return false;
  }

  const { data: elencoDb, error: erroElenco } = await supabase
    .from("elenco")
    .select("id,projeto_id,ativo")
    .eq("id", Number(elencoId))
    .eq("projeto_id", Number(projetoId))
    .eq("ativo", true)
    .maybeSingle();

  if (erroElenco || !elencoDb?.id) {
    console.error("Escalação ativa não encontrada:", erroElenco);
    return false;
  }

  const { error } = await supabase
    .from("projeto_semana_elenco")
    .upsert(
      {
        projeto_semana_id: Number(semanaDb.id),
        elenco_id: Number(elencoDb.id),
        adicionado_por: usuario,
      },
      {
        onConflict: "projeto_semana_id,elenco_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error("Erro ao adicionar participante à semana:", error);
    return false;
  }

  return true;
}

export async function removerElencoSemanaBanco(
  projetoId: string,
  semana: number,
  elencoId: string | number
): Promise<boolean> {
  const { data: semanaDb, error: erroSemana } = await supabase
    .from("projeto_semanas")
    .select("id,status")
    .eq("projeto_id", Number(projetoId))
    .eq("semana", semana)
    .maybeSingle();

  if (erroSemana || !semanaDb?.id) {
    console.error("Semana não encontrada:", erroSemana);
    return false;
  }

  if (semanaDb.status === "concluida") {
    console.error("Não é possível alterar uma semana concluída.");
    return false;
  }

  const { error } = await supabase
    .from("projeto_semana_elenco")
    .delete()
    .eq("projeto_semana_id", Number(semanaDb.id))
    .eq("elenco_id", Number(elencoId));

  if (error) {
    console.error("Erro ao remover participante da semana:", error);
    return false;
  }

  return true;
}

export async function reabrirPapelProjetoBanco(
  projetoId: string,
  elencoId: string | number,
  motivo = "Papel reaberto."
): Promise<string | null> {
  const projetoNumero = Number(projetoId);
  const elencoNumero = Number(elencoId);

  const { data: atual, error: erroAtual } = await supabase
    .from("elenco")
    .select("*")
    .eq("id", elencoNumero)
    .eq("projeto_id", projetoNumero)
    .eq("ativo", true)
    .maybeSingle();

  if (erroAtual || !atual) {
    console.error("Escalação ativa não encontrada para reabrir papel:", erroAtual);
    return null;
  }

  const agora = new Date().toISOString();

  const { error: erroEncerrar } = await supabase
    .from("elenco")
    .update({
      ativo: false,
      encerrado_em: agora,
      motivo_encerramento: motivo || "Papel reaberto.",
    })
    .eq("id", elencoNumero)
    .eq("projeto_id", projetoNumero);

  if (erroEncerrar) {
    console.error("Erro ao encerrar a escalação atual:", erroEncerrar);
    return null;
  }

  const { data: nova, error: erroNova } = await supabase
    .from("elenco")
    .insert([
      {
        projeto_id: projetoNumero,
        personagem: String(atual.personagem || ""),
        dublador: "",
        telefone_dublador: "",
        funcao: String(atual.funcao || ""),
        ativo: true,
        encerrado_em: null,
        motivo_encerramento: null,
        substitui_elenco_id: elencoNumero,
      },
    ])
    .select("id")
    .single();

  if (erroNova || !nova?.id) {
    console.error("Erro ao criar papel reaberto:", erroNova);

    // Melhor esforço para restaurar a escalação original.
    await supabase
      .from("elenco")
      .update({
        ativo: true,
        encerrado_em: null,
        motivo_encerramento: null,
      })
      .eq("id", elencoNumero)
      .eq("projeto_id", projetoNumero);

    return null;
  }

  return String(nova.id);
}

export async function salvarRespostaTreinamentoBanco(
  resposta: RespostaTreinamento
): Promise<boolean> {
  const { error } = await supabase.from("treinamento_respostas").insert([
    {
      usuario_login: resposta.usuario_login,
      usuario_nome: resposta.usuario_nome,
      usuario_cargo: resposta.usuario_cargo,
      modulo_id: resposta.modulo_id,
      modulo_titulo: resposta.modulo_titulo,
      pergunta: resposta.pergunta,
      alternativa_marcada: resposta.alternativa_marcada,
      alternativa_texto: resposta.alternativa_texto,
      alternativa_correta: resposta.alternativa_correta,
      correta: resposta.correta,
      explicacao: resposta.explicacao,
    },
  ]);

  if (error) {
    console.error("Erro ao salvar resposta do treinamento:", error);
    return false;
  }

  return true;
}

export async function carregarRespostasTreinamentoBanco(): Promise<
  RespostaTreinamento[]
> {
  const { data, error } = await supabase
    .from("treinamento_respostas")
    .select("*")
    .order("data_resposta", { ascending: false });

  if (error) {
    console.error("Erro ao buscar respostas do treinamento:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    usuario_login: item.usuario_login || "",
    usuario_nome: item.usuario_nome || "",
    usuario_cargo: item.usuario_cargo || "",
    modulo_id: item.modulo_id || "",
    modulo_titulo: item.modulo_titulo || "",
    pergunta: item.pergunta || "",
    alternativa_marcada: Number(item.alternativa_marcada ?? -1),
    alternativa_texto: item.alternativa_texto || "",
    alternativa_correta: Number(item.alternativa_correta ?? -1),
    correta: Boolean(item.correta),
    explicacao: item.explicacao || "",
    data_resposta: item.data_resposta || null,
  }));
}

export type ResultadoCriacaoUsuario = {
  ok: boolean;
  error?: string;
  precisaConfirmarEmail?: boolean;
  modo?: "edge" | "signup";
};

export async function criarUsuarioCompletoBanco(
  usuario: Usuario,
  senha: string,
  criadoPor: string
): Promise<ResultadoCriacaoUsuario> {
  try {
    assertWritable("A criação de usuário no Supabase Auth");
  } catch (error: any) {
    return { ok: false, error: String(error?.message || error) };
  }

  const email = normalizar(usuario.login);
  const password = String(senha || "");

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Informe um e-mail válido para o usuário." };
  }
  if (password.length < 8) {
    return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const perfil = {
    nome: String(usuario.nome || "").trim(),
    login: email,
    cargo: usuario.cargo,
    vinculo: String(usuario.vinculo || "").trim(),
    training_status: usuario.training_status || "nao_aplicavel",
    criado_por: criadoPor || null,
    ...permissoesDisponiveis.reduce((acc, item) => {
      acc[item.chave] = Boolean(usuario[item.chave]);
      return acc;
    }, {} as Record<ChavePermissao, boolean>),
  };

  // Caminho principal: Edge Function com service role. Ela cria o usuário no
  // Authentication e o perfil em `usuarios` numa única operação.
  try {
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email, password, perfil },
    });

    if (!error && data?.ok) {
      return { ok: true, precisaConfirmarEmail: false, modo: "edge" };
    }

    if (error || data?.error) {
      console.warn(
        "Edge Function admin-create-user indisponível; tentando cadastro isolado:",
        data?.error || error
      );
    }
  } catch (error) {
    console.warn(
      "Não foi possível usar admin-create-user; tentando cadastro isolado:",
      error
    );
  }

  // Fallback seguro para ambientes onde a Edge Function ainda não foi
  // implantada. Usa um cliente separado para não substituir a sessão de quem
  // está administrando o Manager.
  try {
    const clienteCadastro = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: guardedFetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: authData, error: authError } = await clienteCadastro.auth.signUp({
      email,
      password,
      options: {
        data: { nome: perfil.nome },
      },
    });

    if (authError) {
      return { ok: false, error: authError.message };
    }

    const { error: profileError } = await supabase.from("usuarios").insert([perfil]);
    if (profileError) {
      return {
        ok: false,
        error:
          `O acesso foi criado, mas o perfil não pôde ser salvo: ${profileError.message}. ` +
          "Corrija o perfil na tabela usuarios antes de tentar novamente.",
      };
    }

    return {
      ok: true,
      precisaConfirmarEmail: !authData.session,
      modo: "signup",
    };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || error) };
  }
}

export async function carregarUsuariosBanco(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }

  return (data || []).map(mapUsuarioDb);
}

type RespostaMembrosPlanilha<T = any> = {
  ok: boolean;
  data?: T;
  error?: string;
};

function configuracaoMembrosPlanilha() {
  const url = String(import.meta.env.VITE_MEMBROS_SHEETS_WEBAPP_URL || "").trim();
  const token = String(import.meta.env.VITE_MEMBROS_SHEETS_TOKEN || "").trim();

  if (!url) {
    throw new Error(
      "A integração de membros com o Google Planilhas não está configurada. Defina VITE_MEMBROS_SHEETS_WEBAPP_URL no arquivo .env.local."
    );
  }

  return { url, token };
}

async function chamarMembrosPlanilha<T>(
  acao: string,
  payload: Record<string, any> = {}
): Promise<T> {
  const acoesSomenteLeitura = new Set(["ping", "listar_membros", "historico_membro"]);
  if (!acoesSomenteLeitura.has(acao)) {
    assertWritable(`A ação de membros ${acao}`);
  }

  const { url, token } = configuracaoMembrosPlanilha();
  const resposta = await guardedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ acao, token, ...payload }),
    redirect: "follow",
  });

  if (!resposta.ok) {
    throw new Error(`Google Planilhas respondeu HTTP ${resposta.status}.`);
  }

  const json = (await resposta.json()) as RespostaMembrosPlanilha<T>;
  if (!json?.ok) {
    throw new Error(json?.error || "Falha ao acessar a planilha de membros.");
  }

  return json.data as T;
}

export async function testarConexaoMembrosPlanilha(): Promise<{
  planilha: string;
  aba: string;
  total: number;
}> {
  return chamarMembrosPlanilha("ping");
}

let cacheMembrosPlanilha: { data: Membro[]; carregadoEm: number } | null = null;
let requisicaoMembrosEmAndamento: Promise<Membro[]> | null = null;
const CACHE_MEMBROS_MS = 45_000;

export async function carregarMembrosBanco(forcarAtualizacao = false): Promise<Membro[]> {
  const agora = Date.now();

  if (
    !forcarAtualizacao &&
    cacheMembrosPlanilha &&
    agora - cacheMembrosPlanilha.carregadoEm < CACHE_MEMBROS_MS
  ) {
    return cacheMembrosPlanilha.data;
  }

  // Evita que restauração de sessão + listener de autenticação façam duas
  // leituras completas da planilha ao mesmo tempo.
  if (!forcarAtualizacao && requisicaoMembrosEmAndamento) {
    return requisicaoMembrosEmAndamento;
  }

  const requisicao = (async () => {
    try {
      const data = await chamarMembrosPlanilha<any[]>("listar_membros");
      const membros = (data || []).map(mapMembroDb);
      cacheMembrosPlanilha = { data: membros, carregadoEm: Date.now() };
      return membros;
    } catch (error) {
      console.error("Erro ao buscar membros na planilha:", error);
      throw error;
    } finally {
      requisicaoMembrosEmAndamento = null;
    }
  })();

  requisicaoMembrosEmAndamento = requisicao;
  return requisicao;
}

export function invalidarCacheMembrosPlanilha() {
  cacheMembrosPlanilha = null;
}

type AtorMembroPlanilha = {
  nome?: string;
  cargo?: string;
};


type AlteracoesMembroPlanilha = Partial<{
  nome: string | null;
  telefone: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  observacao: string | null;
  movimentacao: string | null;
  participacao: StatusMembro;
  atendimento: AtendimentoMembro;
}>;

export async function atualizarMembroCamposPlanilha(
  membroId: number,
  alteracoes: AlteracoesMembroPlanilha,
  ator?: AtorMembroPlanilha
): Promise<boolean> {
  try {
    if (!Object.keys(alteracoes || {}).length) return true;
    await chamarMembrosPlanilha("atualizar_membro", {
      membroId,
      alteracoes,
      ator: ator || null,
    });
    invalidarCacheMembrosPlanilha();
    return true;
  } catch (error) {
    console.error("Erro ao atualizar membro na planilha:", error);
    return false;
  }
}

export async function atualizarMembroCampoPlanilha(
  membroId: number,
  campo:
    | "nome"
    | "telefone"
    | "data_entrada"
    | "data_saida"
    | "observacao"
    | "movimentacao",
  valor: string | null,
  ator?: AtorMembroPlanilha
): Promise<boolean> {
  return atualizarMembroCamposPlanilha(
    membroId,
    { [campo]: valor ?? null } as AlteracoesMembroPlanilha,
    ator
  );
}

export async function atualizarStatusMembroBanco(
  membroId: number,
  status: StatusMembro,
  ator?: AtorMembroPlanilha
): Promise<boolean> {
  const hoje = new Date().toISOString().slice(0, 10);
  const alteracoes: Record<string, string | null> = {
    participacao: status,
  };

  if (status === "na_comunidade") {
    alteracoes.data_entrada = hoje;
    alteracoes.data_saida = null;
  } else if (status === "saiu" || status === "banido") {
    alteracoes.data_saida = hoje;
  }

  const ok = await atualizarMembroCamposPlanilha(
    membroId,
    alteracoes as AlteracoesMembroPlanilha,
    ator
  );
  if (!ok) {
    console.error("Erro ao atualizar participação do membro na planilha.");
  }
  return ok;
}

export async function atualizarAtendimentoMembroBanco(
  membroId: number,
  atendimento: AtendimentoMembro,
  ator?: AtorMembroPlanilha
): Promise<boolean> {
  return atualizarMembroCamposPlanilha(membroId, { atendimento }, ator);
}

export async function carregarHistoricoMembroPlanilha(
  membroId: number
): Promise<HistoricoMembroEvento[]> {
  try {
    const data = await chamarMembrosPlanilha<HistoricoMembroEvento[]>(
      "historico_membro",
      { membroId }
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar histórico do membro:", error);
    return [];
  }
}

export async function buscarPerfilPorEmail(email: string): Promise<Usuario | null> {
  const emailNormalizado = normalizar(email);

  if (!emailNormalizado) return null;

  const { data, error } = (await comTimeout(
    supabase
      .from("usuarios")
      .select("*")
      .eq("login", emailNormalizado)
      .maybeSingle(),
    15000,
    "A busca do perfil demorou demais."
  )) as any;

  if (error) {
    console.error("Perfil não encontrado:", error);
    return null;
  }

  if (!data) return null;

  return mapUsuarioDb(data);
}

export async function carregarProjetosBanco(
  mostrarArquivados = false
): Promise<Projeto[]> {
  const { data: projetosDb, error: erroProjetos } = await supabase
    .from("projetos")
    .select("*")
    .eq("arquivado", mostrarArquivados)
    .order("id", { ascending: false });

  if (erroProjetos) {
    console.error("Erro ao buscar projetos:", erroProjetos);
    return [];
  }

  const { data: elencoDb, error: erroElenco } = await supabase
    .from("elenco")
    .select("*")
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (erroElenco) {
    console.error("Erro ao buscar elenco:", erroElenco);
    return [];
  }

  const elencoPorProjeto = new Map<string, ElencoItem[]>();

  (elencoDb || []).forEach((item: any) => {
    const projetoId = String(item.projeto_id);
    if (!elencoPorProjeto.has(projetoId)) {
      elencoPorProjeto.set(projetoId, []);
    }

    elencoPorProjeto.get(projetoId)!.push({
      id: String(item.id),
      personagem: item.personagem || "",
      dublador: item.dublador || "",
      telefone_dublador: item.telefone_dublador || "",
      funcao: item.funcao || "",
      status_entrega: item.status_entrega || "pendente",
      semana_atual: item.semana_atual || "Semana 01",
      video_entrega: item.video_entrega || "",
    });
  });

  return (projetosDb || []).map((item: any) =>
    mapProjetoDb(item, elencoPorProjeto.get(String(item.id)) || [])
  );
}

export async function enviarCapaProjetoArquivo(arquivo: File): Promise<string | null> {
  if (!arquivo) return null;

  if (!String(arquivo.type || "").startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem para a capa.");
  }

  const limite = 8 * 1024 * 1024;
  if (arquivo.size > limite) {
    throw new Error("A capa deve ter no máximo 8 MB.");
  }

  const extensaoOriginal = arquivo.name.split(".").pop() || "jpg";
  const extensao = extensaoOriginal.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const nome = `capa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensao}`;
  const storagePath = `projetos/${nome}`;

  const { error } = await supabase.storage
    .from("project-covers")
    .upload(storagePath, arquivo, {
      cacheControl: "3600",
      upsert: false,
      contentType: arquivo.type || "image/jpeg",
    });

  if (error) {
    console.error("Erro ao enviar capa do projeto:", error);
    throw new Error(
      "Não consegui enviar a capa. Verifique se o bucket project-covers foi configurado no Supabase."
    );
  }

  const { data } = supabase.storage.from("project-covers").getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

export async function criarProjetoBanco(projeto: Projeto): Promise<string | null> {
  const { data, error } = await supabase
    .from("projetos")
    .insert([
      {
        projeto: projeto.Projeto,
        tipo: projeto.Tipo,
        genero: projeto.Genero,
        prioridade: projeto.Prioridade,
        dupla: projeto.Dupla,
        lider: projeto.Lider,
        telefone_lider: projeto.Telefone_Lider,
        editor: projeto.Editor,
        telefone_editor: projeto.Telefone_Editor,
        status: projeto.Status,
        data_inicio: projeto.Data_Inicio,
        video_editor_link: projeto.Video_Editor_Link,
        registro_semanal: projeto.Registro_Semanal,
        observacoes: projeto.Observacoes || "",
        capa_url: projeto.Capa_URL,
        arquivado: projeto.Arquivado || false,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar projeto:", error);
    return null;
  }

  return String(data.id);
}

export async function atualizarProjetoBanco(projeto: Projeto): Promise<boolean> {
  const { error } = await supabase
    .from("projetos")
    .update({
      projeto: projeto.Projeto,
      tipo: projeto.Tipo,
      genero: projeto.Genero,
      prioridade: projeto.Prioridade,
      dupla: projeto.Dupla,
      lider: projeto.Lider,
      telefone_lider: projeto.Telefone_Lider,
      editor: projeto.Editor,
      telefone_editor: projeto.Telefone_Editor,
      status: projeto.Status,
      data_inicio: projeto.Data_Inicio,
      video_editor_link: projeto.Video_Editor_Link,
      registro_semanal: projeto.Registro_Semanal,
      observacoes: projeto.Observacoes || "",
      capa_url: projeto.Capa_URL,
      arquivado: projeto.Arquivado || false,
    })
    .eq("id", Number(projeto.ID));

  if (error) {
    console.error("Erro ao atualizar projeto:", error);
    return false;
  }

  return true;
}

export async function atualizarArquivamentoProjetoBanco(
  projetoId: string,
  arquivado: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("projetos")
    .update({ arquivado })
    .eq("id", Number(projetoId));

  if (error) {
    console.error("Erro ao alterar arquivamento:", error);
    return false;
  }

  return true;
}

export async function salvarElencoProjetoBanco(
  projetoId: string,
  elenco: ElencoItem[]
): Promise<boolean> {
  const projetoNumero = Number(projetoId);

  if (!Number.isFinite(projetoNumero)) {
    console.error("Projeto inválido ao salvar Banco do Projeto:", projetoId);
    return false;
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("elenco")
    .select("*")
    .eq("projeto_id", projetoNumero)
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (erroExistentes) {
    console.error("Erro ao carregar Banco do Projeto antes de salvar:", erroExistentes);
    return false;
  }

  const existentesPorId = new Map<string, any>(
    (existentes || []).map((item: any) => [String(item.id), item])
  );

  const agora = new Date().toISOString();

  for (const item of elenco || []) {
    const personagem = String(item.personagem || "").trim();

    // O personagem é a única informação obrigatória no novo Banco do Projeto.
    if (!personagem) continue;

    const dublador = String(item.dublador || "").trim();
    const telefone = String(item.telefone_dublador || "").trim();
    const funcao = String(item.funcao || "").trim();

    const idRecebido = String(item.id || "").trim();
    const existente = existentesPorId.get(idRecebido);

    if (!existente) {
      const { error } = await supabase.from("elenco").insert([
        {
          projeto_id: projetoNumero,
          personagem,
          dublador,
          telefone_dublador: telefone,
          funcao,
          ativo: true,
          encerrado_em: null,
          motivo_encerramento: null,
          substitui_elenco_id: null,
        },
      ]);

      if (error) {
        console.error("Erro ao adicionar personagem ao Banco do Projeto:", error);
        return false;
      }

      continue;
    }

    const dubladorAnterior = String(existente.dublador || "").trim();
    const mudouDublador =
      normalizar(dubladorAnterior) !== normalizar(dublador);

    // Se já havia um dublador e a pessoa foi removida/trocada,
    // NÃO sobrescrevemos a escalação antiga.
    // Ela é encerrada e uma nova linha é criada para preservar o histórico.
    if (dubladorAnterior && mudouDublador) {
      const { error: erroEncerrar } = await supabase
        .from("elenco")
        .update({
          ativo: false,
          encerrado_em: agora,
          motivo_encerramento: dublador
            ? `Substituído por ${dublador}.`
            : "Papel reaberto.",
        })
        .eq("id", Number(existente.id))
        .eq("projeto_id", projetoNumero);

      if (erroEncerrar) {
        console.error("Erro ao encerrar escalação antiga:", erroEncerrar);
        return false;
      }

      const { error: erroNovaEscalacao } = await supabase.from("elenco").insert([
        {
          projeto_id: projetoNumero,
          personagem,
          dublador,
          telefone_dublador: telefone,
          funcao,
          ativo: true,
          encerrado_em: null,
          motivo_encerramento: null,
          substitui_elenco_id: Number(existente.id),
        },
      ]);

      if (erroNovaEscalacao) {
        console.error("Erro ao criar nova escalação:", erroNovaEscalacao);

        // Melhor esforço para não deixar o papel sem escalação ativa.
        await supabase
          .from("elenco")
          .update({
            ativo: true,
            encerrado_em: null,
            motivo_encerramento: null,
          })
          .eq("id", Number(existente.id))
          .eq("projeto_id", projetoNumero);

        return false;
      }

      continue;
    }

    // Personagem ainda sem dublador pode receber alguém normalmente.
    // Alterações de telefone/função também atualizam somente a escalação atual.
    const { error: erroAtualizar } = await supabase
      .from("elenco")
      .update({
        personagem,
        dublador,
        telefone_dublador: telefone,
        funcao,
      })
      .eq("id", Number(existente.id))
      .eq("projeto_id", projetoNumero)
      .eq("ativo", true);

    if (erroAtualizar) {
      console.error("Erro ao atualizar personagem do Banco do Projeto:", erroAtualizar);
      return false;
    }
  }

  // Registros ativos que desapareceram da lista não são apagados.
  // São encerrados para que semanas antigas continuem intactas.
  const idsRecebidosNumericos = new Set(
    (elenco || [])
      .map((item) => String(item.id || "").trim())
      .filter((id) => existentesPorId.has(id))
  );

  for (const existente of existentes || []) {
    const id = String(existente.id);

    if (idsRecebidosNumericos.has(id)) continue;

    const { error: erroEncerrarRemovido } = await supabase
      .from("elenco")
      .update({
        ativo: false,
        encerrado_em: agora,
        motivo_encerramento: "Removido do Banco do Projeto.",
      })
      .eq("id", Number(existente.id))
      .eq("projeto_id", projetoNumero)
      .eq("ativo", true);

    if (erroEncerrarRemovido) {
      console.error("Erro ao encerrar personagem removido:", erroEncerrarRemovido);
      return false;
    }
  }

  return true;
}

export function gerarIdTemporario() {
  return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function comTimeout<T>(
  promessa: PromiseLike<T>,
  ms = 15000,
  mensagem = "Tempo limite excedido"
): Promise<T> {
  return Promise.race([
    Promise.resolve(promessa),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(mensagem)), ms)
    ),
  ]);
}

export function parseDataFlex(valor?: string | null): Date | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const isoSimples = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoSimples) {
    const [, ano, mes, dia] = isoSimples;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  const dataIso = new Date(texto);
  if (!Number.isNaN(dataIso.getTime())) return dataIso;

  const partes = texto.split(/[\/\s:-]+/).map(Number);
  if (partes.length >= 3) {
    const [dia, mes, ano] = partes;
    if (dia && mes && ano) {
      const data = new Date(ano, mes - 1, dia);
      if (!Number.isNaN(data.getTime())) return data;
    }
  }

  return null;
}

export function chaveMes(valor?: string | null): string {
  const data = parseDataFlex(valor);
  if (!data) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function formatarMesLabel(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  const data = new Date(ano, mes - 1, 1);
  const nome = data.toLocaleDateString("pt-BR", { month: "long" });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} / ${ano}`;
}

export function formatarDataBR(valor?: string | null) {
  const data = parseDataFlex(valor);
  if (!data) return "";
  return data.toLocaleDateString("pt-BR");
}

export function gerarMesesEntre(inicio: string, fim: string) {
  const [anoInicio, mesInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim] = fim.split("-").map(Number);
  const meses: string[] = [];
  const data = new Date(anoInicio, mesInicio - 1, 1);
  const limite = new Date(anoFim, mesFim - 1, 1);

  while (data <= limite) {
    meses.push(
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    );
    data.setMonth(data.getMonth() + 1);
  }

  return meses;
}

export function extrairLinksDrive(observacoes?: string) {
  const texto = observacoes || "";
  const inicio = texto.indexOf("[[DRIVE_LINKS]]");
  const fim = texto.indexOf("[[/DRIVE_LINKS]]");

  if (inicio === -1 || fim === -1) {
    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
    };
  }

  try {
    const json = texto.slice(inicio + "[[DRIVE_LINKS]]".length, fim).trim();

    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
      ...JSON.parse(json),
    };
  } catch {
    return {
      pasta: "",
      selecao: "",
      projeto: "",
      videos: "",
      cortes: "",
      finalizados: "",
      falasTeste: "",
      respostasSelecao: "",
      cortesProjeto: "",
      entregasProjeto: "",
      formSelecao: "",
      formEntregas: "",
      planilhaSelecao: "",
      planilhaEntregas: "",
    };
  }
}

export function salvarLinksDriveEmObservacoes(observacoes: string, links: any) {
  const base = (observacoes || "")
    .replace(/\[\[DRIVE_LINKS\]\][\s\S]*?\[\[\/DRIVE_LINKS\]\]/g, "")
    .trim();

  const bloco = `[[DRIVE_LINKS]]
${JSON.stringify(links, null, 2)}
[[/DRIVE_LINKS]]`;

  return [base, bloco].filter(Boolean).join("\n\n");
}

export function calcularRelatorioEntradaSaida(membros: Membro[]): RelatorioMes[] {
  const chaves = membros
    .flatMap((m) => [chaveMes(m.data_entrada), chaveMes(m.data_saida)])
    .filter(Boolean)
    .sort();

  if (!chaves.length) return [];

  const meses = gerarMesesEntre(chaves[0], chaves[chaves.length - 1]);
  let totalInicial = 0;

  return meses.map((mes) => {
    const entradas = membros.filter(
      (m) => chaveMes(m.data_entrada) === mes
    ).length;
    const saidas = membros.filter((m) => chaveMes(m.data_saida) === mes).length;
    const crescimento = entradas - saidas;
    const totalFinal = totalInicial + crescimento;

    const linha = {
      mes,
      mesLabel: formatarMesLabel(mes),
      totalInicial,
      entradas,
      saidas,
      crescimento,
      totalFinal,
    };

    totalInicial = totalFinal;
    return linha;
  });
}


// =========================================================
// AGENDA / CALENDÁRIO
// =========================================================

export type StatusAgendaEvento =
  | "rascunho"
  | "pendente"
  | "aprovado"
  | "rejeitado";

export interface AgendaEvento {
  id: number;
  titulo: string;
  descricao: string;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  tipo: string;
  link_reuniao: string;
  projeto_id: number | null;
  criado_por: string;
  criado_por_uid: string | null;
  status: StatusAgendaEvento;
  enviado_em: string | null;
  decidido_por: string;
  decidido_em: string | null;
  motivo_decisao: string;
  criado_em: string;
  atualizado_em: string;
}

export interface AgendaEventoInput {
  titulo: string;
  descricao?: string;
  inicio: string;
  fim?: string | null;
  dia_inteiro?: boolean;
  tipo?: string;
  link_reuniao?: string;
  projeto_id?: string | number | null;
  criado_por?: string;
  status?: StatusAgendaEvento;
}

function mapAgendaEventoDb(item: any): AgendaEvento {
  return {
    id: Number(item.id),
    titulo: item.titulo || "",
    descricao: item.descricao || "",
    inicio: item.inicio || "",
    fim: item.fim || null,
    dia_inteiro: Boolean(item.dia_inteiro),
    tipo: item.tipo || "compromisso",
    link_reuniao: item.link_reuniao || "",
    projeto_id:
      item.projeto_id === null || item.projeto_id === undefined
        ? null
        : Number(item.projeto_id),
    criado_por: item.criado_por || "",
    criado_por_uid: item.criado_por_uid || null,
    status: (item.status || "aprovado") as StatusAgendaEvento,
    enviado_em: item.enviado_em || null,
    decidido_por: item.decidido_por || "",
    decidido_em: item.decidido_em || null,
    motivo_decisao: item.motivo_decisao || "",
    criado_em: item.criado_em || "",
    atualizado_em: item.atualizado_em || "",
  };
}

export async function carregarAgendaEventosBanco(): Promise<AgendaEvento[]> {
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .order("inicio", { ascending: true });

  if (error) {
    console.error("Erro ao carregar agenda:", error);
    throw new Error(error.message || "Não foi possível carregar a agenda.");
  }

  return (data || []).map(mapAgendaEventoDb);
}

export async function criarAgendaEventoBanco(
  evento: AgendaEventoInput
): Promise<AgendaEvento | null> {
  const payload = {
    titulo: evento.titulo.trim(),
    descricao: evento.descricao?.trim() || null,
    inicio: evento.inicio,
    fim: evento.fim || null,
    dia_inteiro: Boolean(evento.dia_inteiro),
    tipo: evento.tipo?.trim() || "compromisso",
    link_reuniao: evento.link_reuniao?.trim() || null,
    projeto_id:
      evento.projeto_id === null ||
      evento.projeto_id === undefined ||
      String(evento.projeto_id).trim() === ""
        ? null
        : Number(evento.projeto_id),
    criado_por: evento.criado_por?.trim() || null,
    status: evento.status || "pendente",
    enviado_em:
      (evento.status || "pendente") === "pendente"
        ? new Date().toISOString()
        : null,
  };

  const { data, error } = await supabase
    .from("agenda_eventos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar compromisso:", error);
    throw new Error(error.message || "Não foi possível criar o compromisso.");
  }

  return data ? mapAgendaEventoDb(data) : null;
}

export async function atualizarAgendaEventoBanco(
  id: number,
  evento: AgendaEventoInput
): Promise<AgendaEvento | null> {
  const payload = {
    titulo: evento.titulo.trim(),
    descricao: evento.descricao?.trim() || null,
    inicio: evento.inicio,
    fim: evento.fim || null,
    dia_inteiro: Boolean(evento.dia_inteiro),
    tipo: evento.tipo?.trim() || "compromisso",
    link_reuniao: evento.link_reuniao?.trim() || null,
    projeto_id:
      evento.projeto_id === null ||
      evento.projeto_id === undefined ||
      String(evento.projeto_id).trim() === ""
        ? null
        : Number(evento.projeto_id),
    ...(evento.status ? { status: evento.status } : {}),
  };

  const { data, error } = await supabase
    .from("agenda_eventos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao atualizar compromisso:", error);
    throw new Error(error.message || "Não foi possível atualizar o compromisso.");
  }

  return data ? mapAgendaEventoDb(data) : null;
}

export async function excluirAgendaEventoBanco(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("agenda_eventos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir compromisso:", error);
    throw new Error(error.message || "Não foi possível excluir o compromisso.");
  }

  return true;
}

export async function decidirAgendaEventoBanco(
  id: number,
  decisao: "aprovado" | "rejeitado",
  decididoPor: string,
  motivo = ""
): Promise<AgendaEvento | null> {
  const { data, error } = await supabase
    .from("agenda_eventos")
    .update({
      status: decisao,
      decidido_por: decididoPor.trim(),
      decidido_em: new Date().toISOString(),
      motivo_decisao: motivo.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao decidir evento:", error);
    throw new Error(error.message || "Não foi possível decidir o evento.");
  }

  return data ? mapAgendaEventoDb(data) : null;
}

// =========================================================
// WHATSAPP — FILA DE LEMBRETES
// =========================================================

export type ResultadoFilaWhatsapp = {
  ok: boolean;
  duplicado?: boolean;
  id?: string;
  telefone?: string;
  mensagem?: string;
};

export async function enfileirarLembreteWhatsapp(params: {
  projetoId: string;
  semana: number;
  personagem: string;
  dublador: string;
  telefone: string;
  mensagem: string;
  tipoLembrete?: string;
}): Promise<ResultadoFilaWhatsapp> {
  const {
    projetoId,
    semana,
    personagem,
    dublador,
    telefone,
    mensagem,
    tipoLembrete = "manual",
  } = params;

  const { data, error } = await supabase.rpc(
    "enfileirar_lembrete_whatsapp",
    {
      p_projeto_id: Number(projetoId),
      p_semana: semana,
      p_personagem: personagem,
      p_dublador: dublador,
      p_telefone: telefone,
      p_mensagem: mensagem,
      p_tipo_lembrete: tipoLembrete,
    }
  );

  if (error) {
    console.error("Erro ao colocar lembrete do WhatsApp na fila:", error);
    throw new Error(
      error.message || "Não foi possível colocar o lembrete na fila."
    );
  }

  return (data || {
    ok: false,
    mensagem: "A função do WhatsApp não retornou resultado.",
  }) as ResultadoFilaWhatsapp;
}

