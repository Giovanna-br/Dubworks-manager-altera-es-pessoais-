import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "../mobile-first.css";
const CortesPage = React.lazy(() => import("./CortesPage"));

import type {
  AtendimentoMembro,
  AvaliacaoSelecao,
  Cargo,
  ChavePermissao,
  ElencoItem,
  DriveStructureResult,
  EntregaProducao,
  HistoricoMembroEvento,
  Membro,
  ModuloTreinamento,
  Projeto,
  ProjetoSemana,
  RelatorioMes,
  RespostaSelecao,
  RespostaTreinamento,
  StatusMembro,
  StatusSelecao,
  TrainingStatus,
  Usuario,
} from "../types";

import {
  LOGO_URL,
  estilos,
  permissoesDisponiveis,
  FORMS_PROXY_ENABLED,
} from "../config/appConfig";
import { modulosTreinamentoLider } from "../data/trainingModules";
import { PROJECT_STATUS_OPTIONS } from "../domain/projectStatus";
import { useDubworksSession } from "../security/useDubworksSession";
import { READ_ONLY_MODE, WHATSAPP_SEND_ENABLED } from "../config/runtimeConfig";
import { elencoVazio, projetoVazio } from "../data/defaults";
import {
  normalizar,
  cargoLabel,
  statusTreinamentoLabel,
  statusMembroLabel,
  atendimentoMembroLabel,
  statusPadraoPorCargo,
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
  corStatus,
  numeroSemanaEntrega,
  labelSemana,
  escaparCSV,
  mapUsuarioDb,
  mapProjetoDb,
  mapMembroDb,
  criarEstruturaDriveViaFunction,
  compartilharPastaDriveComUsuario,
  copiarFormulariosViaAppsScript,
  sincronizarFormularioEntregasViaAppsScript,
  sincronizarFormularioSelecaoViaAppsScript,
  resolverParticipanteEntregaPorTelefone,
  extrairGoogleFileId,
  extrairGoogleFolderId,
  converterDriveParaPreview,
  lerRespostasSelecaoViaAppsScript,
  salvarAvaliacaoSelecaoBanco,
  carregarAvaliacoesSelecaoBanco,
  lerRespostasEntregasViaEdge,
  salvarEntregasProducaoBanco,
  carregarEntregasProducaoBanco,
  atualizarStatusEntregaBanco,
  carregarSemanasProjetoBanco,
  salvarRespostaTreinamentoBanco,
  carregarRespostasTreinamentoBanco,
  carregarUsuariosBanco,
  criarUsuarioCompletoBanco,
  carregarMembrosBanco,
  atualizarStatusMembroBanco,
  atualizarAtendimentoMembroBanco,
  atualizarMembroCampoPlanilha,
  atualizarMembroCamposPlanilha,
  carregarHistoricoMembroPlanilha,
  buscarPerfilPorEmail,
  carregarProjetosBanco,
  enviarCapaProjetoArquivo,
  criarProjetoBanco,
  atualizarProjetoBanco,
  atualizarArquivamentoProjetoBanco,
  salvarElencoProjetoBanco,
  gerarIdTemporario,
  comTimeout,
  parseDataFlex,
  chaveMes,
  formatarMesLabel,
  formatarDataBR,
  gerarMesesEntre,
  extrairLinksDrive,
  salvarLinksDriveEmObservacoes,
  calcularRelatorioEntradaSaida,
  enfileirarLembreteWhatsapp,
  criarProximaSemanaProjetoBanco,
  fecharSemanaProjetoBanco,
  reabrirSemanaProjetoBanco,
  excluirSemanaProjetoBanco,
  carregarParticipantesSemanaBanco,
  carregarAtividadeSemanalProjetosBanco,
  adicionarElencoSemanaBanco,
  removerElencoSemanaBanco,
  reabrirPapelProjetoBanco,
  carregarCanaisChat,
  carregarMensagensChat,
  enviarMensagemChat,
  marcarCanalComoLido,
  carregarParticipantesChat,
  adicionarParticipantesChat,
  garantirCanalProjeto,
  abrirConversaDireta,
  assinarMensagensChat,
  carregarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  salvarMencoesMensagem,
  assinarNotificacoes,
  carregarAnexosChat,
  enviarAnexosChat,
  assinarAnexosChat,
  editarMensagemChat,
  excluirMensagemChat,
  substituirMencoesMensagem,
  carregarPreferenciasChat,
  definirChatSilenciado,
  carregarAdvertenciasPlanilha,
  carregarAdvertenciasInternasBanco,
  criarAdvertenciaInternaBanco,
  decidirAdvertenciaInternaBanco,
  telefonesAdvertenciaEquivalentes,
  ADVERTENCIAS_FORM_URL,
  carregarAgendaEventosBanco,
  criarAgendaEventoBanco,
  atualizarAgendaEventoBanco,
  excluirAgendaEventoBanco,
  decidirAgendaEventoBanco,
  type AdvertenciaPlanilha,
  type AgendaEvento,
  type ChatCanal,
  type ChatMensagem,
  type ChatParticipante,
  type ChatAnexo,
  type ChatPreferencia,
  type NotificacaoChat,
  type ParticipanteSemanaProjeto,
  type AtividadeSemanalProjeto,
  type SituacaoAtividadeSemanal,
} from "../services/appServices";

const STATUS_PROJETO_OPCOES: readonly string[] = PROJECT_STATUS_OPTIONS;


const TIPO_PROJETO_OPCOES = ["Projeto", "Parceria"];

const GENERO_PROJETO_OPCOES = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Fantasia",
  "Ficção científica",
  "Mistério",
  "Musical",
  "Romance",
  "Suspense",
  "Terror",
  "Outro",
];

const CATEGORIA_PROJETO_OPCOES = [
  "Animação",
  "Anime",
  "Cartoon",
  "Filme",
  "Série",
  "Curta-metragem",
  "Websérie",
  "Jogo",
  "Áudio-drama",
  "Outro",
];

const CATEGORIA_PROJETO_INICIO = "[[CATEGORIA_PROJETO]]";
const CATEGORIA_PROJETO_FIM = "[[/CATEGORIA_PROJETO]]";
const RELATORIO_PROJETO_PREFIXO = "[[RELATORIO_PROJETO]]";

type StatusItemRelatorioProjeto =
  | "entregou"
  | "pendente"
  | "desistiu"
  | "saiu_projeto"
  | "precisa_substituir"
  | "nao_entregou"
  | "aguardando_analise"
  | "aprovado"
  | "regravacao";

type ItemRelatorioProjeto = {
  personagem: string;
  dublador: string;
  telefone?: string;
  status: StatusItemRelatorioProjeto;
  observacao: string;
};

function infoStatusRelatorioAutomatico(status: StatusItemRelatorioProjeto) {
  switch (status) {
    case "aprovado":
      return { label: "Aprovado", icon: "✓", color: "#86efac", bg: "rgba(22,101,52,.30)" };
    case "aguardando_analise":
      return { label: "Aguardando análise", icon: "⌛", color: "#fde68a", bg: "rgba(146,64,14,.30)" };
    case "regravacao":
      return { label: "Regravação", icon: "↻", color: "#c4b5fd", bg: "rgba(91,33,182,.28)" };
    case "nao_entregou":
      return { label: "Não entregou", icon: "!", color: "#fca5a5", bg: "rgba(127,29,29,.30)" };
    case "entregou":
      return { label: "Entregou", icon: "✓", color: "#7dd3fc", bg: "rgba(3,105,161,.26)" };
    case "pendente":
      return { label: "Pendente", icon: "…", color: "#fcd34d", bg: "rgba(120,53,15,.28)" };
    case "precisa_substituir":
      return { label: "Precisa substituir", icon: "!", color: "#fca5a5", bg: "rgba(127,29,29,.30)" };
    case "desistiu":
      return { label: "Desistiu", icon: "×", color: "#fca5a5", bg: "rgba(127,29,29,.30)" };
    case "saiu_projeto":
      return { label: "Saiu do projeto", icon: "×", color: "#fca5a5", bg: "rgba(127,29,29,.30)" };
    default:
      return { label: String(status).replace(/_/g, " "), icon: "•", color: "#cbd5e1", bg: "rgba(30,41,59,.7)" };
  }
}

function infoSituacaoAtividadeSemanal(situacao: SituacaoAtividadeSemanal) {
  switch (situacao) {
    case "normal":
      return { label: "Em andamento", icon: "●", color: "#86efac", bg: "rgba(22,101,52,.28)" };
    case "aguardando_analise":
      return { label: "Aguardando análise", icon: "⌛", color: "#fde68a", bg: "rgba(146,64,14,.28)" };
    case "regravacao":
      return { label: "Regravação", icon: "↻", color: "#c4b5fd", bg: "rgba(91,33,182,.28)" };
    case "atencao":
      return { label: "Atenção", icon: "!", color: "#fdba74", bg: "rgba(154,52,18,.28)" };
    case "critico":
      return { label: "Crítico", icon: "!", color: "#fca5a5", bg: "rgba(127,29,29,.32)" };
    case "concluida":
      return { label: "Semana concluída", icon: "✓", color: "#7dd3fc", bg: "rgba(3,105,161,.25)" };
    case "sem_dados":
    default:
      return { label: "Em organização", icon: "○", color: "#cbd5e1", bg: "rgba(30,41,59,.68)" };
  }
}

type RelatorioProjetoEstruturado = {
  id: string;
  tipo: "semanal" | "material";
  projetoId: string;
  semana?: number;
  criadoEm: string;
  criadoPor: string;
  andamento?: string;
  dificuldades?: string;
  suporte?: string;
  observacoes?: string;
  itens?: ItemRelatorioProjeto[];
  materialNome?: string;
  materialLink?: string;
  materialObservacao?: string;
};

type TutorialProjetoPasso = {
  alvo: string;
  titulo: string;
  texto: string;
};

const TUTORIAL_PROJETO_PASSOS: TutorialProjetoPasso[] = [
  {
    alvo: "lista-projetos",
    titulo: "Projetos",
    texto: "Aqui ficam os projetos. Em telas grandes, a listagem usa quatro cards por linha.",
  },
  {
    alvo: "novo-projeto",
    titulo: "Criar um projeto",
    texto: "Use este botão para abrir o cadastro. Os avisos de campos obrigatórios só aparecem depois da tentativa de criação.",
  },
  {
    alvo: "form-novo-projeto",
    titulo: "Preencha os dados obrigatórios",
    texto: "Informe nome, tipo, gênero, categoria e os dados obrigatórios do líder. Editor, observações e banco inicial continuam opcionais.",
  },
  {
    alvo: "abas-projeto",
    titulo: "Áreas do projeto",
    texto: "O projeto separa Informações, Seleção, Banco e Semanas, Registro, Atividade, Histórico e Relatórios.",
  },
  {
    alvo: "semanas-projeto",
    titulo: "Banco e Semanas",
    texto: "Aqui você cria semanas, adiciona o elenco, conclui, reabre ou exclui uma semana quando tiver permissão.",
  },
  {
    alvo: "relatorios-projeto",
    titulo: "Relatórios integrados",
    texto: "Crie o relatório semanal usando automaticamente o elenco da semana ou registre a entrega de material finalizado. Substituições viram pendências visíveis.",
  },
];

function extrairCategoriaProjeto(observacoes?: string) {
  const texto = String(observacoes || "");
  const inicio = texto.indexOf(CATEGORIA_PROJETO_INICIO);
  const fim = texto.indexOf(CATEGORIA_PROJETO_FIM);
  if (inicio < 0 || fim < 0 || fim <= inicio) return "";
  return texto
    .slice(inicio + CATEGORIA_PROJETO_INICIO.length, fim)
    .trim();
}

function salvarCategoriaProjeto(observacoes: string, categoria: string) {
  const texto = String(observacoes || "");
  const regex = /\[\[CATEGORIA_PROJETO\]\][\s\S]*?\[\[\/CATEGORIA_PROJETO\]\]/gi;
  const semMeta = texto.replace(regex, "").trim();
  const bloco = categoria.trim()
    ? `${CATEGORIA_PROJETO_INICIO}${categoria.trim()}${CATEGORIA_PROJETO_FIM}`
    : "";
  return [semMeta, bloco].filter(Boolean).join("\n");
}

function lerRelatoriosProjeto(registro?: string): RelatorioProjetoEstruturado[] {
  return String(registro || "")
    .split("\n")
    .filter((linha) => linha.startsWith(RELATORIO_PROJETO_PREFIXO))
    .map((linha) => {
      try {
        return JSON.parse(
          linha.slice(RELATORIO_PROJETO_PREFIXO.length)
        ) as RelatorioProjetoEstruturado;
      } catch {
        return null;
      }
    })
    .filter((item): item is RelatorioProjetoEstruturado => Boolean(item));
}

function registroSemRelatorios(registro?: string) {
  return String(registro || "")
    .split("\n")
    .filter((linha) => !linha.startsWith(RELATORIO_PROJETO_PREFIXO))
    .join("\n")
    .trim();
}

const WHATSAPP_BRIDGE_URL = String(
  import.meta.env.VITE_WHATSAPP_BRIDGE_URL || "http://127.0.0.1:8766"
).trim().replace(/\/$/, "");
const WHATSAPP_MSG_01_KEY = "dubworks_whatsapp_mensagem_01_v1";
const WHATSAPP_MSG_02_KEY = "dubworks_whatsapp_mensagem_02_v1";
const WHATSAPP_QUEUE_MIN_SECONDS = 15;
const WHATSAPP_QUEUE_MAX_SECONDS = 5 * 60;

const DEFAULT_WHATSAPP_MSG_01 = `Olá, tudo bem? Aqui é {responsavel}, {cargo} da DubWorks ☺️

Seu número foi informado em uma de nossas fichas de inscrição. Gostaríamos apenas de confirmar:

*👤 Nome na ficha:* _{nome}_

_Você confirma que realizou o cadastro?_

*Ficamos no aguardo da sua confirmação. Obrigado!*`;

const DEFAULT_WHATSAPP_MSG_02 = `Oi, tudo bem? 😊 Meu nome é {responsavel}, faço parte da equipe da DubWorks.

Estamos entrando em contato porque identificamos uma informação na sua ficha que precisa ser corrigida.

*👤 Nome na ficha:* _{nome}_

Pedimos, por favor, que revise e corrija a informação na sua ficha. Depois de fazer a correção, nos avise por aqui para conseguirmos dar continuidade ao seu cadastro. 💙`;

type WhatsappBridgeStatus = {
  state: string;
  detail: string;
  qr_data_url?: string;
  numero?: string;
};

function lerMensagemWhatsappLocal(chave: string, padrao: string) {
  if (typeof window === "undefined") return padrao;
  try {
    return window.localStorage.getItem(chave) || padrao;
  } catch {
    return padrao;
  }
}

const CACHE_MEMBROS_LOCAL_KEY = "dubworks_membros_cache_v2";

function lerCacheMembrosLocal(): Membro[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CACHE_MEMBROS_LOCAL_KEY);
    if (!bruto) return [];
    const cache = JSON.parse(bruto);
    return Array.isArray(cache?.membros) ? cache.membros : [];
  } catch {
    return [];
  }
}

function salvarCacheMembrosLocal(membros: Membro[]) {
  if (typeof window === "undefined" || !membros.length) return;
  try {
    window.localStorage.setItem(
      CACHE_MEMBROS_LOCAL_KEY,
      JSON.stringify({ salvoEm: new Date().toISOString(), membros })
    );
  } catch (erro) {
    console.warn("Não foi possível atualizar o cache local dos membros:", erro);
  }
}

export default function DubworksManager() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membros, setMembros] = useState<Membro[]>(() => lerCacheMembrosLocal());
  const [query, setQuery] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [generoFiltro, setGeneroFiltro] = useState("Todos");
  const [paginaProjetos, setPaginaProjetos] = useState(1);
  const projetosPorPagina = 12;
  const { usuarioLogado, setUsuarioLogado, sessaoInicialCarregada } = useDubworksSession();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("projeto");
  });
  const [rascunho, setRascunho] = useState<Projeto | null>(null);
  const [mostrarNovoProjeto, setMostrarNovoProjeto] = useState(false);

  useEffect(() => {
    const sincronizarComUrl = () => {
      const projetoId = new URLSearchParams(window.location.search).get("projeto");
      setSelecionadoId(projetoId);
      setRascunho(null);
      if (projetoId) setAbaProjeto("informacoes");
    };

    window.addEventListener("popstate", sincronizarComUrl);
    return () => window.removeEventListener("popstate", sincronizarComUrl);
  }, []);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [mostrarFormNovoUsuario, setMostrarFormNovoUsuario] = useState(false);
  const [usuarioExpandidoId, setUsuarioExpandidoId] = useState<string | null>(null);
  const [queryUsuarios, setQueryUsuarios] = useState("");
  const [cargoFiltroUsuarios, setCargoFiltroUsuarios] = useState<"Todos" | Cargo>("Todos");
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
  const [usuarioEdicao, setUsuarioEdicao] = useState<Usuario | null>(null);
  const [mostrarMembros, setMostrarMembros] = useState(false);
  const [mostrarAdvertencias, setMostrarAdvertencias] = useState(false);
  const [mostrarEventos, setMostrarEventos] = useState(false);
  const [mostrarMarketing, setMostrarMarketing] = useState(false);
  const [advertencias, setAdvertencias] = useState<AdvertenciaPlanilha[]>([]);
  const [carregandoAdvertencias, setCarregandoAdvertencias] = useState(false);
  const [erroAdvertencias, setErroAdvertencias] = useState("");
  const [queryAdvertencias, setQueryAdvertencias] = useState("");
  const [advertenciaSelecionada, setAdvertenciaSelecionada] =
    useState<AdvertenciaPlanilha | null>(null);
  const [mostrarNovaAdvertencia, setMostrarNovaAdvertencia] = useState(false);
  const [salvandoAdvertencia, setSalvandoAdvertencia] = useState(false);
  const [decidindoAdvertenciaId, setDecidindoAdvertenciaId] = useState<
    number | null
  >(null);
  const [novaAdvertencia, setNovaAdvertencia] = useState(() => ({
    advertido_telefone: "",
    moderador_telefone: "",
    descricao: "",
    valor: "0",
    provas: "",
    data_ocorrencia: new Date().toISOString().slice(0, 10),
  }));
  const [mostrarFerramentas, setMostrarFerramentas] = useState(false);
  const [categoriaFerramentas, setCategoriaFerramentas] = useState<
    "inicio" | "calendario" | "chat" | "ia" | "editor"
  >("inicio");
  const [mostrarCentralAjuda, setMostrarCentralAjuda] = useState(false);
  const [mostrarRelatorios, setMostrarRelatorios] = useState(false);
  const [atividadeSemanalProjetos, setAtividadeSemanalProjetos] = useState<
    AtividadeSemanalProjeto[]
  >([]);
  const [carregandoAtividadeSemanal, setCarregandoAtividadeSemanal] = useState(false);
  const [erroAtividadeSemanal, setErroAtividadeSemanal] = useState("");
  const [queryAtividadeSemanal, setQueryAtividadeSemanal] = useState("");
  const [filtroAtividadeSemanal, setFiltroAtividadeSemanal] = useState<
    "todos" | SituacaoAtividadeSemanal
  >("todos");
  const [mostrarTreinamentos, setMostrarTreinamentos] = useState(false);
  const [moduloTreinamentoAtivo, setModuloTreinamentoAtivo] =
    useState("papel-lider");
  const [checklistTreinamento, setChecklistTreinamento] = useState<
    Record<string, boolean>
  >({});
  const [respostasTreinamento, setRespostasTreinamento] = useState<
    Record<string, number>
  >({});
  const [respostasTreinamentoSalvas, setRespostasTreinamentoSalvas] = useState<
    RespostaTreinamento[]
  >([]);
  const [carregandoRespostasTreinamento, setCarregandoRespostasTreinamento] =
    useState(false);
  const [mostrarResultadosTreinamento, setMostrarResultadosTreinamento] =
    useState(false);
  const [avaliacaoLider, setAvaliacaoLider] = useState({
    lider: "",
    projeto: "",
    nota: "10",
    status: "em_treinamento",
    observacoes: "",
  });
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [queryMembros, setQueryMembros] = useState("");
  const [statusMembrosFiltro, setStatusMembrosFiltro] = useState<
    "todos" | "na_comunidade" | "somente_canais" | "saiu" | "banido"
  >("todos");
  const [atendimentoMembrosFiltro, setAtendimentoMembrosFiltro] = useState<
    AtendimentoMembro | "todos"
  >("todos");
  const [faixaEtariaMembrosFiltro, setFaixaEtariaMembrosFiltro] = useState("todos");
  const [ordenacaoMembros, setOrdenacaoMembros] = useState<
    "recentes" | "antigos" | "nome_az" | "nome_za"
  >("recentes");
  const [ultimaSincronizacaoMembros, setUltimaSincronizacaoMembros] = useState<Date | null>(null);
  const [membroSelecionadoId, setMembroSelecionadoId] = useState<number | null>(
    null
  );
  const [membroEmEdicaoId, setMembroEmEdicaoId] = useState<number | null>(null);
  const [rascunhoMembroEdicao, setRascunhoMembroEdicao] = useState<Partial<Membro> | null>(null);
  const [salvandoEdicaoMembro, setSalvandoEdicaoMembro] = useState(false);
  const [historicoMembroSelecionado, setHistoricoMembroSelecionado] = useState<
    HistoricoMembroEvento[]
  >([]);
  const [carregandoHistoricoMembro, setCarregandoHistoricoMembro] =
    useState(false);
  const [whatsappBridge, setWhatsappBridge] = useState<WhatsappBridgeStatus>({
    state: "desconhecido",
    detail: "Verificando o bridge local do WhatsApp...",
  });
  const [carregandoWhatsappBridge, setCarregandoWhatsappBridge] = useState(false);
  const [enviandoWhatsappMembroId, setEnviandoWhatsappMembroId] = useState<number | null>(null);
  const [tipoMensagemWhatsapp, setTipoMensagemWhatsapp] = useState<"01" | "02">("01");
  const [mensagemWhatsapp01, setMensagemWhatsapp01] = useState(() =>
    lerMensagemWhatsappLocal(WHATSAPP_MSG_01_KEY, DEFAULT_WHATSAPP_MSG_01)
  );
  const [mensagemWhatsapp02, setMensagemWhatsapp02] = useState(() =>
    lerMensagemWhatsappLocal(WHATSAPP_MSG_02_KEY, DEFAULT_WHATSAPP_MSG_02)
  );
  const [mostrarConfigMensagensWhatsapp, setMostrarConfigMensagensWhatsapp] = useState(false);
  const [filaWhatsappAtiva, setFilaWhatsappAtiva] = useState(false);
  const [filaWhatsappTotal, setFilaWhatsappTotal] = useState(0);
  const [filaWhatsappProcessados, setFilaWhatsappProcessados] = useState(0);
  const [filaWhatsappAtual, setFilaWhatsappAtual] = useState("");
  const [filaWhatsappProximoEm, setFilaWhatsappProximoEm] = useState<number | null>(null);
  const [filaWhatsappResumo, setFilaWhatsappResumo] = useState("");
  const filaWhatsappCancelarRef = useRef(false);
  const [registroSemanalTexto, setRegistroSemanalTexto] = useState("");
  const [novoProjetoCategoria, setNovoProjetoCategoria] = useState("");
  const [tentouCriarProjeto, setTentouCriarProjeto] = useState(false);

  const [tipoRelatorioProjeto, setTipoRelatorioProjeto] = useState<"semanal" | "material">("semanal");
  const [semanaRelatorioProjeto, setSemanaRelatorioProjeto] = useState(1);
  const [itensRelatorioProjeto, setItensRelatorioProjeto] = useState<ItemRelatorioProjeto[]>([]);
  const [andamentoRelatorioProjeto, setAndamentoRelatorioProjeto] = useState("");
  const [dificuldadesRelatorioProjeto, setDificuldadesRelatorioProjeto] = useState("");
  const [suporteRelatorioProjeto, setSuporteRelatorioProjeto] = useState("");
  const [observacoesRelatorioProjeto, setObservacoesRelatorioProjeto] = useState("");
  const [materialNomeRelatorioProjeto, setMaterialNomeRelatorioProjeto] = useState("");
  const [materialLinkRelatorioProjeto, setMaterialLinkRelatorioProjeto] = useState("");
  const [materialObservacaoRelatorioProjeto, setMaterialObservacaoRelatorioProjeto] = useState("");
  const [salvandoRelatorioProjeto, setSalvandoRelatorioProjeto] = useState(false);

  const [tutorialProjetoAtivo, setTutorialProjetoAtivo] = useState(false);
  const [tutorialProjetoPasso, setTutorialProjetoPasso] = useState(0);
  const [tutorialProjetoRect, setTutorialProjetoRect] = useState<DOMRect | null>(null);

  const [abaProjeto, setAbaProjeto] = useState<
    | "informacoes"
    | "selecao"
    | "elenco"
    | "registros"
    | "atividades"
    | "historico"
    | "relatorios"
    | "drive"
  >("informacoes");
  const [carregando, setCarregando] = useState(true);
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [larguraTela, setLarguraTela] = useState(
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  useEffect(() => {
    salvarCacheMembrosLocal(membros);
  }, [membros]);

  useEffect(() => {
    if (!mostrarMembros || !usuarioLogado || !podeGerenciarMembros(usuarioLogado)) return;

    void carregarStatusWhatsappBridge();
    const timer = window.setInterval(() => {
      void carregarStatusWhatsappBridge(false);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [mostrarMembros, usuarioLogado?.login]);

  useEffect(() => {
    if (!tutorialProjetoAtivo || typeof document === "undefined") return;

    let timer = 0;
    const atualizar = () => {
      const passo = TUTORIAL_PROJETO_PASSOS[tutorialProjetoPasso];
      if (!passo) return;
      const alvo = document.querySelector(
        `[data-tutorial-projetos="${passo.alvo}"]`
      ) as HTMLElement | null;
      if (!alvo) {
        setTutorialProjetoRect(null);
        return;
      }
      alvo.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      timer = window.setTimeout(() => {
        setTutorialProjetoRect(alvo.getBoundingClientRect());
      }, 260);
    };

    const atraso = window.setTimeout(atualizar, 180);
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);

    return () => {
      window.clearTimeout(atraso);
      window.clearTimeout(timer);
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
    };
  }, [
    tutorialProjetoAtivo,
    tutorialProjetoPasso,
    mostrarNovoProjeto,
    abaProjeto,
    selecionadoId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || selecionadoId) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("projeto")) return;

    url.searchParams.delete("projeto");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [selecionadoId]);

  const isMobile = larguraTela <= 768;
  const isTablet = larguraTela <= 1100;
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [mensagemIA, setMensagemIA] = useState("");
  const [historicoIA, setHistoricoIA] = useState<
    { autor: "usuario" | "ia"; texto: string }[]
  >([]);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [acaoPendenteIA, setAcaoPendenteIA] = useState<{
    tipo: "atualizar_projeto";
    projeto_id: string;
    projeto: string;
    campo: "Status" | "Prioridade" | "Lider" | "Editor" | "Data_Inicio";
    valor_atual: string;
    novo_valor: string;
  } | null>(null);
  const [salvandoAcaoIA, setSalvandoAcaoIA] = useState(false);

  // ==========================
  // CHAT INTERNO
  // ==========================
  const [canaisChat, setCanaisChat] = useState<ChatCanal[]>([]);
  const [participantesChat, setParticipantesChat] = useState<ChatParticipante[]>([]);
  const [canalChatAtivoId, setCanalChatAtivoId] = useState<string | null>(null);
  const [mensagensChat, setMensagensChat] = useState<ChatMensagem[]>([]);
  const [mensagemChat, setMensagemChat] = useState("");
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [carregandoMensagensChat, setCarregandoMensagensChat] = useState(false);
  const [enviandoMensagemChat, setEnviandoMensagemChat] = useState(false);
  const [erroChat, setErroChat] = useState("");
  const [painelInfoChatAberto, setPainelInfoChatAberto] = useState(true);
  const [mensagemRespondendoChat, setMensagemRespondendoChat] =
    useState<ChatMensagem | null>(null);
  const [mostrarAdicionarPessoasChat, setMostrarAdicionarPessoasChat] =
    useState(false);
  const [buscaPessoasChat, setBuscaPessoasChat] = useState("");
  const [pessoasSelecionadasChat, setPessoasSelecionadasChat] = useState<
    string[]
  >([]);
  const [adicionandoPessoasChat, setAdicionandoPessoasChat] = useState(false);
  const [menuChatAberto, setMenuChatAberto] = useState(false);
  const [menuMensagemAbertoId, setMenuMensagemAbertoId] =
    useState<number | null>(null);
  const [mensagemEditandoChat, setMensagemEditandoChat] =
    useState<ChatMensagem | null>(null);
  const [textoEdicaoMensagemChat, setTextoEdicaoMensagemChat] = useState("");
  const [salvandoEdicaoMensagemChat, setSalvandoEdicaoMensagemChat] =
    useState(false);
  const [preferenciasChat, setPreferenciasChat] = useState<ChatPreferencia[]>(
    []
  );
  const [alterandoSilencioChat, setAlterandoSilencioChat] = useState(false);

  // ==========================
  // NOTIFICAÇÕES E MENÇÕES
  // ==========================
  const [notificacoesChat, setNotificacoesChat] = useState<NotificacaoChat[]>([]);
  const [mostrarNotificacoesChat, setMostrarNotificacoesChat] = useState(false);
  const [carregandoNotificacoesChat, setCarregandoNotificacoesChat] =
    useState(false);
  const [toastNotificacaoChat, setToastNotificacaoChat] =
    useState<NotificacaoChat | null>(null);
  const [permissaoNotificacaoSistema, setPermissaoNotificacaoSistema] = useState<
    "default" | "granted" | "denied" | "indisponivel"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "indisponivel";
    }

    return Notification.permission;
  });
  const [mensagemChatDestacadaId, setMensagemChatDestacadaId] =
    useState<number | null>(null);
  const [mencoesPendentesChat, setMencoesPendentesChat] = useState<
    { login: string; nome: string }[]
  >([]);

  // ==========================
  // ANEXOS DO CHAT
  // ==========================
  const [anexosChat, setAnexosChat] = useState<ChatAnexo[]>([]);
  const [arquivosChatSelecionados, setArquivosChatSelecionados] = useState<
    File[]
  >([]);
  const [enviandoAnexosChat, setEnviandoAnexosChat] = useState(false);
  const inputAnexoChatRef = useRef<HTMLInputElement | null>(null);

  const timerToastNotificacaoRef = useRef<number | null>(null);
  const timerFocoNotificacaoRef = useRef<number | null>(null);

  const [novoProjeto, setNovoProjeto] = useState<Projeto>(projetoVazio);
  const [novoProjetoNomeLider, setNovoProjetoNomeLider] = useState("");
  const [novoProjetoNomeEditor, setNovoProjetoNomeEditor] = useState("");
  const [erroEmailLiderNovo, setErroEmailLiderNovo] = useState("");
  const [erroEmailEditorNovo, setErroEmailEditorNovo] = useState("");
  const [validandoEmailLiderNovo, setValidandoEmailLiderNovo] = useState(false);
  const [validandoEmailEditorNovo, setValidandoEmailEditorNovo] = useState(false);
  const [erroEmailLiderEdicao, setErroEmailLiderEdicao] = useState("");
  const [erroEmailEditorEdicao, setErroEmailEditorEdicao] = useState("");
  const [novoUsuario, setNovoUsuario] = useState<Usuario>({
    nome: "",
    login: "",
    cargo: "lider",
    vinculo: "",
    training_status: "nao_aplicavel",
    ...permissoesPadraoUsuario("lider"),
  });
  const [novaSenhaUsuario, setNovaSenhaUsuario] = useState("");
  const [novoElencoProjeto, setNovoElencoProjeto] =
    useState<ElencoItem>(elencoVazio);
  const [novoElencoRascunho, setNovoElencoRascunho] =
    useState<ElencoItem>(elencoVazio);
  const [enviandoCapaNovoProjeto, setEnviandoCapaNovoProjeto] = useState(false);
  const [enviandoCapaProjeto, setEnviandoCapaProjeto] = useState(false);
  const [criandoEstruturaDrive, setCriandoEstruturaDrive] = useState(false);
  const [preparandoFormulariosProjeto, setPreparandoFormulariosProjeto] =
    useState(false);
  const [respostasSelecao, setRespostasSelecao] = useState<RespostaSelecao[]>(
    []
  );
  const [respostaSelecaoAtivaId, setRespostaSelecaoAtivaId] = useState<
    string | null
  >(null);
  const [sincronizandoSelecao, setSincronizandoSelecao] = useState(false);
  const [statusSelecaoPorId, setStatusSelecaoPorId] = useState<
    Record<string, StatusSelecao>
  >({});
  const [comentarioSelecaoPorId, setComentarioSelecaoPorId] = useState<
    Record<string, string>
  >({});
  const [avaliacoesSelecaoSalvas, setAvaliacoesSelecaoSalvas] = useState<
    AvaliacaoSelecao[]
  >([]);
  const [salvandoAvaliacaoSelecao, setSalvandoAvaliacaoSelecao] =
    useState(false);
  const [entregasProducao, setEntregasProducao] = useState<EntregaProducao[]>(
    []
  );
  const [sincronizandoEntregas, setSincronizandoEntregas] = useState(false);
  const [semanasProjeto, setSemanasProjeto] = useState<ProjetoSemana[]>([]);
  const [semanaFiltroProducao, setSemanaFiltroProducao] = useState(1);
  const [liberandoSemana, setLiberandoSemana] = useState(false);
  const [excluindoSemanaProjeto, setExcluindoSemanaProjeto] = useState(false);
  const [enviandoLembretesWhatsapp, setEnviandoLembretesWhatsapp] =
    useState(false);
  const [participantesSemanaProjeto, setParticipantesSemanaProjeto] = useState<
    ParticipanteSemanaProjeto[]
  >([]);
  const [carregandoParticipantesSemana, setCarregandoParticipantesSemana] =
    useState(false);
  const [mostrarAdicionarSemana, setMostrarAdicionarSemana] = useState(false);
  const [criandoSemanaProjeto, setCriandoSemanaProjeto] = useState(false);
  const [alterandoParticipanteSemana, setAlterandoParticipanteSemana] =
    useState(false);
  const [reabrindoPapelId, setReabrindoPapelId] = useState<string | null>(null);

  // ==========================
  // SINCRONIZAÇÃO AUTOMÁTICA
  // ==========================
  const [statusSincronizacaoAutomatica, setStatusSincronizacaoAutomatica] =
    useState<"idle" | "sincronizando" | "ok" | "erro">("idle");
  const [mensagemSincronizacaoAutomatica, setMensagemSincronizacaoAutomatica] =
    useState("");
  const ultimaSincronizacaoAutomaticaRef = useRef<{
    projetoId: string;
    momento: number;
  } | null>(null);

  // ==========================
  // ESTATÍSTICAS GERAIS
  // ==========================
  const [resumoMidiasPorProjeto, setResumoMidiasPorProjeto] = useState<
    Record<string, { entregas: number; testes: number }>
  >({});

  // ==========================
  // AGENDA / CALENDÁRIO
  // ==========================
  const [agendaEventos, setAgendaEventos] = useState<AgendaEvento[]>([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [visualizacaoAgenda, setVisualizacaoAgenda] = useState<
    "mes" | "semana" | "agenda"
  >("mes");
  const [dataReferenciaAgenda, setDataReferenciaAgenda] = useState(new Date());
  const [modoModalAgenda, setModoModalAgenda] = useState<
    "novo" | "visualizar" | "editar" | null
  >(null);
  const [eventoAgendaSelecionado, setEventoAgendaSelecionado] =
    useState<AgendaEvento | null>(null);
  const [agendaForm, setAgendaForm] = useState({
    titulo: "",
    descricao: "",
    inicio: "",
    fim: "",
    dia_inteiro: false,
    tipo: "compromisso",
    link_reuniao: "",
    projeto_id: "",
  });

  useEffect(() => {
    function atualizarLargura() {
      setLarguraTela(window.innerWidth);
    }

    atualizarLargura();
    window.addEventListener("resize", atualizarLargura);
    return () => window.removeEventListener("resize", atualizarLargura);
  }, []);

  async function enviarMensagemIA() {
    const novaMensagem = mensagemIA.trim();

    if (!novaMensagem || carregandoIA) return;

    setHistoricoIA((anterior) => [
      ...anterior,
      {
        autor: "usuario",
        texto: novaMensagem,
      },
    ]);

    setMensagemIA("");
    setAcaoPendenteIA(null);
    setCarregandoIA(true);

    try {
      const iaApiUrl = import.meta.env.VITE_CORTES_API_URL
        ? `${import.meta.env.VITE_CORTES_API_URL}/ia/chat`
        : "/api/ia/chat";

      const resposta = await fetch(iaApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensagem: novaMensagem,

          projetos: projetosVisiveis.map((projeto) => {
            const linksDrive = extrairLinksDrive(projeto.Observacoes || "");

            const liderNormalizado = normalizar(projeto.Lider || "");

            const perfilLider =
              usuarios.find((usuario) =>
                [usuario.login, usuario.nome, usuario.vinculo].some(
                  (valor) =>
                    Boolean(valor) &&
                    normalizar(valor || "") === liderNormalizado
                )
              ) || null;

            const personagensSelecao = Array.from(
              new Set(
                (projeto.Elenco || [])
                  .map((item) => String(item.personagem || "").trim())
                  .filter(Boolean)
              )
            );

            return {
              id: String(projeto.ID),
              projeto: projeto.Projeto || "",
              status: projeto.Status || "",
              tipo: projeto.Tipo || "",
              genero: projeto.Genero || "",
              prioridade: projeto.Prioridade || "",
              lider: projeto.Lider || "",
              lider_nome: perfilLider?.nome || projeto.Lider || "",
              editor: projeto.Editor || "",
              data_inicio: projeto.Data_Inicio || "",
              ultimos_registros: (projeto.Registro_Semanal || "")
                .split("\\n")
                .slice(-10)
                .join("\\n"),

              // Dados objetivos usados para montar o modelo oficial de seleção.
              // O backend calcula o prazo padrão de 7 dias.
              personagens_selecao: personagensSelecao,
              link_falas_teste: linksDrive.falasTeste || "",
              link_formulario_selecao: linksDrive.formSelecao || "",

              // A IA recebe somente o elenco oficial já registrado no projeto.
              // No fluxo atual do Manager, candidatos aprovados são adicionados
              // ao Elenco do projeto. Assim, a IA não precisa decidir quem foi
              // aprovado: ela apenas organiza os dados oficiais do sistema.
              aprovados: (projeto.Elenco || [])
                .filter(
                  (item) =>
                    Boolean(item.personagem?.trim()) &&
                    Boolean(item.dublador?.trim())
                )
                .map((item) => ({
                  personagem: item.personagem || "",
                  dublador: item.dublador || "",
                  telefone: item.telefone_dublador || "",
                  funcao: item.funcao || "Dublador",
                })),
            };
          }),
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.detail || "Não foi possível consultar a IA."
        );
      }

      if (!dados?.resposta) {
        throw new Error("A IA não retornou nenhuma resposta.");
      }

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto: String(dados.resposta),
        },
      ]);

      if (
        dados?.acao?.tipo === "atualizar_projeto" &&
        dados?.acao?.projeto_id &&
        dados?.acao?.campo &&
        dados?.acao?.novo_valor !== undefined
      ) {
        setAcaoPendenteIA({
          tipo: "atualizar_projeto",
          projeto_id: String(dados.acao.projeto_id),
          projeto: String(dados.acao.projeto || ""),
          campo: dados.acao.campo,
          valor_atual: String(dados.acao.valor_atual || ""),
          novo_valor: String(dados.acao.novo_valor || ""),
        });
      }
    } catch (erro) {
      console.error("Erro ao consultar a IA:", erro);

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto:
            erro instanceof Error
              ? `Erro: ${erro.message}`
              : "Não consegui me conectar à IA.",
        },
      ]);
    } finally {
      setCarregandoIA(false);
    }
  }

  async function confirmarAcaoIA() {
    if (!acaoPendenteIA || salvandoAcaoIA || !usuarioLogado) return;

    const projetoAlvo =
      projetosVisiveis.find(
        (projeto) => String(projeto.ID) === String(acaoPendenteIA.projeto_id)
      ) || null;

    if (!projetoAlvo) {
      alert(
        "O projeto da alteração não está mais disponível para este usuário."
      );
      setAcaoPendenteIA(null);
      return;
    }

    if (!podeEditarProjeto(usuarioLogado, projetoAlvo)) {
      alert("Você não tem permissão para alterar este projeto.");
      setAcaoPendenteIA(null);
      return;
    }

    if (
      acaoPendenteIA.campo === "Lider" &&
      (usuarioLogado.cargo === "lider" ||
        usuarioLogado.cargo === "lider_treinamento")
    ) {
      alert("Seu perfil não tem permissão para trocar o líder do projeto.");
      setAcaoPendenteIA(null);
      return;
    }

    const valorAtualReal = String(
      (projetoAlvo as any)[acaoPendenteIA.campo] || ""
    ).trim();

    if (valorAtualReal !== String(acaoPendenteIA.valor_atual || "").trim()) {
      alert(
        "O projeto foi alterado depois da proposta da IA. Peça a alteração novamente para usar os dados atuais."
      );
      setAcaoPendenteIA(null);
      await recarregarProjetos();
      return;
    }

    const novoValor = String(acaoPendenteIA.novo_valor || "").trim();

    if (!novoValor) {
      alert("A IA não informou um novo valor válido.");
      setAcaoPendenteIA(null);
      return;
    }

    const projetoAtualizado: Projeto = {
      ...projetoAlvo,
      [acaoPendenteIA.campo]: novoValor,
    };

    const nomeCampo: Record<
      "Status" | "Prioridade" | "Lider" | "Editor" | "Data_Inicio",
      string
    > = {
      Status: "status",
      Prioridade: "prioridade",
      Lider: "líder",
      Editor: "editor",
      Data_Inicio: "data de início",
    };

    const descricaoHistorico = `via IA o ${
      nomeCampo[acaoPendenteIA.campo]
    } de "${valorAtualReal || "vazio"}" para "${novoValor}"`;

    const projetoComHistorico = aplicarHistoricoAutomatico(
      projetoAlvo,
      projetoAtualizado,
      descricaoHistorico
    );

    try {
      setSalvandoAcaoIA(true);

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert("Não consegui salvar a alteração no banco.");
        return;
      }

      await recarregarProjetos();

      setHistoricoIA((anterior) => [
        ...anterior,
        {
          autor: "ia",
          texto: `✓ Alteração confirmada. ${projetoAlvo.Projeto}: ${
            nomeCampo[acaoPendenteIA.campo]
          } atualizado de "${valorAtualReal || "vazio"}" para "${novoValor}".`,
        },
      ]);

      setAcaoPendenteIA(null);
    } catch (erro) {
      console.error("Erro ao executar alteração proposta pela IA:", erro);
      alert(
        erro instanceof Error
          ? `Erro ao salvar alteração: ${erro.message}`
          : "Erro ao salvar alteração."
      );
    } finally {
      setSalvandoAcaoIA(false);
    }
  }

  async function carregarAvaliacoesSelecaoProjeto(projeto: Projeto) {
    const avaliacoes = await carregarAvaliacoesSelecaoBanco(projeto.ID);
    setAvaliacoesSelecaoSalvas(avaliacoes);

    const statusMap: Record<string, StatusSelecao> = {};
    const comentarioMap: Record<string, string> = {};

    avaliacoes.forEach((item) => {
      statusMap[item.resposta_id] = item.status;
      comentarioMap[item.resposta_id] = item.comentario_lider || "";
    });

    setStatusSelecaoPorId((anterior) => ({
      ...anterior,
      ...statusMap,
    }));

    setComentarioSelecaoPorId((anterior) => ({
      ...anterior,
      ...comentarioMap,
    }));
  }

  async function salvarAvaliacaoSelecaoAtual(
    projeto: Projeto,
    resposta: RespostaSelecao | null,
    status: StatusSelecao,
    comentario: string
  ) {
    if (!resposta) {
      alert("Selecione uma resposta primeiro.");
      return false;
    }

    if (!projeto?.ID) {
      alert("Projeto inválido.");
      return false;
    }

    setSalvandoAvaliacaoSelecao(true);

    try {
      const ok = await salvarAvaliacaoSelecaoBanco({
        projeto_id: Number(projeto.ID),
        resposta_id: resposta.id,
        linha: resposta.linha ?? null,
        nome: resposta.nome || "",
        telefone: resposta.telefone || "",
        personagem: resposta.personagem || "",
        semana: resposta.semana || "Semana 01",
        video_url: resposta.videoUrl || "",
        comentario_membro: resposta.comentario || "",
        status,
        comentario_lider: comentario || "",
        avaliado_por: usuarioLogado?.nome || usuarioLogado?.login || "Sistema",
      });

      if (!ok) {
        alert("Não consegui salvar a avaliação no Supabase.");
        return false;
      }

      setStatusSelecaoPorId((anterior) => ({
        ...anterior,
        [resposta.id]: status,
      }));

      setComentarioSelecaoPorId((anterior) => ({
        ...anterior,
        [resposta.id]: comentario || "",
      }));

      await carregarAvaliacoesSelecaoProjeto(projeto);

      return true;
    } finally {
      setSalvandoAvaliacaoSelecao(false);
    }
  }

  async function sincronizarRespostasSelecao(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);
    const planilhaSelecao = links.planilhaSelecao || "";
    const pastaRespostasSelecao = links.respostasSelecao || links.selecao || "";

    if (!planilhaSelecao && !pastaRespostasSelecao) {
      alert(
        "Ainda não encontrei a planilha nem a pasta de respostas da seleção neste projeto. Crie a estrutura do Drive novamente em um projeto teste."
      );
      return;
    }

    try {
      setSincronizandoSelecao(true);
      const respostas = await lerRespostasSelecaoViaAppsScript(
        planilhaSelecao,
        pastaRespostasSelecao
      );

      setRespostasSelecao(respostas);
      await carregarAvaliacoesSelecaoProjeto(projeto);

      if (respostas.length) {
        setRespostaSelecaoAtivaId(respostas[0].id);
      } else {
        setRespostaSelecaoAtivaId(null);
      }

      alert(
        `Sincronização concluída. ${respostas.length} resposta(s) importada(s).`
      );
    } catch (err: any) {
      console.error("Erro ao sincronizar respostas da seleção:", err);
      alert(`Erro ao sincronizar respostas: ${err?.message || String(err)}`);
    } finally {
      setSincronizandoSelecao(false);
    }
  }

  async function sincronizarProjetoAutomaticamente(projeto: Projeto) {
    const agora = Date.now();
    const ultima = ultimaSincronizacaoAutomaticaRef.current;

    // Evita chamada duplicada do StrictMode/HMR em poucos segundos.
    if (
      ultima?.projetoId === String(projeto.ID) &&
      agora - ultima.momento < 3000
    ) {
      return;
    }

    ultimaSincronizacaoAutomaticaRef.current = {
      projetoId: String(projeto.ID),
      momento: agora,
    };

    setStatusSincronizacaoAutomatica("sincronizando");
    setMensagemSincronizacaoAutomatica("Sincronizando formulários...");

    const links = extrairLinksDrive(projeto.Observacoes);
    let fontesEncontradas = 0;
    const erros: string[] = [];

    // Seleção: sincronização silenciosa, sem alert.
    if (links.planilhaSelecao || links.respostasSelecao || links.selecao) {
      fontesEncontradas += 1;
      try {
        setSincronizandoSelecao(true);
        const respostas = await lerRespostasSelecaoViaAppsScript(
          links.planilhaSelecao || "",
          links.respostasSelecao || links.selecao || ""
        );

        setRespostasSelecao(respostas);
        await carregarAvaliacoesSelecaoProjeto(projeto);
        setRespostaSelecaoAtivaId(respostas[0]?.id || null);

        setResumoMidiasPorProjeto((anterior) => ({
          ...anterior,
          [String(projeto.ID)]: {
            entregas:
              anterior[String(projeto.ID)]?.entregas ||
              entregasProducao.length ||
              0,
            testes: respostas.length,
          },
        }));
      } catch (erro: any) {
        console.error("Erro na sincronização automática da seleção:", erro);
        erros.push(`Seleção: ${erro?.message || String(erro)}`);
      } finally {
        setSincronizandoSelecao(false);
      }
    }

    // Entregas: sincronização silenciosa e sem concluir semana automaticamente.
    if (links.planilhaEntregas || links.entregasProjeto || links.projeto) {
      fontesEncontradas += 1;
      try {
        setSincronizandoEntregas(true);
        const respostas = await lerRespostasEntregasViaEdge(
          links.planilhaEntregas || "",
          links.entregasProjeto || links.projeto || ""
        );

        const respostasResolvidas = await resolverEntregasPorTelefoneProjeto(
          projeto,
          respostas
        );
        const entregasComProjeto = respostasResolvidas.map((item) => ({
          ...item,
          projeto_id: Number(projeto.ID),
        }));

        const ok = await salvarEntregasProducaoBanco(
          projeto.ID,
          entregasComProjeto
        );

        if (!ok) {
          throw new Error("Não foi possível salvar as entregas no Supabase.");
        }

        const entregasAtualizadas = await carregarEntregasProducaoBanco(
          projeto.ID
        );
        setEntregasProducao(entregasAtualizadas);

        setResumoMidiasPorProjeto((anterior) => ({
          ...anterior,
          [String(projeto.ID)]: {
            testes:
              anterior[String(projeto.ID)]?.testes ||
              respostasSelecao.length ||
              0,
            entregas: entregasAtualizadas.length,
          },
        }));
      } catch (erro: any) {
        console.error("Erro na sincronização automática das entregas:", erro);
        erros.push(`Entregas: ${erro?.message || String(erro)}`);
      } finally {
        setSincronizandoEntregas(false);
      }
    }

    if (!fontesEncontradas) {
      setStatusSincronizacaoAutomatica("ok");
      setMensagemSincronizacaoAutomatica("Sem formulários vinculados");
      return;
    }

    if (erros.length) {
      setStatusSincronizacaoAutomatica("erro");
      setMensagemSincronizacaoAutomatica(
        "Projeto aberto com os últimos dados salvos"
      );
      return;
    }

    setStatusSincronizacaoAutomatica("ok");
    setMensagemSincronizacaoAutomatica("Formulários atualizados");
  }

  function paraDatetimeLocal(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";

    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function datetimeLocalParaIso(valor?: string) {
    if (!valor) return "";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "" : data.toISOString();
  }

  async function carregarAgendaAtual() {
    try {
      setCarregandoAgenda(true);
      const eventos = await carregarAgendaEventosBanco();
      setAgendaEventos(eventos);
      return eventos;
    } catch (erro) {
      console.error("Erro ao carregar a agenda:", erro);
      return [];
    } finally {
      setCarregandoAgenda(false);
    }
  }

  function abrirNovoCompromissoAgenda(dataBase?: Date) {
    if (!podeCriarEventos) {
      alert("Seu cargo não possui permissão para criar eventos.");
      return;
    }

    const inicioBase = dataBase ? new Date(dataBase) : new Date();

    if (!dataBase) {
      inicioBase.setMinutes(0, 0, 0);
      if (inicioBase.getHours() < 8) inicioBase.setHours(9);
    } else {
      inicioBase.setHours(9, 0, 0, 0);
    }

    const fimBase = new Date(inicioBase.getTime() + 60 * 60 * 1000);

    setEventoAgendaSelecionado(null);
    setAgendaForm({
      titulo: "",
      descricao: "",
      inicio: paraDatetimeLocal(inicioBase.toISOString()),
      fim: paraDatetimeLocal(fimBase.toISOString()),
      dia_inteiro: false,
      tipo: "compromisso",
      link_reuniao: "",
      projeto_id: projetoPainel?.ID || "",
    });
    setModoModalAgenda("novo");
  }

  function visualizarCompromissoAgenda(evento: AgendaEvento) {
    setEventoAgendaSelecionado(evento);
    setModoModalAgenda("visualizar");
  }

  function editarCompromissoAgenda(evento: AgendaEvento) {
    setEventoAgendaSelecionado(evento);
    setAgendaForm({
      titulo: evento.titulo || "",
      descricao: evento.descricao || "",
      inicio: paraDatetimeLocal(evento.inicio),
      fim: paraDatetimeLocal(evento.fim),
      dia_inteiro: Boolean(evento.dia_inteiro),
      tipo: evento.tipo || "compromisso",
      link_reuniao: evento.link_reuniao || "",
      projeto_id: evento.projeto_id ? String(evento.projeto_id) : "",
    });
    setModoModalAgenda("editar");
  }

  async function salvarCompromissoAgenda() {
    if (!agendaForm.titulo.trim()) {
      alert("Informe o título do compromisso.");
      return;
    }

    if (!agendaForm.inicio) {
      alert("Informe a data e o horário de início.");
      return;
    }

    const inicio = datetimeLocalParaIso(agendaForm.inicio);
    const fim = datetimeLocalParaIso(agendaForm.fim);

    if (!inicio) {
      alert("A data de início é inválida.");
      return;
    }

    if (fim && new Date(fim).getTime() < new Date(inicio).getTime()) {
      alert("O término não pode ser anterior ao início.");
      return;
    }

    try {
      setSalvandoAgenda(true);

      const payload = {
        titulo: agendaForm.titulo,
        descricao: agendaForm.descricao,
        inicio,
        fim: fim || null,
        dia_inteiro: agendaForm.dia_inteiro,
        tipo: agendaForm.tipo,
        link_reuniao: agendaForm.link_reuniao,
        projeto_id: agendaForm.projeto_id || null,
        criado_por:
          usuarioLogado?.nome || usuarioLogado?.login || "Sistema",
        status: podeAprovarEventos ? ("aprovado" as const) : ("pendente" as const),
      };

      if (modoModalAgenda === "editar" && eventoAgendaSelecionado) {
        await atualizarAgendaEventoBanco(
          eventoAgendaSelecionado.id,
          payload
        );
      } else {
        await criarAgendaEventoBanco(payload);
      }

      await carregarAgendaAtual();
      setModoModalAgenda(null);
      setEventoAgendaSelecionado(null);
      alert(
        podeAprovarEventos
          ? "Evento salvo e publicado na agenda."
          : "Evento enviado para aprovação da Diretoria."
      );
    } catch (erro: any) {
      alert(
        `Não consegui salvar o compromisso: ${
          erro?.message || String(erro)
        }`
      );
    } finally {
      setSalvandoAgenda(false);
    }
  }

  async function excluirCompromissoAgenda(evento: AgendaEvento) {
    const confirmar = window.confirm(
      `Excluir o compromisso "${evento.titulo}"?`
    );

    if (!confirmar) return;

    try {
      setSalvandoAgenda(true);
      await excluirAgendaEventoBanco(evento.id);
      await carregarAgendaAtual();
      setModoModalAgenda(null);
      setEventoAgendaSelecionado(null);
    } catch (erro: any) {
      alert(
        `Não consegui excluir o compromisso: ${
          erro?.message || String(erro)
        }`
      );
    } finally {
      setSalvandoAgenda(false);
    }
  }

  async function decidirEventoAgenda(
    evento: AgendaEvento,
    decisao: "aprovado" | "rejeitado"
  ) {
    if (!podeAprovarEventos || !usuarioLogado) return;

    const motivo =
      decisao === "rejeitado"
        ? window.prompt("Informe o motivo da rejeição:", "")
        : "";

    if (decisao === "rejeitado" && motivo === null) return;

    try {
      setSalvandoAgenda(true);
      await decidirAgendaEventoBanco(
        evento.id,
        decisao,
        usuarioLogado.nome || usuarioLogado.login,
        motivo || ""
      );
      await carregarAgendaAtual();
    } catch (erro: any) {
      alert(
        `Não consegui ${decisao === "aprovado" ? "aprovar" : "rejeitar"} o evento: ${
          erro?.message || String(erro)
        }`
      );
    } finally {
      setSalvandoAgenda(false);
    }
  }

  function podeAlterarEventoAgenda(evento: AgendaEvento) {
    if (podeAprovarEventos) return true;
    if (!usuarioLogado || evento.status === "aprovado") return false;

    return [usuarioLogado.nome, usuarioLogado.login]
      .filter(Boolean)
      .some(
        (referencia) =>
          normalizar(referencia || "") === normalizar(evento.criado_por)
      );
  }

  async function adicionarRespostaSelecaoAoElenco(
    resposta?: RespostaSelecao | null
  ) {
    if (!projetoPainel || !resposta) {
      alert("Selecione uma resposta primeiro.");
      return;
    }

    if (!resposta.personagem || !resposta.nome) {
      alert(
        "A resposta precisa ter personagem e nome do membro para entrar no Banco do Projeto."
      );
      return;
    }

    const existente = (projetoPainel.Elenco || []).find(
      (item) => normalizar(item.personagem) === normalizar(resposta.personagem)
    );

    if (existente?.dublador?.trim()) {
      const confirmar = window.confirm(
        `Já existe alguém registrado para ${resposta.personagem}: ${existente.dublador}. Deseja substituir por ${resposta.nome}? O histórico das semanas anteriores será preservado.`
      );

      if (!confirmar) return;
    }

    const novoElenco = existente
      ? (projetoPainel.Elenco || []).map((item) =>
          item.id === existente.id
            ? {
                ...item,
                personagem: resposta.personagem,
                dublador: resposta.nome,
                telefone_dublador: resposta.telefone || "",
                funcao: item.funcao || "Dublador",
              }
            : item
        )
      : [
          ...(projetoPainel.Elenco || []),
          {
            id: gerarIdTemporario(),
            personagem: resposta.personagem,
            dublador: resposta.nome,
            telefone_dublador: resposta.telefone || "",
            funcao: "Dublador",
          },
        ];

    const ok = await salvarElencoProjetoBanco(projetoPainel.ID, novoElenco);

    if (!ok) {
      alert("Não consegui salvar o Banco do Projeto.");
      return;
    }

    await salvarAvaliacaoSelecaoAtual(
      projetoPainel,
      resposta,
      "aprovado",
      comentarioSelecaoPorId[resposta.id] || ""
    );

    await recarregarProjetos();
    alert(
      `${resposta.nome} foi aprovado(a) para ${resposta.personagem} e vinculado(a) ao Banco do Projeto.`
    );
  }

  async function carregarSemanasProjeto(projeto: Projeto) {
    const semanas = await carregarSemanasProjetoBanco(projeto.ID);
    setSemanasProjeto(semanas);

    if (!semanas.length) {
      setSemanaFiltroProducao(1);
      setParticipantesSemanaProjeto([]);
      return semanas;
    }

    const semanaAtual =
      semanas.find((item) => item.semana === semanaFiltroProducao) ||
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    if (semanaAtual?.semana) {
      setSemanaFiltroProducao(semanaAtual.semana);
      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaAtual.semana
      );
    }

    return semanas;
  }

  async function carregarParticipantesSemanaProjetoBancoLocal(
    projeto: Projeto,
    semana: number
  ) {
    if (!projeto?.ID || !semana) {
      setParticipantesSemanaProjeto([]);
      return [];
    }

    try {
      setCarregandoParticipantesSemana(true);
      const participantes = await carregarParticipantesSemanaBanco(
        projeto.ID,
        semana
      );
      setParticipantesSemanaProjeto(participantes);
      return participantes;
    } catch (erro) {
      console.error("Erro ao carregar participantes da semana:", erro);
      setParticipantesSemanaProjeto([]);
      return [];
    } finally {
      setCarregandoParticipantesSemana(false);
    }
  }

  async function carregarEntregasProducaoProjeto(projeto: Projeto) {
    const entregas = await carregarEntregasProducaoBanco(projeto.ID);
    setEntregasProducao(entregas);
    await carregarSemanasProjeto(projeto);
    return entregas;
  }

  async function listarSemanasAbertasFormulario(projeto: Projeto) {
    const semanas = await carregarSemanasProjetoBanco(projeto.ID);
    return semanas
      .filter((item) => item.status === "aberta")
      .sort((a, b) => a.semana - b.semana)
      .map((item) => labelSemana(item.semana));
  }

  async function sincronizarFormularioEntregasProjeto(
    projeto: Projeto,
    semanasAbertasFornecidas?: string[]
  ) {
    const links = extrairLinksDrive(projeto.Observacoes);
    if (!links.formEntregas) return false;

    const semanasAbertas =
      semanasAbertasFornecidas || (await listarSemanasAbertasFormulario(projeto));

    try {
      return await sincronizarFormularioEntregasViaAppsScript(
        links.formEntregas,
        semanasAbertas
      );
    } catch (erro) {
      console.error("Erro ao sincronizar semanas do formulário de entregas:", erro);
      return false;
    }
  }

  async function resolverEntregasPorTelefoneProjeto(
    projeto: Projeto,
    respostas: EntregaProducao[]
  ) {
    const participantesPorSemana = new Map<number, ParticipanteSemanaProjeto[]>();

    for (const resposta of respostas) {
      const semanaNumero = numeroSemanaEntrega(resposta.semana);
      if (!participantesPorSemana.has(semanaNumero)) {
        const participantes = await carregarParticipantesSemanaBanco(
          projeto.ID,
          semanaNumero
        );
        participantesPorSemana.set(semanaNumero, participantes);
      }
    }

    return respostas.map((resposta) => {
      const semanaNumero = numeroSemanaEntrega(resposta.semana);
      const participantes = participantesPorSemana.get(semanaNumero) || [];
      const resolucao = resolverParticipanteEntregaPorTelefone(
        resposta.telefone,
        participantes
      );

      if (resolucao.status === "vinculado" && resolucao.participante) {
        return {
          ...resposta,
          personagem: resolucao.participante.personagem,
          dublador: resolucao.participante.dublador || resposta.dublador,
        };
      }

      const marcador =
        resolucao.status === "ambiguo"
          ? `[VÍNCULO PENDENTE: ${resolucao.detalhe}]`
          : `[VÍNCULO NÃO ENCONTRADO: ${resolucao.detalhe}]`;

      return {
        ...resposta,
        personagem: resposta.personagem || "Não identificado",
        comentario: [marcador, resposta.comentario].filter(Boolean).join(" "),
      };
    });
  }

  function todosEntregaramSemana(
    participantes: ParticipanteSemanaProjeto[],
    entregas: EntregaProducao[],
    semana: number
  ) {
    const participantesComDublador = participantes.filter(
      (item) => item.personagem?.trim() && item.dublador?.trim()
    );

    if (!participantesComDublador.length) return false;

    return participantesComDublador.every((personagem) =>
      entregas.some(
        (entrega) =>
          normalizar(entrega.personagem) ===
            normalizar(personagem.personagem) &&
          numeroSemanaEntrega(entrega.semana) === semana
      )
    );
  }

  async function criarNovaSemanaProjeto(projeto: Projeto) {
    if (!podeEditarProjeto(usuarioLogado, projeto) || criandoSemanaProjeto) {
      return;
    }

    try {
      setCriandoSemanaProjeto(true);
      const criada = await criarProximaSemanaProjetoBanco(
        projeto.ID,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!criada) {
        alert("Não consegui criar a próxima semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      setSemanaFiltroProducao(criada.semana);
      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        criada.semana
      );
      await sincronizarFormularioEntregasProjeto(projeto);
      alert(`${labelSemana(criada.semana)} criada com sucesso.`);
    } finally {
      setCriandoSemanaProjeto(false);
    }
  }

  async function concluirSemanaAtualProjeto(projeto: Projeto) {
    const semana = semanasProjeto.find(
      (item) => item.semana === semanaFiltroProducao
    );

    if (!semana) {
      alert("Crie uma semana antes de concluí-la.");
      return;
    }

    if (semana.status === "concluida") {
      alert("Esta semana já está concluída.");
      return;
    }

    const confirmar = window.confirm(
      `Concluir ${labelSemana(semanaFiltroProducao)}? Depois de concluída, os participantes desta semana ficam preservados como histórico.`
    );

    if (!confirmar) return;

    setLiberandoSemana(true);

    try {
      const ok = await fecharSemanaProjetoBanco(
        projeto.ID,
        semanaFiltroProducao,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui concluir esta semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      await sincronizarFormularioEntregasProjeto(projeto);
      alert(`${labelSemana(semanaFiltroProducao)} concluída.`);
    } finally {
      setLiberandoSemana(false);
    }
  }

  async function reabrirSemanaAtualProjeto(projeto: Projeto) {
    const semana = semanasProjeto.find(
      (item) => item.semana === semanaFiltroProducao
    );

    if (!semana) {
      alert("Selecione uma semana para reabrir.");
      return;
    }

    if (semana.status !== "concluida") {
      alert("Esta semana já está aberta.");
      return;
    }

    const confirmar = window.confirm(
      `Reabrir ${labelSemana(semanaFiltroProducao)}? Os participantes preservados continuarão vinculados à semana e ela voltará a aceitar alterações.`
    );

    if (!confirmar) return;

    try {
      setLiberandoSemana(true);
      const ok = await reabrirSemanaProjetoBanco(
        projeto.ID,
        semanaFiltroProducao,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui reabrir esta semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaFiltroProducao
      );
      await sincronizarFormularioEntregasProjeto(projeto);
      alert(`${labelSemana(semanaFiltroProducao)} reaberta.`);
    } finally {
      setLiberandoSemana(false);
    }
  }

  async function excluirSemanaAtualProjeto(projeto: Projeto) {
    const semana = semanasProjeto.find(
      (item) => item.semana === semanaFiltroProducao
    );

    if (!semana || excluindoSemanaProjeto) return;

    const confirmar = window.confirm(
      `Excluir ${labelSemana(semana.semana)}? Os participantes vinculados a esta semana serão removidos. Os arquivos já enviados ao Drive não serão apagados.`
    );

    if (!confirmar) return;

    try {
      setExcluindoSemanaProjeto(true);
      const ok = await excluirSemanaProjetoBanco(projeto.ID, semana.semana);

      if (!ok) {
        alert("Não consegui excluir esta semana.");
        return;
      }

      const semanasAtualizadas = await carregarSemanasProjetoBanco(projeto.ID);
      setSemanasProjeto(semanasAtualizadas);

      const semanaDestino =
        semanasAtualizadas.find((item) => item.status === "aberta") ||
        semanasAtualizadas[semanasAtualizadas.length - 1] ||
        null;

      if (semanaDestino) {
        setSemanaFiltroProducao(semanaDestino.semana);
        await carregarParticipantesSemanaProjetoBancoLocal(
          projeto,
          semanaDestino.semana
        );
      } else {
        setSemanaFiltroProducao(1);
        setParticipantesSemanaProjeto([]);
      }

      await sincronizarFormularioEntregasProjeto(
        projeto,
        semanasAtualizadas
          .filter((item) => item.status === "aberta")
          .sort((a, b) => a.semana - b.semana)
          .map((item) => labelSemana(item.semana))
      );
      alert(`${labelSemana(semana.semana)} excluída.`);
    } finally {
      setExcluindoSemanaProjeto(false);
    }
  }

  async function adicionarParticipanteNaSemana(
    projeto: Projeto,
    item: ElencoItem
  ) {
    if (!item.id || !item.dublador?.trim()) {
      alert("Defina um dublador antes de adicionar este personagem à semana.");
      return;
    }

    try {
      setAlterandoParticipanteSemana(true);
      const ok = await adicionarElencoSemanaBanco(
        projeto.ID,
        semanaFiltroProducao,
        item.id,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui adicionar este dublador à semana.");
        return;
      }

      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaFiltroProducao
      );
    } finally {
      setAlterandoParticipanteSemana(false);
    }
  }

  async function removerParticipanteDaSemana(
    projeto: Projeto,
    participante: ParticipanteSemanaProjeto
  ) {
    const confirmar = window.confirm(
      `Remover ${participante.personagem} — ${participante.dublador} somente da ${labelSemana(
        semanaFiltroProducao
      )}? O Banco do Projeto e as semanas anteriores não serão alterados.`
    );

    if (!confirmar) return;

    try {
      setAlterandoParticipanteSemana(true);
      const ok = await removerElencoSemanaBanco(
        projeto.ID,
        semanaFiltroProducao,
        participante.elenco_id
      );

      if (!ok) {
        alert("Não consegui remover este participante da semana.");
        return;
      }

      await carregarParticipantesSemanaProjetoBancoLocal(
        projeto,
        semanaFiltroProducao
      );
    } finally {
      setAlterandoParticipanteSemana(false);
    }
  }

  async function reabrirPapelProjeto(item: ElencoItem) {
    if (!projetoPainel || !item.id || reabrindoPapelId) return;

    const confirmar = window.confirm(
      `Reabrir o papel de ${item.personagem}? ${item.dublador || "O dublador atual"} deixará de ser a escalação ativa, mas continuará registrado(a) nas semanas anteriores.`
    );

    if (!confirmar) return;

    try {
      setReabrindoPapelId(String(item.id));
      const novoId = await reabrirPapelProjetoBanco(
        projetoPainel.ID,
        item.id,
        `Papel reaberto por ${
          usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
        }.`
      );

      if (!novoId) {
        alert("Não consegui reabrir este papel.");
        return;
      }

      await recarregarProjetos();
      alert(
        `${item.personagem} foi reaberto. As semanas anteriores continuam com ${item.dublador || "a escalação anterior"}.`
      );
    } finally {
      setReabrindoPapelId(null);
    }
  }

  async function verificarLiberacaoAutomaticaSemana(
    projeto: Projeto,
    entregas: EntregaProducao[]
  ) {
    const semanas = await carregarSemanasProjeto(projeto);
    const aberta =
      semanas.find((item) => item.status === "aberta") ||
      semanas[semanas.length - 1];

    if (!aberta) return;

    const semanaAtual = aberta.semana || 1;
    const participantes = await carregarParticipantesSemanaBanco(
      projeto.ID,
      semanaAtual
    );

    if (!todosEntregaramSemana(participantes, entregas, semanaAtual)) {
      return;
    }

    const confirmar = window.confirm(
      `Todos os participantes da ${labelSemana(
        semanaAtual
      )} entregaram. Deseja concluir esta semana? A próxima semana será criada somente quando você clicar em "Criar Semana".`
    );

    if (!confirmar) return;

    setLiberandoSemana(true);

    try {
      const ok = await fecharSemanaProjetoBanco(
        projeto.ID,
        semanaAtual,
        usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
      );

      if (!ok) {
        alert("Não consegui concluir a semana.");
        return;
      }

      await carregarSemanasProjeto(projeto);
      await sincronizarFormularioEntregasProjeto(projeto);
      alert(`${labelSemana(semanaAtual)} concluída.`);
    } finally {
      setLiberandoSemana(false);
    }
  }

  async function sincronizarEntregasProducao(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);
    const planilhaEntregas = links.planilhaEntregas || "";
    const pastaEntregas = links.entregasProjeto || links.projeto || "";

    if (!planilhaEntregas && !pastaEntregas) {
      alert(
        "Ainda não encontrei a planilha nem a pasta de entregas deste projeto."
      );
      return;
    }

    try {
      setSincronizandoEntregas(true);

      const respostas = await lerRespostasEntregasViaEdge(
        planilhaEntregas,
        pastaEntregas
      );

      const respostasResolvidas = await resolverEntregasPorTelefoneProjeto(
        projeto,
        respostas
      );
      const entregasComProjeto = respostasResolvidas.map((item) => ({
        ...item,
        projeto_id: Number(projeto.ID),
      }));

      const ok = await salvarEntregasProducaoBanco(
        projeto.ID,
        entregasComProjeto
      );

      if (!ok) {
        alert("Não consegui salvar as entregas no Supabase.");
        return;
      }

      const entregasAtualizadas = await carregarEntregasProducaoProjeto(
        projeto
      );
      await verificarLiberacaoAutomaticaSemana(projeto, entregasAtualizadas);

      alert(
        `Sincronização concluída. ${respostas.length} entrega(s) importada(s).`
      );
    } catch (err: any) {
      console.error("Erro ao sincronizar entregas:", err);
      alert(`Erro ao sincronizar entregas: ${err?.message || String(err)}`);
    } finally {
      setSincronizandoEntregas(false);
    }
  }

  async function enviarLembretesWhatsappPendentes(projeto: Projeto) {
    if (usuarioLogado?.cargo !== "diretoria") {
      alert("Somente a Diretoria pode enviar lembretes pelo WhatsApp.");
      return;
    }

    if (enviandoLembretesWhatsapp) return;

    let participantes = await carregarParticipantesSemanaBanco(
      projeto.ID,
      semanaFiltroProducao
    );

    // Compatibilidade com projetos que já existiam antes do novo modelo
    // Banco do Projeto + participantes por semana.
    // Se a semana ainda não tiver ninguém vinculado, oferecemos migrar
    // os dubladores ativos do Banco do Projeto para ESTA semana.
    if (!participantes.length) {
      const elencoAtivo = (projeto.Elenco || []).filter(
        (item) =>
          Boolean(item.id) &&
          Boolean(item.personagem?.trim()) &&
          Boolean(item.dublador?.trim())
      );

      if (!elencoAtivo.length) {
        alert(
          `${labelSemana(
            semanaFiltroProducao
          )} ainda não tem participantes e o Banco do Projeto não possui dubladores escalados para adicionar.`
        );
        return;
      }

      const migrar = window.confirm(
        `${labelSemana(
          semanaFiltroProducao
        )} ainda não tem participantes vinculados.\n\nDeseja adicionar os ${elencoAtivo.length} dublador(es) atualmente escalados no Banco do Projeto a esta semana e continuar com o envio dos pendentes?`
      );

      if (!migrar) return;

      setEnviandoLembretesWhatsapp(true);

      try {
        let adicionados = 0;
        const falhasMigracao: string[] = [];

        for (const item of elencoAtivo) {
          const ok = await adicionarElencoSemanaBanco(
            projeto.ID,
            semanaFiltroProducao,
            item.id!,
            usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
          );

          if (ok) {
            adicionados += 1;
          } else {
            falhasMigracao.push(
              `${item.personagem} — ${item.dublador}`
            );
          }
        }

        participantes = await carregarParticipantesSemanaBanco(
          projeto.ID,
          semanaFiltroProducao
        );

        setParticipantesSemanaProjeto(participantes);

        if (!participantes.length) {
          alert(
            "Não consegui vincular nenhum dublador a esta semana. O envio foi cancelado."
          );
          return;
        }

        if (falhasMigracao.length) {
          alert(
            `${adicionados} participante(s) foram vinculados à semana.\n\nNão consegui vincular: ${falhasMigracao
              .slice(0, 6)
              .join(", ")}.\n\nO envio continuará apenas para os participantes vinculados com sucesso.`
          );
        }
      } finally {
        setEnviandoLembretesWhatsapp(false);
      }
    }

    const elenco = participantes.filter(
      (item) =>
        Boolean(item.personagem?.trim()) &&
        Boolean(item.dublador?.trim())
    );

    if (!elenco.length) {
      alert(
        `Nenhum dublador válido foi encontrado na ${labelSemana(
          semanaFiltroProducao
        )}.`
      );
      return;
    }

    const entregasSemana = entregasProducao.filter(
      (entrega) =>
        numeroSemanaEntrega(entrega.semana) === semanaFiltroProducao
    );

    const pendentes = elenco.filter(
      (item) =>
        !entregasSemana.some(
          (entrega) =>
            normalizar(entrega.personagem) ===
            normalizar(item.personagem)
        )
    );

    if (!pendentes.length) {
      alert(`Não há pendências na ${labelSemana(semanaFiltroProducao)}.`);
      return;
    }

    const comTelefone = pendentes.filter((item) =>
      Boolean(item.telefone_dublador?.trim())
    );

    const semTelefone = pendentes.filter(
      (item) => !item.telefone_dublador?.trim()
    );

    if (!comTelefone.length) {
      alert(
        `Há ${pendentes.length} pendência(s), mas nenhum dublador pendente tem telefone cadastrado para esta semana.`
      );
      return;
    }

    const avisoSemTelefone = semTelefone.length
      ? `\n\n${semTelefone.length} pendente(s) sem telefone será(ão) ignorado(s).`
      : "";

    const confirmar = window.confirm(
      `Enviar lembrete pelo WhatsApp para ${comTelefone.length} pendente(s) de ${projeto.Projeto} — ${labelSemana(
        semanaFiltroProducao
      )}?${avisoSemTelefone}\n\nSomente os participantes cadastrados nesta semana serão cobrados.`
    );

    if (!confirmar) return;

    setEnviandoLembretesWhatsapp(true);

    let enfileirados = 0;
    let duplicados = 0;
    const falhas: string[] = [];

    try {
      for (const item of comTelefone) {
        const mensagem = [
          `Olá, ${item.dublador}! 🎙️`,
          "",
          `Passando para lembrar da sua entrega de ${item.personagem} no projeto ${projeto.Projeto}.`,
          `${labelSemana(semanaFiltroProducao)}.`,
          "",
          "Caso você já tenha realizado a entrega, desconsidere esta mensagem.",
          "",
          "— DubWorks",
        ].join("\n");

        try {
          const resultado = await enfileirarLembreteWhatsapp({
            projetoId: projeto.ID,
            semana: semanaFiltroProducao,
            personagem: item.personagem,
            dublador: item.dublador,
            telefone: item.telefone_dublador || "",
            mensagem,
            tipoLembrete: "manual",
          });

          if (resultado.duplicado) {
            duplicados += 1;
          } else if (resultado.ok) {
            enfileirados += 1;
          } else {
            falhas.push(
              `${item.dublador} — ${item.personagem}: ${
                resultado.mensagem || "erro desconhecido"
              }`
            );
          }
        } catch (err: any) {
          falhas.push(
            `${item.dublador} — ${item.personagem}: ${
              err?.message || String(err)
            }`
          );
        }
      }

      const resumo = [
        `Lembretes processados para ${projeto.Projeto}.`,
        "",
        `Na fila para envio: ${enfileirados}`,
        `Já enviados/enfileirados hoje: ${duplicados}`,
        `Sem telefone: ${semTelefone.length}`,
        `Falhas: ${falhas.length}`,
      ];

      if (falhas.length) {
        resumo.push("", "Falhas:", ...falhas.slice(0, 6));
      }

      resumo.push(
        "",
        "O agente do WhatsApp enviará as mensagens automaticamente."
      );

      alert(resumo.join("\n"));
    } finally {
      setEnviandoLembretesWhatsapp(false);
    }
  }

  async function alterarStatusEntrega(
    entrega: EntregaProducao,
    status: "pendente" | "aprovado" | "regravacao"
  ) {
    if (!entrega.id) {
      alert("Entrega ainda não foi salva no Supabase.");
      return;
    }

    const ok = await atualizarStatusEntregaBanco(
      entrega.id,
      status,
      usuarioLogado?.nome || usuarioLogado?.login || "Sistema"
    );

    if (!ok) {
      alert("Não consegui atualizar o status da entrega.");
      return;
    }

    setEntregasProducao((anteriores) =>
      anteriores.map((item) =>
        item.id === entrega.id ? { ...item, status } : item
      )
    );
  }

  function renderAbaSelecaoVisual(projeto: Projeto) {
    const links = extrairLinksDrive(projeto.Observacoes);

    const temFormulario = Boolean(links.formSelecao || links.respostasSelecao);
    const respostaAtiva =
      respostasSelecao.find((item) => item.id === respostaSelecaoAtivaId) ||
      respostasSelecao[0] ||
      null;

    const statusAtual: StatusSelecao =
      (respostaAtiva && statusSelecaoPorId[respostaAtiva.id]) ||
      respostaAtiva?.status ||
      "pendente";

    const comentarioAtual =
      (respostaAtiva && comentarioSelecaoPorId[respostaAtiva.id]) || "";

    const respostasComStatus = respostasSelecao.map((item) => ({
      ...item,
      statusFinal: statusSelecaoPorId[item.id] || item.status || "pendente",
    }));

    const totalPendentes = respostasComStatus.filter(
      (item) => item.statusFinal === "pendente"
    ).length;
    const totalAprovados = respostasComStatus.filter(
      (item) => item.statusFinal === "aprovado"
    ).length;
    const totalReprovados = respostasComStatus.filter(
      (item) => item.statusFinal === "reprovado"
    ).length;

    const previewUrl = respostaAtiva?.videoUrl
      ? converterDriveParaPreview(respostaAtiva.videoUrl)
      : "";

    function atualizarStatus(status: StatusSelecao) {
      if (!respostaAtiva) {
        alert("Selecione uma resposta primeiro.");
        return;
      }

      setStatusSelecaoPorId((anterior) => ({
        ...anterior,
        [respostaAtiva.id]: status,
      }));
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={tituloCardDarkStyle}>🎭 Seleção de Personagens</h2>
              <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                Respostas do formulário de seleção. O líder analisa os testes,
                aprova/reprova candidatos e adiciona aprovados ao elenco
                oficial.
              </p>
            </div>

            <button
              type="button"
              style={botaoPrimarioStyle}
              disabled={sincronizandoSelecao}
              onClick={() => sincronizarRespostasSelecao(projeto)}
            >
              {sincronizandoSelecao
                ? "Sincronizando..."
                : "Sincronizar respostas"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              ["Pendentes", String(totalPendentes)],
              ["Selecionados", String(totalAprovados)],
              ["Não selecionados", String(totalReprovados)],
              ["Formulário", temFormulario ? "Ativo" : "Pendente"],
            ].map(([label, valor]) => (
              <div
                key={label}
                style={{
                  background: "rgba(2, 6, 23, 0.55)",
                  border: "1px solid rgba(148, 163, 184, 0.24)",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
                <strong style={{ color: "#f8fafc", fontSize: 20 }}>
                  {valor}
                </strong>
              </div>
            ))}
          </div>

          {respostasSelecao.length > 0 && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <strong style={{ color: "#f8fafc" }}>Respostas importadas</strong>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {respostasSelecao.map((item) => {
                  const ativo = respostaAtiva?.id === item.id;
                  const statusItem =
                    statusSelecaoPorId[item.id] || item.status || "pendente";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRespostaSelecaoAtivaId(item.id)}
                      style={{
                        textAlign: "left",
                        border: ativo
                          ? "1px solid rgba(56, 189, 248, 0.55)"
                          : "1px solid rgba(148, 163, 184, 0.18)",
                        background: ativo
                          ? "rgba(56, 189, 248, 0.12)"
                          : "rgba(2, 6, 23, 0.42)",
                        borderRadius: 12,
                        padding: 12,
                        color: "#f8fafc",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "1.2fr 1.2fr 0.8fr 0.7fr",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <span>
                        <strong>
                          {item.personagem || "Personagem não informado"}
                        </strong>
                        <br />
                        <small style={{ color: "#94a3b8" }}>
                          {item.nome || "Nome não informado"}
                        </small>
                      </span>

                      <span style={{ color: "#cbd5e1" }}>
                        {item.telefone || "Sem número"}
                      </span>

                      <span style={{ color: "#cbd5e1" }}>
                        {item.timestamp || "Sem data"}
                      </span>

                      <span
                        style={{
                          justifySelf: isMobile ? "start" : "end",
                          borderRadius: 999,
                          padding: "5px 10px",
                          background:
                            statusItem === "aprovado"
                              ? "rgba(34, 197, 94, 0.16)"
                              : statusItem === "reprovado"
                              ? "rgba(248, 113, 113, 0.16)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            statusItem === "aprovado"
                              ? "#86efac"
                              : statusItem === "reprovado"
                              ? "#fecaca"
                              : "#fbbf24",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {statusItem === "aprovado"
                          ? "Selecionado"
                          : statusItem === "reprovado"
                          ? "Não selecionado"
                          : "Pendente"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            ...painelDarkStyle,
            padding: 18,
            border: "1px solid rgba(56, 189, 248, 0.20)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(280px, 0.95fr) minmax(280px, 1fr) minmax(280px, 1fr)",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Pré-visualização do envio
              </h2>

              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "rgba(2, 6, 23, 0.64)",
                  border: "1px solid rgba(56, 189, 248, 0.16)",
                  minHeight: 210,
                  display: "grid",
                  placeItems: "center",
                  color: "#94a3b8",
                }}
              >
                {previewUrl ? (
                  <iframe
                    title="Pré-visualização do envio"
                    src={previewUrl}
                    allow="autoplay"
                    style={{
                      width: "100%",
                      height: 260,
                      border: 0,
                      background: "#020617",
                    }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: 22 }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        margin: "0 auto 12px",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(56, 189, 248, 0.12)",
                        border: "1px solid rgba(56, 189, 248, 0.18)",
                        color: "#38bdf8",
                        fontSize: 26,
                      }}
                    >
                      ▶
                    </div>

                    <strong style={{ color: "#f8fafc" }}>
                      Nenhum envio selecionado
                    </strong>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "#94a3b8",
                      }}
                    >
                      Sincronize e selecione uma resposta para assistir ao vídeo
                      aqui.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                style={{
                  marginTop: 12,
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontWeight: 700,
                  cursor: respostaAtiva?.videoUrl ? "pointer" : "not-allowed",
                  padding: 0,
                  opacity: respostaAtiva?.videoUrl ? 1 : 0.5,
                }}
                disabled={!respostaAtiva?.videoUrl}
                onClick={() => {
                  if (respostaAtiva?.videoUrl) {
                    window.open(respostaAtiva.videoUrl, "_blank");
                  }
                }}
              >
                Abrir em nova aba ↗
              </button>
            </div>

            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Detalhes do envio
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  color: "#cbd5e1",
                  fontSize: 13,
                }}
              >
                {[
                  ["Membro", respostaAtiva?.nome || "Nenhum envio selecionado"],
                  ["Número", respostaAtiva?.telefone || "—"],
                  ["Personagem", respostaAtiva?.personagem || "—"],
                  ["Data de envio", respostaAtiva?.timestamp || "—"],
                  ["Tipo", "Seleção"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "118px 1fr",
                      gap: 10,
                    }}
                  >
                    <span style={{ color: "#94a3b8" }}>{label}:</span>
                    <strong style={{ color: "#f8fafc" }}>{value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Comentário do membro:
                </div>

                <div
                  style={{
                    minHeight: 74,
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(2, 6, 23, 0.56)",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    color: "#cbd5e1",
                    fontSize: 13,
                  }}
                >
                  {respostaAtiva?.comentario ||
                    "O comentário enviado pelo membro aparecerá aqui."}
                </div>
              </div>

              <button
                type="button"
                style={{
                  marginTop: 16,
                  border: "1px solid rgba(56, 189, 248, 0.28)",
                  color: "#dbeafe",
                  background: "rgba(56, 189, 248, 0.08)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: respostaAtiva ? "pointer" : "not-allowed",
                  opacity: respostaAtiva ? 1 : 0.5,
                }}
                disabled={!respostaAtiva}
                onClick={() => adicionarRespostaSelecaoAoElenco(respostaAtiva)}
              >
                👥 Adicionar ao elenco manualmente
              </button>
            </div>

            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 12 }}>
                Avaliação do líder
              </h2>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Status da seleção
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("aprovado");
                    if (projetoPainel && respostaAtiva) {
                      const ok = await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "aprovado",
                        comentarioAtual
                      );

                      if (ok) {
                        await adicionarRespostaSelecaoAoElenco(respostaAtiva);
                      }
                    }
                  }}
                  style={{
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    color: "#dcfce7",
                    background:
                      statusAtual === "aprovado"
                        ? "rgba(22, 163, 74, 0.42)"
                        : "rgba(22, 163, 74, 0.22)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✓ Aprovar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("reprovado");
                    if (projetoPainel && respostaAtiva) {
                      await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "reprovado",
                        comentarioAtual
                      );
                    }
                  }}
                  style={{
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    color: "#fee2e2",
                    background:
                      statusAtual === "reprovado"
                        ? "rgba(220, 38, 38, 0.42)"
                        : "rgba(220, 38, 38, 0.20)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✕ Reprovar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    atualizarStatus("pendente");
                    if (projetoPainel && respostaAtiva) {
                      await salvarAvaliacaoSelecaoAtual(
                        projetoPainel,
                        respostaAtiva,
                        "pendente",
                        comentarioAtual
                      );
                    }
                  }}
                  style={{
                    border: "1px solid rgba(245, 158, 11, 0.40)",
                    color: "#fde68a",
                    background:
                      statusAtual === "pendente"
                        ? "rgba(120, 53, 15, 0.48)"
                        : "rgba(120, 53, 15, 0.28)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ◷ Pendente
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Comentário do líder
              </label>

              <textarea
                placeholder="Deixe uma observação sobre o teste..."
                value={comentarioAtual}
                onChange={(e) => {
                  if (!respostaAtiva) return;
                  setComentarioSelecaoPorId((anterior) => ({
                    ...anterior,
                    [respostaAtiva.id]: e.target.value,
                  }));
                }}
                style={{
                  width: "100%",
                  minHeight: 112,
                  resize: "vertical",
                  boxSizing: "border-box",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(2, 6, 23, 0.64)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  color: "#f8fafc",
                  outline: "none",
                }}
              />

              <button
                type="button"
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "1px solid rgba(56, 189, 248, 0.30)",
                  color: "#06121f",
                  background: "linear-gradient(135deg, #bfdbfe, #3b82f6)",
                  borderRadius: 12,
                  padding: "13px 16px",
                  fontWeight: 900,
                  cursor: respostaAtiva ? "pointer" : "not-allowed",
                  opacity: respostaAtiva ? 1 : 0.5,
                }}
                disabled={!respostaAtiva || salvandoAvaliacaoSelecao}
                onClick={async () => {
                  if (!respostaAtiva || !projetoPainel) return;

                  const ok = await salvarAvaliacaoSelecaoAtual(
                    projetoPainel,
                    respostaAtiva,
                    statusAtual,
                    comentarioAtual
                  );

                  if (ok) {
                    alert("Avaliação salva no Supabase.");
                  }
                }}
              >
                {salvandoAvaliacaoSelecao ? "Salvando..." : "Salvar avaliação"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function recarregarProjetos() {
    try {
      setCarregando(true);
      const lista = await comTimeout(
        carregarProjetosBanco(mostrarArquivados),
        20000,
        "A busca dos projetos demorou demais."
      );
      setProjetos(lista);
    } catch (err) {
      console.error("Erro ao recarregar projetos:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarUsuarios() {
    try {
      const lista = await comTimeout(
        carregarUsuariosBanco(),
        20000,
        "A busca dos usuários demorou demais."
      );
      setUsuarios(lista);
    } catch (err) {
      console.error("Erro ao recarregar usuários:", err);
    }
  }

  async function recarregarMembros(forcarAtualizacao = false) {
    if (!podeGerenciarMembros(usuarioLogado)) return;

    try {
      const lista = await comTimeout(
        carregarMembrosBanco(forcarAtualizacao),
        30000,
        "A sincronização dos membros demorou demais."
      );
      setMembros(lista);
      setUltimaSincronizacaoMembros(new Date());
    } catch (err) {
      console.error("Erro ao recarregar membros:", err);
    }
  }

  useEffect(() => {
    if (!sessaoInicialCarregada) return;
    void recarregarProjetos();
    void recarregarUsuarios();
  }, [mostrarArquivados, sessaoInicialCarregada]);

  useEffect(() => {
    if (!sessaoInicialCarregada || !usuarioLogado) {
      setMembros([]);
      return;
    }

    if (!podeGerenciarMembros(usuarioLogado)) {
      setMembros([]);
      return;
    }

    carregarMembrosBanco()
      .then((lista) => {
        setMembros(lista);
        setUltimaSincronizacaoMembros(new Date());
      })
      .catch((err) => console.error("Erro ao carregar membros:", err));
  }, [usuarioLogado?.login, sessaoInicialCarregada]);

  useEffect(() => {
    if (!mostrarMembros || !podeGerenciarMembros(usuarioLogado)) return;

    let cancelado = false;
    let sincronizando = false;

    const sincronizarAutomaticamente = async () => {
      if (cancelado || sincronizando || salvandoEdicaoMembro) return;
      sincronizando = true;
      try {
        const lista = await carregarMembrosBanco(true);
        if (!cancelado) {
          setMembros(lista);
          setUltimaSincronizacaoMembros(new Date());
        }
      } catch (err) {
        console.error("Erro na sincronização automática dos membros:", err);
      } finally {
        sincronizando = false;
      }
    };

    const intervalo = window.setInterval(sincronizarAutomaticamente, 15000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [mostrarMembros, usuarioLogado, salvandoEdicaoMembro]);

  useEffect(() => {
    if (!mostrarNovoProjeto || !usuarioLogado) return;

    if (
      usuarioLogado.cargo === "lider" ||
      usuarioLogado.cargo === "lider_treinamento"
    ) {
      setNovoProjeto((anterior) => ({
        ...anterior,
        Lider: usuarioLogado.login || usuarioLogado.vinculo || usuarioLogado.nome,
      }));
    }
  }, [mostrarNovoProjeto, usuarioLogado]);

  useEffect(() => {
    const permitidos = cargosPermitidosParaCriar(usuarioLogado);
    if (!permitidos.length) return;
    if (permitidos.indexOf(novoUsuario.cargo) === -1) {
      setNovoUsuario((anterior) => ({
        ...anterior,
        cargo: permitidos[0],
        training_status: statusPadraoPorCargo(permitidos[0]),
        ...permissoesPadraoUsuario(permitidos[0]),
      }));
    }
  }, [usuarioLogado, novoUsuario.cargo]);

  const projetosVisiveis = useMemo(() => {
    if (!usuarioLogado) return [];
    return projetos.filter((p) => podeVerProjeto(usuarioLogado, p));
  }, [projetos, usuarioLogado]);

  const projetosAtivosRelatorio = useMemo(() => {
    return projetosVisiveis.filter((projeto) => {
      if (projeto.Arquivado) return false;
      const status = normalizar(projeto.Status);
      return !["final", "conclu", "encerr", "cancel", "interromp"].some(
        (termo) => status.includes(termo)
      );
    });
  }, [projetosVisiveis]);

  async function recarregarAtividadeSemanal() {
    if (!usuarioLogado) return;
    try {
      setCarregandoAtividadeSemanal(true);
      setErroAtividadeSemanal("");
      const dados = await carregarAtividadeSemanalProjetosBanco(
        projetosAtivosRelatorio
      );
      setAtividadeSemanalProjetos(dados);
    } catch (erro) {
      console.error("Erro ao montar atividade semanal:", erro);
      setErroAtividadeSemanal(
        "Não foi possível montar a atividade semanal neste momento."
      );
      setAtividadeSemanalProjetos([]);
    } finally {
      setCarregandoAtividadeSemanal(false);
    }
  }

  function iniciaisChat(nome?: string) {
    const partes = String(nome || "U").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "U";
    if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
    return `${partes[0][0] || ""}${partes[partes.length - 1][0] || ""}`
      .toUpperCase()
      .slice(0, 2);
  }

  function formatarHoraChat(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatarDataChat(valor?: string | null) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    const hoje = new Date();

    if (
      data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    ) {
      return "Hoje";
    }

    return data.toLocaleDateString("pt-BR");
  }

  function usuarioPorReferenciaChat(referencia?: string | null) {
    const alvo = normalizar(referencia || "");
    if (!alvo) return null;

    return (
      usuarios.find((usuario) =>
        [usuario.login, usuario.nome, usuario.vinculo].some(
          (valor) => Boolean(valor) && normalizar(valor || "") === alvo
        )
      ) || null
    );
  }

  function canalChatPermitido(
    canal: ChatCanal,
    participantes: ChatParticipante[] = participantesChat
  ) {
    if (!usuarioLogado) return false;

    if (canal.tipo === "geral") return true;

    if (canal.tipo === "diretoria") {
      return usuarioLogado.cargo === "diretoria";
    }

    if (canal.tipo === "lideres") {
      return ["diretoria", "lider", "lider_treinamento"].includes(
        usuarioLogado.cargo
      );
    }

    if (canal.tipo === "projeto") {
      return projetosVisiveis.some(
        (projeto) => Number(projeto.ID) === Number(canal.projeto_id)
      );
    }

    if (canal.tipo === "direta") {
      const loginAtual = normalizar(usuarioLogado.login);
      return participantes.some(
        (participante) =>
          participante.canal_id === canal.id &&
          normalizar(participante.usuario_login) === loginAtual
      );
    }

    return false;
  }

  function nomeCanalChat(canal?: ChatCanal | null) {
    if (!canal) return "Chat da equipe";
    if (canal.tipo !== "direta") return canal.nome || "Canal";

    const loginAtual = normalizar(usuarioLogado?.login);

    const outros = participantesChat
      .filter(
        (participante) =>
          participante.canal_id === canal.id &&
          normalizar(participante.usuario_login) !== loginAtual
      )
      .map((participante) => {
        const perfil =
          usuarios.find(
            (usuario) =>
              normalizar(usuario.login) ===
              normalizar(participante.usuario_login)
          ) || null;

        return perfil?.nome || participante.usuario_login || "Usuário";
      });

    if (!outros.length) return "Conversa direta";
    if (outros.length <= 3) return outros.join(", ");

    return `${outros.slice(0, 2).join(", ")} +${outros.length - 2}`;
  }

  async function recarregarEstruturaChat(preferirCanalId?: string | null) {
    if (!usuarioLogado) return;

    const [canais, participantes] = await Promise.all([
      carregarCanaisChat(),
      carregarParticipantesChat(),
    ]);

    setCanaisChat(canais);
    setParticipantesChat(participantes);

    const permitidos = canais.filter((canal) =>
      canalChatPermitido(canal, participantes)
    );

    const escolhido =
      (preferirCanalId &&
        permitidos.find((canal) => canal.id === preferirCanalId)) ||
      (canalChatAtivoId &&
        permitidos.find((canal) => canal.id === canalChatAtivoId)) ||
      permitidos.find((canal) => canal.tipo === "geral") ||
      permitidos[0] ||
      null;

    setCanalChatAtivoId(escolhido?.id || null);
  }

  async function abrirCanalProjetoChat(projeto: Projeto) {
    if (!usuarioLogado) return;

    setErroChat("");

    let canal =
      canaisChat.find(
        (item) =>
          item.tipo === "projeto" &&
          Number(item.projeto_id) === Number(projeto.ID)
      ) || null;

    if (!canal) {
      canal = await garantirCanalProjeto(
        projeto.ID,
        projeto.Projeto || `Projeto ${projeto.ID}`,
        usuarioLogado.login || usuarioLogado.nome || "Sistema"
      );
    }

    if (!canal) {
      setErroChat("Não consegui abrir o canal deste projeto.");
      return;
    }

    await recarregarEstruturaChat(canal.id);
  }

  async function abrirConversaDiretaChat(outroUsuario: Usuario) {
    if (!usuarioLogado) return;

    setErroChat("");

    const canal = await abrirConversaDireta(usuarioLogado, outroUsuario);

    if (!canal) {
      setErroChat("Não consegui abrir a conversa direta.");
      return;
    }

    await recarregarEstruturaChat(canal.id);
  }

  function abrirAdicionarPessoasChat() {
    if (!canalChatAtivoId) return;

    setBuscaPessoasChat("");
    setPessoasSelecionadasChat([]);
    setMostrarAdicionarPessoasChat(true);
  }

  async function confirmarAdicionarPessoasChat() {
    if (
      !canalChatAtivoId ||
      !pessoasSelecionadasChat.length ||
      adicionandoPessoasChat
    ) {
      return;
    }

    try {
      setAdicionandoPessoasChat(true);
      setErroChat("");

      const ok = await adicionarParticipantesChat(
        canalChatAtivoId,
        pessoasSelecionadasChat
      );

      if (!ok) {
        setErroChat("Não consegui adicionar as pessoas à conversa.");
        return;
      }

      await recarregarEstruturaChat(canalChatAtivoId);
      setMostrarAdicionarPessoasChat(false);
      setPessoasSelecionadasChat([]);
      setBuscaPessoasChat("");
    } finally {
      setAdicionandoPessoasChat(false);
    }
  }

  function responderMensagemChat(mensagem: ChatMensagem) {
    if (mensagem.excluido_em) return;

    setMensagemRespondendoChat(mensagem);

    window.setTimeout(() => {
      document.getElementById("dubworks-chat-composer")?.focus();
    }, 20);
  }

  function extrairLoginsMencionadosTextoChat(textoMensagem: string) {
    const textoNormalizado = String(textoMensagem || "").toLocaleLowerCase(
      "pt-BR"
    );

    return Array.from(
      new Set(
        usuarios
          .filter((usuario) => {
            const login = normalizar(usuario.login);
            const nome = String(usuario.nome || "")
              .trim()
              .toLocaleLowerCase("pt-BR");

            if (!login) return false;

            return (
              textoNormalizado.includes(`@${login}`) ||
              (nome && textoNormalizado.includes(`@${nome}`))
            );
          })
          .map((usuario) => normalizar(usuario.login))
          .filter(
            (login) =>
              Boolean(login) &&
              login !== normalizar(usuarioLogado?.login)
          )
      )
    );
  }

  function iniciarEdicaoMensagemChat(mensagem: ChatMensagem) {
    if (mensagem.excluido_em) return;

    setMenuMensagemAbertoId(null);
    setMensagemEditandoChat(mensagem);
    setTextoEdicaoMensagemChat(mensagem.mensagem || "");

    window.setTimeout(() => {
      document
        .getElementById(`chat-editar-${mensagem.id}`)
        ?.focus();
    }, 20);
  }

  function cancelarEdicaoMensagemChat() {
    setMensagemEditandoChat(null);
    setTextoEdicaoMensagemChat("");
    setSalvandoEdicaoMensagemChat(false);
  }

  async function salvarEdicaoMensagemChatAtual() {
    if (
      !usuarioLogado ||
      !mensagemEditandoChat ||
      salvandoEdicaoMensagemChat
    ) {
      return;
    }

    const novoTexto = textoEdicaoMensagemChat.trim();

    if (!novoTexto) {
      alert("A mensagem não pode ficar vazia.");
      return;
    }

    try {
      setSalvandoEdicaoMensagemChat(true);
      setErroChat("");

      const atualizada = await editarMensagemChat(
        mensagemEditandoChat.id,
        usuarioLogado,
        novoTexto
      );

      if (!atualizada) {
        setErroChat("Não consegui editar a mensagem.");
        return;
      }

      const mencoes = extrairLoginsMencionadosTextoChat(novoTexto);

      const mencoesOk = await substituirMencoesMensagem(
        atualizada.id,
        mencoes
      );

      if (!mencoesOk) {
        console.warn(
          "A mensagem foi editada, mas não consegui atualizar todas as menções."
        );
      }

      setMensagensChat((anteriores) =>
        anteriores.map((item) =>
          item.id === atualizada.id ? atualizada : item
        )
      );

      cancelarEdicaoMensagemChat();
    } finally {
      setSalvandoEdicaoMensagemChat(false);
    }
  }

  async function excluirMensagemChatAtual(mensagem: ChatMensagem) {
    if (!usuarioLogado || mensagem.excluido_em) return;

    const confirmar = window.confirm(
      "Excluir esta mensagem? Os anexos desta mensagem também serão removidos."
    );

    if (!confirmar) return;

    setMenuMensagemAbertoId(null);
    setErroChat("");

    const excluida = await excluirMensagemChat(
      mensagem.id,
      usuarioLogado
    );

    if (!excluida) {
      setErroChat("Não consegui excluir a mensagem.");
      return;
    }

    setMensagensChat((anteriores) =>
      anteriores.map((item) =>
        item.id === excluida.id ? excluida : item
      )
    );

    setAnexosChat((anteriores) =>
      anteriores.filter(
        (anexo) => anexo.mensagem_id !== mensagem.id
      )
    );

    if (mensagemRespondendoChat?.id === mensagem.id) {
      setMensagemRespondendoChat(null);
    }

    if (mensagemEditandoChat?.id === mensagem.id) {
      cancelarEdicaoMensagemChat();
    }
  }

  async function alternarSilenciarCanalChat() {
    if (
      !usuarioLogado?.login ||
      !canalChatAtivoId ||
      alterandoSilencioChat
    ) {
      return;
    }

    const preferenciaAtual = preferenciasChat.find(
      (item) => item.canal_id === canalChatAtivoId
    );

    const novoValor = !Boolean(preferenciaAtual?.silenciado);

    try {
      setAlterandoSilencioChat(true);

      const ok = await definirChatSilenciado(
        canalChatAtivoId,
        usuarioLogado.login,
        novoValor
      );

      if (!ok) {
        setErroChat("Não consegui alterar as notificações deste chat.");
        return;
      }

      setPreferenciasChat((anteriores) => {
        const agora = new Date().toISOString();
        const existe = anteriores.some(
          (item) => item.canal_id === canalChatAtivoId
        );

        if (existe) {
          return anteriores.map((item) =>
            item.canal_id === canalChatAtivoId
              ? {
                  ...item,
                  silenciado: novoValor,
                  updated_at: agora,
                }
              : item
          );
        }

        return [
          ...anteriores,
          {
            canal_id: canalChatAtivoId,
            usuario_login: usuarioLogado.login,
            silenciado: novoValor,
            updated_at: agora,
          },
        ];
      });
    } finally {
      setAlterandoSilencioChat(false);
    }
  }

  function selecionarMencaoChat(usuario: Usuario) {
    const nomeExibicao = String(usuario.nome || usuario.login || "").trim();
    const loginUsuario = normalizar(usuario.login);

    if (!nomeExibicao || !loginUsuario) return;

    setMensagemChat((atual) =>
      atual.replace(
        /(^|\s)@([^\s@]*)$/,
        (_trecho, prefixo: string) => `${prefixo}@${nomeExibicao} `
      )
    );

    setMencoesPendentesChat((anteriores) =>
      anteriores.some(
        (item) => normalizar(item.login) === loginUsuario
      )
        ? anteriores
        : [
            ...anteriores,
            {
              login: usuario.login,
              nome: nomeExibicao,
            },
          ]
    );

    window.setTimeout(() => {
      document.getElementById("dubworks-chat-composer")?.focus();
    }, 20);
  }

  function atualizarTextoMensagemChat(novoTexto: string) {
    setMensagemChat(novoTexto);

    setMencoesPendentesChat((anteriores) =>
      anteriores.filter((mencao) =>
        novoTexto
          .toLocaleLowerCase("pt-BR")
          .includes(`@${mencao.nome.toLocaleLowerCase("pt-BR")}`)
      )
    );
  }

  const quantidadeNotificacoesNaoLidas = notificacoesChat.filter(
    (notificacao) => !notificacao.lida
  ).length;

  function atualizarNotificacaoLocal(notificacaoAtualizada: NotificacaoChat) {
    setNotificacoesChat((anteriores) => {
      const existe = anteriores.some(
        (item) => item.id === notificacaoAtualizada.id
      );

      if (!existe) {
        return [notificacaoAtualizada, ...anteriores]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 100);
      }

      return anteriores
        .map((item) =>
          item.id === notificacaoAtualizada.id
            ? notificacaoAtualizada
            : item
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    });
  }

  async function abrirNotificacaoChat(notificacao: NotificacaoChat) {
    setMostrarNotificacoesChat(false);
    setToastNotificacaoChat(null);

    if (!notificacao.lida) {
      const ok = await marcarNotificacaoComoLida(notificacao.id);

      if (ok) {
        atualizarNotificacaoLocal({
          ...notificacao,
          lida: true,
          lida_em: new Date().toISOString(),
        });
      }
    }

    if (!notificacao.canal_id) return;

    setMostrarFerramentas(true);
    setCategoriaFerramentas("chat");
    setMostrarTreinamentos(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);

    setCanalChatAtivoId(notificacao.canal_id);

    if (notificacao.mensagem_id) {
      setMensagemChatDestacadaId(notificacao.mensagem_id);

      if (timerFocoNotificacaoRef.current) {
        window.clearTimeout(timerFocoNotificacaoRef.current);
      }

      timerFocoNotificacaoRef.current = window.setTimeout(() => {
        document
          .getElementById(
            `chat-mensagem-${notificacao.mensagem_id}`
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

        timerFocoNotificacaoRef.current = window.setTimeout(() => {
          setMensagemChatDestacadaId(null);
        }, 2600);
      }, 650);
    }
  }

  async function marcarTodasNotificacoesLidasAtual() {
    if (!usuarioLogado?.login || !quantidadeNotificacoesNaoLidas) return;

    const ok = await marcarTodasNotificacoesComoLidas(usuarioLogado.login);

    if (!ok) return;

    const agora = new Date().toISOString();

    setNotificacoesChat((anteriores) =>
      anteriores.map((item) => ({
        ...item,
        lida: true,
        lida_em: item.lida_em || agora,
      }))
    );
  }

  function formatarTamanhoAnexoChat(bytes?: number) {
    const tamanho = Number(bytes || 0);

    if (tamanho < 1024) return `${tamanho} B`;
    if (tamanho < 1024 * 1024) {
      return `${(tamanho / 1024).toFixed(1)} KB`;
    }

    return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
  }

  function selecionarArquivosChat(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const novos = Array.from(event.target.files || []);
    event.target.value = "";

    if (!novos.length) return;

    const combinado = [...arquivosChatSelecionados, ...novos];

    if (combinado.length > 5) {
      alert("Você pode anexar no máximo 5 arquivos por mensagem.");
      return;
    }

    const acimaDoLimite = combinado.find(
      (arquivo) => arquivo.size > 25 * 1024 * 1024
    );

    if (acimaDoLimite) {
      alert(
        `${acimaDoLimite.name} ultrapassa o limite de 25 MB por arquivo.`
      );
      return;
    }

    const total = combinado.reduce(
      (soma, arquivo) => soma + arquivo.size,
      0
    );

    if (total > 50 * 1024 * 1024) {
      alert("Os anexos da mensagem não podem ultrapassar 50 MB no total.");
      return;
    }

    setArquivosChatSelecionados(combinado);
  }

  function removerArquivoChatSelecionado(indice: number) {
    setArquivosChatSelecionados((anteriores) =>
      anteriores.filter((_, index) => index !== indice)
    );
  }

  async function enviarMensagemChatAtual() {
    const temTexto = Boolean(mensagemChat.trim());
    const temAnexo = arquivosChatSelecionados.length > 0;

    if (
      !usuarioLogado ||
      !canalChatAtivoId ||
      (!temTexto && !temAnexo) ||
      enviandoMensagemChat ||
      enviandoAnexosChat
    ) {
      return;
    }

    const arquivosParaEnviar = [...arquivosChatSelecionados];

    const textoMensagem =
      mensagemChat.trim() ||
      (arquivosParaEnviar.length === 1
        ? "📎 Enviou um anexo."
        : `📎 Enviou ${arquivosParaEnviar.length} anexos.`);
    const loginsMencionados = Array.from(
      new Set([
        ...mencoesPendentesChat
          .map((mencao) => normalizar(mencao.login))
          .filter(Boolean),
        ...extrairLoginsMencionadosTextoChat(textoMensagem),
      ])
    ).filter(
      (loginMencionado) =>
        Boolean(loginMencionado) &&
        loginMencionado !== normalizar(usuarioLogado.login)
    );

    try {
      setEnviandoMensagemChat(true);
      setErroChat("");

      const enviada = await enviarMensagemChat(
        canalChatAtivoId,
        usuarioLogado,
        textoMensagem,
        mensagemRespondendoChat?.id || null
      );

      if (!enviada) {
        setErroChat("Não consegui enviar a mensagem.");
        return;
      }

      if (loginsMencionados.length) {
        const mencoesOk = await salvarMencoesMensagem(
          enviada.id,
          loginsMencionados
        );

        if (!mencoesOk) {
          console.warn(
            "A mensagem foi enviada, mas não foi possível registrar todas as menções."
          );
        }
      }

      if (arquivosParaEnviar.length) {
        try {
          setEnviandoAnexosChat(true);

          const anexosEnviados = await enviarAnexosChat(
            enviada.id,
            canalChatAtivoId,
            usuarioLogado,
            arquivosParaEnviar
          );

          setAnexosChat((anteriores) => {
            const mapa = new Map<number, ChatAnexo>();

            [...anteriores, ...anexosEnviados].forEach((anexo) => {
              mapa.set(anexo.id, anexo);
            });

            return Array.from(mapa.values()).sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });

          setArquivosChatSelecionados([]);
        } catch (erro) {
          console.error("Erro ao enviar anexos:", erro);

          setErroChat(
            erro instanceof Error
              ? `A mensagem foi enviada, mas o anexo falhou: ${erro.message}`
              : "A mensagem foi enviada, mas não consegui enviar o anexo."
          );
        } finally {
          setEnviandoAnexosChat(false);
        }
      }

      setMensagemChat("");
      setMencoesPendentesChat([]);
      setMensagemRespondendoChat(null);

      setMensagensChat((anteriores) =>
        anteriores.some((item) => item.id === enviada.id)
          ? anteriores
          : [...anteriores, enviada]
      );

      await marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
    } finally {
      setEnviandoMensagemChat(false);
    }
  }

  useEffect(() => {
    if (categoriaFerramentas !== "chat" || !usuarioLogado) return;

    let cancelado = false;

    async function iniciarChat() {
      try {
        setCarregandoChat(true);
        setErroChat("");

        const [canais, participantes] = await Promise.all([
          carregarCanaisChat(),
          carregarParticipantesChat(),
        ]);

        if (cancelado) return;

        setCanaisChat(canais);
        setParticipantesChat(participantes);

        const permitidos = canais.filter((canal) =>
          canalChatPermitido(canal, participantes)
        );

        setCanalChatAtivoId((atual) => {
          if (atual && permitidos.some((canal) => canal.id === atual)) {
            return atual;
          }

          return (
            permitidos.find((canal) => canal.tipo === "geral")?.id ||
            permitidos[0]?.id ||
            null
          );
        });
      } catch (erro) {
        console.error("Erro ao iniciar chat:", erro);
        if (!cancelado) {
          setErroChat(
            "Não consegui carregar o chat. Confira as tabelas do chat no Supabase."
          );
        }
      } finally {
        if (!cancelado) setCarregandoChat(false);
      }
    }

    iniciarChat();

    return () => {
      cancelado = true;
    };
  }, [
    categoriaFerramentas,
    usuarioLogado?.login,
    usuarioLogado?.cargo,
    projetosVisiveis,
  ]);

  useEffect(() => {
    if (
      categoriaFerramentas !== "chat" ||
      !canalChatAtivoId ||
      !usuarioLogado
    ) {
      return;
    }

    let cancelado = false;

    async function carregarCanal() {
      try {
        setCarregandoMensagensChat(true);
        setErroChat("");

        const [mensagens, anexos] = await Promise.all([
          carregarMensagensChat(canalChatAtivoId, 150),
          carregarAnexosChat(canalChatAtivoId),
        ]);

        if (cancelado) return;

        setMensagensChat(mensagens);
        setAnexosChat(anexos);
        setMensagemRespondendoChat(null);
        setMensagemEditandoChat(null);
        setTextoEdicaoMensagemChat("");
        setMenuMensagemAbertoId(null);
        setMencoesPendentesChat([]);
        setArquivosChatSelecionados([]);
        await marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
      } catch (erro) {
        console.error("Erro ao carregar mensagens do chat:", erro);
        if (!cancelado) {
          setErroChat("Não consegui carregar as mensagens deste canal.");
        }
      } finally {
        if (!cancelado) setCarregandoMensagensChat(false);
      }
    }

    carregarCanal();

    const cancelarRealtime = assinarMensagensChat(
      canalChatAtivoId,
      (novaMensagem) => {
        if (cancelado) return;

        setMensagensChat((anteriores) =>
          anteriores.some((item) => item.id === novaMensagem.id)
            ? anteriores.map((item) =>
                item.id === novaMensagem.id ? novaMensagem : item
              )
            : [...anteriores, novaMensagem]
        );

        if (novaMensagem.excluido_em) {
          setAnexosChat((anteriores) =>
            anteriores.filter(
              (anexo) => anexo.mensagem_id !== novaMensagem.id
            )
          );
        }

        void marcarCanalComoLido(canalChatAtivoId, usuarioLogado.login);
      }
    );

    const cancelarRealtimeAnexos = assinarAnexosChat(
      canalChatAtivoId,
      (novoAnexo) => {
        if (cancelado) return;

        setAnexosChat((anteriores) =>
          anteriores.some((item) => item.id === novoAnexo.id)
            ? anteriores.map((item) =>
                item.id === novoAnexo.id ? novoAnexo : item
              )
            : [...anteriores, novoAnexo]
        );
      }
    );

    return () => {
      cancelado = true;
      cancelarRealtime();
      cancelarRealtimeAnexos();
    };
  }, [
    categoriaFerramentas,
    canalChatAtivoId,
    usuarioLogado?.login,
  ]);

  useEffect(() => {
    if (categoriaFerramentas !== "chat" || !canalChatAtivoId) return;

    // Quando o usuário abriu uma notificação, não joga a tela para o fim
    // antes de tentar localizar a mensagem destacada.
    if (mensagemChatDestacadaId) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById("dubworks-chat-fim")
        ?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [
    categoriaFerramentas,
    canalChatAtivoId,
    mensagensChat.length,
    mensagemChatDestacadaId,
  ]);

  async function ativarNotificacoesSistema() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissaoNotificacaoSistema("indisponivel");
      alert("Este navegador não oferece notificações do sistema.");
      return;
    }

    try {
      const permissao = await Notification.requestPermission();
      setPermissaoNotificacaoSistema(permissao);

      if (permissao === "granted") {
        new Notification("DubWorks Manager", {
          body: "Notificações do celular ativadas com sucesso.",
          tag: "dubworks-notificacoes-ativadas",
        });
      } else if (permissao === "denied") {
        alert(
          "As notificações foram bloqueadas no navegador. Libere a permissão nas configurações do site para ativá-las."
        );
      }
    } catch (erro) {
      console.error("Erro ao solicitar notificações do sistema:", erro);
      alert("Não consegui ativar as notificações do celular.");
    }
  }

  function exibirNotificacaoSistema(notificacao: NotificacaoChat) {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      const notificacaoSistema = new Notification(
        notificacao.titulo || "DubWorks Manager",
        {
          body:
            notificacao.texto_preview ||
            "Você recebeu uma nova notificação no DubWorks Manager.",
          tag: `dubworks-${notificacao.id}`,
        }
      );

      notificacaoSistema.onclick = () => {
        window.focus();
        void abrirNotificacaoChat(notificacao);
        notificacaoSistema.close();
      };
    } catch (erro) {
      console.error("Erro ao exibir notificação do sistema:", erro);
    }
  }

  useEffect(() => {
    const loginAtual = normalizar(usuarioLogado?.login);

    if (!loginAtual) {
      setNotificacoesChat([]);
      return;
    }

    let cancelado = false;

    async function iniciarNotificacoes() {
      try {
        setCarregandoNotificacoesChat(true);

        const lista = await carregarNotificacoes(loginAtual, 100);

        if (cancelado) return;

        setNotificacoesChat(lista);
      } catch (erro) {
        console.error("Erro ao iniciar notificações do chat:", erro);
      } finally {
        if (!cancelado) {
          setCarregandoNotificacoesChat(false);
        }
      }
    }

    iniciarNotificacoes();

    const cancelarRealtime = assinarNotificacoes(
      loginAtual,
      (notificacao) => {
        if (cancelado) return;

        atualizarNotificacaoLocal(notificacao);

        // A menção é criada logo após a mensagem. Um pequeno atraso permite
        // que o UPDATE de "mensagem" -> "mencao" chegue antes do toast.
        if (!notificacao.lida) {
          if (timerToastNotificacaoRef.current) {
            window.clearTimeout(timerToastNotificacaoRef.current);
          }

          timerToastNotificacaoRef.current = window.setTimeout(async () => {
            if (cancelado) return;

            const listaAtualizada = await carregarNotificacoes(
              loginAtual,
              100
            );

            if (cancelado) return;

            setNotificacoesChat(listaAtualizada);

            const maisAtual =
              listaAtualizada.find(
                (item) => item.id === notificacao.id
              ) || notificacao;

            if (!maisAtual.lida) {
              setToastNotificacaoChat(maisAtual);
              exibirNotificacaoSistema(maisAtual);
            }
          }, 320);
        }
      }
    );

    return () => {
      cancelado = true;
      cancelarRealtime();

      if (timerToastNotificacaoRef.current) {
        window.clearTimeout(timerToastNotificacaoRef.current);
        timerToastNotificacaoRef.current = null;
      }
    };
  }, [usuarioLogado?.login]);

  useEffect(() => {
    if (!toastNotificacaoChat) return;

    const timer = window.setTimeout(() => {
      setToastNotificacaoChat(null);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [toastNotificacaoChat?.id, toastNotificacaoChat?.tipo]);

  useEffect(() => {
    return () => {
      if (timerFocoNotificacaoRef.current) {
        window.clearTimeout(timerFocoNotificacaoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loginAtual = normalizar(usuarioLogado?.login);

    if (!loginAtual) {
      setPreferenciasChat([]);
      return;
    }

    let cancelado = false;

    carregarPreferenciasChat(loginAtual)
      .then((lista) => {
        if (!cancelado) {
          setPreferenciasChat(lista);
        }
      })
      .catch((erro) => {
        console.error(
          "Erro ao carregar preferências de chat:",
          erro
        );
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioLogado?.login]);

  function normalizarStatusProjetoUI(status?: string) {
    const valorOriginal = String(status || "").trim();
    const valor = normalizar(valorOriginal);

    if (!valor) return "Sem status";
    if (valor.includes("aprov")) return "Aguardando aprovação";
    if (valor.includes("nao inici") || valor.includes("não inici") || valor.includes("aguard")) {
      return "Aguardando início";
    }
    if (valor.includes("planej")) return "Planejamento";
    if (valor.includes("selec")) return "Seleção";
    if (valor.includes("finalizand") || valor.includes("edi") || valor.includes("revis")) {
      return "Em edição";
    }
    if (valor.includes("stand") || valor.includes("paus")) return "Pausado";
    if (valor.includes("interromp") || valor.includes("cancel")) return "Interrompido";
    if (valor.includes("conclu") || valor.includes("encerr") || valor.includes("final")) {
      return "Finalizado";
    }
    if (valor.includes("exec") || valor.includes("andamento") || valor.includes("iniciad")) {
      return "Em andamento";
    }

    return valorOriginal;
  }

  const statusUnicos = useMemo(() => {
    const ordemStatus = [
      "Aguardando aprovação",
      "Aguardando início",
      "Planejamento",
      "Seleção",
      "Em andamento",
      "Em edição",
      "Pausado",
      "Interrompido",
      "Finalizado",
      "Sem status",
    ];

    return Array.from(
      new Set(
        projetosVisiveis.map((p) => normalizarStatusProjetoUI(p.Status)).filter(Boolean)
      )
    ).sort((a, b) => {
      const indiceA = ordemStatus.indexOf(a);
      const indiceB = ordemStatus.indexOf(b);
      const pesoA = indiceA === -1 ? ordemStatus.length : indiceA;
      const pesoB = indiceB === -1 ? ordemStatus.length : indiceB;
      return pesoA - pesoB || a.localeCompare(b, "pt-BR");
    });
  }, [projetosVisiveis]);

  const filtrados = useMemo(() => {
    return projetosVisiveis.filter((p) => {
      const termo = query.toLowerCase();
      const statusProjeto = normalizarStatusProjetoUI(p.Status);
      const camposBusca = [
        p.ID,
        p.Projeto,
        p.Tipo,
        p.Genero,
        extrairCategoriaProjeto(p.Observacoes),
        p.Prioridade,
        p.Status,
        statusProjeto,
        p.Lider,
        p.Editor,
        p.Dupla,
        ...p.Elenco.map(
          (item) => `${item.personagem} ${item.dublador} ${item.funcao}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      const busca = camposBusca.indexOf(termo) !== -1;
      const statusOk = statusFiltro === "Todos" || statusProjeto === statusFiltro;
      const generoOk =
        generoFiltro === "Todos" ||
        normalizar(p.Genero || "").includes(normalizar(generoFiltro));
      return busca && statusOk && generoOk;
    });
  }, [projetosVisiveis, query, statusFiltro, generoFiltro]);

  const totalPaginasProjetos = Math.max(
    1,
    Math.ceil(filtrados.length / projetosPorPagina)
  );

  const projetosPaginados = useMemo(() => {
    const inicio = (paginaProjetos - 1) * projetosPorPagina;
    return filtrados.slice(inicio, inicio + projetosPorPagina);
  }, [filtrados, paginaProjetos, projetosPorPagina]);

  useEffect(() => {
    setPaginaProjetos((paginaAtual) =>
      Math.min(Math.max(1, paginaAtual), totalPaginasProjetos)
    );
  }, [totalPaginasProjetos]);

  function extrairNomesResponsaveisProjeto(observacoes?: string) {
    const texto = String(observacoes || "");
    const match = texto.match(
      /\[\[RESPONSAVEIS_PROJETO\]\]\s*([\s\S]*?)\s*\[\[\/RESPONSAVEIS_PROJETO\]\]/i
    );

    if (!match?.[1]) return { lider: "", editor: "" };

    try {
      const dados = JSON.parse(match[1]);
      return {
        lider: String(dados?.lider || "").trim(),
        editor: String(dados?.editor || "").trim(),
      };
    } catch {
      return { lider: "", editor: "" };
    }
  }

  function salvarNomesResponsaveisProjeto(
    observacoes: string,
    nomeLider: string,
    nomeEditor: string
  ) {
    const semMetadados = String(observacoes || "")
      .replace(
        /\[\[RESPONSAVEIS_PROJETO\]\][\s\S]*?\[\[\/RESPONSAVEIS_PROJETO\]\]/gi,
        " "
      )
      .trim();

    const metadados = `[[RESPONSAVEIS_PROJETO]]${JSON.stringify({
      lider: String(nomeLider || "").trim(),
      editor: String(nomeEditor || "").trim(),
    })}[[/RESPONSAVEIS_PROJETO]]`;

    return [semMetadados, metadados].filter(Boolean).join("\n");
  }

  function emailPareceValido(email?: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  async function localizarUsuarioPorEmailProjeto(email?: string) {
    const emailNormalizado = normalizar(String(email || "").trim());
    if (!emailNormalizado || !emailPareceValido(emailNormalizado)) return null;

    const local = usuarios.find((usuario) =>
      [usuario.login, usuario.vinculo]
        .filter(Boolean)
        .some((valor) => normalizar(String(valor || "")) === emailNormalizado)
    );

    if (local) return local;
    return await buscarPerfilPorEmail(emailNormalizado);
  }

  async function validarEmailResponsavelNovo(tipo: "lider" | "editor") {
    const email = tipo === "lider" ? novoProjeto.Lider : novoProjeto.Editor;
    const setErro = tipo === "lider" ? setErroEmailLiderNovo : setErroEmailEditorNovo;
    const setValidando =
      tipo === "lider" ? setValidandoEmailLiderNovo : setValidandoEmailEditorNovo;

    if (!String(email || "").trim()) {
      if (tipo === "lider") setErro("E-mail do líder é obrigatório.");
      else setErro("");
      return null;
    }

    if (!emailPareceValido(email)) {
      setErro("Digite um e-mail válido.");
      return null;
    }

    try {
      setValidando(true);
      const perfil = await localizarUsuarioPorEmailProjeto(email);
      if (!perfil) {
        setErro("Este e-mail não está cadastrado nos usuários do DubWorks Manager.");
        return null;
      }

      setErro("");
      if (tipo === "lider" && !novoProjetoNomeLider.trim()) {
        setNovoProjetoNomeLider(perfil.nome || "");
      }
      if (tipo === "editor" && !novoProjetoNomeEditor.trim()) {
        setNovoProjetoNomeEditor(perfil.nome || "");
      }
      return perfil;
    } finally {
      setValidando(false);
    }
  }

  function atualizarNomeResponsavelRascunho(tipo: "lider" | "editor", nome: string) {
    if (!rascunho) return;
    const nomesAtuais = extrairNomesResponsaveisProjeto(rascunho.Observacoes);
    setRascunho({
      ...rascunho,
      Observacoes: salvarNomesResponsaveisProjeto(
        rascunho.Observacoes || "",
        tipo === "lider" ? nome : nomesAtuais.lider,
        tipo === "editor" ? nome : nomesAtuais.editor
      ),
    });
  }

  function valorDataParaInput(valor?: string) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const data = parseDataFlex(texto);
    if (!data || Number.isNaN(data.getTime())) return "";
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function separarHistoricoProjeto(texto?: string) {
    return String(texto || "")
      .split(/\n+(?=\[[^\]]+\]\s)/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function limparResumoProjeto(observacoes?: string) {
    const texto = String(observacoes || "");

    return texto
      // Remove metadados internos usados apenas pelo sistema.
      .replace(/\[\[RESPONSAVEIS_PROJETO\]\][\s\S]*?\[\[\/RESPONSAVEIS_PROJETO\]\]/gi, " ")
      .replace(/\[\[CATEGORIA_PROJETO\]\][\s\S]*?\[\[\/CATEGORIA_PROJETO\]\]/gi, " ")
      // Remove blocos técnicos antigos usados para guardar links do Drive.
      .replace(/\[\[DRIVE_LINKS\]\]\s*\{[\s\S]*?\}\s*\[\[\/DRIVE_LINKS\]\]/gi, " ")
      .replace(/\[DRIVE_LINKS\]\s*\{[\s\S]*?\}\s*\[\/DRIVE_LINKS\]/gi, " ")
      // Compatibilidade com registros em que só existe uma das tags.
      .replace(/\[\[\/?DRIVE_LINKS\]\]/gi, " ")
      .replace(/\[\/?DRIVE_LINKS\]/gi, " ")
      // Remove JSON legado do Drive que acabou salvo junto da observação.
      .replace(/\{\s*"(?:pasta|selecao|projeto|finalizados|falasTeste|formSelecao|formEntregas|planilhaSelecao|planilhaEntregas)"[\s\S]*?\}/gi, " ")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function calcularProgressoStatusProjeto(status?: string) {
    const valor = normalizar(status || "");
    if (valor.includes("final")) return 100;
    if (valor.includes("edic") || valor.includes("revis")) return 85;
    if (valor.includes("andamento")) return 65;
    if (valor.includes("sele") || valor.includes("planej")) return 35;
    if (valor.includes("aguard")) return 15;
    if (valor.includes("paus") || valor.includes("stand")) return 50;
    return 10;
  }

  function obterProgressoProjeto(projeto: Projeto) {
    const elencoValido = (projeto.Elenco || []).filter(
      (item) => Boolean(item.personagem?.trim()) || Boolean(item.dublador?.trim())
    );

    if (elencoValido.length) {
      const concluidos = elencoValido.filter((item) => {
        const statusEntrega = normalizar(item.status_entrega || "");
        return ["aprov", "entreg", "conclu", "final", "feito", "ok"].some(
          (termo) => statusEntrega.includes(termo)
        );
      }).length;

      if (concluidos > 0) {
        return Math.max(1, Math.min(100, Math.round((concluidos / elencoValido.length) * 100)));
      }
    }

    return calcularProgressoStatusProjeto(projeto.Status);
  }

  function obterNumeroSemanaProjeto(projeto: Projeto) {
    const semanasElenco = (projeto.Elenco || [])
      .map((item) => numeroSemanaEntrega(item.semana_atual))
      .filter((numero) => Number.isFinite(numero) && numero > 0);

    if (semanasElenco.length) {
      return Math.max(...semanasElenco);
    }

    const registros = `${projeto.Registro_Semanal || ""} ${projeto.Observacoes || ""}`;
    const correspondencias = Array.from(registros.matchAll(/semana\s*0*(\d+)/gi));
    if (correspondencias.length) {
      const ultimo = correspondencias[correspondencias.length - 1]?.[1];
      return numeroSemanaEntrega(ultimo);
    }

    return 1;
  }

  function obterNomeLiderProjeto(projeto: Projeto) {
    const nomesSalvos = extrairNomesResponsaveisProjeto(projeto.Observacoes);
    if (nomesSalvos.lider) return nomesSalvos.lider;

    const liderNormalizado = normalizar(projeto.Lider || "");

    if (!liderNormalizado) return "—";

    const perfil = usuarios.find((usuario) =>
      [usuario.login, usuario.nome, usuario.vinculo].some(
        (valor) => Boolean(valor) && normalizar(valor || "") === liderNormalizado
      )
    );

    return perfil?.nome || projeto.Lider || "—";
  }

  function atualizarUrlProjeto(projetoId: string | null, modo: "push" | "replace" = "push") {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (projetoId) {
      url.searchParams.set("projeto", String(projetoId));
    } else {
      url.searchParams.delete("projeto");
    }

    const destino = `${url.pathname}${url.search}${url.hash}`;

    if (modo === "replace") {
      window.history.replaceState({ projetoId }, "", destino);
    } else {
      window.history.pushState({ projetoId }, "", destino);
    }
  }

  function abrirPaginaProjeto(projetoId: string) {
    setRascunho(null);
    setErroEmailLiderEdicao("");
    setErroEmailEditorEdicao("");
    setSelecionadoId(projetoId);
    setAbaProjeto("informacoes");
    atualizarUrlProjeto(projetoId, "push");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarParaListaProjetos() {
    setSelecionadoId(null);
    setRascunho(null);
    setAbaProjeto("informacoes");
    atualizarUrlProjeto(null, "push");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selecionado = useMemo(() => {
    return projetos.find((p) => p.ID === selecionadoId) || null;
  }, [projetos, selecionadoId]);


  const projetoPainel = selecionado || null;

  useEffect(() => {
    if (!projetoPainel || abaProjeto !== "relatorios" || tipoRelatorioProjeto !== "semanal") {
      return;
    }

    const semanaInicial = semanasProjeto.some(
      (item) => item.semana === semanaRelatorioProjeto
    )
      ? semanaRelatorioProjeto
      : semanasProjeto.find((item) => item.status === "aberta")?.semana ||
        semanasProjeto[0]?.semana ||
        1;

    if (semanaInicial !== semanaRelatorioProjeto) {
      setSemanaRelatorioProjeto(semanaInicial);
      return;
    }

    void carregarItensRelatorioSemana(projetoPainel, semanaInicial);
  }, [
    projetoPainel?.ID,
    abaProjeto,
    tipoRelatorioProjeto,
    semanaRelatorioProjeto,
    semanasProjeto,
    entregasProducao,
  ]);

  const resumoRelatorioAutomaticoProjeto = useMemo(() => {
    const previstos = itensRelatorioProjeto.length;
    const aprovados = itensRelatorioProjeto.filter((item) => item.status === "aprovado").length;
    const pendentes = itensRelatorioProjeto.filter(
      (item) => item.status === "aguardando_analise"
    ).length;
    const regravacoes = itensRelatorioProjeto.filter(
      (item) => item.status === "regravacao"
    ).length;
    const naoEntregaram = itensRelatorioProjeto.filter(
      (item) => item.status === "nao_entregou"
    ).length;
    const entregaram = Math.max(0, previstos - naoEntregaram);
    return {
      previstos,
      entregaram,
      naoEntregaram,
      pendentes,
      aprovados,
      regravacoes,
      progressoRecebimento: previstos
        ? Math.round((entregaram / previstos) * 100)
        : 0,
      progressoAprovacao: previstos
        ? Math.round((aprovados / previstos) * 100)
        : 0,
    };
  }, [itensRelatorioProjeto]);

  const estatisticasCards = useMemo(() => {
    const baseProjetos = projetoPainel ? [projetoPainel] : projetosVisiveis;

    const contarRegistros = (projeto: Projeto) =>
      (projeto.Registro_Semanal || "")
        .split("\n\n")
        .map((item) => item.trim())
        .filter(Boolean).length;

    const progressoPorStatus = (status?: string) => {
      const valor = normalizar(status || "");

      if (valor.includes("final")) return 100;
      if (valor.includes("edi")) return 85;
      if (valor.includes("andamento")) return 60;
      if (valor.includes("sele")) return 35;
      if (valor.includes("aguard")) return 15;
      if (valor.includes("paus") || valor.includes("stand")) return 50;
      return 10;
    };

    const membrosElenco = baseProjetos.reduce(
      (total, projeto) =>
        total +
        (projeto.Elenco || []).filter((item) =>
          Boolean(item.dublador?.trim())
        ).length,
      0
    );

    const videosTestes = baseProjetos.reduce((total, projeto) => {
      const resumo =
        resumoMidiasPorProjeto[String(projeto.ID)] || {
          entregas: 0,
          testes: 0,
        };

      if (projetoPainel && String(projeto.ID) === String(projetoPainel.ID)) {
        return (
          total +
          Math.max(resumo.testes, respostasSelecao.length) +
          Math.max(resumo.entregas, entregasProducao.length)
        );
      }

      return total + resumo.testes + resumo.entregas;
    }, 0);

    const finalizados = baseProjetos.filter((projeto) =>
      normalizar(projeto.Status || "").includes("final")
    ).length;

    const registros = baseProjetos.reduce(
      (total, projeto) => total + contarRegistros(projeto),
      0
    );

    const progresso = baseProjetos.length
      ? Math.round(
          baseProjetos.reduce(
            (total, projeto) =>
              total + progressoPorStatus(projeto.Status),
            0
          ) / baseProjetos.length
        )
      : 0;

    return {
      membrosElenco,
      videosTestes,
      finalizados,
      registros,
      progresso,
    };
  }, [
    projetoPainel,
    projetosVisiveis,
    resumoMidiasPorProjeto,
    respostasSelecao.length,
    entregasProducao.length,
  ]);

  useEffect(() => {
    if (!projetoPainel?.ID) {
      setSemanasProjeto([]);
      setParticipantesSemanaProjeto([]);
      setEntregasProducao([]);
      setRespostasSelecao([]);
      setRespostaSelecaoAtivaId(null);
      setStatusSincronizacaoAutomatica("idle");
      setMensagemSincronizacaoAutomatica("");
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const [entregas, semanas] = await Promise.all([
          carregarEntregasProducaoBanco(projetoPainel.ID),
          carregarSemanasProjetoBanco(projetoPainel.ID),
        ]);

        if (cancelado) return;

        setEntregasProducao(entregas);
        setSemanasProjeto(semanas);

        const semanaPreferida =
          semanas.find((item) => item.status === "aberta") ||
          semanas[semanas.length - 1];

        if (semanaPreferida?.semana) {
          setSemanaFiltroProducao(semanaPreferida.semana);
          await carregarParticipantesSemanaProjetoBancoLocal(
            projetoPainel,
            semanaPreferida.semana
          );
        } else {
          setSemanaFiltroProducao(1);
          setParticipantesSemanaProjeto([]);
        }

        if (!cancelado) {
          await sincronizarProjetoAutomaticamente(projetoPainel);
        }
      } catch (erro) {
        console.error("Erro ao abrir o projeto:", erro);
        if (!cancelado) {
          setStatusSincronizacaoAutomatica("erro");
          setMensagemSincronizacaoAutomatica(
            "Projeto aberto com os últimos dados salvos"
          );
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [projetoPainel?.ID]);

  useEffect(() => {
    if (!projetoPainel?.ID || !semanasProjeto.length) {
      if (!semanasProjeto.length) setParticipantesSemanaProjeto([]);
      return;
    }

    void carregarParticipantesSemanaProjetoBancoLocal(
      projetoPainel,
      semanaFiltroProducao
    );
  }, [projetoPainel?.ID, semanaFiltroProducao]);

  useEffect(() => {
    const ids = projetosVisiveis
      .map((projeto) => Number(projeto.ID))
      .filter((id) => Number.isFinite(id));

    if (!ids.length) {
      setResumoMidiasPorProjeto({});
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const [entregasResultado, selecaoResultado] = await Promise.all([
          supabase
            .from("entregas_producao")
            .select("projeto_id")
            .in("projeto_id", ids),
          supabase
            .from("selecao_avaliacoes")
            .select("projeto_id")
            .in("projeto_id", ids),
        ]);

        if (cancelado) return;

        const resumo: Record<
          string,
          { entregas: number; testes: number }
        > = {};

        ids.forEach((id) => {
          resumo[String(id)] = { entregas: 0, testes: 0 };
        });

        if (!entregasResultado.error) {
          (entregasResultado.data || []).forEach((item: any) => {
            const chave = String(item.projeto_id);
            if (!resumo[chave]) {
              resumo[chave] = { entregas: 0, testes: 0 };
            }
            resumo[chave].entregas += 1;
          });
        }

        if (!selecaoResultado.error) {
          (selecaoResultado.data || []).forEach((item: any) => {
            const chave = String(item.projeto_id);
            if (!resumo[chave]) {
              resumo[chave] = { entregas: 0, testes: 0 };
            }
            resumo[chave].testes += 1;
          });
        }

        setResumoMidiasPorProjeto((anterior) => {
          const combinado = { ...resumo };

          Object.entries(anterior).forEach(([chave, valor]) => {
            if (!combinado[chave]) combinado[chave] = valor;
            else {
              combinado[chave] = {
                entregas: Math.max(
                  combinado[chave].entregas,
                  valor.entregas
                ),
                testes: Math.max(
                  combinado[chave].testes,
                  valor.testes
                ),
              };
            }
          });

          return combinado;
        });
      } catch (erro) {
        console.error("Erro ao carregar resumo das estatísticas:", erro);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [projetosVisiveis]);

  useEffect(() => {
    if (
      !usuarioLogado ||
      !mostrarFerramentas ||
      categoriaFerramentas !== "calendario"
    ) {
      return;
    }

    void carregarAgendaAtual();
  }, [
    usuarioLogado?.login,
    mostrarFerramentas,
    categoriaFerramentas,
  ]);

  useEffect(() => {
    if (
      !usuarioLogado ||
      !(mostrarEventos || usuarioLogado.cargo === "eventos")
    ) {
      return;
    }

    void carregarAgendaAtual();
  }, [usuarioLogado?.login, usuarioLogado?.cargo, mostrarEventos]);

  useEffect(() => {
    if (
      !usuarioLogado ||
      !(mostrarAdvertencias || usuarioLogado.cargo === "moderador")
    ) {
      return;
    }

    void recarregarAdvertencias();
  }, [usuarioLogado?.login, usuarioLogado?.cargo, mostrarAdvertencias]);

  useEffect(() => {
    if (selecionado) {
      setRascunho({ ...selecionado, Elenco: [...selecionado.Elenco] });
    } else {
      setRascunho(null);
    }
  }, [selecionado]);

  const rankingDubladores = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nome: string;
        totalProjetos: number;
        totalPapeis: number;
        projetosUnicos: Set<string>;
      }
    >();

    projetos.forEach((projeto) => {
      projeto.Elenco.forEach((item) => {
        const chave = normalizar(item.dublador);
        if (!chave) return;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            nome: item.dublador,
            totalProjetos: 0,
            totalPapeis: 0,
            projetosUnicos: new Set<string>(),
          });
        }
        const registro = mapa.get(chave)!;
        registro.totalPapeis += 1;
        registro.projetosUnicos.add(projeto.ID);
      });
    });

    return Array.from(mapa.values())
      .map((item) => ({
        nome: item.nome,
        totalProjetos: item.projetosUnicos.size,
        totalPapeis: item.totalPapeis,
      }))
      .sort((a, b) => {
        if (b.totalProjetos !== a.totalProjetos)
          return b.totalProjetos - a.totalProjetos;
        return b.totalPapeis - a.totalPapeis;
      });
  }, [projetos]);

  const usuariosVisiveis = useMemo(() => {
    if (!usuarioLogado) return [];
    if (usuarioLogado.cargo === "diretoria") return usuarios;
    if (usuarioLogado.cargo === "adm") {
      return usuarios.filter((u) => u.cargo !== "diretoria");
    }
    if (usuarioLogado.cargo === "adm_treinamento") {
      return usuarios.filter((u) => u.cargo === "lider_treinamento");
    }
    return [];
  }, [usuarios, usuarioLogado]);

  const faixasEtariasMembros = useMemo(() => {
    return Array.from(
      new Set(
        membros
          .map((m) => String(m.faixa_etaria || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" })
    );
  }, [membros]);

  const membrosFiltrados = useMemo(() => {
    const termo = normalizar(queryMembros);

    const statusDireto: Record<string, StatusMembro> = {
      "na comunidade": "na_comunidade",
      ativo: "na_comunidade",
      ativos: "na_comunidade",
      "so nos canais": "somente_canais",
      "só nos canais": "somente_canais",
      canais: "somente_canais",
      saiu: "saiu",
      sairam: "saiu",
      saíram: "saiu",
      banido: "banido",
      banidos: "banido",
    };

    const normalizarAtendimento = (valor?: string | null) => {
      const atual = normalizar(String(valor || "chamar"));
      if (atual === "1") return "01";
      if (atual === "2") return "02";
      if (atual === "concluido" || atual === "concluído") return "concluido";
      if (atual === "erro") return "erro";
      return "chamar";
    };

    const filtrados = membros.filter((m) => {
      if (statusMembrosFiltro !== "todos" && m.status !== statusMembrosFiltro) {
        return false;
      }

      if (
        atendimentoMembrosFiltro !== "todos" &&
        normalizarAtendimento(m.atendimento) !== atendimentoMembrosFiltro
      ) {
        return false;
      }

      if (
        faixaEtariaMembrosFiltro !== "todos" &&
        String(m.faixa_etaria || "").trim() !== faixaEtariaMembrosFiltro
      ) {
        return false;
      }

      if (!termo) return true;
      if (statusDireto[termo]) return m.status === statusDireto[termo];

      return [
        m.nome,
        m.telefone,
        m.email,
        m.habilidades || "",
        m.motivacao || "",
        m.observacao || "",
        m.faixa_etaria || "",
        atendimentoMembroLabel(m.atendimento),
        statusMembroLabel(m.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });

    return [...filtrados].sort((a, b) => {
      if (ordenacaoMembros === "nome_az") {
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
          sensitivity: "base",
        });
      }

      if (ordenacaoMembros === "nome_za") {
        return String(b.nome || "").localeCompare(String(a.nome || ""), "pt-BR", {
          sensitivity: "base",
        });
      }

      const dataA = parseDataFlex(a.data_entrada || a.data_ficha)?.getTime() || 0;
      const dataB = parseDataFlex(b.data_entrada || b.data_ficha)?.getTime() || 0;

      return ordenacaoMembros === "antigos" ? dataA - dataB : dataB - dataA;
    });
  }, [
    membros,
    queryMembros,
    statusMembrosFiltro,
    atendimentoMembrosFiltro,
    faixaEtariaMembrosFiltro,
    ordenacaoMembros,
  ]);

  const relatorioEntradaSaida = useMemo(() => {
    return calcularRelatorioEntradaSaida(membros);
  }, [membros]);

  const totalMembrosAtivos = membros.filter(
    (m) => m.status === "na_comunidade"
  ).length;
  const totalMembrosSaida = membros.filter((m) => m.status === "saiu").length;
  const totalMembrosCanais = membros.filter(
    (m) => m.status === "somente_canais"
  ).length;
  const totalMembrosBanidos = membros.filter(
    (m) => m.status === "banido"
  ).length;
  const totalAtendimentoPendente = membros.filter(
    (m) => String(m.atendimento || "chamar") === "chamar"
  ).length;

  const totalProjetos = projetosVisiveis.length;
  const totalAtivos = projetosVisiveis.filter(
    (p) =>
      ["finalizado", "concluida", "concluído"].indexOf(normalizar(p.Status)) ===
      -1
  ).length;
  const totalFinalizados = projetosVisiveis.filter(
    (p) =>
      ["finalizado", "concluida", "concluído"].indexOf(normalizar(p.Status)) !==
      -1
  ).length;
  const totalElenco = projetosVisiveis.reduce(
    (acc, projeto) => acc + projeto.Elenco.length,
    0
  );
  const totalTreinamento = usuarios.filter(
    (u) => u.cargo === "lider_treinamento"
  ).length;

  const moduloSelecionadoTreinamento =
    modulosTreinamentoLider.find((m) => m.id === moduloTreinamentoAtivo) ||
    modulosTreinamentoLider[0];

  const totalPerguntasTreinamento = modulosTreinamentoLider.filter(
    (modulo) => modulo.pergunta
  ).length;

  const respostasCorretasTreinamento = modulosTreinamentoLider.filter(
    (modulo) =>
      modulo.pergunta &&
      respostasTreinamento[modulo.id] === modulo.pergunta.correta
  ).length;

  const progressoTreinamento = totalPerguntasTreinamento
    ? Math.round(
        (respostasCorretasTreinamento / totalPerguntasTreinamento) * 100
      )
    : 0;

  function responderPerguntaTreinamento(
    moduloId: string,
    alternativaIndex: number
  ) {
    setRespostasTreinamento((atual) => ({
      ...atual,
      [moduloId]: alternativaIndex,
    }));
  }

  async function recarregarRespostasTreinamento() {
    if (!usuarioLogado) return;
    if (!podeGerenciarTreinamentos(usuarioLogado)) return;

    try {
      setCarregandoRespostasTreinamento(true);
      const lista = await carregarRespostasTreinamentoBanco();
      setRespostasTreinamentoSalvas(lista);
    } catch (err) {
      console.error("Erro ao carregar respostas do treinamento:", err);
    } finally {
      setCarregandoRespostasTreinamento(false);
    }
  }

  async function enviarRespostaTreinamento(modulo: ModuloTreinamento) {
    if (!usuarioLogado || !modulo.pergunta) return;

    const alternativaMarcada = respostasTreinamento[modulo.id];

    if (alternativaMarcada === undefined) {
      alert("Escolha uma alternativa antes de enviar.");
      return;
    }

    const resposta: RespostaTreinamento = {
      usuario_login: usuarioLogado.login,
      usuario_nome: usuarioLogado.nome,
      usuario_cargo: usuarioLogado.cargo,
      modulo_id: modulo.id,
      modulo_titulo: modulo.titulo,
      pergunta: modulo.pergunta.pergunta,
      alternativa_marcada: alternativaMarcada,
      alternativa_texto: modulo.pergunta.alternativas[alternativaMarcada] || "",
      alternativa_correta: modulo.pergunta.correta,
      correta: alternativaMarcada === modulo.pergunta.correta,
      explicacao: modulo.pergunta.explicacao,
    };

    const ok = await salvarRespostaTreinamentoBanco(resposta);

    if (!ok) {
      alert(
        "Não consegui salvar a resposta. Confira se a tabela treinamento_respostas existe no Supabase."
      );
      return;
    }

    alert("Resposta enviada para avaliação da diretoria.");
    await recarregarRespostasTreinamento();
  }

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setCarregandoLogin(true);
      setErroLogin("");

      const email = login.trim().toLowerCase();

      if (!email || !senha) {
        setErroLogin("Digite seu e-mail e sua senha.");
        return;
      }

      const { data, error } = (await comTimeout(
        supabase.auth.signInWithPassword({
          email,
          password: senha,
        }),
        20000,
        "O login demorou demais para responder."
      )) as any;

      if (error || !data.user?.email) {
        console.error("Erro no login:", error);
        setErroLogin("Login ou senha inválidos.");
        return;
      }

      const perfil = await buscarPerfilPorEmail(data.user.email);

      if (!perfil) {
        await supabase.auth.signOut();
        setErroLogin(
          "Login autorizado, mas esse e-mail ainda não tem perfil na tabela usuarios. Confira o cadastro no Supabase."
        );
        return;
      }

      setUsuarioLogado(perfil);
      setErroLogin("");
      setSelecionadoId(
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("projeto")
      );

      // Recarrega os dados depois de liberar a entrada.
      // Assim o botão não fica preso em "Entrando..." se alguma consulta demorar.
      setTimeout(() => {
        recarregarProjetos();
        recarregarUsuarios();
        if (podeGerenciarMembros(perfil)) {
          carregarMembrosBanco()
            .then(setMembros)
            .catch((err) => console.error("Erro ao carregar membros:", err));
        }
      }, 0);
    } catch (err: any) {
      console.error("Erro inesperado no login:", err);
      setErroLogin(
        err?.message || "Erro de conexão com o servidor. Tente novamente."
      );
    } finally {
      setCarregandoLogin(false);
    }
  }

  async function enviarRecuperacaoSenha() {
    if (READ_ONLY_MODE) {
      setErroLogin("Modo de teste: recuperação de senha desativada para não alterar o Supabase Auth original.");
      return;
    }

    const email = login.trim().toLowerCase();

    if (!email) {
      setErroLogin("Digite seu e-mail no campo de login primeiro.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://dubworks-manager-teste.vercel.app/",
    });

    if (error) {
      console.error("Erro ao enviar recuperação de senha:", error);
      setErroLogin(
        "Não consegui enviar o e-mail de recuperação. Confira o e-mail e tente novamente."
      );
      return;
    }

    setErroLogin("Enviamos um link de recuperação para o seu e-mail.");
  }

  async function sair() {
    await supabase.auth.signOut();
    setUsuarioLogado(null);
    setLogin("");
    setSenha("");
    setErroLogin("");
    setSelecionadoId(null);
    setRascunho(null);
  }

  function atualizarCampo(campo: keyof Projeto, valor: string) {
    if (!rascunho) return;
    setRascunho({ ...rascunho, [campo]: valor });
  }

  async function enviarCapaNovoProjeto(arquivo: File | null) {
    if (!arquivo) return;

    setEnviandoCapaNovoProjeto(true);
    try {
      const url = await enviarCapaProjetoArquivo(arquivo);
      if (!url) throw new Error("Não recebi a URL da capa enviada.");
      setNovoProjeto((anterior) => ({ ...anterior, Capa_URL: url }));
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Não consegui enviar a capa.");
    } finally {
      setEnviandoCapaNovoProjeto(false);
    }
  }

  async function enviarCapaRascunho(arquivo: File | null) {
    if (!arquivo || !rascunho) return;

    setEnviandoCapaProjeto(true);
    try {
      const url = await enviarCapaProjetoArquivo(arquivo);
      if (!url) throw new Error("Não recebi a URL da capa enviada.");
      setRascunho((anterior) =>
        anterior ? { ...anterior, Capa_URL: url } : anterior
      );
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Não consegui enviar a capa.");
    } finally {
      setEnviandoCapaProjeto(false);
    }
  }

  function limparFormularioProjeto() {
    const usuarioEhLider = Boolean(
      usuarioLogado &&
        (usuarioLogado.cargo === "lider" ||
          usuarioLogado.cargo === "lider_treinamento")
    );

    const emailUsuario = usuarioEhLider
      ? usuarioLogado?.login || usuarioLogado?.vinculo || ""
      : "";
    const membroUsuario = membros.find(
      (membro) => normalizar(membro.email || "") === normalizar(emailUsuario)
    );

    setNovoProjeto({
      ...projetoVazio,
      Lider: emailUsuario,
      Telefone_Lider: usuarioEhLider ? membroUsuario?.telefone || "" : "",
    });
    setNovoProjetoNomeLider(usuarioEhLider ? usuarioLogado?.nome || "" : "");
    setNovoProjetoNomeEditor("");
    setNovoProjetoCategoria("");
    setTentouCriarProjeto(false);
    setErroEmailLiderNovo("");
    setErroEmailEditorNovo("");
    setNovoElencoProjeto(elencoVazio);
  }

  async function criarProjeto() {
    if (!usuarioLogado || !podeCriarProjeto(usuarioLogado)) return;

    setTentouCriarProjeto(true);
    const obrigatoriosFaltando: string[] = [];
    if (!novoProjeto.Projeto.trim()) obrigatoriosFaltando.push("nome do projeto");
    if (!novoProjeto.Tipo.trim()) obrigatoriosFaltando.push("tipo do projeto");
    if (!novoProjeto.Genero.trim()) obrigatoriosFaltando.push("gênero");
    if (!novoProjetoCategoria.trim()) obrigatoriosFaltando.push("categoria");
    if (!novoProjetoNomeLider.trim()) obrigatoriosFaltando.push("nome do líder");
    if (!novoProjeto.Lider.trim()) obrigatoriosFaltando.push("e-mail do líder");
    if (!novoProjeto.Telefone_Lider.trim()) obrigatoriosFaltando.push("telefone do líder");

    if (obrigatoriosFaltando.length) {
      alert(`Preencha os campos obrigatórios: ${obrigatoriosFaltando.join(", ")}.`);
      return;
    }

    const perfilLider = await validarEmailResponsavelNovo("lider");
    if (!perfilLider) return;

    let perfilEditor: Usuario | null = null;
    if (novoProjeto.Editor.trim()) {
      perfilEditor = await validarEmailResponsavelNovo("editor");
      if (!perfilEditor) return;
    }

    const usuarioEhLider =
      usuarioLogado.cargo === "lider" ||
      usuarioLogado.cargo === "lider_treinamento";

    const projetoParaSalvar: Projeto = {
      ...novoProjeto,
      Status: "Aguardando aprovação",
      Dupla: "",
      Lider: usuarioEhLider
        ? usuarioLogado.login || usuarioLogado.vinculo || novoProjeto.Lider
        : novoProjeto.Lider,
      Editor: novoProjeto.Editor,
      Observacoes: salvarCategoriaProjeto(
        salvarNomesResponsaveisProjeto(
          novoProjeto.Observacoes || "",
          novoProjetoNomeLider || perfilLider?.nome || "",
          novoProjetoNomeEditor || perfilEditor?.nome || ""
        ),
        novoProjetoCategoria
      ),
    };

    const projetoParaSalvarComHistorico: Projeto = {
      ...projetoParaSalvar,
      Registro_Semanal: [
        projetoParaSalvar.Registro_Semanal || "",
        `[${new Date().toLocaleString("pt-BR")}] ${
          usuarioLogado.nome
        }: Criou o projeto.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const projetoId = await criarProjetoBanco(projetoParaSalvarComHistorico);
    if (!projetoId) {
      alert("Erro ao salvar no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoId,
      projetoParaSalvarComHistorico.Elenco
    );

    if (!elencoOk) alert("Projeto salvo, mas houve erro ao salvar o elenco.");

    await recarregarProjetos();
    setMostrarNovoProjeto(false);
    limparFormularioProjeto();
    abrirPaginaProjeto(projetoId);
    alert("Projeto salvo. A página dedicada dele já foi criada 🚀");
  }

  function registrarHistoricoProjeto(texto: string) {
    if (!rascunho) return;

    const agora = new Date().toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Sistema";
    const linha = `[${agora}] ${autor}: ${texto}`;

    setRascunho({
      ...rascunho,
      Registro_Semanal: [rascunho.Registro_Semanal || "", linha]
        .filter(Boolean)
        .join("\n"),
    });
  }

  async function prepararOuAtualizarFormulariosProjeto() {
    if (!rascunho || !projetoPainel || preparandoFormulariosProjeto) return;

    if (!podeEditarProjeto(usuarioLogado, projetoPainel)) {
      alert("Você não tem permissão para preparar os formulários deste projeto.");
      return;
    }

    const linksAtuais = extrairLinksDrive(rascunho.Observacoes);
    const respostasSelecaoFolderId = extrairGoogleFolderId(
      linksAtuais.respostasSelecao || linksAtuais.selecao || ""
    );
    const entregasFolderId = extrairGoogleFolderId(
      linksAtuais.entregasProjeto || linksAtuais.projeto || ""
    );

    if (!respostasSelecaoFolderId || !entregasFolderId) {
      alert(
        "Crie primeiro a estrutura do Drive. Preciso das pastas de Seleção e Projeto para guardar os formulários e as planilhas."
      );
      return;
    }

    try {
      setPreparandoFormulariosProjeto(true);

      const personagens = Array.from(
        new Set(
          (rascunho.Elenco || [])
            .map((item) => String(item.personagem || "").trim())
            .filter(Boolean)
        )
      );
      const semanasAbertas = await listarSemanasAbertasFormulario(projetoPainel);

      const forms = await copiarFormulariosViaAppsScript(
        rascunho.Projeto || projetoPainel.Projeto || "Projeto",
        respostasSelecaoFolderId,
        entregasFolderId,
        personagens,
        {
          projectId: String(projetoPainel.ID || ""),
          projectType: rascunho.Tipo || projetoPainel.Tipo || "Projeto",
          mainFolderId: extrairGoogleFolderId(linksAtuais.pasta || ""),
          formSelecao: linksAtuais.formSelecao || "",
          formEntregas: linksAtuais.formEntregas || "",
          semanasAbertas,
        }
      );

      if (!forms.formSelecao && !forms.formEntregas) {
        throw new Error(
          "A integração respondeu, mas não devolveu os links dos formulários."
        );
      }

      const novosLinks = {
        ...linksAtuais,
        formSelecao: forms.formSelecao || linksAtuais.formSelecao || "",
        formEntregas: forms.formEntregas || linksAtuais.formEntregas || "",
        planilhaSelecao:
          forms.planilhaSelecao || linksAtuais.planilhaSelecao || "",
        planilhaEntregas:
          forms.planilhaEntregas || linksAtuais.planilhaEntregas || "",
      };

      const atualizado = aplicarHistoricoAutomatico(
        projetoPainel,
        {
          ...rascunho,
          Observacoes: salvarLinksDriveEmObservacoes(
            rascunho.Observacoes,
            novosLinks
          ),
        },
        "criou/atualizou os formulários do projeto"
      );

      const ok = await atualizarProjetoBanco(atualizado);
      if (!ok) {
        throw new Error(
          "Os formulários foram preparados, mas não consegui salvar os links no projeto."
        );
      }

      setRascunho(atualizado);
      await recarregarProjetos();
      alert(
        "Formulários atualizados. Seleção usa os personagens do Banco; Entregas usa telefone + Semana/Corte."
      );
    } catch (erro: any) {
      console.error("Erro ao preparar formulários do projeto:", erro);
      alert(`Erro ao preparar formulários: ${erro?.message || String(erro)}`);
    } finally {
      setPreparandoFormulariosProjeto(false);
    }
  }

  async function criarEstruturaDriveProjeto() {
    if (!rascunho || !projetoPainel) return;

    if (!podeEditarProjeto(usuarioLogado, projetoPainel)) {
      alert("Você não tem permissão para criar pastas neste projeto.");
      return;
    }

    const linksAtuais = extrairLinksDrive(rascunho.Observacoes);

    if (
      linksAtuais.pasta ||
      linksAtuais.selecao ||
      linksAtuais.projeto ||
      linksAtuais.finalizados
    ) {
      const confirmar = window.confirm(
        "Este projeto já possui links do Drive cadastrados. Deseja continuar mesmo assim?"
      );

      if (!confirmar) return;
    }

    try {
      setCriandoEstruturaDrive(true);

      const prefixoPasta =
        normalizar(rascunho.Tipo || projetoPainel.Tipo) === "parceria"
          ? "[Parceria]"
          : "[Projeto]";

      const resultado = await criarEstruturaDriveViaFunction(
        `${prefixoPasta} ${rascunho.Projeto || projetoPainel.Projeto || "Sem nome"}`,
        rascunho.Lider || projetoPainel.Lider || "",
        rascunho.Editor || projetoPainel.Editor || ""
      );

      if (
        !resultado.pasta &&
        !resultado.selecao &&
        !resultado.projeto &&
        !resultado.finalizados &&
        !resultado.falasTeste &&
        !resultado.respostasSelecao &&
        !resultado.cortesProjeto &&
        !resultado.Advertencia &&
        !resultado.entregasProjeto
      ) {
        console.error("Retorno inesperado da função do Drive:", resultado);
        alert(
          "A função respondeu, mas não retornou os links das pastas. Verifique os logs da Edge Function no Supabase."
        );
        return;
      }

      const personagensFormulario = Array.from(
        new Set(
          (rascunho.Elenco || [])
            .map((item) => String(item.personagem || "").trim())
            .filter(Boolean)
        )
      );

      let formulariosCriados: Partial<DriveStructureResult> = {};
      let erroPreparacaoFormularios = "";

      // A função de pastas e a função dos Forms são integrações separadas.
      // Quando os Forms ainda não vierem prontos da estrutura do Drive,
      // criamos/copiamos os formulários já enviando a lista do Banco do Projeto.
      if (
        !resultado.formSelecao ||
        !resultado.formEntregas ||
        FORMS_PROXY_ENABLED
      ) {
        const respostasSelecaoFolderId =
          resultado.respostasSelecaoId ||
          extrairGoogleFolderId(resultado.respostasSelecao || resultado.selecao || "");
        const entregasFolderId =
          resultado.entregasProjetoId ||
          extrairGoogleFolderId(resultado.entregasProjeto || resultado.projeto || "");

        if (respostasSelecaoFolderId && entregasFolderId) {
          try {
            const semanasAbertas = await listarSemanasAbertasFormulario(
              projetoPainel
            );
            formulariosCriados = await copiarFormulariosViaAppsScript(
              rascunho.Projeto || projetoPainel.Projeto || "Projeto",
              respostasSelecaoFolderId,
              entregasFolderId,
              personagensFormulario,
              {
                projectId: String(projetoPainel.ID || ""),
                projectType: rascunho.Tipo || projetoPainel.Tipo || "Projeto",
                mainFolderId:
                  resultado.pastaId ||
                  extrairGoogleFolderId(resultado.pasta || ""),
                formSelecao: linksAtuais.formSelecao || "",
                formEntregas: linksAtuais.formEntregas || "",
                semanasAbertas,
              }
            );
          } catch (erroForms: any) {
            erroPreparacaoFormularios =
              erroForms?.message || String(erroForms || "Erro desconhecido");
            console.error(
              "Estrutura criada, mas houve erro ao preparar os formulários:",
              erroForms
            );
          }
        }
      }

      const novosLinks = {
        ...linksAtuais,
        pasta: resultado.pasta || linksAtuais.pasta || "",
        selecao: resultado.selecao || linksAtuais.selecao || "",
        projeto: resultado.projeto || linksAtuais.projeto || "",
        finalizados: resultado.finalizados || linksAtuais.finalizados || "",
        falasTeste: resultado.falasTeste || linksAtuais.falasTeste || "",
        respostasSelecao:
          resultado.respostasSelecao || linksAtuais.respostasSelecao || "",
        cortesProjeto:
          resultado.cortesProjeto || linksAtuais.cortesProjeto || "",
        Advertencia: resultado.Advertencia,
        entregasProjeto:
          resultado.entregasProjeto || linksAtuais.entregasProjeto || "",
        formSelecao:
          resultado.formSelecao || formulariosCriados.formSelecao || linksAtuais.formSelecao || "",
        formEntregas:
          resultado.formEntregas || formulariosCriados.formEntregas || linksAtuais.formEntregas || "",
        planilhaSelecao:
          resultado.planilhaSelecao || formulariosCriados.planilhaSelecao || linksAtuais.planilhaSelecao || "",
        planilhaEntregas:
          resultado.planilhaEntregas || formulariosCriados.planilhaEntregas || linksAtuais.planilhaEntregas || "",
      };

      const projetoComLinks: Projeto = {
        ...rascunho,
        Observacoes: salvarLinksDriveEmObservacoes(
          rascunho.Observacoes,
          novosLinks
        ),
      };

      const projetoComHistorico = aplicarHistoricoAutomatico(
        projetoPainel,
        projetoComLinks,
        "criou estrutura oficial no Google Drive"
      );

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert(
          "A estrutura foi criada, mas houve erro ao salvar os links no banco."
        );
        return;
      }

      setRascunho(projetoComHistorico);
      await recarregarProjetos();
      if (erroPreparacaoFormularios) {
        alert(
          `Estrutura do Drive criada e salva, mas os formulários não foram preparados.\n\n${erroPreparacaoFormularios}\n\nUse o botão "Criar/atualizar formulários" para tentar novamente sem recriar as pastas.`
        );
      } else {
        alert("Estrutura do Drive e formulários preparados com sucesso.");
      }
    } catch (err: any) {
      console.error("Erro ao criar estrutura no Drive:", err);
      alert(
        `Erro ao criar estrutura no Drive: ${
          err?.message || String(err) || "erro desconhecido"
        }`
      );
    } finally {
      setCriandoEstruturaDrive(false);
    }
  }

  async function salvarLinksDriveComHistorico() {
    if (!rascunho || !projetoPainel) return;

    const linksAtuais = extrairLinksDrive(rascunho.Observacoes);
    const linksAntigos = extrairLinksDrive(projetoPainel.Observacoes);

    const alterados: string[] = [];

    if ((linksAtuais.pasta || "") !== (linksAntigos.pasta || "")) {
      alterados.push("Pasta Principal");
    }

    if (
      (linksAtuais.selecao || linksAtuais.videos || "") !==
      (linksAntigos.selecao || linksAntigos.videos || "")
    ) {
      alterados.push("1 | Seleção");
    }

    if (
      (linksAtuais.projeto || linksAtuais.cortes || "") !==
      (linksAntigos.projeto || linksAntigos.cortes || "")
    ) {
      alterados.push("2 | Projeto");
    }

    if ((linksAtuais.finalizados || "") !== (linksAntigos.finalizados || "")) {
      alterados.push("Finalizados");
    }

    if (alterados.length) {
      const agora = new Date().toLocaleString("pt-BR");
      const autor = usuarioLogado?.nome || "Sistema";
      const linha = `[${agora}] ${autor}: Atualizou links do Drive (${alterados.join(
        ", "
      )}).`;

      const projetoComHistorico: Projeto = aplicarHistoricoAutomatico(
        projetoPainel,
        rascunho,
        `atualizou links do Drive (${alterados.join(", ")})`
      );

      setRascunho(projetoComHistorico);

      const ok = await atualizarProjetoBanco(projetoComHistorico);

      if (!ok) {
        alert("Erro ao salvar os links no banco.");
        return;
      }

      await recarregarProjetos();
      alert("Links salvos e histórico registrado.");
      return;
    }

    await salvarAlteracoes();
  }

  function descreverAlteracoesProjeto(antes: Projeto, depois: Projeto) {
    const alteracoes: string[] = [];

    const campos: { chave: keyof Projeto; label: string }[] = [
      { chave: "Projeto", label: "nome do projeto" },
      { chave: "Tipo", label: "tipo" },
      { chave: "Genero", label: "gênero" },
      { chave: "Prioridade", label: "prioridade" },
      { chave: "Dupla", label: "dupla" },
      { chave: "Lider", label: "líder" },
      { chave: "Telefone_Lider", label: "telefone do líder" },
      { chave: "Editor", label: "editor" },
      { chave: "Telefone_Editor", label: "telefone do editor" },
      { chave: "Status", label: "status" },
      { chave: "Data_Inicio", label: "data de início" },
      { chave: "Video_Editor_Link", label: "link do vídeo do editor" },
      { chave: "Capa_URL", label: "capa do projeto" },
    ];

    campos.forEach((campo) => {
      const valorAntes = String((antes as any)[campo.chave] || "").trim();
      const valorDepois = String((depois as any)[campo.chave] || "").trim();

      if (valorAntes !== valorDepois) {
        alteracoes.push(campo.label);
      }
    });

    const nomesAntes = extrairNomesResponsaveisProjeto(antes.Observacoes);
    const nomesDepois = extrairNomesResponsaveisProjeto(depois.Observacoes);
    if (nomesAntes.lider !== nomesDepois.lider) alteracoes.push("nome do líder");
    if (nomesAntes.editor !== nomesDepois.editor) alteracoes.push("nome do editor");

    const observacoesSemResponsaveis = (valor?: string) =>
      String(valor || "")
        .replace(/\[\[RESPONSAVEIS_PROJETO\]\][\s\S]*?\[\[\/RESPONSAVEIS_PROJETO\]\]/gi, "")
        .trim();
    if (
      observacoesSemResponsaveis(antes.Observacoes) !==
      observacoesSemResponsaveis(depois.Observacoes)
    ) {
      alteracoes.push("observações/links do Drive");
    }

    const elencoAntes = (antes.Elenco || [])
      .map(
        (item) =>
          `${item.personagem}|${item.dublador}|${
            item.telefone_dublador || ""
          }|${item.funcao}`
      )
      .join(";;");

    const elencoDepois = (depois.Elenco || [])
      .map(
        (item) =>
          `${item.personagem}|${item.dublador}|${
            item.telefone_dublador || ""
          }|${item.funcao}`
      )
      .join(";;");

    if (elencoAntes !== elencoDepois) {
      alteracoes.push("elenco");
    }

    return alteracoes;
  }

  function aplicarHistoricoAutomatico(
    projetoAntes: Projeto,
    projetoDepois: Projeto,
    acaoManual?: string
  ) {
    const alteracoes = acaoManual
      ? [acaoManual]
      : descreverAlteracoesProjeto(projetoAntes, projetoDepois);

    if (!alteracoes.length) return projetoDepois;

    const agora = new Date().toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Sistema";
    const linha = `[${agora}] ${autor}: Atualizou ${alteracoes.join(", ")}.`;

    return {
      ...projetoDepois,
      Registro_Semanal: [projetoDepois.Registro_Semanal || "", linha]
        .filter(Boolean)
        .join("\n"),
    };
  }

  async function salvarAlteracoes() {
    if (!rascunho || !selecionado || !usuarioLogado) return;

    const podeEditar = podeEditarProjeto(usuarioLogado, selecionado);
    const podeVideo = podeSubirVideoEditor(usuarioLogado, selecionado);
    if (!podeEditar && !podeVideo) return;

    const liderAlterado = normalizar(rascunho.Lider || "") !== normalizar(selecionado.Lider || "");
    const editorAlterado = normalizar(rascunho.Editor || "") !== normalizar(selecionado.Editor || "");

    if (podeEditar && liderAlterado && rascunho.Lider.trim()) {
      const perfilLider = await localizarUsuarioPorEmailProjeto(rascunho.Lider);
      if (!perfilLider) {
        setErroEmailLiderEdicao(
          "Este e-mail não está cadastrado nos usuários do DubWorks Manager."
        );
        alert("O e-mail do líder precisa pertencer a um usuário cadastrado.");
        return;
      }
      setErroEmailLiderEdicao("");
    }

    if (podeEditar && editorAlterado && rascunho.Editor.trim()) {
      const perfilEditor = await localizarUsuarioPorEmailProjeto(rascunho.Editor);
      if (!perfilEditor) {
        setErroEmailEditorEdicao(
          "Este e-mail não está cadastrado nos usuários do DubWorks Manager."
        );
        alert("O e-mail do editor precisa pertencer a um usuário cadastrado.");
        return;
      }
      setErroEmailEditorEdicao("");
    }

    if (!podeEditar && podeVideo) {
      const projetoVideoBase: Projeto = {
        ...selecionado,
        Video_Editor_Link: rascunho.Video_Editor_Link || "",
        Observacoes: rascunho.Observacoes || "",
      };

      const projetoVideo = aplicarHistoricoAutomatico(
        selecionado,
        projetoVideoBase
      );

      const ok = await atualizarProjetoBanco(projetoVideo);
      if (!ok) {
        alert("Erro ao salvar no banco.");
        return;
      }

      await recarregarProjetos();
      alert("Alterações salvas com sucesso.");
      return;
    }

    const projetoFinal: Projeto = {
      ...rascunho,
      Lider:
        usuarioLogado.cargo === "lider" ||
        usuarioLogado.cargo === "lider_treinamento"
          ? usuarioLogado.login || usuarioLogado.vinculo || usuarioLogado.nome
          : rascunho.Lider,
    };

    const projetoFinalComHistorico = aplicarHistoricoAutomatico(
      selecionado,
      projetoFinal
    );

    const projetoOk = await atualizarProjetoBanco(projetoFinalComHistorico);
    if (!projetoOk) {
      alert("Erro ao salvar o projeto no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoFinalComHistorico.ID,
      projetoFinalComHistorico.Elenco.filter(
        (item) => item.personagem.trim() || item.dublador.trim()
      )
    );
    if (!elencoOk) {
      alert("Projeto salvo, mas houve erro ao salvar o elenco.");
      return;
    }

    let acessoDriveAtualizado = false;
    let avisoDrive = "";

    if (editorAlterado && projetoFinalComHistorico.Editor.trim()) {
      const linksDrive = extrairLinksDrive(projetoFinalComHistorico.Observacoes || "");
      const pastaPrincipal = linksDrive.pasta || projetoFinalComHistorico.Drive_Pasta_Link || "";

      if (pastaPrincipal) {
        try {
          acessoDriveAtualizado = await compartilharPastaDriveComUsuario(
            pastaPrincipal,
            projetoFinalComHistorico.Editor
          );
        } catch (erro) {
          console.error("Editor salvo, mas não foi possível atualizar o acesso ao Drive:", erro);
          avisoDrive =
            " O editor foi salvo no projeto, mas o acesso à pasta do Drive não pôde ser atualizado automaticamente.";
        }
      }
    }

    await recarregarProjetos();
    alert(
      acessoDriveAtualizado
        ? "Alterações salvas. O editor também recebeu acesso de edição à pasta principal do Drive."
        : `Alterações salvas com sucesso.${avisoDrive}`
    );
  }

  async function salvarElencoAtual() {
    if (!rascunho || !selecionado || !usuarioLogado) return;

    if (!podeEditarProjeto(usuarioLogado, selecionado)) {
      alert("Você não tem permissão para alterar o elenco deste projeto.");
      return;
    }

    const elencoFiltrado = (rascunho.Elenco || []).filter(
      (item) => item.personagem.trim() || item.dublador.trim()
    );

    const projetoComElenco: Projeto = {
      ...rascunho,
      Elenco: elencoFiltrado,
    };

    const projetoComHistorico = aplicarHistoricoAutomatico(
      selecionado,
      projetoComElenco,
      "atualizou o elenco"
    );

    const projetoOk = await atualizarProjetoBanco(projetoComHistorico);

    if (!projetoOk) {
      alert("Erro ao salvar o projeto no banco.");
      return;
    }

    const elencoOk = await salvarElencoProjetoBanco(
      projetoComHistorico.ID,
      projetoComHistorico.Elenco
    );

    if (!elencoOk) {
      alert("Projeto salvo, mas houve erro ao salvar o elenco.");
      return;
    }

    setRascunho(projetoComHistorico);
    await recarregarProjetos();
    alert("Elenco salvo com sucesso.");
  }

  async function criarUsuario() {
    if (!usuarioLogado || !podeGerenciarUsuarios(usuarioLogado)) return;
    if (READ_ONLY_MODE) {
      alert("Modo de teste: criação de usuário bloqueada para proteger o Supabase original.");
      return;
    }

    const permitidos = cargosPermitidosParaCriar(usuarioLogado);
    if (permitidos.indexOf(novoUsuario.cargo) === -1) {
      alert("Você não tem permissão para criar esse tipo de usuário.");
      return;
    }

    if (!novoUsuario.nome.trim() || !novoUsuario.login.trim()) {
      alert("Preencha nome e e-mail/login.");
      return;
    }

    const senhaNovoUsuario = String(novaSenhaUsuario || "");
    if (senhaNovoUsuario.length < 8) {
      alert("Defina uma senha inicial com pelo menos 8 caracteres.");
      return;
    }

    const email = novoUsuario.login.trim().toLowerCase();
    if (usuarios.some((u) => normalizar(u.login) === email)) {
      alert("Já existe um perfil com esse login.");
      return;
    }

    const perfilNovo: Usuario = {
      ...novoUsuario,
      nome: novoUsuario.nome.trim(),
      login: email,
      vinculo: novoUsuario.vinculo.trim(),
      training_status:
        novoUsuario.cargo === "lider_treinamento"
          ? novoUsuario.training_status || "em_andamento"
          : "nao_aplicavel",
      criado_por: usuarioLogado.login,
      ...permissoesDisponiveis.reduce((acc, item) => {
        acc[item.chave] = Boolean(novoUsuario[item.chave]);
        return acc;
      }, {} as Record<ChavePermissao, boolean>),
    };

    const resultado = await criarUsuarioCompletoBanco(
      perfilNovo,
      senhaNovoUsuario,
      usuarioLogado.login
    );

    if (!resultado.ok) {
      alert(resultado.error || "Não consegui criar o usuário.");
      return;
    }

    await recarregarUsuarios();
    const cargoInicial = permitidos[0] || "lider";
    setNovoUsuario({
      nome: "",
      login: "",
      cargo: cargoInicial,
      vinculo: "",
      training_status: statusPadraoPorCargo(cargoInicial),
      ...permissoesPadraoUsuario(cargoInicial),
    });
    setNovaSenhaUsuario("");

    alert(
      resultado.precisaConfirmarEmail
        ? "Usuário criado. O e-mail precisa confirmar o cadastro antes do primeiro acesso."
        : "Usuário criado com acesso ao sistema e perfil interno configurado."
    );
  }

  async function excluirUsuario(alvo: Usuario) {
    if (!usuarioLogado || !podeExcluirUsuario(usuarioLogado, alvo)) {
      alert("Você não tem permissão para excluir esse usuário.");
      return;
    }

    if (normalizar(alvo.login) === normalizar(usuarioLogado.login)) {
      alert("Você não pode excluir o próprio usuário logado.");
      return;
    }

    const confirmar = confirm(`Excluir o perfil de ${alvo.nome}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao excluir perfil:", error);
      alert("Erro ao excluir perfil.");
      return;
    }

    await recarregarUsuarios();
  }

  async function atualizarTrainingStatus(
    alvo: Usuario,
    status: TrainingStatus
  ) {
    if (!usuarioLogado || !podeGerenciarTreinamentos(usuarioLogado)) return;
    if (
      usuarioLogado.cargo === "adm_treinamento" &&
      alvo.cargo !== "lider_treinamento"
    ) {
      alert("ADM treinamento só pode alterar líderes em treinamento.");
      return;
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ training_status: status })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao atualizar treinamento:", error);
      alert("Erro ao atualizar status de treinamento.");
      return;
    }

    await recarregarUsuarios();
  }

  async function concluirTreinamento(alvo: Usuario) {
    if (!usuarioLogado || !podeGerenciarTreinamentos(usuarioLogado)) return;

    const { error } = await supabase
      .from("usuarios")
      .update({ cargo: "lider", training_status: "concluido" })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao concluir treinamento:", error);
      alert("Erro ao concluir treinamento.");
      return;
    }

    await recarregarUsuarios();
    alert("Treinamento concluído e usuário alterado para líder.");
  }

  async function alterarArquivamentoProjeto(arquivado: boolean) {
    if (!usuarioLogado || usuarioLogado.cargo !== "diretoria" || !selecionado)
      return;

    const acao = arquivado ? "arquivar" : "reativar";
    const confirmar = confirm(`Tem certeza que deseja ${acao} este projeto?`);
    if (!confirmar) return;

    const projetoComHistoricoArquivamento: Projeto = aplicarHistoricoAutomatico(
      selecionado,
      { ...selecionado, Arquivado: arquivado },
      arquivado ? "arquivou o projeto" : "reativou o projeto"
    );

    await atualizarProjetoBanco(projetoComHistoricoArquivamento);

    const ok = await atualizarArquivamentoProjetoBanco(
      selecionado.ID,
      arquivado
    );
    if (!ok) {
      alert("Não consegui alterar o status de arquivamento do projeto.");
      return;
    }

    setSelecionadoId(null);
    setRascunho(null);
    await recarregarProjetos();
    alert(arquivado ? "Projeto arquivado." : "Projeto reativado.");
  }

  function adicionarElencoNovoProjeto() {
    if (!novoElencoProjeto.personagem.trim()) {
      alert("Preencha o nome do personagem.");
      return;
    }

    setNovoProjeto((anterior) => ({
      ...anterior,
      Elenco: [
        ...anterior.Elenco,
        { ...novoElencoProjeto, id: gerarIdTemporario() },
      ],
    }));

    setNovoElencoProjeto(elencoVazio);
  }

  function removerElencoNovoProjeto(id: string) {
    setNovoProjeto((anterior) => ({
      ...anterior,
      Elenco: anterior.Elenco.filter((item) => item.id !== id),
    }));
  }

  function removerElencoRascunho(id: string) {
    if (!rascunho) return;
    setRascunho({
      ...rascunho,
      Elenco: rascunho.Elenco.filter((item) => item.id !== id),
    });
  }

  function adicionarElencoRascunho() {
    if (!rascunho) return;

    const novoItem: ElencoItem = {
      id: `novo-${Date.now()}`,
      personagem: "",
      dublador: "",
      funcao: "",
    };

    setRascunho({
      ...rascunho,
      Elenco: [...(rascunho.Elenco || []), novoItem],
    });
  }

  function atualizarElencoRascunho(
    index: number,
    campo: keyof ElencoItem,
    valor: string
  ) {
    if (!rascunho) return;

    const novoElenco = [...(rascunho.Elenco || [])];
    novoElenco[index] = {
      ...novoElenco[index],
      [campo]: valor,
    };

    setRascunho({
      ...rascunho,
      Elenco: novoElenco,
    });
  }

  async function excluirElencoRascunho(item: ElencoItem, index: number) {
    if (!rascunho) return;

    const confirmar = confirm(
      `Retirar ${item.personagem || "este personagem"} do Banco do Projeto? O histórico das semanas anteriores será preservado quando você salvar.`
    );
    if (!confirmar) return;

    const novoElenco = rascunho.Elenco.filter((_, i) => i !== index);

    setRascunho({
      ...rascunho,
      Elenco: novoElenco,
    });
  }

  async function atualizarPermissaoUsuario(
    alvo: Usuario,
    chave: ChavePermissao,
    valor: boolean
  ) {
    if (!podeGerenciarUsuarios(usuarioLogado)) return;

    if (alvo.cargo === "diretoria" && usuarioLogado?.cargo !== "diretoria") {
      alert("Somente diretoria pode alterar permissões de outra diretoria.");
      return;
    }

    // No modo TESTE SEGURO a permissão pode ser alterada visualmente para
    // validar o fluxo, mas nenhuma escrita é enviada ao Supabase original.
    if (READ_ONLY_MODE) {
      const correspondeAoAlvo = (u: Usuario) =>
        alvo.id ? u.id === alvo.id : u.login === alvo.login;

      setUsuarios((lista) =>
        lista.map((u) =>
          correspondeAoAlvo(u) ? { ...u, [chave]: valor } : u
        )
      );
      setUsuarioEdicao((atual) =>
        atual && correspondeAoAlvo(atual)
          ? { ...atual, [chave]: valor }
          : atual
      );
      return;
    }

    if (!alvo.id) {
      alert("Não foi possível identificar esse usuário no banco.");
      return;
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ [chave]: valor })
      .eq("id", alvo.id);

    if (error) {
      console.error("Erro ao atualizar permissão:", error);
      alert("Não consegui atualizar a permissão.");
      return;
    }

    setUsuarios((lista) =>
      lista.map((u) => (u.id === alvo.id ? { ...u, [chave]: valor } : u))
    );
  }

  const podeVerAdvertencias = temAcesso(
    usuarioLogado,
    "acesso_advertencias"
  );
  const podeAprovarAdvertencias = temAcesso(
    usuarioLogado,
    "acesso_aprovacao_advertencias"
  );
  const podeVerEventos = temAcesso(usuarioLogado, "acesso_eventos");
  const podeAprovarEventos = temAcesso(
    usuarioLogado,
    "acesso_aprovacao_eventos"
  );
  const podeCriarEventos = podeVerEventos || podeAprovarEventos;
  const podeVerMarketing = temAcesso(
    usuarioLogado,
    "acesso_projetos_finalizados"
  );
  const podeVerRelatorios = [
    "acesso_relatorios_projetos",
    "acesso_relatorios_elenco",
    "acesso_relatorios_membros",
    "acesso_relatorios_entrada_saida",
    "acesso_exportacoes",
  ].some((chave) => temAcesso(usuarioLogado, chave as ChavePermissao));
  const podeVerFerramentasGerais = ![
    "moderador",
    "analista_rr",
    "marketing",
    "eventos",
  ].includes(usuarioLogado?.cargo || "");

  function membroDaAdvertencia(advertencia: AdvertenciaPlanilha) {
    return (
      membros.find((membro) =>
        telefonesAdvertenciaEquivalentes(
          membro.telefone,
          advertencia.advertido_telefone
        )
      ) || null
    );
  }

  async function recarregarAdvertencias() {
    if (!podeVerAdvertencias) return;

    try {
      setCarregandoAdvertencias(true);
      setErroAdvertencias("");

      if (!membros.length) {
        await recarregarMembros();
      }

      const [resultadoPlanilha, resultadoSistema] = await Promise.allSettled([
        carregarAdvertenciasPlanilha(),
        carregarAdvertenciasInternasBanco(),
      ]);

      const listaPlanilha =
        resultadoPlanilha.status === "fulfilled" ? resultadoPlanilha.value : [];
      const listaSistema =
        resultadoSistema.status === "fulfilled" ? resultadoSistema.value : [];

      if (
        resultadoPlanilha.status === "rejected" &&
        resultadoSistema.status === "rejected"
      ) {
        throw resultadoSistema.reason || resultadoPlanilha.reason;
      }

      setAdvertencias([...listaSistema, ...listaPlanilha]);

      if (resultadoPlanilha.status === "rejected") {
        setErroAdvertencias(
          "As advertências do sistema foram carregadas, mas o histórico antigo da planilha não respondeu."
        );
      } else if (resultadoSistema.status === "rejected") {
        setErroAdvertencias(
          "O histórico antigo foi carregado. Execute o novo SQL para ativar a criação de advertências dentro do sistema."
        );
      }
    } catch (erro) {
      console.error("Erro ao carregar advertências:", erro);
      setErroAdvertencias(
        erro instanceof Error
          ? erro.message
          : "Não consegui carregar as advertências."
      );
    } finally {
      setCarregandoAdvertencias(false);
    }
  }

  function limparFormularioAdvertencia() {
    setNovaAdvertencia({
      advertido_telefone: "",
      moderador_telefone: "",
      descricao: "",
      valor: "0",
      provas: "",
      data_ocorrencia: new Date().toISOString().slice(0, 10),
    });
  }

  async function salvarNovaAdvertencia() {
    const telefoneAdvertido = novaAdvertencia.advertido_telefone.trim();
    const descricao = novaAdvertencia.descricao.trim();
    const pontos = Number(novaAdvertencia.valor || 0);

    if (!telefoneAdvertido) {
      alert("Selecione um membro ou informe o telefone do advertido.");
      return;
    }

    if (!descricao) {
      alert("Descreva o motivo e os detalhes da advertência.");
      return;
    }

    if (!novaAdvertencia.data_ocorrencia) {
      alert("Informe a data da ocorrência.");
      return;
    }

    if (!Number.isFinite(pontos) || pontos < 0) {
      alert("A pontuação deve ser um número igual ou maior que zero.");
      return;
    }

    const provas = novaAdvertencia.provas
      .split(/[\r\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      setSalvandoAdvertencia(true);

      const criada = await criarAdvertenciaInternaBanco({
        advertido_telefone: telefoneAdvertido,
        descricao,
        valor: pontos,
        provas,
        data_ocorrencia: novaAdvertencia.data_ocorrencia,
        moderador_nome: usuarioLogado?.nome || "",
        moderador_telefone: novaAdvertencia.moderador_telefone,
        criado_por_login: usuarioLogado?.login || "",
      });

      setAdvertencias((lista) => [criada, ...lista]);
      setMostrarNovaAdvertencia(false);
      limparFormularioAdvertencia();
      alert("Advertência enviada para aprovação da Diretoria.");
    } catch (erro) {
      console.error("Erro ao salvar advertência:", erro);
      alert(
        erro instanceof Error
          ? erro.message
          : "Não foi possível registrar a advertência."
      );
    } finally {
      setSalvandoAdvertencia(false);
    }
  }

  async function decidirAdvertencia(
    advertencia: AdvertenciaPlanilha,
    decisao: "aprovado" | "rejeitado"
  ) {
    if (
      !podeAprovarAdvertencias ||
      advertencia.origem !== "sistema" ||
      advertencia.status !== "pendente"
    ) {
      return;
    }

    let motivo = "";

    if (decisao === "rejeitado") {
      const resposta = prompt("Informe o motivo da rejeição:");
      if (resposta === null) return;
      motivo = resposta.trim();

      if (!motivo) {
        alert("Informe o motivo para rejeitar a advertência.");
        return;
      }
    } else if (!confirm("Aprovar esta advertência?")) {
      return;
    }

    try {
      setDecidindoAdvertenciaId(advertencia.linha);

      const atualizada = await decidirAdvertenciaInternaBanco(
        advertencia.linha,
        decisao,
        usuarioLogado?.nome || usuarioLogado?.login || "Diretoria",
        motivo
      );

      setAdvertencias((lista) =>
        lista.map((item) => (item.id === atualizada.id ? atualizada : item))
      );
      setAdvertenciaSelecionada(atualizada);
      alert(
        decisao === "aprovado"
          ? "Advertência aprovada e publicada no histórico."
          : "Advertência rejeitada."
      );
    } catch (erro) {
      console.error("Erro ao decidir advertência:", erro);
      alert(
        erro instanceof Error
          ? erro.message
          : "Não foi possível concluir a decisão."
      );
    } finally {
      setDecidindoAdvertenciaId(null);
    }
  }

  function abrirTelaAdvertencias() {
    if (!podeVerAdvertencias) {
      alert("Seu cargo não possui acesso às advertências.");
      return;
    }

    setMostrarAdvertencias(true);
    setMostrarEventos(false);
    setMostrarMarketing(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarTreinamentos(false);
    setMostrarFerramentas(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);

    void recarregarAdvertencias();
  }

  function abrirTelaTreinamentos() {
    setMostrarTreinamentos(true);
    setMostrarEventos(false);
    setMostrarMarketing(false);
    setMostrarAdvertencias(false);
    setMostrarFerramentas(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
  }

  function abrirTelaFerramentas() {
    setMostrarFerramentas(true);
    setMostrarEventos(false);
    setMostrarMarketing(false);
    setMostrarEventos(false);
    setMostrarMarketing(false);
    setCategoriaFerramentas("inicio");
    setMostrarTreinamentos(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setMostrarFormNovoUsuario(false);
    setMenuMobileAberto(false);
  }

  function abrirTelaEventos() {
    if (!podeCriarEventos) {
      alert("Seu cargo não possui acesso à Central de Eventos.");
      return;
    }

    setMostrarEventos(true);
    setMostrarMarketing(false);
    setMostrarAdvertencias(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarTreinamentos(false);
    setMostrarFerramentas(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
    setMenuMobileAberto(false);
    void carregarAgendaAtual();
  }

  function abrirTelaMarketing() {
    if (!podeVerMarketing) {
      alert("Seu cargo não possui acesso à Central de Marketing.");
      return;
    }

    setMostrarMarketing(true);
    setMostrarEventos(false);
    setMostrarAdvertencias(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarTreinamentos(false);
    setMostrarFerramentas(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
    setMenuMobileAberto(false);
  }

  function exportarProjetosCSV() {
    const cabecalhos = [
      "ID",
      "Projeto",
      "Tipo",
      "Genero",
      "Prioridade",
      "Dupla",
      "Lider",
      "Telefone_Lider",
      "Editor",
      "Telefone_Editor",
      "Status",
      "Data_Inicio",
      "Video_Editor_Link",
      "Registro_Semanal",
      "Observacoes",
      "Capa_URL",
      "Arquivado",
      "Qtd_Elenco",
    ];

    const linhas = filtrados.map((p) =>
      [
        p.ID,
        p.Projeto,
        p.Tipo,
        p.Genero,
        p.Prioridade,
        p.Dupla,
        p.Lider,
        p.Telefone_Lider,
        p.Editor,
        p.Telefone_Editor,
        p.Status,
        p.Data_Inicio,
        p.Video_Editor_Link,
        p.Registro_Semanal,
        p.Observacoes,
        p.Capa_URL,
        p.Arquivado ? "Sim" : "Não",
        String(p.Elenco.length),
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projetos_dubworks_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportarRelatorioProjetosAtivosCSV() {
    if (!projetosAtivosRelatorio.length) {
      alert("Não há projetos ativos disponíveis para exportação.");
      return;
    }

    try {
      const atividadeAtualizada = await carregarAtividadeSemanalProjetosBanco(
        projetosAtivosRelatorio
      );

      setAtividadeSemanalProjetos(atividadeAtualizada);

      const cabecalhos = [
        "ID_Projeto",
        "Projeto",
        "Status_Projeto",
        "Lider",
        "Editor",
        "Semana_Atual",
        "Status_Semana",
        "Situacao_Atual",
        "Participantes_Previstos",
        "Entregaram",
        "Nao_Entregaram",
        "Aguardando_Analise",
        "Aprovados",
        "Regravacoes",
        "Progresso_Recebimento",
        "Progresso_Aprovacao",
        "Prazo_Semana",
        "Ultima_Atividade",
        "Pendentes_Entrega",
        "Pendentes_Analise",
        "Pendentes_Regravacao",
      ];

      const porProjeto = new Map(
        atividadeAtualizada.map((item) => [String(item.projetoId), item])
      );

      const formatarDataExportacao = (valor?: string | null) => {
        if (!valor) return "";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return data.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const listarParticipantes = (
        item: AtividadeSemanalProjeto,
        status: AtividadeSemanalProjeto["participantes"][number]["status"]
      ) =>
        item.participantes
          .filter((participante) => participante.status === status)
          .map((participante) =>
            [participante.personagem, participante.dublador]
              .filter(Boolean)
              .join(" — ")
          )
          .filter(Boolean)
          .join(" | ");

      const linhas = projetosAtivosRelatorio.map((projeto) => {
        const item = porProjeto.get(String(projeto.ID));

        if (!item) {
          return [
            projeto.ID,
            projeto.Projeto,
            projeto.Status,
            projeto.Lider,
            projeto.Editor,
            "",
            "",
            "Em organização",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
            "0%",
            "0%",
            "",
            "",
            "",
            "",
            "",
          ]
            .map(escaparCSV)
            .join(";");
        }

        return [
          item.projetoId,
          item.projeto,
          item.statusProjeto,
          item.lider,
          item.editor,
          item.semana != null ? String(item.semana) : "",
          item.semanaStatus || "",
          infoSituacaoAtividadeSemanal(item.situacao).label,
          String(item.previstos),
          String(item.entregaram),
          String(item.naoEntregaram),
          String(item.pendentes),
          String(item.aprovados),
          String(item.regravacoes),
          `${item.progressoRecebimento}%`,
          `${item.progressoAprovacao}%`,
          formatarDataExportacao(item.prazoEm),
          formatarDataExportacao(item.ultimaAtividade),
          listarParticipantes(item, "nao_entregou"),
          listarParticipantes(item, "aguardando_analise"),
          listarParticipantes(item, "regravacao"),
        ]
          .map(escaparCSV)
          .join(";");
      });

      const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
      const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_projetos_ativos_dubworks_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (erro) {
      console.error("Erro ao exportar relatório dos projetos ativos:", erro);
      alert("Não foi possível montar o relatório dos projetos ativos neste momento.");
    }
  }

  function exportarElencoCSV() {
    const cabecalhos = [
      "Projeto",
      "ID_Projeto",
      "Personagem",
      "Dublador",
      "Funcao",
      "Qtd_Projetos_Dublador",
      "Qtd_Papeis_Dublador",
    ];

    const linhas: string[] = [];
    filtrados.forEach((projeto) => {
      projeto.Elenco.forEach((item) => {
        const ranking = rankingDubladores.find(
          (r) => normalizar(r.nome) === normalizar(item.dublador)
        );

        linhas.push(
          [
            projeto.Projeto,
            projeto.ID,
            item.personagem,
            item.dublador,
            item.funcao,
            String(ranking?.totalProjetos || 0),
            String(ranking?.totalPapeis || 0),
          ]
            .map(escaparCSV)
            .join(";")
        );
      });
    });

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elenco_dubworks_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function carregarStatusWhatsappBridge(mostrarErro = false) {
    if (carregandoWhatsappBridge) return;
    setCarregandoWhatsappBridge(true);
    try {
      const controlador = new AbortController();
      const timeout = window.setTimeout(() => controlador.abort(), 5000);
      const resposta = await fetch(`${WHATSAPP_BRIDGE_URL}/api/status`, {
        signal: controlador.signal,
        cache: "no-store",
      });
      window.clearTimeout(timeout);
      const json = await resposta.json();
      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.error || "Bridge do WhatsApp indisponível.");
      }
      const estado = String(json.whatsapp?.state || "desconhecido");
      setWhatsappBridge({
        state: estado,
        detail: String(json.whatsapp?.detail || ""),
        qr_data_url: String(json.whatsapp?.qr_data_url || ""),
        numero: String(json.whatsapp?.numero || ""),
      });
      return estado;
    } catch (error: any) {
      const detail =
        error?.name === "AbortError"
          ? "O bridge do WhatsApp não respondeu a tempo."
          : "Bridge local do WhatsApp não está rodando. Abra o INICIAR-WHATSAPP.cmd.";
      setWhatsappBridge({ state: "offline", detail });
      if (mostrarErro) alert(detail);
      return "offline";
    } finally {
      setCarregandoWhatsappBridge(false);
    }
  }

  function salvarMensagensBaseWhatsapp() {
    try {
      window.localStorage.setItem(WHATSAPP_MSG_01_KEY, mensagemWhatsapp01);
      window.localStorage.setItem(WHATSAPP_MSG_02_KEY, mensagemWhatsapp02);
      alert("Mensagens-base do WhatsApp salvas neste computador.");
    } catch {
      alert("Não consegui salvar as mensagens-base neste navegador.");
    }
  }

  function aplicarTemplateWhatsapp(template: string, membro: Membro) {
    const ator = atorAtualMembro();
    const valores: Record<string, string> = {
      nome: membro.nome || "[NOME DA PESSOA]",
      responsavel: ator.nome || "[RESPONSÁVEL]",
      cargo: ator.cargo || "[CARGO]",
    };

    return String(template || "").replace(
      /\{(nome|responsavel|cargo)\}/g,
      (_, chave: string) => valores[chave] || ""
    );
  }

  async function enviarChamadaWhatsapp(membro: Membro) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;
    if (!WHATSAPP_SEND_ENABLED) {
      alert("Modo de teste: o envio real pelo WhatsApp está desativado. A prévia e a conexão podem ser testadas sem enviar mensagem.");
      return;
    }
    if (enviandoWhatsappMembroId) return;

    const telefone = String(membro.telefone || "").trim();
    if (!telefone) {
      alert("Este membro não possui número de WhatsApp cadastrado.");
      return;
    }

    const template = tipoMensagemWhatsapp === "01" ? mensagemWhatsapp01 : mensagemWhatsapp02;
    const mensagem = aplicarTemplateWhatsapp(template, membro).trim();
    if (!mensagem) {
      alert("A mensagem-base selecionada está vazia.");
      return;
    }

    if (whatsappBridge.state !== "pronto") {
      await carregarStatusWhatsappBridge(true);
      return;
    }

    const confirmarEnvio = window.confirm(
      `Enviar a mensagem ${tipoMensagemWhatsapp} para ${membro.nome || telefone}?\n\n` +
        `Ao confirmar o envio, o atendimento será atualizado automaticamente para ${tipoMensagemWhatsapp}.`
    );
    if (!confirmarEnvio) return;

    setEnviandoWhatsappMembroId(membro.id);
    try {
      const resposta = await fetch(`${WHATSAPP_BRIDGE_URL}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone, mensagem }),
      });
      const json = await resposta.json();
      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.error || "Falha ao enviar pelo WhatsApp.");
      }

      const sincronizado = await alterarAtendimentoMembro(
        membro,
        tipoMensagemWhatsapp as AtendimentoMembro
      );

      if (sincronizado) {
        alert(
          `Mensagem ${tipoMensagemWhatsapp} enviada para ${membro.nome || telefone} e atendimento sincronizado com a ficha.`
        );
      } else {
        alert(
          `A mensagem foi enviada pelo WhatsApp, mas não consegui sincronizar o status ${tipoMensagemWhatsapp} com a planilha.`
        );
      }
    } catch (error: any) {
      const detalhe = String(error?.message || error);
      await alterarAtendimentoMembro(membro, "erro");
      alert(`Não consegui enviar a mensagem pelo WhatsApp: ${detalhe}`);
    } finally {
      setEnviandoWhatsappMembroId(null);
      void carregarStatusWhatsappBridge(false);
    }
  }

  function segundosFilaWhatsappAleatorios() {
    const intervalo = WHATSAPP_QUEUE_MAX_SECONDS - WHATSAPP_QUEUE_MIN_SECONDS + 1;
    return Math.floor(Math.random() * intervalo) + WHATSAPP_QUEUE_MIN_SECONDS;
  }

  function formatarEsperaFilaWhatsapp(segundos: number | null) {
    if (segundos === null) return "";
    if (segundos < 60) return `${segundos}s`;
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return resto ? `${minutos}min ${resto}s` : `${minutos}min`;
  }

  async function aguardarIntervaloFilaWhatsapp(segundos: number) {
    let restante = segundos;
    setFilaWhatsappProximoEm(restante);
    while (restante > 0) {
      if (filaWhatsappCancelarRef.current) {
        setFilaWhatsappProximoEm(null);
        return false;
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
      restante -= 1;
      setFilaWhatsappProximoEm(restante);
    }
    setFilaWhatsappProximoEm(null);
    return !filaWhatsappCancelarRef.current;
  }

  function pararFilaChamadasWhatsapp() {
    filaWhatsappCancelarRef.current = true;
    setFilaWhatsappAtual("Parando fila após o intervalo atual...");
  }

  async function iniciarFilaChamadasWhatsapp() {
    if (!podeGerenciarMembros(usuarioLogado) || filaWhatsappAtiva) return;
    if (!WHATSAPP_SEND_ENABLED) {
      alert("Modo de teste: a fila real de WhatsApp está desativada para evitar envios durante os testes.");
      return;
    }

    const pendentes = membros.filter((membro) => {
      const atendimento = String(membro.atendimento || "chamar").toLowerCase();
      const telefone = String(membro.telefone || "").replace(/\D/g, "");
      return atendimento === "chamar" && telefone.length >= 10;
    });
    const semTelefone = membros.filter((membro) => {
      const atendimento = String(membro.atendimento || "chamar").toLowerCase();
      const telefone = String(membro.telefone || "").replace(/\D/g, "");
      return atendimento === "chamar" && telefone.length < 10;
    }).length;

    if (!pendentes.length) {
      alert(
        semTelefone
          ? `Não há fichas em Chamar com WhatsApp válido. Existem ${semTelefone} ficha(s) sem telefone válido.`
          : "Não há membros com Atendimento = Chamar."
      );
      return;
    }

    const estado =
      whatsappBridge.state === "pronto"
        ? "pronto"
        : await carregarStatusWhatsappBridge(true);
    if (estado !== "pronto") return;

    const confirmar = window.confirm(
      `Iniciar a fila de WhatsApp para ${pendentes.length} membro(s) com Atendimento = Chamar?\n\n` +
        `Será usada a Mensagem 01. Antes de cada envio o sistema aguardará um tempo aleatório entre ${WHATSAPP_QUEUE_MIN_SECONDS} segundos e 5 minutos.\n\n` +
        `Mantenha esta página aberta enquanto a fila estiver rodando.${semTelefone ? `\n\n${semTelefone} ficha(s) sem telefone válido serão ignoradas.` : ""}`
    );
    if (!confirmar) return;

    filaWhatsappCancelarRef.current = false;
    setFilaWhatsappAtiva(true);
    setFilaWhatsappTotal(pendentes.length);
    setFilaWhatsappProcessados(0);
    setFilaWhatsappResumo("");

    let enviados = 0;
    let erros = 0;
    let processados = 0;

    try {
      for (const membro of pendentes) {
        if (filaWhatsappCancelarRef.current) break;

        const espera = segundosFilaWhatsappAleatorios();
        setFilaWhatsappAtual(`Próximo: ${membro.nome || membro.telefone || "membro"}`);
        const continuar = await aguardarIntervaloFilaWhatsapp(espera);
        if (!continuar) break;

        const telefone = String(membro.telefone || "").trim();
        const mensagem = aplicarTemplateWhatsapp(mensagemWhatsapp01, membro).trim();
        setEnviandoWhatsappMembroId(membro.id || null);
        setFilaWhatsappAtual(`Enviando para ${membro.nome || telefone}...`);

        try {
          const resposta = await fetch(`${WHATSAPP_BRIDGE_URL}/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone, mensagem }),
          });
          const json = await resposta.json();
          if (!resposta.ok || !json?.ok) {
            throw new Error(json?.error || "Falha ao enviar pelo WhatsApp.");
          }

          const sincronizado = await alterarAtendimentoMembro(membro, "01");
          if (sincronizado) {
            enviados += 1;
          } else {
            erros += 1;
            await alterarAtendimentoMembro(membro, "erro");
          }
        } catch {
          erros += 1;
          await alterarAtendimentoMembro(membro, "erro");
        } finally {
          processados += 1;
          setFilaWhatsappProcessados(processados);
          setEnviandoWhatsappMembroId(null);
        }
      }
    } finally {
      const cancelada = filaWhatsappCancelarRef.current;
      setFilaWhatsappAtiva(false);
      setFilaWhatsappProximoEm(null);
      setFilaWhatsappAtual("");
      setEnviandoWhatsappMembroId(null);
      filaWhatsappCancelarRef.current = false;
      const resumo = `${cancelada ? "Fila interrompida" : "Fila finalizada"}: ${enviados} enviado(s), ${erros} erro(s), ${processados}/${pendentes.length} processado(s).`;
      setFilaWhatsappResumo(resumo);
      void carregarStatusWhatsappBridge(false);
      alert(resumo);
    }
  }

  function atorAtualMembro() {
    return {
      nome: usuarioLogado?.nome || usuarioLogado?.login || "DubWorks Manager",
      cargo: usuarioLogado ? cargoLabel(usuarioLogado.cargo) : "",
    };
  }

  async function recarregarHistoricoMembro(membroId: number) {
    setCarregandoHistoricoMembro(true);
    try {
      const eventos = await carregarHistoricoMembroPlanilha(membroId);
      setHistoricoMembroSelecionado(eventos);
    } finally {
      setCarregandoHistoricoMembro(false);
    }
  }

  async function selecionarMembroTabela(membro: Membro) {
    if (!membro.id) return;
    if (membroSelecionadoId === membro.id) {
      setMembroSelecionadoId(null);
      setMembroEmEdicaoId(null);
      setRascunhoMembroEdicao(null);
      setHistoricoMembroSelecionado([]);
      return;
    }

    setMembroSelecionadoId(membro.id);
    setMembroEmEdicaoId(null);
    setRascunhoMembroEdicao(null);
    setHistoricoMembroSelecionado([]);
    await recarregarHistoricoMembro(membro.id);
  }

  function iniciarEdicaoMembro(membro: Membro) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;
    setMembroEmEdicaoId(membro.id);
    setRascunhoMembroEdicao({ ...membro });
  }

  function cancelarEdicaoMembro() {
    setMembroEmEdicaoId(null);
    setRascunhoMembroEdicao(null);
  }

  async function salvarEdicaoMembro(membro: Membro) {
    if (!membro.id || !rascunhoMembroEdicao || !podeGerenciarMembros(usuarioLogado)) return;

    const rascunho = rascunhoMembroEdicao;
    const alteracoes: Record<string, string | null> = {};

    if (String(membro.nome || "") !== String(rascunho.nome || "")) {
      alteracoes.nome = String(rascunho.nome || "") || null;
    }
    if (String(membro.telefone || "") !== String(rascunho.telefone || "")) {
      alteracoes.telefone = String(rascunho.telefone || "") || null;
    }
    if (String(membro.observacao || "") !== String(rascunho.observacao || "")) {
      alteracoes.observacao = String(rascunho.observacao || "") || null;
    }

    if (!Object.keys(alteracoes).length) {
      cancelarEdicaoMembro();
      return;
    }

    setSalvandoEdicaoMembro(true);
    try {
      // Uma única chamada para a planilha, mesmo quando nome, telefone e
      // observação foram alterados juntos.
      const ok = await atualizarMembroCamposPlanilha(
        membro.id,
        alteracoes,
        atorAtualMembro()
      );

      if (!ok) {
        alert("Não consegui salvar as alterações na planilha.");
        return;
      }

      setMembros((lista) =>
        lista.map((item) =>
          item.id === membro.id ? { ...item, ...alteracoes } as Membro : item
        )
      );
      cancelarEdicaoMembro();
      if (membroSelecionadoId === membro.id) {
        await recarregarHistoricoMembro(membro.id);
      }
    } finally {
      setSalvandoEdicaoMembro(false);
    }
  }

  async function alterarStatusMembro(membro: Membro, status: StatusMembro) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;
    if (membro.status === status) return;

    const confirmar = confirm(
      `Alterar a participação de ${membro.nome} para "${statusMembroLabel(status)}"?`
    );
    if (!confirmar) return;

    const statusAnterior = membro.status;
    const hoje = new Date().toISOString().slice(0, 10);

    // Atualiza a tela imediatamente. Não faz uma nova leitura das 600+ linhas.
    setMembros((lista) =>
      lista.map((item) => {
        if (item.id !== membro.id) return item;
        const atualizado: Membro = { ...item, status };
        if (status === "na_comunidade") {
          atualizado.data_entrada = hoje;
          atualizado.data_saida = null;
        } else if (status === "saiu" || status === "banido") {
          atualizado.data_saida = hoje;
        }
        return atualizado;
      })
    );

    const ok = await atualizarStatusMembroBanco(
      membro.id,
      status,
      atorAtualMembro()
    );

    if (!ok) {
      // Se a gravação falhar, volta o status visual anterior para não criar
      // divergência silenciosa entre o Manager e a planilha.
      setMembros((lista) =>
        lista.map((item) =>
          item.id === membro.id ? { ...item, status: statusAnterior } : item
        )
      );
      alert("Não consegui atualizar a participação do membro.");
      return;
    }

    if (membroSelecionadoId === membro.id) {
      const titulo =
        status === "banido"
          ? "Foi banido da comunidade"
          : status === "saiu"
          ? "Saiu da comunidade"
          : status === "somente_canais"
          ? "Passou a participar apenas pelos canais"
          : status === "pausado"
          ? "Participação pausada"
          : status === "na_comunidade"
          ? ["saiu", "banido", "somente_canais", "pausado"].includes(statusAnterior)
            ? "Retornou para a comunidade"
            : "Entrou na comunidade"
          : "Participação atualizada";
      setHistoricoMembroSelecionado((eventos) => [
        {
          id: `local-participacao-${Date.now()}`,
          data: new Date().toISOString(),
          tipo: "participacao",
          titulo,
          valor_anterior: statusMembroLabel(statusAnterior),
          valor_novo: statusMembroLabel(status),
          usuario: atorAtualMembro().nome,
          cargo: atorAtualMembro().cargo,
        },
        ...eventos,
      ]);
    }
  }

  async function alterarAtendimentoMembro(
    membro: Membro,
    atendimento: AtendimentoMembro
  ): Promise<boolean> {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return false;
    const atendimentoAnterior = String(membro.atendimento || "chamar") as AtendimentoMembro;
    if (atendimentoAnterior === atendimento) return true;

    // Resposta imediata na interface; a gravação na planilha acontece com
    // apenas uma chamada e sem recarregar toda a lista em seguida.
    setMembros((lista) =>
      lista.map((item) =>
        item.id === membro.id ? { ...item, atendimento } : item
      )
    );

    const ok = await atualizarAtendimentoMembroBanco(
      membro.id,
      atendimento,
      atorAtualMembro()
    );

    if (!ok) {
      setMembros((lista) =>
        lista.map((item) =>
          item.id === membro.id ? { ...item, atendimento: atendimentoAnterior } : item
        )
      );
      alert("Não consegui atualizar o atendimento do membro.");
      return false;
    }

    if (membroSelecionadoId === membro.id) {
      const titulo =
        atendimento === "01"
          ? "Atendimento avançou para 1"
          : atendimento === "02"
          ? "Atendimento avançou para 2"
          : atendimento === "concluido"
          ? "Atendimento concluído"
          : atendimento === "erro"
          ? "Atendimento marcado com erro"
          : "Marcado para chamar";
      setHistoricoMembroSelecionado((eventos) => [
        {
          id: `local-atendimento-${Date.now()}`,
          data: new Date().toISOString(),
          tipo: "atendimento",
          titulo,
          valor_anterior: atendimentoMembroLabel(atendimentoAnterior),
          valor_novo: atendimentoMembroLabel(atendimento),
          usuario: atorAtualMembro().nome,
          cargo: atorAtualMembro().cargo,
        },
        ...eventos,
      ]);
    }
    return true;
  }

  async function atualizarMembroCampo(
    membro: Membro,
    campo:
      | "nome"
      | "telefone"
      | "data_entrada"
      | "data_saida"
      | "observacao"
      | "movimentacao",
    valor: string
  ) {
    if (!membro.id || !podeGerenciarMembros(usuarioLogado)) return;

    const atual = String((membro as any)[campo] || "");
    if (atual === String(valor || "")) return;

    const ok = await atualizarMembroCampoPlanilha(
      membro.id,
      campo,
      valor || null,
      atorAtualMembro()
    );

    if (!ok) {
      alert("Não consegui atualizar o membro na planilha.");
      return;
    }

    setMembros((lista) =>
      lista.map((item) =>
        item.id === membro.id ? { ...item, [campo]: valor || null } : item
      )
    );
  }

  function exportarMembrosCSV() {
    const cabecalhos = [
      "Nome",
      "Telefone",
      "Email",
      "Idade",
      "Data_Entrada",
      "Status",
      "Data_Saida",
      "Habilidades",
      "Observacao",
    ];

    const linhas = membrosFiltrados.map((m) =>
      [
        m.nome,
        m.telefone,
        m.email,
        String(m.idade || ""),
        formatarDataBR(m.data_entrada),
        statusMembroLabel(m.status),
        formatarDataBR(m.data_saida),
        m.habilidades || "",
        m.observacao || "",
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membros_dubworks_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function baixarBackupMembrosJSON() {
    const pacote = {
      versao: 1,
      origem: "DubWorks Manager - Central de Membros",
      gerado_em: new Date().toISOString(),
      total: membros.length,
      membros,
    };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_membros_dubworks_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarRelatorioEntradaSaidaCSV() {
    const cabecalhos = [
      "Mês",
      "Total inicial",
      "Entradas",
      "Saídas",
      "Crescimento",
      "Total final",
    ];

    const linhas = relatorioEntradaSaida.map((r) =>
      [
        r.mesLabel,
        String(r.totalInicial),
        String(r.entradas),
        String(r.saidas),
        String(r.crescimento),
        String(r.totalFinal),
      ]
        .map(escaparCSV)
        .join(";")
    );

    const conteudo = "\uFEFF" + [cabecalhos.join(";"), ...linhas].join("\n");
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_entrada_saida_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!usuarioLogado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 18% 68%, rgba(37, 99, 235, 0.45), transparent 22%), radial-gradient(circle at 75% 28%, rgba(14, 165, 233, 0.36), transparent 24%), linear-gradient(135deg, #020617 0%, #111827 48%, #07152f 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? 18 : 24,
          fontFamily: "Arial, sans-serif",
          color: "#f8fafc",
        }}
      >
        <style>{estilosAnimacao}</style>

        <div
          style={{
            position: "absolute",
            width: isMobile ? 170 : 260,
            height: isMobile ? 170 : 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 68% 26%, #7dd3fc 0%, #1d4ed8 34%, #020617 82%)",
            top: isMobile ? 18 : 38,
            left: isMobile ? "54%" : "50%",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 0 46px rgba(59, 130, 246, 0.55))",
            animation: "dwFloat 7s ease-in-out infinite",
            opacity: 0.98,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: isMobile ? 150 : 230,
            height: isMobile ? 150 : 230,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 70% 28%, #38bdf8 0%, #2563eb 38%, #050816 84%)",
            right: isMobile ? -70 : "12%",
            top: isMobile ? 170 : "29%",
            filter: "drop-shadow(0 0 42px rgba(59, 130, 246, 0.45))",
            animation: "dwFloat 8s ease-in-out infinite reverse",
            opacity: 0.82,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: isMobile ? 170 : 260,
            height: isMobile ? 170 : 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 70% 28%, #60a5fa 0%, #1d4ed8 36%, #020617 86%)",
            left: isMobile ? -92 : "12%",
            bottom: isMobile ? 74 : "14%",
            filter: "drop-shadow(0 0 42px rgba(37, 99, 235, 0.45))",
            animation: "dwFloat 9s ease-in-out infinite",
            opacity: 0.78,
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: isMobile ? "100%" : 620,
            padding: isMobile ? "82px 20px 24px" : "92px 58px 42px",
            borderRadius: isMobile ? 30 : 34,
            border: "1px solid rgba(191, 219, 254, 0.42)",
            background:
              "linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(30, 41, 59, 0.52))",
            backdropFilter: "blur(18px)",
            boxShadow:
              "0 34px 110px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 70px rgba(37, 99, 235, 0.18)",
            overflow: "hidden",
            animation: "dwFadeUp .65s ease both",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.10), transparent)",
              animation: "dwScan 5.6s linear infinite",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <img
              src={LOGO_URL}
              alt="DubWorks"
              style={{
                width: isMobile ? 122 : 152,
                height: "auto",
                display: "block",
                margin: "0 auto 20px",
                filter: "drop-shadow(0 0 18px rgba(96, 165, 250, 0.32))",
              }}
            />

            <div
              style={{
                textAlign: "center",
                letterSpacing: 3,
                fontSize: isMobile ? 15 : 17,
                color: "#93c5fd",
                fontWeight: 800,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Acesso interno
            </div>

            <h1
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: isMobile ? 30 : 40,
                lineHeight: 1.05,
                color: "#f8fafc",
                textShadow: "0 0 28px rgba(59, 130, 246, 0.30)",
              }}
            >
              DubWorks Manager
            </h1>

            <p
              style={{
                textAlign: "center",
                marginTop: 10,
                marginBottom: isMobile ? 22 : 30,
                color: "#cbd5e1",
                fontSize: isMobile ? 14 : 15,
              }}
            >
              Central tecnológica de gerenciamento da DubWorks
            </p>

            <form onSubmit={fazerLogin}>
              <label style={{ ...labelStyle, color: "#cbd5e1" }}>E-mail</label>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu e-mail"
                style={{
                  ...inputStyle,
                  marginBottom: 16,
                  background: "rgba(15, 23, 42, 0.72)",
                  border: "1px solid rgba(147, 197, 253, 0.32)",
                  color: "#f8fafc",
                  boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.05)",
                }}
              />

              <label style={{ ...labelStyle, color: "#cbd5e1" }}>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                style={{
                  ...inputStyle,
                  marginBottom: 16,
                  background: "rgba(15, 23, 42, 0.72)",
                  border: "1px solid rgba(147, 197, 253, 0.32)",
                  color: "#f8fafc",
                  boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.05)",
                }}
              />

              {erroLogin && (
                <div
                  style={{
                    background: "rgba(127, 29, 29, 0.35)",
                    color: "#fecaca",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  {erroLogin}
                </div>
              )}

              <button
                type="submit"
                disabled={carregandoLogin}
                style={{
                  ...botaoPrimarioStyleGrande,
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
                  boxShadow:
                    "0 18px 40px rgba(37, 99, 235, 0.38), 0 0 24px rgba(14, 165, 233, 0.22)",
                  letterSpacing: 0.4,
                }}
              >
                {carregandoLogin ? "Entrando..." : "Entrar no sistema"}
              </button>

              <button
                type="button"
                onClick={enviarRecuperacaoSenha}
                style={{
                  marginTop: 14,
                  background: "transparent",
                  border: "none",
                  color: "#93c5fd",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                  padding: 10,
                }}
              >
                Esqueci minha senha
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const telaAtual = mostrarFerramentas
    ? "ferramentas"
    : mostrarTreinamentos
    ? "treinamentos"
    : mostrarAdvertencias
    ? "advertencias"
    : mostrarEventos
    ? "eventos"
    : mostrarMarketing
    ? "marketing"
    : mostrarMembros
    ? "membros"
    : mostrarUsuarios
    ? "usuarios"
    : mostrarRelatorios
    ? "relatorios"
    : usuarioLogado?.cargo === "marketing"
    ? "marketing"
    : usuarioLogado?.cargo === "analista_rr"
    ? "membros"
    : usuarioLogado?.cargo === "moderador"
    ? "advertencias"
    : usuarioLogado?.cargo === "eventos"
    ? "eventos"
    : "projetos";
  const projetoDrive = rascunho || projetoPainel;
  const driveSalvo = extrairLinksDrive(projetoDrive?.Observacoes);

  const observacoesVisiveis = (projetoPainel?.Observacoes || "")
    .replace(/\[\[DRIVE_LINKS\]\][\s\S]*?\[\[\/DRIVE_LINKS\]\]/g, "")
    .replace(/\[\[RESPONSAVEIS_PROJETO\]\][\s\S]*?\[\[\/RESPONSAVEIS_PROJETO\]\]/gi, "")
    .replace(/\[\[CATEGORIA_PROJETO\]\][\s\S]*?\[\[\/CATEGORIA_PROJETO\]\]/gi, "")
    .trim();

  const driveLinks: {
    chave: "pasta" | "selecao" | "projeto" | "finalizados";
    titulo: string;
    descricao: string;
    icone: string;
    cor: string;
    link: string;
  }[] = [
    {
      chave: "pasta",
      titulo: "Pasta Principal",
      descricao: "Pasta principal do projeto com toda a estrutura oficial.",
      icone: "📁",
      cor: "#2563eb",
      link: driveSalvo.pasta || "",
    },
    {
      chave: "selecao",
      titulo: "1 | Seleção",
      descricao:
        "Falas teste, formulário de seleção, testes enviados e resultado.",
      icone: "🎙️",
      cor: "#7c3aed",
      link: driveSalvo.selecao || driveSalvo.videos || "",
    },
    {
      chave: "projeto",
      titulo: "2 | Projeto",
      descricao:
        "Cortes, cenas, áudios recebidos, edição e materiais em andamento.",
      icone: "🧩",
      cor: "#16a34a",
      link: driveSalvo.projeto || driveSalvo.cortes || "",
    },
    {
      chave: "finalizados",
      titulo: "3 | Finalizado",
      descricao:
        "Vídeo final, créditos, thumbs, capas, renders e arquivos concluídos.",
      icone: "🎬",
      cor: "#f97316",
      link: driveSalvo.finalizados || "",
    },
  ];

  const historicoProjetoDemo = [
    {
      usuario: "Sistema",
      acao: "alterou o link da pasta principal",
      data: "Hoje, 14:20",
    },
    {
      usuario: "Sistema",
      acao: "incluiu um novo teste de vídeo",
      data: "Hoje, 13:05",
    },
    {
      usuario: usuarioLogado?.nome || "Sistema",
      acao: "atualizou as informações do projeto",
      data: "Ontem, 18:42",
    },
  ];

  // TODO SUPABASE:
  // Estas notificações deverão ser geradas automaticamente
  // com base nas ações reais dos usuários.
  // Exemplo:
  // criar projeto, alterar link, enviar relatório, adicionar elenco etc.

  const notificacoesProjeto = projetoPainel
    ? [
        {
          usuario: usuarioLogado?.nome || "Sistema",
          acao: `acessou/atualizou o projeto ${projetoPainel.Projeto}`,
          data: new Date().toLocaleString("pt-BR"),
          tipo: "Projeto",
          projetoId: projetoPainel.ID,
          lider: projetoPainel.Lider,
          editor: projetoPainel.Editor,
        },
      ].filter((notificacao) => {
        if (!usuarioLogado || !projetoPainel) return false;

        if (
          usuarioLogado.cargo === "diretoria" ||
          usuarioLogado.cargo === "adm"
        ) {
          return notificacao.projetoId === projetoPainel.ID;
        }

        const vinculo = normalizar(
          usuarioLogado.login || usuarioLogado.vinculo || usuarioLogado.nome || usuarioLogado.login
        );

        if (
          usuarioLogado.cargo === "lider" ||
          usuarioLogado.cargo === "lider_treinamento"
        ) {
          return (
            notificacao.projetoId === projetoPainel.ID &&
            normalizar(notificacao.lider) === vinculo
          );
        }

        if (usuarioLogado.cargo === "editor") {
          return (
            notificacao.projetoId === projetoPainel.ID &&
            normalizar(notificacao.editor) === vinculo
          );
        }

        return false;
      })
    : [];

  function abrirLink(link?: string) {
    if (!link) {
      alert("Link ainda não cadastrado.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function cargoMembro(membro: Membro | null) {
    if (!membro) return "Membro";
    const alvo = normalizar(membro.email || membro.nome);
    const perfil = usuarios.find(
      (u) =>
        normalizar(u.login) === alvo ||
        normalizar(u.nome) === normalizar(membro.nome)
    );
    return perfil ? cargoLabel(perfil.cargo) : "Membro";
  }

  async function salvarRegistroSemanalProjeto() {
    if (!projetoPainel || !registroSemanalTexto.trim()) {
      alert("Selecione um projeto e escreva o registro semanal.");
      return;
    }

    const agora = new Date();
    const carimbo = agora.toLocaleString("pt-BR");
    const autor = usuarioLogado?.nome || "Usuário";
    const novoRegistro = `[${carimbo}] ${autor}: ${registroSemanalTexto.trim()}`;
    const registroAnterior = projetoPainel.Registro_Semanal || "";
    const projetoAtualizado: Projeto = {
      ...projetoPainel,
      Registro_Semanal: [novoRegistro, registroAnterior]
        .filter(Boolean)
        .join("\n\n"),
    };

    const ok = await atualizarProjetoBanco(projetoAtualizado);
    if (!ok) {
      alert("Não consegui salvar o registro semanal.");
      return;
    }

    setRegistroSemanalTexto("");
    await recarregarProjetos();
    alert("Registro semanal salvo com data e hora.");
  }

  async function carregarItensRelatorioSemana(
    projeto: Projeto,
    semana: number
  ) {
    const participantes = await carregarParticipantesSemanaBanco(
      projeto.ID,
      semana
    );

    const entregasSemana = entregasProducao
      .filter((entrega) => numeroSemanaEntrega(entrega.semana) === semana)
      .slice()
      .sort((a, b) => {
        const dataA = Math.max(
          a.data_avaliacao ? new Date(a.data_avaliacao).getTime() : 0,
          a.data_envio ? new Date(a.data_envio).getTime() : 0
        );
        const dataB = Math.max(
          b.data_avaliacao ? new Date(b.data_avaliacao).getTime() : 0,
          b.data_envio ? new Date(b.data_envio).getTime() : 0
        );
        return dataB - dataA;
      });

    const telefoneLimpo = (valor?: string | null) =>
      String(valor || "").replace(/\D/g, "");

    setItensRelatorioProjeto(
      participantes.map((item) => {
        const telefone = telefoneLimpo(item.telefone_dublador);
        const entrega = entregasSemana.find((candidata) => {
          const telefoneEntrega = telefoneLimpo(candidata.telefone);
          if (
            normalizar(candidata.personagem) !== normalizar(item.personagem)
          ) {
            return false;
          }
          if (telefone && telefoneEntrega && telefone === telefoneEntrega) return true;
          return normalizar(candidata.dublador) === normalizar(item.dublador);
        });

        const status: StatusItemRelatorioProjeto = !entrega
          ? "nao_entregou"
          : entrega.status === "aprovado"
          ? "aprovado"
          : entrega.status === "regravacao"
          ? "regravacao"
          : "aguardando_analise";

        return {
          personagem: item.personagem || "",
          dublador: item.dublador || "",
          telefone: item.telefone_dublador || "",
          status,
          observacao: entrega?.comentario || "",
        };
      })
    );
  }

  function atualizarItemRelatorioProjeto(
    indice: number,
    alteracao: Partial<ItemRelatorioProjeto>
  ) {
    setItensRelatorioProjeto((lista) =>
      lista.map((item, i) => (i === indice ? { ...item, ...alteracao } : item))
    );
  }

  function limparFormularioRelatorioProjeto() {
    setAndamentoRelatorioProjeto("");
    setDificuldadesRelatorioProjeto("");
    setSuporteRelatorioProjeto("");
    setObservacoesRelatorioProjeto("");
    setMaterialNomeRelatorioProjeto("");
    setMaterialLinkRelatorioProjeto("");
    setMaterialObservacaoRelatorioProjeto("");
  }

  async function salvarRelatorioProjetoAtual() {
    if (!projetoPainel || salvandoRelatorioProjeto) return;

    if (tipoRelatorioProjeto === "semanal" && !semanaRelatorioProjeto) {
      alert("Selecione a semana do relatório.");
      return;
    }

    if (tipoRelatorioProjeto === "material" && !materialNomeRelatorioProjeto.trim()) {
      alert("Informe qual material/episódio foi concluído.");
      return;
    }

    const relatorio: RelatorioProjetoEstruturado = {
      id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tipo: tipoRelatorioProjeto,
      projetoId: projetoPainel.ID,
      criadoEm: new Date().toISOString(),
      criadoPor: usuarioLogado?.nome || usuarioLogado?.login || "Sistema",
      ...(tipoRelatorioProjeto === "semanal"
        ? {
            semana: semanaRelatorioProjeto,
            andamento: andamentoRelatorioProjeto.trim(),
            dificuldades: dificuldadesRelatorioProjeto.trim(),
            suporte: suporteRelatorioProjeto.trim(),
            observacoes: observacoesRelatorioProjeto.trim(),
            itens: itensRelatorioProjeto,
          }
        : {
            materialNome: materialNomeRelatorioProjeto.trim(),
            materialLink: materialLinkRelatorioProjeto.trim(),
            materialObservacao: materialObservacaoRelatorioProjeto.trim(),
          }),
    };

    const linhaRelatorio = `${RELATORIO_PROJETO_PREFIXO}${JSON.stringify(relatorio)}`;
    const registroAtual = projetoPainel.Registro_Semanal || "";
    const projetoAtualizado: Projeto = {
      ...projetoPainel,
      Registro_Semanal: [linhaRelatorio, registroAtual].filter(Boolean).join("\n"),
    };

    try {
      setSalvandoRelatorioProjeto(true);
      const ok = await atualizarProjetoBanco(projetoAtualizado);
      if (!ok) {
        alert("Não consegui salvar o relatório.");
        return;
      }

      limparFormularioRelatorioProjeto();
      await recarregarProjetos();
      alert(
        tipoRelatorioProjeto === "semanal"
          ? "Relatório semanal salvo."
          : "Material concluído registrado."
      );
    } finally {
      setSalvandoRelatorioProjeto(false);
    }
  }

  async function abrirVagaEmergencialPorRelatorio(item: ItemRelatorioProjeto) {
    if (!projetoPainel) return;
    const papel = (projetoPainel.Elenco || []).find(
      (elenco) => normalizar(elenco.personagem) === normalizar(item.personagem)
    );

    if (!papel?.id) {
      alert(
        `Não encontrei ${item.personagem} no Banco do Projeto. Abra o Banco & Semanas para revisar este papel.`
      );
      return;
    }

    await reabrirPapelProjeto(papel);
  }

  function abrirAreaProjetosParaTutorial() {
    setMostrarTreinamentos(false);
    setMostrarFerramentas(false);
    setMostrarAdvertencias(false);
    setMostrarEventos(false);
    setMostrarMarketing(false);
    setMostrarMembros(false);
    setMostrarUsuarios(false);
    setMostrarRelatorios(false);
    setMostrarNovoProjeto(false);
    setSelecionadoId(null);
    setRascunho(null);
    setAbaProjeto("informacoes");
    setMenuMobileAberto(false);
  }

  async function prepararPassoTutorialProjeto(indice: number) {
    const limite = TUTORIAL_PROJETO_PASSOS.length - 1;
    const proximo = Math.max(0, Math.min(indice, limite));

    if (proximo <= 1) {
      abrirAreaProjetosParaTutorial();
    } else if (proximo === 2) {
      abrirAreaProjetosParaTutorial();
      limparFormularioProjeto();
      setMostrarNovoProjeto(true);
    } else {
      setMostrarNovoProjeto(false);
      if (!selecionadoId) {
        const primeiro = projetosVisiveis[0] || projetos[0];
        if (primeiro?.ID) abrirPaginaProjeto(primeiro.ID);
      }
      if (proximo === 4) setAbaProjeto("elenco");
      if (proximo === 5) setAbaProjeto("relatorios");
    }

    setTutorialProjetoPasso(proximo);
  }

  function iniciarTutorialPraticoProjetos() {
    setTutorialProjetoAtivo(true);
    void prepararPassoTutorialProjeto(0);
  }

  function encerrarTutorialPraticoProjetos() {
    setTutorialProjetoAtivo(false);
    setTutorialProjetoRect(null);
    setMostrarNovoProjeto(false);
  }

  const SidebarItem = ({
    id,
    label,
    icon,
    onClick,
  }: {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
  }) => {
    const ativo = telaAtual === id;
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          border: "none",
          borderRadius: 14,
          padding: "14px 16px",
          cursor: "pointer",
          color: ativo ? "#38bdf8" : "#cbd5e1",
          background: ativo
            ? "linear-gradient(90deg, rgba(37,99,235,0.24), rgba(14,165,233,0.08))"
            : "transparent",
          textAlign: "left",
          fontWeight: ativo ? 800 : 700,
          fontSize: 15,
        }}
      >
        <span style={{ fontSize: 19, width: 22, textAlign: "center" }}>
          {icon}
        </span>
        {label}
      </button>
    );
  };

  const MiniStat = ({
    icon,
    value,
    label,
    color,
  }: {
    icon: string;
    value: string;
    label: string;
    color: string;
  }) => (
    <div
      style={{
        background: "rgba(2,6,23,0.55)",
        border: "1px solid rgba(148,163,184,0.16)",
        borderRadius: 14,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: `${color}22`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc" }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      </div>
    </div>
  );

  const ProjectList = () => {
    const paginaInicial = Math.max(1, paginaProjetos - 2);
    const paginaFinal = Math.min(totalPaginasProjetos, paginaInicial + 4);
    const paginasVisiveis = Array.from(
      { length: Math.max(0, paginaFinal - paginaInicial + 1) },
      (_, indice) => paginaInicial + indice
    );

    function estiloStatusProjeto(status?: string) {
      const valor = normalizarStatusProjetoUI(status);

      if (valor === "Seleção") {
        return {
          background: "rgba(30,58,138,.76)",
          border: "rgba(59,130,246,.58)",
          color: "#dbeafe",
        };
      }

      if (valor === "Aguardando aprovação") {
        return {
          background: "rgba(76,29,149,.76)",
          border: "rgba(139,92,246,.58)",
          color: "#ede9fe",
        };
      }

      if (valor === "Aguardando início") {
        return {
          background: "rgba(120,53,15,.82)",
          border: "rgba(245,158,11,.56)",
          color: "#fef3c7",
        };
      }

      if (valor === "Planejamento") {
        return {
          background: "rgba(51,65,85,.86)",
          border: "rgba(148,163,184,.42)",
          color: "#e2e8f0",
        };
      }

      if (valor === "Em andamento") {
        return {
          background: "rgba(6,78,59,.78)",
          border: "rgba(16,185,129,.52)",
          color: "#d1fae5",
        };
      }

      if (valor === "Em edição") {
        return {
          background: "rgba(12,74,110,.78)",
          border: "rgba(56,189,248,.52)",
          color: "#e0f2fe",
        };
      }

      if (valor === "Pausado") {
        return {
          background: "rgba(63,63,70,.84)",
          border: "rgba(161,161,170,.46)",
          color: "#f4f4f5",
        };
      }

      if (valor === "Interrompido") {
        return {
          background: "rgba(127,29,29,.80)",
          border: "rgba(239,68,68,.52)",
          color: "#fee2e2",
        };
      }

      if (valor === "Finalizado") {
        return {
          background: "rgba(20,83,45,.80)",
          border: "rgba(34,197,94,.52)",
          color: "#dcfce7",
        };
      }

      return {
        background: "rgba(30,41,59,.88)",
        border: "rgba(100,116,139,.42)",
        color: "#e2e8f0",
      };
    }

    return (
      <section
        data-tutorial-projetos="lista-projetos"
        style={{
          ...painelDarkStyle,
          minHeight: 260,
          overflow: "hidden",
          padding: isMobile ? 14 : 16,
        }}
      >
        <div
          style={{
            ...painelHeaderStyle,
            paddingBottom: 14,
            borderBottom: "1px solid rgba(148,163,184,.10)",
          }}
        >
          <div>
            <h2 style={{ ...tituloCardDarkStyle, fontSize: 18 }}>Projetos</h2>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Abra um projeto para acessar a página dedicada dele.
            </div>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            {filtrados.length} projeto(s)
          </span>
        </div>

        {filtrados.length ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isTablet
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 14,
                paddingTop: 14,
              }}
            >
              {projetosPaginados.map((p) => {
                const status = estiloStatusProjeto(p.Status);
                const resumo = limparResumoProjeto(p.Observacoes);
                const semanaAtualProjeto = obterNumeroSemanaProjeto(p);
                const liderProjeto = obterNomeLiderProjeto(p);
                const categoriaProjeto = extrairCategoriaProjeto(p.Observacoes);

                return (
                  <button
                    key={p.ID}
                    type="button"
                    onClick={() => abrirPaginaProjeto(p.ID)}
                    aria-label={`Abrir página do projeto ${p.Projeto || p.ID}`}
                    style={{
                      minWidth: 0,
                      padding: 0,
                      overflow: "hidden",
                      border: "1px solid rgba(96,165,250,.24)",
                      borderRadius: 20,
                      color: "#f8fafc",
                      background:
                        "linear-gradient(180deg, rgba(9,23,49,.98), rgba(5,15,36,1))",
                      textAlign: "left",
                      cursor: "pointer",
                      boxShadow: "0 16px 36px rgba(0,0,0,.22)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: isMobile ? 320 : 330,
                      transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: isMobile ? 138 : 124,
                        position: "relative",
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        background: p.Capa_URL
                          ? "#0b1730"
                          : "linear-gradient(135deg,#173f86 0%,#0d2f65 45%,#0a1f45 100%)",
                        borderBottom: "1px solid rgba(96,165,250,.14)",
                      }}
                    >
                      {p.Capa_URL ? (
                        <img
                          src={p.Capa_URL}
                          alt={`Capa de ${p.Projeto || "projeto"}`}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          style={{
                            fontSize: 34,
                            filter: "drop-shadow(0 7px 18px rgba(0,0,0,.28))",
                          }}
                        >
                          🎬
                        </span>
                      )}

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(180deg, rgba(8,15,32,.08) 0%, rgba(7,15,34,.18) 45%, rgba(4,11,28,.66) 100%)",
                        }}
                      />

                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          background: status.background,
                          color: status.color,
                          border: `1px solid ${status.border}`,
                          borderRadius: 999,
                          padding: "5px 10px",
                          fontSize: 10,
                          lineHeight: 1,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                          boxShadow: "0 8px 18px rgba(2,6,23,.18)",
                        }}
                      >
                        {normalizarStatusProjetoUI(p.Status)}
                      </span>

                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          color: "#dbe7ff",
                          background: "rgba(4,11,28,.58)",
                          border: "1px solid rgba(148,163,184,.14)",
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 900,
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        #{p.ID}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: isMobile ? "12px 12px 13px" : "13px 14px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: isMobile ? 16.5 : 16,
                          lineHeight: 1.22,
                          color: "#f8fafc",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          minHeight: isMobile ? 40 : 38,
                        }}
                      >
                        {p.Projeto || "Projeto sem nome"}
                      </strong>

                      <p
                        style={{
                          margin: 0,
                          color: "#c7d3ea",
                          fontSize: 12,
                          lineHeight: 1.45,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 34,
                        }}
                      >
                        {resumo || "Sem descrição cadastrada para este projeto."}
                      </p>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span
                          className="dw-chip dw-chip-blue"
                          style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999 }}
                        >
                          {p.Tipo || "Projeto"}
                        </span>
                        {p.Genero && (
                          <span
                            className="dw-chip"
                            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999 }}
                          >
                            {p.Genero}
                          </span>
                        )}
                        {categoriaProjeto && (
                          <span
                            className="dw-chip"
                            style={{
                              fontSize: 10,
                              padding: "4px 10px",
                              borderRadius: 999,
                              color: "#bae6fd",
                              background: "rgba(14,165,233,.12)",
                              border: "1px solid rgba(56,189,248,.18)",
                            }}
                          >
                            {categoriaProjeto}
                          </span>
                        )}
                        {p.Prioridade && (
                          <span
                            className="dw-chip"
                            style={{
                              fontSize: 10,
                              padding: "4px 10px",
                              borderRadius: 999,
                              color: "#fde68a",
                              background: "rgba(146,64,14,.28)",
                              border: "1px solid rgba(245,158,11,.22)",
                            }}
                          >
                            {p.Prioridade}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: 10,
                          borderTop: "1px solid rgba(148,163,184,.10)",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1.25fr .8fr",
                          gap: 12,
                          alignItems: "end",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#7f93be", marginBottom: 4, fontSize: 10 }}>
                            👤 Líder
                          </div>
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#f8fafc",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {liderProjeto}
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#7f93be", marginBottom: 4, fontSize: 10 }}>
                            🗓 Semana
                          </div>
                          <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 700 }}>
                            {labelSemana(semanaAtualProjeto)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          borderRadius: 13,
                          background: "linear-gradient(180deg, #4f8fff 0%, #2f6fe2 100%)",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 13,
                          textAlign: "center",
                          padding: "10px 12px",
                          boxShadow: "0 10px 18px rgba(35,99,214,.22)",
                        }}
                      >
                        Abrir projeto →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid rgba(148,163,184,.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#64748b", fontSize: 11 }}>
                Página {paginaProjetos} de {totalPaginasProjetos} • {projetosPorPagina} por página
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  disabled={paginaProjetos === 1}
                  onClick={() => {
                    setPaginaProjetos((atual) => Math.max(1, atual - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    ...botaoSecundarioStyle,
                    padding: "8px 11px",
                    minWidth: 36,
                    opacity: paginaProjetos === 1 ? .45 : 1,
                  }}
                >
                  ‹
                </button>

                {paginaInicial > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaginaProjetos(1)}
                      style={{ ...botaoSecundarioStyle, padding: "8px 11px", minWidth: 36 }}
                    >
                      1
                    </button>
                    {paginaInicial > 2 && <span style={{ color: "#64748b" }}>…</span>}
                  </>
                )}

                {paginasVisiveis.map((pagina) => (
                  <button
                    key={pagina}
                    type="button"
                    onClick={() => setPaginaProjetos(pagina)}
                    style={{
                      ...(pagina === paginaProjetos
                        ? botaoPrimarioStyle
                        : botaoSecundarioStyle),
                      padding: "8px 11px",
                      minWidth: 36,
                    }}
                  >
                    {pagina}
                  </button>
                ))}

                {paginaFinal < totalPaginasProjetos && (
                  <>
                    {paginaFinal < totalPaginasProjetos - 1 && (
                      <span style={{ color: "#64748b" }}>…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaginaProjetos(totalPaginasProjetos)}
                      style={{ ...botaoSecundarioStyle, padding: "8px 11px", minWidth: 36 }}
                    >
                      {totalPaginasProjetos}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={paginaProjetos === totalPaginasProjetos}
                  onClick={() => {
                    setPaginaProjetos((atual) =>
                      Math.min(totalPaginasProjetos, atual + 1)
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    ...botaoSecundarioStyle,
                    padding: "8px 11px",
                    minWidth: 36,
                    opacity: paginaProjetos === totalPaginasProjetos ? .45 : 1,
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "42px 14px 28px",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Nenhum projeto encontrado com esses filtros.
          </div>
        )}
      </section>
    );
  };

  const ProjectDetails = () => {
    if (!projetoPainel) {
      return (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Nenhum projeto selecionado</h2>
          <p style={{ color: "#94a3b8" }}>
            Selecione um projeto na lista ou crie um novo projeto.
          </p>
        </div>
      );
    }

    const statusCor = corStatus(projetoPainel.Status);
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            background: projetoPainel.Capa_URL
              ? `linear-gradient(rgba(2,6,23,0.25), rgba(2,6,23,0.72)), url(${projetoPainel.Capa_URL}) center/cover`
              : "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.68))",
            border: "1px solid rgba(56,189,248,0.24)",
            borderRadius: 22,
            padding: 38,
            minHeight: 170,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            boxShadow: "0 22px 60px rgba(37,99,235,0.22)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: 26,
              textShadow: "0 2px 18px rgba(0,0,0,0.48)",
            }}
          >
            {projetoPainel.Projeto}
          </h2>
        </div>

        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ margin: 0, color: "#dbeafe", fontSize: 26 }}>
                {projetoPainel.Projeto}
              </h1>
              <div style={{ color: "#94a3b8", marginTop: 6 }}>
                ID: {projetoPainel.ID}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={voltarParaListaProjetos}
                style={botaoSecundarioStyle}
              >
                ← Voltar aos projetos
              </button>
              {!rascunho || rascunho.ID !== projetoPainel.ID ? (
                <>
                  <button
                    onClick={() => setSelecionadoId(projetoPainel.ID)}
                    style={botaoSecundarioStyle}
                  >
                    Editar informações
                  </button>
                  {isMobile && (
                    <button
                      onClick={() => setSelecionadoId(projetoPainel.ID)}
                      style={botaoPrimarioStyle}
                    >
                      Alterar capa
                    </button>
                  )}
                </>
              ) : (
                <button onClick={salvarAlteracoes} style={botaoPrimarioStyle}>
                  Salvar alterações
                </button>
              )}
            </div>
          </div>

          {rascunho && rascunho.ID === projetoPainel.ID ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 22,
              }}
            >
              {[
                ["Projeto", "Projeto"],
                ["Tipo", "Tipo"],
                ["Gênero", "Genero"],
                ["Prioridade", "Prioridade"],
                ["Status", "Status"],
                ["Nome do líder", "__nome_lider"],
                ["E-mail do líder", "Lider"],
                ["Telefone do líder", "Telefone_Lider"],
                ["Nome do editor", "__nome_editor"],
                ["E-mail do editor", "Editor"],
                ["Telefone do editor", "Telefone_Editor"],
                ["Data de início", "Data_Inicio"],
                ["Capa do projeto", "Capa_URL"],
              ].map(([label, campo]) =>
                campo === "Capa_URL" ? (
                  <div
                    key={campo}
                    style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}
                  >
                    <label style={labelStyle}>{label}</label>

                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        background: "rgba(2, 6, 23, 0.42)",
                        border: "1px solid rgba(56, 189, 248, 0.18)",
                        borderRadius: 16,
                        padding: isMobile ? 12 : 14,
                        overflow: "hidden",
                      }}
                    >
                      <label
                        htmlFor={`capa-projeto-${projetoPainel.ID}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const arquivo = e.dataTransfer.files?.[0] || null;
                          if (arquivo && arquivo.type.startsWith("image/")) {
                            void enviarCapaRascunho(arquivo);
                          } else if (arquivo) {
                            alert("Selecione um arquivo de imagem.");
                          }
                        }}
                        style={{
                          width: "100%",
                          minHeight: isMobile ? 170 : 220,
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px dashed rgba(96,165,250,.42)",
                          background: String((rascunho as any)[campo] || "").trim()
                            ? `linear-gradient(rgba(2,6,23,.08), rgba(2,6,23,.42)), url(${String((rascunho as any)[campo] || "")}) center/cover`
                            : "linear-gradient(135deg, rgba(15,34,70,.88), rgba(8,20,45,.92))",
                          color: "#a9b9d6",
                          display: "grid",
                          placeItems: "center",
                          textAlign: "center",
                          padding: 18,
                          cursor: enviandoCapaProjeto ? "wait" : "pointer",
                          boxSizing: "border-box",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            justifyItems: "center",
                            gap: 8,
                            padding: "12px 18px",
                            borderRadius: 14,
                            background: String((rascunho as any)[campo] || "").trim()
                              ? "rgba(2,6,23,.56)"
                              : "transparent",
                            backdropFilter: String((rascunho as any)[campo] || "").trim()
                              ? "blur(6px)"
                              : undefined,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: isMobile ? 34 : 42,
                              lineHeight: 1,
                              color: "#60a5fa",
                              filter: "drop-shadow(0 8px 18px rgba(37,99,235,.24))",
                            }}
                          >
                            ☁️
                          </span>
                          <strong style={{ color: "#dbeafe", fontSize: isMobile ? 14 : 16 }}>
                            {enviandoCapaProjeto
                              ? "Enviando imagem..."
                              : "Envie uma imagem ou cole a URL da capa aqui."}
                          </strong>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>
                            Arraste e solte ou clique para selecionar.
                          </span>
                        </div>

                        <input
                          id={`capa-projeto-${projetoPainel.ID}`}
                          type="file"
                          accept="image/*"
                          disabled={enviandoCapaProjeto}
                          onChange={(e) => {
                            const arquivo = e.target.files?.[0] || null;
                            void enviarCapaRascunho(arquivo);
                            e.currentTarget.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>

                      <input
                        value={String((rascunho as any)[campo] || "")}
                        onChange={(e) =>
                          atualizarCampo(campo as keyof Projeto, e.target.value)
                        }
                        placeholder="Cole aqui o link da imagem da capa"
                        inputMode="url"
                        autoComplete="off"
                        style={{
                          ...inputStyle,
                          width: "100%",
                          minHeight: isMobile ? 48 : inputStyle.minHeight,
                        }}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                          alignItems: "stretch",
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...botaoPrimarioStyle,
                            width: "100%",
                            minHeight: 48,
                          }}
                          onClick={async () => {
                            try {
                              const texto = await navigator.clipboard.readText();
                              if (!texto.trim()) {
                                alert("Não encontrei nenhum link copiado.");
                                return;
                              }
                              atualizarCampo("Capa_URL", texto.trim());
                            } catch (erro) {
                              alert(
                                "Não consegui acessar a área de transferência. Cole o link manualmente no campo."
                              );
                            }
                          }}
                        >
                          🔗 Colar link da capa
                        </button>

                        <label
                          htmlFor={`capa-projeto-${projetoPainel.ID}`}
                          style={{
                            ...botaoSecundarioStyle,
                            width: "100%",
                            minHeight: 48,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: enviandoCapaProjeto ? "wait" : "pointer",
                            opacity: enviandoCapaProjeto ? 0.7 : 1,
                            boxSizing: "border-box",
                          }}
                        >
                          ⤴ {enviandoCapaProjeto ? "Enviando capa..." : "Enviar arquivo"}
                        </label>

                        <button
                          type="button"
                          style={{
                            ...botaoSecundarioStyle,
                            width: "100%",
                            minHeight: 48,
                            color: "#fb7185",
                            borderColor: "rgba(244,63,94,.36)",
                            background: "rgba(127,29,29,.12)",
                          }}
                          onClick={() => atualizarCampo("Capa_URL", "")}
                        >
                          🗑 Remover capa
                        </button>
                      </div>

                      <div style={{ color: "#94a3b8", fontSize: 12 }}>
                        Você pode enviar uma imagem diretamente ou colar a URL.
                        Depois clique em “Salvar alterações”.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={campo}>
                    <label style={labelStyle}>{label}</label>
                    {campo === "Status" ? (
                      <select
                        value={String((rascunho as any)[campo] || "")}
                        onChange={(e) =>
                          atualizarCampo(
                            campo as keyof Projeto,
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="">Selecione o status</option>
                        {!STATUS_PROJETO_OPCOES.includes(
                          String((rascunho as any)[campo] || "")
                        ) &&
                          String((rascunho as any)[campo] || "").trim() && (
                            <option
                              value={String((rascunho as any)[campo] || "")}
                            >
                              {String((rascunho as any)[campo] || "")}
                            </option>
                          )}
                        {STATUS_PROJETO_OPCOES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : campo === "__nome_lider" || campo === "__nome_editor" ? (
                      <input
                        value={
                          campo === "__nome_lider"
                            ? extrairNomesResponsaveisProjeto(rascunho.Observacoes).lider
                            : extrairNomesResponsaveisProjeto(rascunho.Observacoes).editor
                        }
                        onChange={(e) =>
                          atualizarNomeResponsavelRascunho(
                            campo === "__nome_lider" ? "lider" : "editor",
                            e.target.value
                          )
                        }
                        placeholder={campo === "__nome_lider" ? "Nome do líder" : "Nome do editor"}
                        style={inputStyle}
                      />
                    ) : campo === "Data_Inicio" ? (
                      <input
                        type="date"
                        value={valorDataParaInput(rascunho.Data_Inicio)}
                        onChange={(e) => atualizarCampo("Data_Inicio", e.target.value)}
                        style={inputStyle}
                      />
                    ) : (
                      <>
                        <input
                          value={String((rascunho as any)[campo] || "")}
                          onChange={(e) => {
                            atualizarCampo(campo as keyof Projeto, e.target.value);
                            if (campo === "Lider") setErroEmailLiderEdicao("");
                            if (campo === "Editor") setErroEmailEditorEdicao("");
                          }}
                          onBlur={() => {
                            if ((campo === "Lider" || campo === "Editor") && String((rascunho as any)[campo] || "").trim()) {
                              void localizarUsuarioPorEmailProjeto(String((rascunho as any)[campo] || "")).then((perfil) => {
                                const mensagem = perfil
                                  ? ""
                                  : "Este e-mail não está cadastrado nos usuários do DubWorks Manager.";
                                if (campo === "Lider") setErroEmailLiderEdicao(mensagem);
                                if (campo === "Editor") setErroEmailEditorEdicao(mensagem);
                              });
                            }
                          }}
                          placeholder={
                            campo === "Lider"
                              ? "E-mail do líder"
                              : campo === "Editor"
                              ? "E-mail do editor"
                              : campo === "Telefone_Lider" || campo === "Telefone_Editor"
                              ? "[00] 00000-0000"
                              : campo === "Projeto"
                              ? "Nome do projeto"
                              : ""
                          }
                          inputMode={
                            campo === "Lider" || campo === "Editor"
                              ? "email"
                              : campo === "Telefone_Lider" || campo === "Telefone_Editor"
                              ? "tel"
                              : undefined
                          }
                          style={{
                            ...inputStyle,
                            borderColor:
                              campo === "Lider" && erroEmailLiderEdicao
                                ? "rgba(248,113,113,.72)"
                                : campo === "Editor" && erroEmailEditorEdicao
                                ? "rgba(248,113,113,.72)"
                                : inputStyle.borderColor,
                          }}
                        />
                        {campo === "Lider" && erroEmailLiderEdicao && (
                          <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                            {erroEmailLiderEdicao}
                          </div>
                        )}
                        {campo === "Editor" && erroEmailEditorEdicao && (
                          <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                            {erroEmailEditorEdicao}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginTop: 22,
              }}
            >
              {[
                ["Tipo", projetoPainel.Tipo],
                ["Gênero", projetoPainel.Genero],
                ["Prioridade", projetoPainel.Prioridade],
                ["Nome do líder", extrairNomesResponsaveisProjeto(projetoPainel.Observacoes).lider],
                ["E-mail do líder", projetoPainel.Lider],
                ["Telefone do líder", projetoPainel.Telefone_Lider],
                ["Nome do editor", extrairNomesResponsaveisProjeto(projetoPainel.Observacoes).editor],
                ["E-mail do editor", projetoPainel.Editor],
                ["Telefone do editor", projetoPainel.Telefone_Editor],
                ["Data de início", formatarDataBR(projetoPainel.Data_Inicio)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>{label}</div>
                  <div
                    style={{ color: "#f8fafc", fontWeight: 800, marginTop: 4 }}
                  >
                    {value || "-"}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Status</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    background: statusCor.bg,
                    color: statusCor.color,
                    border: "1px solid rgba(148,163,184,0.12)",
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontWeight: 900,
                  }}
                >
                  {projetoPainel.Status || "Sem status"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DrivePanel = () => (
    <div style={painelDarkStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              ...tituloCardDarkStyle,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>📁</span> Arquivos do Drive
          </h2>
          <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>
            Crie as pastas oficiais do projeto no Google Drive ou salve os links manualmente.
          </p>
        </div>

        {projetoPainel && podeEditarProjeto(usuarioLogado, projetoPainel) && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={criarEstruturaDriveProjeto}
              disabled={criandoEstruturaDrive}
              style={{
                ...botaoPrimarioStyle,
                opacity: criandoEstruturaDrive ? 0.7 : 1,
                cursor: criandoEstruturaDrive ? "not-allowed" : "pointer",
              }}
            >
              {criandoEstruturaDrive
                ? "Criando estrutura..."
                : "Criar estrutura no Drive"}
            </button>

            <button
              onClick={prepararOuAtualizarFormulariosProjeto}
              disabled={preparandoFormulariosProjeto}
              style={{
                ...botaoSecundarioStyle,
                opacity: preparandoFormulariosProjeto ? 0.65 : 1,
                cursor: preparandoFormulariosProjeto ? "not-allowed" : "pointer",
              }}
              title="Cria ou atualiza os Forms sem recriar as pastas do Drive"
            >
              {preparandoFormulariosProjeto
                ? "Atualizando formulários..."
                : "Criar/atualizar formulários"}
            </button>

            <button
              onClick={salvarLinksDriveComHistorico}
              style={botaoSecundarioStyle}
            >
              Salvar links
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {driveLinks.map((item) => (
          <div
            key={item.titulo}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "48px 1fr" : "56px 1fr auto",
              gap: 14,
              alignItems: "center",
              padding: "14px 0",
              borderTop: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: `${item.cor}22`,
                color: item.cor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {item.icone}
            </div>

            <div>
              <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                {item.titulo}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                {item.descricao}
              </div>

              <input
                placeholder="Cole o link desta pasta aqui"
                value={item.link || ""}
                onChange={(e) => {
                  if (!rascunho) return;

                  const linksAtuais = extrairLinksDrive(rascunho.Observacoes);
                  const novosLinks = {
                    ...linksAtuais,
                    [item.chave]: e.target.value,
                  };

                  setRascunho({
                    ...rascunho,
                    Observacoes: salvarLinksDriveEmObservacoes(
                      rascunho.Observacoes,
                      novosLinks
                    ),
                  });
                }}
                disabled={
                  !projetoPainel ||
                  !podeEditarProjeto(usuarioLogado, projetoPainel)
                }
                style={{
                  ...inputStyle,
                  marginTop: 10,
                  color: "#38bdf8",
                  border: "1px solid rgba(37,99,235,0.45)",
                }}
              />

              {!podeEditarProjeto(usuarioLogado, projetoPainel) && (
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                  Você pode visualizar este link, mas não tem permissão para
                  editar.
                </div>
              )}

              {isMobile && (
                <button
                  onClick={() => abrirLink(item.link || "")}
                  style={{ ...botaoSecundarioStyle, marginTop: 10 }}
                >
                  Abrir ↗
                </button>
              )}
            </div>

            {!isMobile && (
              <button
                onClick={() => abrirLink(item.link || "")}
                style={botaoSecundarioStyle}
              >
                Abrir ↗
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const AdvertenciasPage = () => {
    if (!podeVerAdvertencias) {
      return (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>⚠ Advertências</h2>
          <p style={{ color: "#94a3b8", marginBottom: 0 }}>
            Seu cargo não possui acesso a este módulo.
          </p>
        </div>
      );
    }

    const termo = normalizar(queryAdvertencias);

    const listaFiltrada = advertencias.filter((advertencia) => {
      if (!termo) return true;

      const membro = membroDaAdvertencia(advertencia);

      return [
        advertencia.moderador_telefone,
        advertencia.advertido_telefone,
        advertencia.descricao,
        advertencia.valor,
        advertencia.status,
        advertencia.decidido_por,
        advertencia.motivo_decisao,
        advertencia.data_ocorrencia,
        advertencia.timestamp,
        membro?.nome || "",
        membro?.email || "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });

    listaFiltrada.sort(
      (a, b) => Number(b.status === "pendente") - Number(a.status === "pendente")
    );

    const advertidosUnicos = new Set(
      advertencias
        .map((item) =>
          String(item.advertido_telefone || "").replace(/\D/g, "")
        )
        .filter(Boolean)
    ).size;

    const totalProvas = advertencias.reduce(
      (total, item) => total + item.provas.length,
      0
    );

    const comPontuacao = advertencias.filter(
      (item) => Number(String(item.valor || "").replace(",", ".")) > 0
    ).length;

    const pendentesAprovacao = advertencias.filter(
      (item) => item.status === "pendente"
    ).length;

    const cardMetrica = (
      titulo: string,
      valor: string | number,
      detalhe: string,
      icone: string
    ) => (
      <div
        style={{
          borderRadius: 16,
          padding: 18,
          border: "1px solid rgba(96,165,250,.16)",
          background:
            "linear-gradient(145deg, rgba(15,23,42,.88), rgba(8,18,34,.80))",
          boxShadow: "0 14px 34px rgba(0,0,0,.16)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: "#60a5fa",
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          {icone}
        </div>
        <div
          style={{
            color: "#f8fafc",
            fontSize: 25,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {valor}
        </div>
        <div
          style={{
            color: "#e2e8f0",
            fontSize: 12,
            fontWeight: 900,
            marginTop: 8,
          }}
        >
          {titulo}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
          {detalhe}
        </div>
      </div>
    );

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            ...painelDarkStyle,
            padding: isMobile ? 16 : 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: isMobile ? "stretch" : "center",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div>
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: ".12em",
                  marginBottom: 6,
                }}
              >
                CONDUTA
              </div>
              <h1
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: isMobile ? 24 : 30,
                }}
              >
                ⚠ Advertências
              </h1>
              <p
                style={{
                  color: "#94a3b8",
                  margin: "7px 0 0",
                  maxWidth: 720,
                  lineHeight: 1.5,
                }}
              >
                Registre ocorrências e acompanhe a aprovação da Diretoria.
            
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setMostrarNovaAdvertencia(true)}
                style={botaoPrimarioStyle}
              >
                ＋ Nova advertência
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(
                    ADVERTENCIAS_FORM_URL,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                style={botaoSecundarioStyle}
              >
                ↗ Formulário antigo
              </button>

              <button
                type="button"
                onClick={() => void recarregarAdvertencias()}
                disabled={carregandoAdvertencias}
                style={botaoSecundarioStyle}
              >
                {carregandoAdvertencias ? "Sincronizando..." : "↻ Sincronizar"}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(5, minmax(150px, 210px))",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {cardMetrica(
            "Registros",
            advertencias.length,
            "planilha e registros internos",
            "▤"
          )}
          {cardMetrica(
            "Advertidos",
            advertidosUnicos,
            "telefones diferentes",
            "👥"
          )}
          {cardMetrica(
            "Pendentes",
            pendentesAprovacao,
            "aguardando decisão da Diretoria",
            "⏳"
          )}
          {cardMetrica(
            "Com pontuação",
            comPontuacao,
            "registros com valor acima de zero",
            "⚠"
          )}
          {cardMetrica(
            "Provas",
            totalProvas,
            "arquivos vinculados no Drive",
            "📎"
          )}
        </div>

        <div style={painelDarkStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: isMobile ? "stretch" : "center",
              flexDirection: isMobile ? "column" : "row",
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                Fila e histórico de advertências
              </h2>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {listaFiltrada.length} registro(s) exibido(s)
              </div>
            </div>

            <input
              value={queryAdvertencias}
              onChange={(event) =>
                setQueryAdvertencias(event.target.value)
              }
              placeholder="Buscar membro, telefone, moderador ou ocorrência..."
              style={{
                ...inputStyle,
                width: isMobile ? "100%" : 390,
                margin: 0,
              }}
            />
          </div>

          {erroAdvertencias && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(248,113,113,.26)",
                background: "rgba(127,29,29,.18)",
                color: "#fecaca",
                padding: 12,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              {erroAdvertencias}
            </div>
          )}

          {!carregandoAdvertencias &&
            !erroAdvertencias &&
            !advertencias.length && (
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                Clique em <strong>Sincronizar</strong> para carregar os
                registros existentes.
              </div>
            )}

          {carregandoAdvertencias && (
            <div
              style={{
                padding: "30px 16px",
                textAlign: "center",
                color: "#93c5fd",
              }}
            >
              Carregando advertências...
            </div>
          )}

          {!carregandoAdvertencias && listaFiltrada.length > 0 && (
            <div style={{ display: "grid", gap: 9 }}>
              {listaFiltrada.map((advertencia) => {
                const membro = membroDaAdvertencia(advertencia);
                const pontos = String(advertencia.valor || "").trim();
                const statusVisual =
                  advertencia.status === "aprovado"
                    ? {
                        label: "Aprovada",
                        cor: "#86efac",
                        fundo: "rgba(22,101,52,.18)",
                        borda: "rgba(74,222,128,.24)",
                      }
                    : advertencia.status === "rejeitado"
                    ? {
                        label: "Rejeitada",
                        cor: "#fca5a5",
                        fundo: "rgba(127,29,29,.18)",
                        borda: "rgba(248,113,113,.24)",
                      }
                    : {
                        label: "Aguardando aprovação",
                        cor: "#fde68a",
                        fundo: "rgba(120,53,15,.20)",
                        borda: "rgba(245,158,11,.28)",
                      };

                return (
                  <button
                    type="button"
                    key={`${advertencia.id}-${advertencia.linha}`}
                    onClick={() =>
                      setAdvertenciaSelecionada(advertencia)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 13,
                      border:
                        advertencia.status === "pendente"
                          ? "1px solid rgba(245,158,11,.30)"
                          : "1px solid rgba(148,163,184,.12)",
                      background: "rgba(2,6,23,.34)",
                      padding: isMobile ? 12 : 14,
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "minmax(190px, 1.1fr) minmax(260px, 2.1fr) 110px 120px",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: membro ? "#f8fafc" : "#cbd5e1",
                          fontWeight: 900,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {membro?.nome || "Membro não vinculado"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        {advertencia.advertido_telefone || "Sem telefone"}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: 12,
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: isMobile ? 3 : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {advertencia.descricao || "Sem descrição"}
                    </div>

                    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: statusVisual.fundo,
                          border: `1px solid ${statusVisual.borda}`,
                          color: statusVisual.cor,
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      >
                        {statusVisual.label}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "5px 9px",
                          background:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "rgba(245,158,11,.12)"
                              : "rgba(59,130,246,.10)",
                          border:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "1px solid rgba(245,158,11,.26)"
                              : "1px solid rgba(59,130,246,.20)",
                          color:
                            Number(String(pontos || "0").replace(",", ".")) > 0
                              ? "#fbbf24"
                              : "#93c5fd",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {pontos || "0"} ponto(s)
                      </span>
                    </div>

                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 11,
                      }}
                    >
                      <div>
                        {advertencia.data_ocorrencia ||
                          advertencia.timestamp.split(" ")[0] ||
                          "—"}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        📎 {advertencia.provas.length}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const EventsPage = () => {
    const eventosOrdenados = [...agendaEventos].sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
    const pendentes = eventosOrdenados.filter(
      (evento) => evento.status === "pendente"
    );
    const aprovados = eventosOrdenados.filter(
      (evento) => evento.status === "aprovado"
    );
    const rejeitados = eventosOrdenados.filter(
      (evento) => evento.status === "rejeitado"
    );

    function estiloStatusEvento(status: AgendaEvento["status"]) {
      if (status === "aprovado") {
        return { label: "Aprovado", cor: "#86efac", fundo: "rgba(22,101,52,.20)" };
      }
      if (status === "rejeitado") {
        return { label: "Rejeitado", cor: "#fca5a5", fundo: "rgba(127,29,29,.20)" };
      }
      if (status === "rascunho") {
        return { label: "Rascunho", cor: "#cbd5e1", fundo: "rgba(71,85,105,.22)" };
      }
      return { label: "Aguardando aprovação", cor: "#fde68a", fundo: "rgba(120,53,15,.24)" };
    }

    function eventoDoUsuario(evento: AgendaEvento) {
      const referencias = [usuarioLogado?.nome, usuarioLogado?.login]
        .filter(Boolean)
        .map((valor) => normalizar(valor || ""));
      return referencias.includes(normalizar(evento.criado_por));
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>Comunidade › Eventos</div>
            <h1 style={pageTitleDarkStyle}>Central de Eventos</h1>
            <p style={{ color: "#94a3b8", margin: "7px 0 0" }}>
              Crie eventos e acompanhe a aprovação da Diretoria.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={botaoSecundarioStyle}
              onClick={() => void carregarAgendaAtual()}
            >
              ↻ Atualizar
            </button>
            {podeCriarEventos && (
              <button
                type="button"
                style={botaoPrimarioStyle}
                onClick={() => abrirNovoCompromissoAgenda()}
              >
                + Criar evento
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <MiniStat icon="📅" value={String(eventosOrdenados.length)} label="Eventos visíveis" color="#38bdf8" />
          <MiniStat icon="◷" value={String(pendentes.length)} label="Aguardando aprovação" color="#f59e0b" />
          <MiniStat icon="✓" value={String(aprovados.length)} label="Aprovados" color="#22c55e" />
          <MiniStat icon="×" value={String(rejeitados.length)} label="Rejeitados" color="#f87171" />
        </div>

        {podeAprovarEventos && pendentes.length > 0 && (
          <div
            style={{
              ...painelDarkStyle,
              border: "1px solid rgba(245,158,11,.28)",
            }}
          >
            <div style={{ color: "#fde68a", fontSize: 12, fontWeight: 900 }}>
              FILA DA DIRETORIA
            </div>
            <h2 style={{ ...tituloCardDarkStyle, marginTop: 6 }}>
              {pendentes.length} evento(s) esperando decisão
            </h2>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {carregandoAgenda ? (
            <div style={{ ...painelDarkStyle, color: "#7dd3fc" }}>
              Carregando eventos...
            </div>
          ) : eventosOrdenados.length ? (
            eventosOrdenados.map((evento) => {
              const status = estiloStatusEvento(evento.status);
              const projeto = evento.projeto_id
                ? projetosVisiveis.find(
                    (item) => Number(item.ID) === Number(evento.projeto_id)
                  )
                : null;
              const podeAlterar =
                podeAprovarEventos ||
                (eventoDoUsuario(evento) && evento.status !== "aprovado");

              return (
                <article
                  key={evento.id}
                  style={{
                    ...painelDarkStyle,
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr) auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "#7dd3fc", fontSize: 14 }}>
                      {new Date(evento.inicio).toLocaleDateString("pt-BR")}
                    </strong>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {new Date(evento.inicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <h3 style={{ margin: 0, color: "#f8fafc" }}>{evento.titulo}</h3>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: status.fundo,
                          color: status.cor,
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 7 }}>
                      {projeto?.Projeto || "Evento geral"} · Criado por {evento.criado_por || "—"}
                    </div>
                    {evento.motivo_decisao && (
                      <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 7 }}>
                        Motivo: {evento.motivo_decisao}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={botaoSecundarioStyle}
                      onClick={() => visualizarCompromissoAgenda(evento)}
                    >
                      Ver
                    </button>
                    {podeAlterar && (
                      <button
                        type="button"
                        style={botaoSecundarioStyle}
                        onClick={() => editarCompromissoAgenda(evento)}
                      >
                        Editar
                      </button>
                    )}
                    {podeAprovarEventos && evento.status === "pendente" && (
                      <>
                        <button
                          type="button"
                          disabled={salvandoAgenda}
                          style={{ ...botaoPrimarioStyle, background: "linear-gradient(135deg,#22c55e,#15803d)" }}
                          onClick={() => void decidirEventoAgenda(evento, "aprovado")}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={salvandoAgenda}
                          style={{ ...botaoSecundarioStyle, color: "#fca5a5" }}
                          onClick={() => void decidirEventoAgenda(evento, "rejeitado")}
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div style={{ ...painelDarkStyle, color: "#94a3b8", textAlign: "center", padding: 36 }}>
              Nenhum evento cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    );
  };

  const MarketingPage = () => {
    const finalizados = projetosVisiveis.filter(
      (projeto) => normalizar(projeto.Status) === "finalizado"
    );

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>Conteúdo › Marketing</div>
            <h1 style={pageTitleDarkStyle}>Central de Marketing</h1>
            <p style={{ color: "#94a3b8", margin: "7px 0 0" }}>
              Acesso somente leitura às pastas finais dos projetos concluídos.
            </p>
          </div>
          <span
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              background: "rgba(34,197,94,.14)",
              color: "#86efac",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            {finalizados.length} finalizado(s)
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(280px,1fr))",
            gap: 16,
          }}
        >
          {finalizados.length ? (
            finalizados.map((projeto) => {
              const links = extrairLinksDrive(projeto.Observacoes);
              const linkFinal = projeto.Drive_Final_Link || links.finalizados || "";

              return (
                <article key={projeto.ID} style={{ ...painelDarkStyle, display: "grid", gap: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {projeto.Capa_URL ? (
                      <img
                        src={projeto.Capa_URL}
                        alt=""
                        style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 12 }}
                      />
                    ) : (
                      <div style={{ width: 58, height: 58, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(56,189,248,.12)", fontSize: 24 }}>
                        📁
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ ...tituloCardDarkStyle, margin: 0 }}>{projeto.Projeto}</h2>
                      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>
                        {[projeto.Tipo, projeto.Genero].filter(Boolean).join(" · ") || "Projeto finalizado"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!linkFinal}
                    style={{
                      ...botaoPrimarioStyle,
                      opacity: linkFinal ? 1 : 0.55,
                      cursor: linkFinal ? "pointer" : "not-allowed",
                    }}
                    onClick={() =>
                      linkFinal && window.open(linkFinal, "_blank", "noopener,noreferrer")
                    }
                  >
                    {linkFinal ? "Abrir pasta 3 | Finalizado" : "Pasta final não cadastrada"}
                  </button>
                </article>
              );
            })
          ) : (
            <div style={{ ...painelDarkStyle, color: "#94a3b8", textAlign: "center", padding: 36 }}>
              Nenhum projeto finalizado disponível.
            </div>
          )}
        </div>
      </div>
    );
  };

  const MembersPage = () => {
    const formatarSomenteDataHistorico = (valor?: string | null) => {
      if (!valor) return "-";
      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) return valor;
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    const paletaStatusMembroTag = (status: StatusMembro) => {
      switch (status) {
        case "na_comunidade":
          return { bg: "rgba(59,130,246,0.30)", color: "#bfdbfe", border: "rgba(96,165,250,0.42)" };
        case "somente_canais":
          return { bg: "rgba(125,211,252,0.24)", color: "#bae6fd", border: "rgba(125,211,252,0.34)" };
        case "saiu":
          return { bg: "rgba(248,113,113,0.26)", color: "#fecaca", border: "rgba(248,113,113,0.38)" };
        case "banido":
          return { bg: "rgba(239,68,68,0.34)", color: "#fecaca", border: "rgba(239,68,68,0.44)" };
        case "pausado":
          return { bg: "rgba(234,179,8,0.30)", color: "#fde68a", border: "rgba(250,204,21,0.34)" };
        default:
          return { bg: "rgba(100,116,139,0.28)", color: "#e2e8f0", border: "rgba(148,163,184,0.32)" };
      }
    };

    const paletaAtendimentoMembroTag = (atendimento?: AtendimentoMembro | string) => {
      const valor = String(atendimento || "chamar").toLowerCase();
      if (valor === "01" || valor === "1") {
        return { bg: "rgba(253,230,138,0.24)", color: "#fde68a", border: "rgba(253,230,138,0.34)" };
      }
      if (valor === "02" || valor === "2") {
        return { bg: "rgba(254,240,138,0.18)", color: "#fef3c7", border: "rgba(254,240,138,0.30)" };
      }
      if (valor === "concluido") {
        return { bg: "rgba(34,197,94,0.34)", color: "#86efac", border: "rgba(34,197,94,0.45)" };
      }
      if (valor === "erro") {
        return { bg: "rgba(239,68,68,0.34)", color: "#fca5a5", border: "rgba(239,68,68,0.44)" };
      }
      if (valor === "fila" || valor === "na_fila") {
        return { bg: "rgba(14,165,233,0.34)", color: "#7dd3fc", border: "rgba(14,165,233,0.40)" };
      }
      return { bg: "rgba(245,158,11,0.34)", color: "#fcd34d", border: "rgba(245,158,11,0.40)" };
    };

    const estiloSelectStatus = (
      bg: string,
      color: string,
      borderColor?: string
    ): React.CSSProperties => ({
      backgroundColor: bg,
      color,
      border: `1px solid ${borderColor || `${color}55`}`,
      borderRadius: 999,
      padding: "8px 12px",
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.1,
      minWidth: 148,
      outline: "none",
      cursor: "pointer",
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(15,23,42,0.16)`,
    });

    const descricaoEventoMembro = (evento: HistoricoMembroEvento) => {
      const novo = normalizar(`${evento.valor_novo || ""} ${evento.titulo || ""}`);
      const anterior = normalizar(evento.valor_anterior || "");

      if (evento.tipo === "participacao") {
        if (novo.includes("ban")) return "Foi banido da comunidade";
        if (novo.includes("sai")) return "Saiu da comunidade";
        if (novo.includes("paus")) return "Participação pausada";
        if (novo.includes("canal")) return "Passou a participar apenas pelos canais";
        if (novo.includes("comunidade") || novo.includes("na comunidade")) {
          if (
            anterior.includes("sai") ||
            anterior.includes("ban") ||
            anterior.includes("canal") ||
            anterior.includes("paus")
          ) {
            return "Retornou para a comunidade";
          }
          return "Entrou na comunidade";
        }
      }

      if (evento.tipo === "atendimento") {
        const valorNovo = normalizar(evento.valor_novo || "");
        if (valorNovo === "1" || valorNovo === "01") return "Atendimento avançou para 1";
        if (valorNovo === "2" || valorNovo === "02") return "Atendimento avançou para 2";
        if (valorNovo.includes("conclu")) return "Atendimento concluído";
        if (valorNovo.includes("erro")) return "Atendimento marcado com erro";
        if (valorNovo.includes("chamar")) return "Marcado para chamar";
      }

      return evento.titulo || "Atividade registrada";
    };

    const corEventoMembro = (evento: HistoricoMembroEvento) => {
      const texto = normalizar(`${evento.valor_novo || ""} ${evento.titulo || ""}`);
      if (texto.includes("ban")) return "#fb7185";
      if (texto.includes("sai")) return "#f87171";
      if (texto.includes("canal")) return "#38bdf8";
      if (evento.tipo === "atendimento") return "#fbbf24";
      return "#34d399";
    };

    const renderDetalhesMembro = (membro: Membro) => {
      const editando = membroEmEdicaoId === membro.id && Boolean(rascunhoMembroEdicao);
      const rascunho = editando ? rascunhoMembroEdicao! : membro;
      const eventosAtividade = [...historicoMembroSelecionado]
        .filter((evento) =>
          ["ficha", "atendimento", "participacao", "edicao", "observacao", "movimentacao"].includes(
            evento.tipo
          )
        )
        .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")))
        .slice(-80);

      const entradasRegistradas = historicoMembroSelecionado.filter((evento) => {
        if (evento.tipo !== "participacao") return false;
        const novo = normalizar(`${evento.valor_novo || ""} ${evento.titulo || ""}`);
        return novo.includes("comunidade") && !novo.includes("sai");
      }).length;
      const saidasRegistradas = historicoMembroSelecionado.filter((evento) => {
        if (evento.tipo !== "participacao") return false;
        return normalizar(`${evento.valor_novo || ""} ${evento.titulo || ""}`).includes("sai");
      }).length;
      const foiBanido =
        membro.status === "banido" ||
        historicoMembroSelecionado.some((evento) =>
          normalizar(`${evento.valor_novo || ""} ${evento.titulo || ""}`).includes("ban")
        );

      const telefoneNumerico = String(membro.telefone || "").replace(/\D/g, "");
      const telefoneWhatsApp = telefoneNumerico.length >= 12
        ? telefoneNumerico
        : telefoneNumerico.length >= 10
        ? `55${telefoneNumerico}`
        : "";
      const whatsappPronto = whatsappBridge.state === "pronto";
      const templateWhatsappAtual =
        tipoMensagemWhatsapp === "01" ? mensagemWhatsapp01 : mensagemWhatsapp02;
      const previewWhatsappAtual = aplicarTemplateWhatsapp(
        templateWhatsappAtual,
        membro
      );

      const infoLinha = (
        label: string,
        valor: React.ReactNode,
        ultimo = false
      ) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(105px,.8fr) minmax(0,1.4fr)",
            gap: 12,
            padding: "10px 0",
            borderBottom: ultimo ? "none" : "1px solid rgba(148,163,184,.10)",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{label}</span>
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 750, minWidth: 0 }}>
            {valor || "-"}
          </span>
        </div>
      );

      return (
        <div
          style={{
            margin: "8px 4px 18px",
            border: "1px solid rgba(96,165,250,.28)",
            borderRadius: 14,
            background: "rgba(8,15,30,.96)",
            boxShadow: "0 16px 38px rgba(0,0,0,.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "17px 18px 4px",
            }}
          >
            <h3 style={{ margin: 0, color: "#f8fafc", fontSize: 20 }}>
              {membro.nome || "Membro sem nome"}
            </h3>
          </div>

          <div
            style={{
              padding: 18,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(280px,.72fr) minmax(0,1.45fr)",
              gap: 14,
              alignItems: "start",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(148,163,184,.12)",
                borderRadius: 12,
                background: "rgba(15,23,42,.48)",
                padding: 14,
              }}
            >
              {editando ? (
                <>
                  <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: 14, marginBottom: 12 }}>
                    ✎ Editar informações do membro
                  </div>
                  <div style={{ display: "grid", gap: 11 }}>
                    <div>
                      <label style={labelStyle}>Nome</label>
                      <input
                        value={String(rascunho.nome || "")}
                        onChange={(e) => setRascunhoMembroEdicao((atual) => ({ ...(atual || {}), nome: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Número / WhatsApp</label>
                      <input
                        value={String(rascunho.telefone || "")}
                        onChange={(e) => setRascunhoMembroEdicao((atual) => ({ ...(atual || {}), telefone: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Observação interna</label>
                      <textarea
                        value={String(rascunho.observacao || "")}
                        onChange={(e) => setRascunhoMembroEdicao((atual) => ({ ...(atual || {}), observacao: e.target.value }))}
                        placeholder="Adicione uma observação sobre este membro..."
                        style={{ ...textareaStyle, minHeight: 90, marginTop: 6 }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={cancelarEdicaoMembro}
                        disabled={salvandoEdicaoMembro}
                        style={botaoSecundarioStyle}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => salvarEdicaoMembro(membro)}
                        disabled={salvandoEdicaoMembro}
                        style={{ ...botaoPrimarioStyle, opacity: salvandoEdicaoMembro ? .65 : 1 }}
                      >
                        {salvandoEdicaoMembro ? "Salvando..." : "Salvar alterações"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                    👤 Informações principais
                  </div>
                  {infoLinha("Nome", membro.nome || "-")}
                  {infoLinha("Telefone", membro.telefone || "-")}
                  {infoLinha("Nascimento", formatarDataBR(membro.data_nascimento) || "-")}
                  {infoLinha(
                    "Idade",
                    <span style={{ color: membro.idade_inconsistente ? "#fca5a5" : "#e2e8f0" }}>
                      {membro.idade ?? "-"} anos
                      {membro.idade_inconsistente ? "  ⚠ conferir faixa etária" : ""}
                    </span>
                  )}
                  {infoLinha("Data da ficha", formatarSomenteDataHistorico(membro.data_ficha), true)}

                  <div style={{ borderTop: "1px solid rgba(148,163,184,.12)", marginTop: 8, paddingTop: 12 }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                      Observação interna
                    </div>
                    <div style={{ color: membro.observacao ? "#cbd5e1" : "#64748b", fontSize: 12, lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap" }}>
                      {membro.observacao || "Nenhuma observação registrada."}
                    </div>
                  </div>

                  {(telefoneWhatsApp || podeGerenciarMembros(usuarioLogado)) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          telefoneWhatsApp && podeGerenciarMembros(usuarioLogado)
                            ? "minmax(0,.8fr) minmax(0,1.15fr)"
                            : "1fr",
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      {telefoneWhatsApp && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${telefoneWhatsApp}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          style={{
                            ...botaoSecundarioStyle,
                            padding: "9px 10px",
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          WhatsApp
                        </button>
                      )}
                      {podeGerenciarMembros(usuarioLogado) && (
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoMembro(membro)}
                          style={{
                            ...botaoPrimarioStyle,
                            padding: "9px 10px",
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          ✎ Editar membro
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {podeGerenciarMembros(usuarioLogado) && (
                <div
                  style={{
                    border: "1px solid rgba(37,211,102,.20)",
                    borderRadius: 12,
                    background: "rgba(7,24,20,.48)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: 14 }}>
                        💬 Chamada pelo WhatsApp
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>
                        Envio manual integrado à ficha. Após enviar, o status vira 01 ou 02 automaticamente.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 900,
                          background: whatsappPronto
                            ? "rgba(34,197,94,.18)"
                            : whatsappBridge.state === "qr"
                            ? "rgba(245,158,11,.18)"
                            : "rgba(239,68,68,.15)",
                          color: whatsappPronto
                            ? "#86efac"
                            : whatsappBridge.state === "qr"
                            ? "#fcd34d"
                            : "#fca5a5",
                        }}
                      >
                        {whatsappPronto
                          ? "Conectado"
                          : whatsappBridge.state === "qr"
                          ? "Aguardando QR"
                          : "Offline"}
                      </span>
                      <button
                        type="button"
                        onClick={() => carregarStatusWhatsappBridge(true)}
                        disabled={carregandoWhatsappBridge}
                        style={{ ...botaoSecundarioStyle, padding: "6px 9px", fontSize: 11 }}
                      >
                        {carregandoWhatsappBridge ? "..." : "↻"}
                      </button>
                    </div>
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 9 }}>
                    {whatsappBridge.detail}
                    {whatsappBridge.numero ? ` • ${whatsappBridge.numero}` : ""}
                  </div>

                  {whatsappBridge.state === "qr" && whatsappBridge.qr_data_url && (
                    <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <img
                        src={whatsappBridge.qr_data_url}
                        alt="QR Code do WhatsApp"
                        style={{ width: 180, height: 180, borderRadius: 10, background: "white", padding: 6 }}
                      />
                      <div style={{ color: "#cbd5e1", fontSize: 12, maxWidth: 300, lineHeight: 1.55 }}>
                        No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho.
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "210px minmax(0,1fr)",
                      gap: 10,
                      marginTop: 13,
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Tipo de mensagem</label>
                      <select
                        value={tipoMensagemWhatsapp}
                        onChange={(e) => setTipoMensagemWhatsapp(e.target.value as "01" | "02")}
                        style={inputStyle}
                      >
                        <option value="01">01 — Confirmação da ficha</option>
                        <option value="02">02 — Correção da ficha</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Prévia para {membro.nome || "o membro"}</label>
                      <div
                        style={{
                          border: "1px solid rgba(148,163,184,.14)",
                          borderRadius: 10,
                          background: "rgba(2,6,23,.54)",
                          color: "#dbeafe",
                          padding: 11,
                          minHeight: 86,
                          maxHeight: 180,
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {previewWhatsappAtual}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => enviarChamadaWhatsapp(membro)}
                      disabled={!whatsappPronto || enviandoWhatsappMembroId === membro.id || !membro.telefone}
                      style={{
                        ...botaoPrimarioStyle,
                        opacity:
                          !whatsappPronto || enviandoWhatsappMembroId === membro.id || !membro.telefone
                            ? 0.55
                            : 1,
                      }}
                    >
                      {enviandoWhatsappMembroId === membro.id
                        ? "Enviando..."
                        : `Enviar ${tipoMensagemWhatsapp} pelo WhatsApp`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarConfigMensagensWhatsapp((valor) => !valor)}
                      style={botaoSecundarioStyle}
                    >
                      {mostrarConfigMensagensWhatsapp ? "Fechar mensagens-base" : "Editar mensagens-base"}
                    </button>
                  </div>

                  {mostrarConfigMensagensWhatsapp && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                        gap: 10,
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(148,163,184,.12)",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Mensagem 01 — confirmação</label>
                        <textarea
                          value={mensagemWhatsapp01}
                          onChange={(e) => setMensagemWhatsapp01(e.target.value)}
                          style={{ ...textareaStyle, minHeight: 170 }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Mensagem 02 — correção da ficha</label>
                        <textarea
                          value={mensagemWhatsapp02}
                          onChange={(e) => setMensagemWhatsapp02(e.target.value)}
                          style={{ ...textareaStyle, minHeight: 170 }}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ color: "#64748b", fontSize: 11 }}>
                          Campos disponíveis: {`{nome}`}, {`{responsavel}`} e {`{cargo}`}.
                        </span>
                        <button type="button" onClick={salvarMensagensBaseWhatsapp} style={botaoPrimarioStyle}>
                          Salvar mensagens-base
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  border: "1px solid rgba(148,163,184,.12)",
                  borderRadius: 12,
                  background: "rgba(15,23,42,.48)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: 14 }}>
                      ◷ Atividade do membro
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
                      Alterações, entradas, saídas, banimentos e andamento do atendimento.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => membro.id && recarregarHistoricoMembro(membro.id)}
                    style={{ ...botaoSecundarioStyle, padding: "6px 9px", fontSize: 11 }}
                  >
                    ↻ Atualizar
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {[
                    ["↩", String(entradasRegistradas), "Entradas registradas", "#34d399"],
                    ["↪", String(saidasRegistradas), "Saídas registradas", "#f87171"],
                    ["⛔", foiBanido ? "Sim" : "Não", "Banimento", foiBanido ? "#fb7185" : "#94a3b8"],
                  ].map(([icone, valor, label, color]) => (
                    <div
                      key={String(label)}
                      style={{
                        border: "1px solid rgba(148,163,184,.10)",
                        borderRadius: 10,
                        padding: 10,
                        background: "rgba(2,6,23,.36)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: String(color), fontSize: 15 }}>{icone}</span>
                        <strong style={{ color: "#f8fafc", fontSize: 17 }}>{valor}</strong>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    border: "1px solid rgba(96,165,250,.16)",
                    borderRadius: 10,
                    background: "#050b16",
                    minHeight: 188,
                    maxHeight: 320,
                    overflowY: "auto",
                    padding: "10px 12px",
                    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
                  }}
                >
                  {carregandoHistoricoMembro ? (
                    <div style={{ color: "#64748b", fontSize: 12 }}>Carregando histórico...</div>
                  ) : eventosAtividade.length ? (
                    eventosAtividade.map((evento, idx) => (
                      <div
                        key={evento.id || `${evento.data}-${idx}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "92px minmax(0,1fr)" : "104px minmax(0,1fr)",
                          gap: 10,
                          padding: "7px 2px",
                          borderBottom: idx === eventosAtividade.length - 1 ? "none" : "1px solid rgba(148,163,184,.06)",
                          lineHeight: 1.45,
                        }}
                      >
                        <span style={{ color: corEventoMembro(evento), fontSize: 11, fontWeight: 800 }}>
                          {formatarSomenteDataHistorico(evento.data)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#cbd5e1", fontSize: 11 }}>
                            — {descricaoEventoMembro(evento)}
                          </div>
                          <div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>
                            por {evento.usuario || "Sistema"}
                            {evento.cargo ? ` • ${evento.cargo}` : ""}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 12, padding: "8px 2px" }}>
                      Nenhuma movimentação registrada ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>
              {usuarioLogado?.cargo === "analista_rr"
                ? "Recepção e Remoção"
                : "Membros"}
            </div>
            <h1 style={pageTitleDarkStyle}>
              {usuarioLogado?.cargo === "analista_rr"
                ? "Central de RR"
                : "Central de Membros"}
            </h1>
            <p style={{ color: "#94a3b8", margin: "7px 0 0" }}>
              Dados sincronizados com a planilha do formulário da DubWorks.
              {ultimaSincronizacaoMembros
                ? ` Última sincronização: ${ultimaSincronizacaoMembros.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`
                : " Sincronização automática ativa a cada 15 segundos."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {filaWhatsappAtiva ? (
              <button
                type="button"
                onClick={pararFilaChamadasWhatsapp}
                style={{ ...botaoSecundarioStyle, borderColor: "rgba(248,113,113,.45)", color: "#fecaca" }}
              >
                ■ Parar fila WhatsApp
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void iniciarFilaChamadasWhatsapp()}
                disabled={totalAtendimentoPendente === 0}
                style={{
                  ...botaoPrimarioStyle,
                  opacity: totalAtendimentoPendente === 0 ? 0.55 : 1,
                  cursor: totalAtendimentoPendente === 0 ? "not-allowed" : "pointer",
                }}
                title="Chama automaticamente os membros marcados como Chamar, com intervalo aleatório de até 5 minutos."
              >
                ▶ Chamar pendentes ({totalAtendimentoPendente})
              </button>
            )}
            <button
              onClick={baixarBackupMembrosJSON}
              style={botaoSecundarioStyle}
              title="Baixa uma cópia local dos dados atualmente carregados na Central."
            >
              Baixar backup
            </button>
            <button
              onClick={async () => {
                await recarregarMembros(true);
                if (membroSelecionadoId) {
                  await recarregarHistoricoMembro(membroSelecionadoId);
                }
                alert("Membros sincronizados com a planilha.");
              }}
              style={botaoPrimarioStyle}
            >
              Sincronizar planilha
            </button>
          </div>
        </div>

        {(filaWhatsappAtiva || filaWhatsappResumo) && (
          <div
            style={{
              ...painelDarkStyle,
              border: "1px solid rgba(37,211,102,.25)",
              background: "rgba(5,46,22,.18)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ color: "#bbf7d0" }}>💬 Fila de chamadas do WhatsApp</strong>
              {filaWhatsappAtiva && (
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  {filaWhatsappProcessados}/{filaWhatsappTotal} processados
                </span>
              )}
            </div>
            {filaWhatsappAtiva ? (
              <>
                <div style={{ color: "#e2e8f0", fontSize: 13 }}>{filaWhatsappAtual || "Preparando fila..."}</div>
                {filaWhatsappProximoEm !== null && (
                  <div style={{ color: "#86efac", fontSize: 12 }}>
                    Próximo envio em {formatarEsperaFilaWhatsapp(filaWhatsappProximoEm)}
                  </div>
                )}
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  Intervalo aleatório: 15 segundos a 5 minutos. A Mensagem 01 é usada para quem está em Chamar.
                </div>
              </>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{filaWhatsappResumo}</div>
            )}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0,1fr))"
              : "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <MiniStat
            icon="👥"
            value={String(membros.length)}
            label="Total de fichas"
            color="#38bdf8"
          />
          <MiniStat
            icon="✅"
            value={String(totalMembrosAtivos)}
            label="Na comunidade"
            color="#22c55e"
          />
          <MiniStat
            icon="📢"
            value={String(totalMembrosCanais)}
            label="Somente canais"
            color="#38bdf8"
          />
          <MiniStat
            icon="↪"
            value={String(totalMembrosSaida)}
            label="Saíram"
            color="#f97316"
          />
          <MiniStat
            icon="🚫"
            value={String(totalMembrosBanidos)}
            label="Banidos"
            color="#ef4444"
          />
          <MiniStat
            icon="💬"
            value={String(totalAtendimentoPendente)}
            label="Aguardando contato"
            color="#f59e0b"
          />
        </div>

        <div style={painelDarkStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(250px, 1.5fr) repeat(4, minmax(140px, 0.75fr)) auto",
              gap: 10,
              alignItems: "end",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Busca</div>
              <input
                placeholder="Nome, telefone, status ou atendimento..."
                value={queryMembros}
                onChange={(e) => setQueryMembros(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Status</div>
              <select
                value={statusMembrosFiltro}
                onChange={(e) =>
                  setStatusMembrosFiltro(
                    e.target.value as
                      | "todos"
                      | "na_comunidade"
                      | "somente_canais"
                      | "saiu"
                      | "banido"
                  )
                }
                style={inputStyle}
              >
                <option value="todos">Todos</option>
                <option value="na_comunidade">Na comunidade</option>
                <option value="somente_canais">Somente canais</option>
                <option value="saiu">Saiu</option>
                <option value="banido">Banido</option>
              </select>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Atendimento</div>
              <select
                value={atendimentoMembrosFiltro}
                onChange={(e) =>
                  setAtendimentoMembrosFiltro(
                    e.target.value as AtendimentoMembro | "todos"
                  )
                }
                style={inputStyle}
              >
                <option value="todos">Todos</option>
                <option value="chamar">Chamar</option>
                <option value="01">01</option>
                <option value="02">02</option>
                <option value="concluido">Concluído</option>
                <option value="erro">Erro</option>
              </select>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Faixa etária</div>
              <select
                value={faixaEtariaMembrosFiltro}
                onChange={(e) => setFaixaEtariaMembrosFiltro(e.target.value)}
                style={inputStyle}
              >
                <option value="todos">Todas</option>
                {faixasEtariasMembros.map((faixa) => (
                  <option key={faixa} value={faixa}>
                    {faixa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>Ordenar por</div>
              <select
                value={ordenacaoMembros}
                onChange={(e) =>
                  setOrdenacaoMembros(
                    e.target.value as "recentes" | "antigos" | "nome_az" | "nome_za"
                  )
                }
                style={inputStyle}
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="nome_az">Nome A-Z</option>
                <option value="nome_za">Nome Z-A</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setQueryMembros("");
                setStatusMembrosFiltro("todos");
                setAtendimentoMembrosFiltro("todos");
                setFaixaEtariaMembrosFiltro("todos");
                setOrdenacaoMembros("recentes");
              }}
              style={{ ...botaoSecundarioStyle, minHeight: 42, whiteSpace: "nowrap" }}
            >
              Limpar filtros
            </button>
          </div>

          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>
            {membrosFiltrados.length} de {membros.length} ficha(s) exibida(s).
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Nome",
                    "Telefone",
                    "Idade",
                    "Entrada",
                    "Status",
                    "Atendimento",
                  ].map((h) => (
                    <th key={h} style={tabelaHeaderDarkStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membrosFiltrados.slice(0, 80).map((m) => {
                  const cor = paletaStatusMembroTag(m.status);
                  const corAtendimento = paletaAtendimentoMembroTag(m.atendimento);
                  const selecionado = membroSelecionadoId === m.id;

                  return (
                    <React.Fragment key={m.id || m.nome}>
                      <tr
                        onClick={() => selecionarMembroTabela(m)}
                        style={{
                          borderBottom: "1px solid rgba(148,163,184,0.10)",
                          cursor: "pointer",
                          background: selecionado
                            ? "rgba(37,99,235,0.18)"
                            : "transparent",
                        }}
                      >
                        <td
                          style={{
                            ...tabelaCellDarkStyle,
                            fontWeight: 800,
                            maxWidth: 280,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                color: selecionado ? "#60a5fa" : "#64748b",
                                fontSize: 10,
                              }}
                            >
                              {selecionado ? "▼" : "▶"}
                            </span>
                            <span>{m.nome || "(sem nome)"}</span>
                            {m.idade_inconsistente && (
                              <span
                                title="Idade e faixa etária não conferem."
                                style={{
                                  color: "#fca5a5",
                                  fontSize: 12,
                                }}
                              >
                                ⚠
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={tabelaCellDarkStyle}>
                          {m.telefone || "-"}
                        </td>
                        <td style={tabelaCellDarkStyle}>{m.idade ?? "-"}</td>
                        <td style={tabelaCellDarkStyle}>
                          {formatarDataBR(m.data_entrada) || "-"}
                        </td>
                        <td
                          style={tabelaCellDarkStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            className={`dw-member-tag-select dw-member-status-${m.status}`}
                            value={m.status}
                            onChange={(e) =>
                              alterarStatusMembro(
                                m,
                                e.target.value as StatusMembro
                              )
                            }
                            style={estiloSelectStatus(cor.bg, cor.color, cor.border)}
                          >
                            <option value="nao_definido">Não definido</option>
                            <option value="na_comunidade">
                              Comunidade
                            </option>
                            <option value="somente_canais">
                              Canais
                            </option>
                            <option value="saiu">Saiu</option>
                            <option value="banido">Ban</option>
                            <option value="pausado">Pausado</option>
                          </select>
                        </td>
                        <td
                          style={tabelaCellDarkStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            className={`dw-member-tag-select dw-member-atendimento-${String(m.atendimento || "chamar").replace(/[^a-zA-Z0-9_-]/g, "")}`}
                            value={String(m.atendimento || "chamar")}
                            onChange={(e) =>
                              alterarAtendimentoMembro(
                                m,
                                e.target.value as AtendimentoMembro
                              )
                            }
                            style={estiloSelectStatus(
                              corAtendimento.bg,
                              corAtendimento.color,
                              corAtendimento.border
                            )}
                          >
                            <option value="chamar">Chamar</option>
                            <option value="01">01</option>
                            <option value="02">02</option>
                            <option value="concluido">Concluído</option>
                            <option value="erro">Erro</option>
                          </select>
                        </td>
                      </tr>

                      {selecionado && (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: 0,
                              borderBottom:
                                "1px solid rgba(148,163,184,0.10)",
                            }}
                          >
                            {renderDetalhesMembro(m)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {membrosFiltrados.length > 80 && (
              <div
                style={{
                  color: "#94a3b8",
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                Mostrando 80 de {membrosFiltrados.length}. Use a busca para
                filtrar.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const UsersPage = () => {
    const chaveUsuario = (usuario: Usuario) =>
      String(usuario.id || usuario.login || usuario.nome);

    const cargosFiltroDisponiveis = Array.from(
      new Set(usuariosVisiveis.map((usuario) => usuario.cargo))
    ).sort((a, b) =>
      cargoLabel(a).localeCompare(cargoLabel(b), "pt-BR", {
        sensitivity: "base",
      })
    );

    const termoUsuario = normalizar(queryUsuarios);
    const usuariosLista = usuariosVisiveis.filter((usuario) => {
      const correspondeNome =
        !termoUsuario || normalizar(usuario.nome).includes(termoUsuario);
      const correspondeCargo =
        cargoFiltroUsuarios === "Todos" ||
        usuario.cargo === cargoFiltroUsuarios;
      return correspondeNome && correspondeCargo;
    });

    const alternarUsuario = (usuario: Usuario) => {
      const chave = chaveUsuario(usuario);
      const vaiFechar = usuarioExpandidoId === chave;
      setUsuarioExpandidoId(vaiFechar ? null : chave);
      setUsuarioEditandoId(null);
      setUsuarioEdicao(null);
      setMostrarFormNovoUsuario(false);
    };

    const podeEditarPermissoes = podeGerenciarUsuarios(usuarioLogado);

    const podeEditarDadosUsuario = (usuario: Usuario) => {
      if (!usuarioLogado || !podeGerenciarUsuarios(usuarioLogado)) return false;
      if (
        usuario.cargo === "diretoria" &&
        usuarioLogado.cargo !== "diretoria"
      ) {
        return false;
      }
      return true;
    };

    const iniciarEdicaoUsuario = (usuario: Usuario) => {
      setUsuarioEditandoId(chaveUsuario(usuario));
      setUsuarioEdicao({ ...usuario });
    };

    const cancelarEdicaoUsuario = () => {
      setUsuarioEditandoId(null);
      setUsuarioEdicao(null);
    };

    const salvarEdicaoUsuario = async (alvo: Usuario) => {
      if (!usuarioEdicao || !podeEditarDadosUsuario(alvo)) return;

      const nome = usuarioEdicao.nome.trim();
      const vinculo = String(usuarioEdicao.vinculo || "").trim();
      if (!nome) {
        alert("Informe o nome do usuário.");
        return;
      }

      const cargo = usuarioEdicao.cargo;
      const training_status: TrainingStatus =
        cargo === "lider_treinamento"
          ? usuarioEdicao.training_status || "em_andamento"
          : cargo === "lider"
            ? usuarioEdicao.training_status || "nao_aplicavel"
            : "nao_aplicavel";

      const atualizado: Usuario = {
        ...alvo,
        nome,
        cargo,
        vinculo,
        training_status,
      };

      if (READ_ONLY_MODE) {
        setUsuarios((lista) =>
          lista.map((usuario) =>
            chaveUsuario(usuario) === chaveUsuario(alvo) ? atualizado : usuario
          )
        );
        setUsuarioEdicao(atualizado);
        setUsuarioEditandoId(null);
        alert(
          "Modo teste: alteração aplicada somente nesta tela. O Supabase original não foi modificado."
        );
        return;
      }

      if (!alvo.id) {
        alert("Não foi possível identificar esse usuário no banco.");
        return;
      }

      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: atualizado.nome,
          cargo: atualizado.cargo,
          vinculo: atualizado.vinculo,
          training_status: atualizado.training_status,
        })
        .eq("id", alvo.id);

      if (error) {
        console.error("Erro ao editar usuário:", error);
        alert("Não consegui salvar as alterações do usuário.");
        return;
      }

      setUsuarios((lista) =>
        lista.map((usuario) =>
          chaveUsuario(usuario) === chaveUsuario(alvo) ? atualizado : usuario
        )
      );
      setUsuarioEdicao(atualizado);
      setUsuarioEditandoId(null);
      alert("Usuário atualizado com sucesso.");
    };

    const iconePermissao = (chave: ChavePermissao) => {
      const icones: Partial<Record<ChavePermissao, string>> = {
        acesso_projetos: "▣",
        acesso_membros: "♟",
        acesso_usuarios: "♙",
        acesso_advertencias: "△",
        acesso_eventos: "▦",
        acesso_aprovacao_eventos: "✓",
        acesso_projetos_finalizados: "◈",
        acesso_relatorios_projetos: "▥",
        acesso_relatorios_elenco: "▤",
        acesso_relatorios_membros: "▧",
        acesso_relatorios_entrada_saida: "↔",
        acesso_exportacoes: "⇩",
        acesso_treinamentos: "◇",
      };
      return icones[chave] || "•";
    };

    const renderDetalheInline = (usuario: Usuario) => {
      const inicial = String(usuario.nome || usuario.login || "U")
        .trim()
        .charAt(0)
        .toUpperCase();
      const permitidoCount = permissoesDisponiveis.filter((item) =>
        temAcesso(usuario, item.chave)
      ).length;
      const editando =
        usuarioEditandoId === chaveUsuario(usuario) && Boolean(usuarioEdicao);
      const cargosEditaveis = Array.from(
        new Set([
          ...cargosPermitidosParaCriar(usuarioLogado),
          usuario.cargo,
        ])
      );

      return (
        <div
          style={{
            margin: isMobile ? "0 8px 10px" : "0 12px 12px",
            padding: isMobile ? 13 : 16,
            borderRadius: 15,
            border: "1px solid rgba(56,189,248,.24)",
            background:
              "linear-gradient(180deg, rgba(15,35,66,.72), rgba(8,18,36,.78))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.02)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(260px, 1.25fr) repeat(3, minmax(120px, .6fr)) auto",
              alignItems: "center",
              gap: isMobile ? 12 : 0,
              paddingBottom: 15,
              borderBottom: "1px solid rgba(148,163,184,.12)",
            }}
          >
            <div
              style={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingRight: isMobile ? 0 : 18,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                  color: "#dbeafe",
                  fontSize: 17,
                  fontWeight: 950,
                  background:
                    "linear-gradient(145deg, rgba(59,130,246,.38), rgba(30,41,59,.95))",
                  border: "1px solid rgba(96,165,250,.24)",
                }}
              >
                {inicial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#f8fafc",
                    fontSize: 16,
                    fontWeight: 950,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {usuario.nome || "Usuário sem nome"}
                </div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                    marginTop: 4,
                    overflowWrap: "anywhere",
                  }}
                >
                  {usuario.login || "E-mail não informado"}
                </div>
              </div>
            </div>

            {[
              ["Cargo", cargoLabel(usuario.cargo)],
              ["Vínculo", usuario.vinculo || "Não informado"],
              ["Treinamento", statusTreinamentoLabel(usuario.training_status)],
            ].map(([titulo, valor], index) => (
              <div
                key={titulo}
                style={{
                  minWidth: 0,
                  padding: isMobile ? "10px 0 0" : "2px 16px",
                  borderLeft:
                    !isMobile && index >= 0
                      ? "1px solid rgba(148,163,184,.14)"
                      : undefined,
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 750 }}>
                  {titulo}
                </div>
                <div
                  style={{
                    color: "#e2e8f0",
                    fontSize: 12,
                    fontWeight: 850,
                    marginTop: 5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={String(valor)}
                >
                  {valor}
                </div>
              </div>
            ))}

            {podeEditarDadosUsuario(usuario) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: isMobile ? "flex-start" : "flex-end",
                  alignItems: "center",
                  paddingLeft: isMobile ? 0 : 14,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    editando
                      ? cancelarEdicaoUsuario()
                      : iniciarEdicaoUsuario(usuario)
                  }
                  style={{
                    ...botaoSecundarioStyle,
                    padding: "8px 11px",
                    whiteSpace: "nowrap",
                    borderColor: editando
                      ? "rgba(248,113,113,.30)"
                      : "rgba(96,165,250,.28)",
                    color: editando ? "#fecaca" : "#bfdbfe",
                  }}
                >
                  {editando ? "Cancelar edição" : "✎ Editar usuário"}
                </button>
              </div>
            )}
          </div>

          {editando && usuarioEdicao && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 13,
                border: "1px solid rgba(96,165,250,.20)",
                background: "rgba(15,23,42,.58)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: 13,
                      fontWeight: 950,
                    }}
                  >
                    Editar usuário
                  </div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    Altere os dados internos do perfil. O e-mail de acesso não é alterado por aqui.
                  </div>
                </div>

                {READ_ONLY_MODE && (
                  <span
                    style={{
                      color: "#fbbf24",
                      fontSize: 10,
                      fontWeight: 850,
                    }}
                  >
                    Simulação local · Supabase protegido
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input
                    value={usuarioEdicao.nome}
                    onChange={(e) =>
                      setUsuarioEdicao({
                        ...usuarioEdicao,
                        nome: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input
                    value={usuarioEdicao.login}
                    readOnly
                    style={{
                      ...inputStyle,
                      opacity: 0.72,
                      cursor: "not-allowed",
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Cargo</label>
                  <select
                    value={usuarioEdicao.cargo}
                    onChange={(e) => {
                      const cargo = e.target.value as Cargo;
                      setUsuarioEdicao({
                        ...usuarioEdicao,
                        cargo,
                        training_status:
                          cargo === "lider_treinamento"
                            ? usuarioEdicao.training_status === "nao_aplicavel"
                              ? "em_andamento"
                              : usuarioEdicao.training_status || "em_andamento"
                            : cargo === "lider"
                              ? usuarioEdicao.training_status || "nao_aplicavel"
                              : "nao_aplicavel",
                      });
                    }}
                    style={inputStyle}
                  >
                    {cargosEditaveis.map((cargo) => (
                      <option key={cargo} value={cargo}>
                        {cargoLabel(cargo)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Vínculo</label>
                  <input
                    value={usuarioEdicao.vinculo || ""}
                    onChange={(e) =>
                      setUsuarioEdicao({
                        ...usuarioEdicao,
                        vinculo: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                {(usuarioEdicao.cargo === "lider_treinamento" ||
                  usuarioEdicao.cargo === "lider") && (
                  <div style={{ gridColumn: isMobile ? undefined : "1 / 2" }}>
                    <label style={labelStyle}>Treinamento</label>
                    <select
                      value={usuarioEdicao.training_status || "nao_aplicavel"}
                      onChange={(e) =>
                        setUsuarioEdicao({
                          ...usuarioEdicao,
                          training_status: e.target.value as TrainingStatus,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="nao_aplicavel">Não aplicável</option>
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="reprovado">Reprovado</option>
                    </select>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 9,
                  marginTop: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={cancelarEdicaoUsuario}
                  style={botaoSecundarioStyle}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void salvarEdicaoUsuario(usuario)}
                  style={botaoPrimarioStyle}
                >
                  Salvar alterações
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 13,
            }}
          >
            <div>
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: 13,
                  fontWeight: 950,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "#60a5fa" }}>▣</span>
                Permissões de Acesso
              </div>
              <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>
                {permitidoCount} de {permissoesDisponiveis.length} acessos permitidos.
              </div>
            </div>

            {READ_ONLY_MODE && (
              <div
                style={{
                  color: "#fbbf24",
                  fontSize: 10,
                  fontWeight: 800,
                  textAlign: "right",
                }}
              >
                Modo teste: alterações simuladas somente nesta tela.
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 8,
              marginTop: 12,
            }}
          >
            {permissoesDisponiveis.map((item) => {
              const permitido = temAcesso(usuario, item.chave);
              return (
                <button
                  key={item.chave}
                  type="button"
                  disabled={!podeEditarPermissoes}
                  onClick={() =>
                    atualizarPermissaoUsuario(usuario, item.chave, !permitido)
                  }
                  title={
                    podeEditarPermissoes
                      ? READ_ONLY_MODE
                        ? `Clique para ${permitido ? "bloquear" : "permitir"} este acesso nesta simulação. O Supabase original não será alterado.`
                        : `Clique para ${permitido ? "bloquear" : "permitir"} este acesso.`
                      : "Você não tem permissão para alterar este acesso."
                  }
                  style={{
                    appearance: "none",
                    minHeight: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 11,
                    border: permitido
                      ? "1px solid rgba(34,197,94,.20)"
                      : "1px solid rgba(248,113,113,.16)",
                    background: permitido
                      ? "rgba(21,128,61,.09)"
                      : "rgba(127,29,29,.08)",
                    color: "inherit",
                    textAlign: "left",
                    cursor: podeEditarPermissoes ? "pointer" : "default",
                    opacity: !podeEditarPermissoes ? 0.86 : 1,
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                        color: "#bfdbfe",
                        background: "rgba(30,41,59,.78)",
                        border: "1px solid rgba(148,163,184,.14)",
                        fontSize: 13,
                        fontWeight: 950,
                      }}
                    >
                      {iconePermissao(item.chave)}
                    </span>
                    <span
                      style={{
                        minWidth: 0,
                        color: "#e2e8f0",
                        fontSize: 11,
                        fontWeight: 850,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      flex: "0 0 auto",
                      padding: "5px 8px",
                      borderRadius: 999,
                      color: permitido ? "#86efac" : "#fca5a5",
                      background: permitido
                        ? "rgba(22,101,52,.34)"
                        : "rgba(127,29,29,.34)",
                      border: permitido
                        ? "1px solid rgba(34,197,94,.17)"
                        : "1px solid rgba(248,113,113,.14)",
                      fontSize: 9,
                      fontWeight: 900,
                    }}
                  >
                    {permitido ? "✓ Permitido" : "× Bloqueado"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    const renderNovoUsuarioPanel = () => (
      <div
        style={{
          ...painelDarkStyle,
          minHeight: isMobile ? undefined : 620,
          padding: isMobile ? 16 : 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ color: "#f8fafc", fontSize: 19, fontWeight: 950 }}>
              Novo usuário
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Cadastre um novo acesso interno ao Manager.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormNovoUsuario(false)}
            style={{ ...botaoSecundarioStyle, padding: "8px 11px" }}
          >
            Fechar
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              value={novoUsuario.nome}
              onChange={(e) =>
                setNovoUsuario({ ...novoUsuario, nome: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>E-mail/Login</label>
            <input
              type="email"
              value={novoUsuario.login}
              onChange={(e) =>
                setNovoUsuario({ ...novoUsuario, login: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Senha inicial</label>
            <input
              type="password"
              value={novaSenhaUsuario}
              onChange={(e) => setNovaSenhaUsuario(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Cargo</label>
            <select
              value={novoUsuario.cargo}
              onChange={(e) => {
                const cargo = e.target.value as Cargo;
                setNovoUsuario({
                  ...novoUsuario,
                  cargo,
                  training_status: statusPadraoPorCargo(cargo),
                  ...permissoesPadraoUsuario(cargo),
                });
              }}
              style={inputStyle}
            >
              {cargosPermitidosParaCriar(usuarioLogado).map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargoLabel(cargo)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
            <label style={labelStyle}>Vínculo</label>
            <input
              value={novoUsuario.vinculo}
              onChange={(e) =>
                setNovoUsuario({ ...novoUsuario, vinculo: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid rgba(148,163,184,.12)",
          }}
        >
          <div style={{ color: "#e2e8f0", fontWeight: 900, fontSize: 13 }}>
            Permissões iniciais
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 9,
              marginTop: 10,
            }}
          >
            {permissoesDisponiveis.map((item) => (
              <label
                key={item.chave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "10px 11px",
                  borderRadius: 11,
                  border: "1px solid rgba(148,163,184,.13)",
                  background: "rgba(15,23,42,.52)",
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(novoUsuario[item.chave])}
                  onChange={(e) =>
                    setNovoUsuario({
                      ...novoUsuario,
                      [item.chave]: e.target.checked,
                    })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setMostrarFormNovoUsuario(false)}
            style={botaoSecundarioStyle}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={criarUsuario}
            style={{
              ...botaoPrimarioStyle,
              opacity: READ_ONLY_MODE ? 0.62 : 1,
              cursor: READ_ONLY_MODE ? "not-allowed" : "pointer",
            }}
            title={
              READ_ONLY_MODE
                ? "Bloqueado no modo teste para proteger o Supabase original."
                : undefined
            }
          >
            Salvar usuário
          </button>
        </div>

        {READ_ONLY_MODE && (
          <div
            style={{
              marginTop: 12,
              color: "#fbbf24",
              fontSize: 11,
              fontWeight: 750,
              textAlign: "right",
            }}
          >
            Modo teste: o cadastro pode ser preenchido, mas não será enviado ao Supabase.
          </div>
        )}
      </div>
    );


    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            ...painelDarkStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            flexDirection: isMobile ? "column" : "row",
            gap: 12,
            padding: isMobile ? 16 : 20,
          }}
        >
          <div>
            <div
              style={{
                color: "#f8fafc",
                fontSize: isMobile ? 19 : 22,
                fontWeight: 950,
              }}
            >
              Controle de Usuários e Permissões
            </div>
            <div style={{ color: "#94a3b8", marginTop: 5, fontSize: 12 }}>
              Gerencie cargos, permissões e acessos internos do sistema. Clique em um usuário para visualizar suas permissões.
            </div>
          </div>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button onClick={recarregarUsuarios} style={botaoSecundarioStyle}>
              ↻ Atualizar
            </button>
            <button
              onClick={() => {
                setMostrarFormNovoUsuario((atual) => !atual);
                setUsuarioExpandidoId(null);
                setUsuarioEditandoId(null);
                setUsuarioEdicao(null);
              }}
              style={botaoPrimarioStyle}
            >
              + Novo usuário
            </button>
          </div>
        </div>

        {mostrarFormNovoUsuario && renderNovoUsuarioPanel()}

        <div
          style={{
            ...painelDarkStyle,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(260px, 1fr) minmax(180px, 260px) auto",
              gap: 10,
              alignItems: "end",
              padding: isMobile ? 12 : "13px 16px",
              borderBottom: "1px solid rgba(148,163,184,.12)",
              background:
                "linear-gradient(180deg, rgba(15,23,42,.48), rgba(15,23,42,.22))",
            }}
          >
            <div>
              <label style={labelStyle}>Pesquisar por nome</label>
              <input
                value={queryUsuarios}
                onChange={(e) => setQueryUsuarios(e.target.value)}
                placeholder="Digite o nome do usuário..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Cargo</label>
              <select
                value={cargoFiltroUsuarios}
                onChange={(e) =>
                  setCargoFiltroUsuarios(e.target.value as "Todos" | Cargo)
                }
                style={inputStyle}
              >
                <option value="Todos">Todos os cargos</option>
                {cargosFiltroDisponiveis.map((cargo) => (
                  <option key={cargo} value={cargo}>
                    {cargoLabel(cargo)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setQueryUsuarios("");
                setCargoFiltroUsuarios("Todos");
              }}
              disabled={!queryUsuarios && cargoFiltroUsuarios === "Todos"}
              style={{
                ...botaoSecundarioStyle,
                height: 42,
                opacity:
                  !queryUsuarios && cargoFiltroUsuarios === "Todos" ? 0.5 : 1,
                cursor:
                  !queryUsuarios && cargoFiltroUsuarios === "Todos"
                    ? "default"
                    : "pointer",
              }}
            >
              Limpar filtros
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "minmax(0, 1fr) 90px 28px"
                : "minmax(220px, .8fr) minmax(300px, 1.85fr) minmax(120px, .7fr) 32px",
              gap: 10,
              alignItems: "center",
              padding: isMobile ? "11px 12px" : "13px 16px",
              color: "#cbd5e1",
              fontSize: 11,
              fontWeight: 900,
              borderBottom: "1px solid rgba(148,163,184,.15)",
              background: "rgba(15,23,42,.34)",
            }}
          >
            <span>Nome</span>
            {!isMobile && <span>E-mail</span>}
            <span>Cargo</span>
            <span />
          </div>

          {usuariosLista.length === 0 ? (
            <div
              style={{
                padding: 30,
                color: "#94a3b8",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              Nenhum usuário encontrado.
            </div>
          ) : (
            usuariosLista.map((usuario) => {
              const chave = chaveUsuario(usuario);
              const expandido = usuarioExpandidoId === chave;

              return (
                <div
                  key={chave}
                  style={{
                    borderBottom: "1px solid rgba(148,163,184,.10)",
                    background: expandido
                      ? "linear-gradient(90deg, rgba(37,99,235,.12), rgba(15,23,42,.18))"
                      : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => alternarUsuario(usuario)}
                    aria-expanded={expandido}
                    style={{
                      appearance: "none",
                      width: "100%",
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "minmax(0, 1fr) 90px 28px"
                        : "minmax(220px, .8fr) minmax(300px, 1.85fr) minmax(120px, .7fr) 32px",
                      gap: 10,
                      alignItems: "center",
                      padding: isMobile ? "12px" : "13px 16px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "#f8fafc",
                          fontSize: 13,
                          fontWeight: 950,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {usuario.nome || "Sem nome"}
                      </div>
                      {isMobile && (
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 9,
                            marginTop: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {usuario.login}
                        </div>
                      )}
                    </div>

                    {!isMobile && (
                      <span
                        style={{
                          minWidth: 0,
                          color: "#e2e8f0",
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={usuario.login}
                      >
                        {usuario.login}
                      </span>
                    )}

                    <span
                      style={{
                        justifySelf: "start",
                        maxWidth: "100%",
                        padding: "5px 8px",
                        borderRadius: 999,
                        color: "#bfdbfe",
                        background: "rgba(37,99,235,.14)",
                        border: "1px solid rgba(96,165,250,.16)",
                        fontSize: 9,
                        fontWeight: 900,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cargoLabel(usuario.cargo)}
                    </span>

                    <span
                      aria-hidden="true"
                      style={{
                        justifySelf: "center",
                        color: expandido ? "#7dd3fc" : "#e2e8f0",
                        fontSize: 21,
                        fontWeight: 900,
                        lineHeight: 1,
                        transform: expandido ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform .18s ease, color .18s ease",
                      }}
                    >
                      ›
                    </span>
                  </button>

                  {expandido && renderDetalheInline(usuario)}
                </div>
              );
            })
          )}

          <div
            style={{
              padding: "11px 16px 13px",
              color: "#64748b",
              fontSize: 10,
            }}
          >
            {usuariosLista.length} de {usuariosVisiveis.length} usuário(s) exibido(s).
          </div>
        </div>
      </div>
    );
  };

  const ReportsPage = () => {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>Relatórios</div>
            <h1 style={pageTitleDarkStyle}>Relatórios</h1>
            <p style={{ color: "#94a3b8", margin: "7px 0 0", fontSize: 12 }}>
              Exporte os dados administrativos e o relatório atualizado dos projetos ativos.
            </p>
          </div>
        </div>

        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Exportações</h2>
          <p style={{ color: "#64748b", margin: "6px 0 14px", fontSize: 10 }}>
            Escolha o relatório que deseja gerar. As exportações apenas consultam os dados atuais do sistema.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <button onClick={exportarProjetosCSV} style={reportCardDarkStyle}>
              📌 Exportar Projetos
            </button>
            <button
              onClick={() => void exportarRelatorioProjetosAtivosCSV()}
              style={reportCardDarkStyle}
            >
              📋 Exportar Relatório dos Projetos
            </button>
            <button onClick={exportarElencoCSV} style={reportCardDarkStyle}>
              🎙️ Exportar Elenco
            </button>
            {podeGerenciarMembros(usuarioLogado) && (
              <button onClick={exportarMembrosCSV} style={reportCardDarkStyle}>
                👥 Exportar Membros
              </button>
            )}
            {podeGerenciarMembros(usuarioLogado) && (
              <button
                onClick={exportarRelatorioEntradaSaidaCSV}
                style={reportCardDarkStyle}
              >
                📊 Entrada e Saída
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const cardDarkStyle: React.CSSProperties = {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,.22)",
    background: "rgba(15,23,42,.72)",
    boxShadow: "0 18px 45px rgba(0,0,0,.18)",
  };

  const ToolsPage = () => {
    const ferramentas = [
      {
        id: "calendario" as const,
        icon: "📅",
        titulo: "Calendário",
        descricao:
          "Acompanhe datas de início, entregas, reuniões e compromissos da produção.",
        acao: "Abrir calendário",
        status: "Disponível",
      },
      {
        id: "chat" as const,
        icon: "💬",
        titulo: "Chat da equipe",
        descricao:
          "Espaço interno para a equipe conversar sem depender de mensagens espalhadas.",
        acao: "Abrir chat",
        status: "Disponível",
      },
      {
        id: "ia" as const,
        icon: "✦",
        titulo: "Assistente IA",
        descricao:
          "Área para organizar ideias, revisar textos e apoiar o planejamento dos projetos.",
        acao: "Abrir assistente",
        status: "Disponível",
      },
      {
        id: "editor" as const,
        icon: "✂",
        titulo: "Editor de vídeo",
        descricao:
          "Envie o episódio, marque os tempos e organize a lista de cortes do projeto.",
        acao: "Abrir editor",
        status: "Disponível",
      },
    ];

    const ferramentaAtiva = ferramentas.find(
      (item) => item.id === categoriaFerramentas
    );

    const cardFerramentaStyle: React.CSSProperties = {
      ...painelDarkStyle,
      minHeight: 220,
      padding: 22,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 18,
      overflow: "hidden",
    };

    const voltarFerramentas = () => setCategoriaFerramentas("inicio");

    const projetosDoCalendario = projetosVisiveis
      .map((projeto) => ({
        projeto,
        data: parseDataFlex(projeto.Data_Inicio),
      }))
      .filter(
        (
          item
        ): item is {
          projeto: Projeto;
          data: Date;
        } => Boolean(item.data)
      )
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    const hojeCalendario = new Date();
    const anoCalendario = hojeCalendario.getFullYear();
    const mesCalendario = hojeCalendario.getMonth();
    const primeiroDiaSemana = new Date(
      anoCalendario,
      mesCalendario,
      1
    ).getDay();
    const totalDiasMes = new Date(
      anoCalendario,
      mesCalendario + 1,
      0
    ).getDate();

    const diasCalendario = Array.from(
      { length: primeiroDiaSemana + totalDiasMes },
      (_, indice) =>
        indice < primeiroDiaSemana ? null : indice - primeiroDiaSemana + 1
    );

    const nomeMesCalendario = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(hojeCalendario);

    function renderCabecalhoFerramenta() {
      return (
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>
              Ferramentas › {ferramentaAtiva?.titulo || ""}
            </div>
            <h1 style={pageTitleDarkStyle}>
              {ferramentaAtiva?.icon} {ferramentaAtiva?.titulo}
            </h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              {ferramentaAtiva?.descricao}
            </p>
          </div>

          <button
            type="button"
            onClick={voltarFerramentas}
            style={botaoSecundarioGrandeStyle}
          >
            ← Voltar às ferramentas
          </button>
        </div>
      );
    }

    if (categoriaFerramentas === "editor") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <button
            type="button"
            onClick={voltarFerramentas}
            style={{
              ...botaoSecundarioStyle,
              width: "fit-content",
            }}
          >
            ← Voltar às ferramentas
          </button>

          <React.Suspense
            fallback={
              <div style={{ padding: 24, color: "#cbd5e1" }}>
                Carregando editor de cortes...
              </div>
            }
          >
            <CortesPage />
          </React.Suspense>
        </div>
      );
    }

    if (categoriaFerramentas === "calendario") {
      const projetosDoCalendarioAtual = projetosVisiveis
        .map((projeto) => ({
          projeto,
          data: parseDataFlex(projeto.Data_Inicio),
        }))
        .filter(
          (
            item
          ): item is {
            projeto: Projeto;
            data: Date;
          } => Boolean(item.data)
        );

      const eventosCombinados = [
        ...agendaEventos
          .filter((evento) => evento.status === "aprovado")
          .map((evento) => ({
          id: `agenda-${evento.id}`,
          tipo: "agenda" as const,
          titulo: evento.titulo,
          inicio: new Date(evento.inicio),
          fim: evento.fim ? new Date(evento.fim) : null,
          evento,
          projeto: evento.projeto_id
            ? projetosVisiveis.find(
                (projeto) =>
                  Number(projeto.ID) === Number(evento.projeto_id)
              ) || null
            : null,
          })),
        ...projetosDoCalendarioAtual.map(({ projeto, data }) => ({
          id: `projeto-${projeto.ID}`,
          tipo: "projeto" as const,
          titulo: projeto.Projeto,
          inicio: data,
          fim: null,
          evento: null,
          projeto,
        })),
      ]
        .filter((item) => !Number.isNaN(item.inicio.getTime()))
        .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

      const anoCalendario = dataReferenciaAgenda.getFullYear();
      const mesCalendario = dataReferenciaAgenda.getMonth();
      const primeiroDiaSemana = new Date(
        anoCalendario,
        mesCalendario,
        1
      ).getDay();
      const totalDiasMes = new Date(
        anoCalendario,
        mesCalendario + 1,
        0
      ).getDate();

      const diasCalendario = Array.from(
        { length: primeiroDiaSemana + totalDiasMes },
        (_, indice) =>
          indice < primeiroDiaSemana
            ? null
            : indice - primeiroDiaSemana + 1
      );

      const nomeMesCalendario = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(dataReferenciaAgenda);

      const referenciaSemana = new Date(dataReferenciaAgenda);
      const deslocamentoSegunda = (referenciaSemana.getDay() + 6) % 7;
      referenciaSemana.setDate(
        referenciaSemana.getDate() - deslocamentoSegunda
      );
      referenciaSemana.setHours(0, 0, 0, 0);

      const diasSemanaAgenda = Array.from({ length: 7 }, (_, indice) => {
        const data = new Date(referenciaSemana);
        data.setDate(referenciaSemana.getDate() + indice);
        return data;
      });

      const mesmoDia = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      const formatarHoraAgenda = (data: Date) =>
        data.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const formatarPeriodoAgenda = (
        inicio: Date,
        fim?: Date | null
      ) => {
        const inicioTexto = formatarHoraAgenda(inicio);
        if (!fim || Number.isNaN(fim.getTime())) return inicioTexto;
        return `${inicioTexto} — ${formatarHoraAgenda(fim)}`;
      };

      const abrirItemCalendario = (item: (typeof eventosCombinados)[number]) => {
        if (item.tipo === "agenda" && item.evento) {
          visualizarCompromissoAgenda(item.evento);
          return;
        }

        if (item.projeto) {
          abrirPaginaProjeto(item.projeto.ID);
          setMostrarFerramentas(false);
        }
      };

      const moverPeriodoAgenda = (direcao: -1 | 1) => {
        setDataReferenciaAgenda((anterior) => {
          const proxima = new Date(anterior);

          if (visualizacaoAgenda === "mes") {
            proxima.setMonth(proxima.getMonth() + direcao);
          } else if (visualizacaoAgenda === "semana") {
            proxima.setDate(proxima.getDate() + direcao * 7);
          } else {
            proxima.setMonth(proxima.getMonth() + direcao);
          }

          return proxima;
        });
      };

      const renderEventoCompacto = (
        item: (typeof eventosCombinados)[number]
      ) => (
        <button
          key={item.id}
          type="button"
          className="dw-calendar-event"
          onClick={() => abrirItemCalendario(item)}
          title={item.titulo}
          style={{
            width: "100%",
            border: item.tipo === "agenda"
              ? "1px solid rgba(56,189,248,.24)"
              : "1px solid rgba(139,92,246,.22)",
            borderRadius: 8,
            padding: "6px 7px",
            background:
              item.tipo === "agenda"
                ? "rgba(14,165,233,.14)"
                : "rgba(139,92,246,.14)",
            color:
              item.tipo === "agenda" ? "#bae6fd" : "#ddd6fe",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
          }}
        >
          {item.tipo === "agenda"
            ? `${formatarHoraAgenda(item.inicio)} · `
            : "Projeto · "}
          {item.titulo}
        </button>
      );

      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          <div
            style={{
              ...painelDarkStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["mes", "Mês"],
                ["semana", "Semana"],
                ["agenda", "Agenda"],
              ].map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setVisualizacaoAgenda(
                      valor as "mes" | "semana" | "agenda"
                    )
                  }
                  style={{
                    ...botaoSecundarioStyle,
                    background:
                      visualizacaoAgenda === valor
                        ? "rgba(37,99,235,.24)"
                        : botaoSecundarioStyle.background,
                    border:
                      visualizacaoAgenda === valor
                        ? "1px solid rgba(96,165,250,.44)"
                        : botaoSecundarioStyle.border,
                    color:
                      visualizacaoAgenda === valor
                        ? "#dbeafe"
                        : botaoSecundarioStyle.color,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => moverPeriodoAgenda(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => setDataReferenciaAgenda(new Date())}
              >
                Hoje
              </button>
              <button
                type="button"
                style={botaoSecundarioStyle}
                onClick={() => moverPeriodoAgenda(1)}
              >
                ›
              </button>
              {podeCriarEventos && (
                <button
                  type="button"
                  style={botaoPrimarioStyle}
                  onClick={() => abrirNovoCompromissoAgenda()}
                >
                  + Novo compromisso
                </button>
              )}
            </div>
          </div>

          {carregandoAgenda && (
            <div
              style={{
                ...painelDarkStyle,
                color: "#7dd3fc",
                fontSize: 13,
                animation: "dwPulse 1.2s ease-in-out infinite",
              }}
            >
              ↻ Atualizando agenda...
            </div>
          )}

          {visualizacaoAgenda === "mes" && (
            <div style={painelDarkStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    CALENDÁRIO
                  </div>
                  <h2
                    style={{
                      ...tituloCardDarkStyle,
                      textTransform: "capitalize",
                      marginTop: 4,
                    }}
                  >
                    {nomeMesCalendario}
                  </h2>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "7px 11px",
                    background: "rgba(56,189,248,0.12)",
                    border: "1px solid rgba(56,189,248,0.22)",
                    color: "#7dd3fc",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {
                    agendaEventos.filter(
                      (evento) => evento.status === "aprovado"
                    ).length
                  } compromisso(s)
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (diaSemana) => (
                    <div
                      key={diaSemana}
                      style={{
                        color: "#64748b",
                        fontSize: 11,
                        fontWeight: 900,
                        textAlign: "center",
                        padding: "4px 0 7px",
                      }}
                    >
                      {diaSemana}
                    </div>
                  )
                )}

                {diasCalendario.map((dia, indice) => {
                  if (!dia) {
                    return <div key={`vazio-${indice}`} />;
                  }

                  const dataDia = new Date(
                    anoCalendario,
                    mesCalendario,
                    dia
                  );

                  const eventosDia = eventosCombinados.filter((item) =>
                    mesmoDia(item.inicio, dataDia)
                  );

                  const ehHoje = mesmoDia(dataDia, new Date());

                  return (
                    <div
                      key={dia}
                      onDoubleClick={() =>
                        abrirNovoCompromissoAgenda(dataDia)
                      }
                      style={{
                        minHeight: isMobile ? 74 : 118,
                        borderRadius: 12,
                        padding: isMobile ? 7 : 9,
                        background: ehHoje
                          ? "rgba(14,165,233,0.15)"
                          : "rgba(2,6,23,0.48)",
                        border: ehHoje
                          ? "1px solid rgba(56,189,248,0.48)"
                          : "1px solid rgba(148,163,184,0.14)",
                        overflow: "hidden",
                        transition:
                          "transform .16s ease, border-color .16s ease, background .16s ease",
                      }}
                    >
                      <strong
                        style={{
                          color: ehHoje ? "#7dd3fc" : "#e2e8f0",
                          fontSize: 12,
                        }}
                      >
                        {dia}
                      </strong>

                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                          marginTop: 7,
                        }}
                      >
                        {eventosDia.slice(0, isMobile ? 2 : 4).map(
                          renderEventoCompacto
                        )}
                        {eventosDia.length > (isMobile ? 2 : 4) && (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: 9,
                              paddingLeft: 4,
                            }}
                          >
                            +{eventosDia.length - (isMobile ? 2 : 4)} evento(s)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 11,
                  marginTop: 12,
                }}
              >
                Dica: dê dois cliques em um dia para criar um compromisso
                naquela data.
              </div>
            </div>
          )}

          {visualizacaoAgenda === "semana" && (
            <div style={painelDarkStyle}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  SEMANA
                </div>
                <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                  {diasSemanaAgenda[0].toLocaleDateString("pt-BR")} —{" "}
                  {diasSemanaAgenda[6].toLocaleDateString("pt-BR")}
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet
                    ? "1fr"
                    : "repeat(7, minmax(150px, 1fr))",
                  gap: 10,
                  overflowX: "auto",
                }}
              >
                {diasSemanaAgenda.map((data) => {
                  const eventosDia = eventosCombinados.filter((item) =>
                    mesmoDia(item.inicio, data)
                  );
                  const ehHoje = mesmoDia(data, new Date());

                  return (
                    <div
                      key={data.toISOString()}
                      style={{
                        minHeight: 260,
                        borderRadius: 14,
                        padding: 11,
                        background: ehHoje
                          ? "rgba(14,165,233,.10)"
                          : "rgba(2,6,23,.46)",
                        border: ehHoje
                          ? "1px solid rgba(56,189,248,.34)"
                          : "1px solid rgba(148,163,184,.14)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => abrirNovoCompromissoAgenda(data)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: 0,
                          background: "transparent",
                          color: "#f8fafc",
                          cursor: "pointer",
                          padding: "0 0 10px",
                        }}
                        title="Criar compromisso neste dia"
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 10,
                            textTransform: "uppercase",
                          }}
                        >
                          {data.toLocaleDateString("pt-BR", {
                            weekday: "short",
                          })}
                        </div>
                        <strong style={{ fontSize: 17 }}>
                          {data.getDate()}
                        </strong>
                      </button>

                      <div style={{ display: "grid", gap: 7 }}>
                        {eventosDia.length ? (
                          eventosDia.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => abrirItemCalendario(item)}
                              style={{
                                textAlign: "left",
                                borderRadius: 10,
                                padding: 9,
                                border:
                                  item.tipo === "agenda"
                                    ? "1px solid rgba(56,189,248,.20)"
                                    : "1px solid rgba(139,92,246,.20)",
                                background:
                                  item.tipo === "agenda"
                                    ? "rgba(14,165,233,.12)"
                                    : "rgba(139,92,246,.12)",
                                color: "#f8fafc",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  color:
                                    item.tipo === "agenda"
                                      ? "#7dd3fc"
                                      : "#c4b5fd",
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                {item.tipo === "agenda"
                                  ? formatarPeriodoAgenda(
                                      item.inicio,
                                      item.fim
                                    )
                                  : "INÍCIO DO PROJETO"}
                              </div>
                              <strong
                                style={{
                                  display: "block",
                                  marginTop: 4,
                                  fontSize: 12,
                                }}
                              >
                                {item.titulo}
                              </strong>
                            </button>
                          ))
                        ) : (
                          <div
                            style={{
                              color: "#475569",
                              fontSize: 11,
                              paddingTop: 10,
                            }}
                          >
                            Sem compromissos.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visualizacaoAgenda === "agenda" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet
                  ? "1fr"
                  : "minmax(0,1.5fr) minmax(280px,.65fr)",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div style={{ ...painelDarkStyle, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    PRÓXIMOS EVENTOS
                  </div>
                  <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                    Minha agenda
                  </h2>
                </div>

                {eventosCombinados.length ? (
                  eventosCombinados.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => abrirItemCalendario(item)}
                      style={{
                        textAlign: "left",
                        borderRadius: 13,
                        padding: 13,
                        border:
                          item.tipo === "agenda"
                            ? "1px solid rgba(56,189,248,.18)"
                            : "1px solid rgba(139,92,246,.18)",
                        background: "rgba(2,6,23,.46)",
                        color: "#f8fafc",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "110px 1fr auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#7dd3fc", fontSize: 12 }}>
                          {item.inicio.toLocaleDateString("pt-BR")}
                        </strong>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {item.tipo === "agenda"
                            ? formatarPeriodoAgenda(item.inicio, item.fim)
                            : "Projeto"}
                        </div>
                      </div>

                      <div>
                        <strong>{item.titulo}</strong>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 11,
                            marginTop: 3,
                          }}
                        >
                          {item.tipo === "agenda"
                            ? item.projeto?.Projeto || "Compromisso geral"
                            : item.projeto?.Status || "Projeto"}
                        </div>
                      </div>

                      <span style={{ color: "#64748b" }}>›</span>
                    </button>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,.14)",
                      background: "rgba(2,6,23,.46)",
                      color: "#94a3b8",
                    }}
                  >
                    Nenhum compromisso cadastrado.
                  </div>
                )}
              </div>

              <div style={{ ...painelDarkStyle, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    AÇÕES RÁPIDAS
                  </div>
                  <h2 style={{ ...tituloCardDarkStyle, marginTop: 4 }}>
                    Agenda
                  </h2>
                </div>

                {podeCriarEventos && (
                  <button
                    type="button"
                    style={botaoPrimarioStyle}
                    onClick={() => abrirNovoCompromissoAgenda()}
                  >
                    + Novo compromisso
                  </button>
                )}

                <button
                  type="button"
                  style={botaoSecundarioStyle}
                  onClick={() => void carregarAgendaAtual()}
                >
                  ↻ Atualizar agenda
                </button>

                <div
                  style={{
                    borderRadius: 12,
                    padding: 13,
                    background: "rgba(2,6,23,.42)",
                    border: "1px solid rgba(148,163,184,.12)",
                    color: "#94a3b8",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Reuniões, gravações e compromissos ficam salvos no
                  Supabase. As datas de início dos projetos também aparecem
                  aqui automaticamente.
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (categoriaFerramentas === "chat") {
      const canaisFixos = canaisChat.filter(
        (canal) =>
          ["geral", "diretoria", "lideres"].includes(canal.tipo) &&
          canalChatPermitido(canal)
      );

      const canalAtivo =
        canaisChat.find((canal) => canal.id === canalChatAtivoId) || null;

      const projetoCanalAtivo =
        canalAtivo?.tipo === "projeto"
          ? projetosVisiveis.find(
              (projeto) =>
                Number(projeto.ID) === Number(canalAtivo.projeto_id)
            ) || null
          : null;

      const usuariosDiretaAtiva =
        canalAtivo?.tipo === "direta"
          ? participantesChat
              .filter(
                (item) =>
                  item.canal_id === canalAtivo.id &&
                  normalizar(item.usuario_login) !==
                    normalizar(usuarioLogado?.login)
              )
              .map(
                (item) =>
                  usuarios.find(
                    (usuario) =>
                      normalizar(usuario.login) ===
                      normalizar(item.usuario_login)
                  ) || null
              )
              .filter((usuario): usuario is Usuario => Boolean(usuario))
          : [];

      const outroUsuarioDireta = usuariosDiretaAtiva[0] || null;

      const perfilLiderChat = projetoCanalAtivo
        ? usuarioPorReferenciaChat(projetoCanalAtivo.Lider)
        : null;

      const perfilEditorChat = projetoCanalAtivo
        ? usuarioPorReferenciaChat(projetoCanalAtivo.Editor)
        : null;

      const linksProjetoChat = projetoCanalAtivo
        ? extrairLinksDrive(projetoCanalAtivo.Observacoes || "")
        : null;

      const usuariosDiretos = usuarios
        .filter(
          (usuario) =>
            normalizar(usuario.login) !== normalizar(usuarioLogado?.login)
        )
        .sort((a, b) =>
          String(a.nome || a.login).localeCompare(
            String(b.nome || b.login),
            "pt-BR"
          )
        );

      const tituloCanal = nomeCanalChat(canalAtivo);

      const matchMencaoChat = mensagemChat.match(
        /(?:^|\s)@([^\s@]*)$/
      );

      const termoMencaoChat = normalizar(
        matchMencaoChat?.[1] || ""
      );

      const usuariosMencionaveisChat = canalAtivo
        ? usuarios
            .filter(
              (usuario) =>
                normalizar(usuario.login) !==
                normalizar(usuarioLogado?.login)
            )
            .filter((usuario) => {
              if (canalAtivo.tipo === "geral") return true;

              if (canalAtivo.tipo === "diretoria") {
                return usuario.cargo === "diretoria";
              }

              if (canalAtivo.tipo === "lideres") {
                return [
                  "diretoria",
                  "lider",
                  "lider_treinamento",
                ].includes(usuario.cargo);
              }

              if (canalAtivo.tipo === "projeto") {
                const projeto = projetos.find(
                  (item) =>
                    Number(item.ID) === Number(canalAtivo.projeto_id)
                );

                return projeto ? podeVerProjeto(usuario, projeto) : false;
              }

              if (canalAtivo.tipo === "direta") {
                return participantesChat.some(
                  (participante) =>
                    participante.canal_id === canalAtivo.id &&
                    normalizar(participante.usuario_login) ===
                      normalizar(usuario.login)
                );
              }

              return false;
            })
            .filter((usuario) => {
              if (!matchMencaoChat) return false;
              if (!termoMencaoChat) return true;

              return [
                usuario.nome,
                usuario.login,
                cargoLabel(usuario.cargo),
              ]
                .map((valor) => normalizar(valor || ""))
                .some((valor) => valor.includes(termoMencaoChat));
            })
            .slice(0, 7)
        : [];

      const canalChatSilenciado = Boolean(
        canalAtivo &&
          preferenciasChat.find(
            (item) => item.canal_id === canalAtivo.id
          )?.silenciado
      );

      const subtituloCanal = projetoCanalAtivo
        ? "Discussões da equipe do projeto"
        : canalAtivo?.tipo === "direta"
        ? usuariosDiretaAtiva.length > 1
          ? `Conversa em grupo · ${usuariosDiretaAtiva.length + 1} pessoas`
          : outroUsuarioDireta
          ? cargoLabel(outroUsuarioDireta.cargo)
          : "Conversa direta"
        : canalAtivo?.tipo === "diretoria"
        ? "Canal reservado para a diretoria"
        : canalAtivo?.tipo === "lideres"
        ? "Canal da liderança de projetos"
        : "Canal geral da equipe DubWorks";

      const equipePainel: Usuario[] = projetoCanalAtivo
        ? [perfilLiderChat, perfilEditorChat]
            .filter((item): item is Usuario => Boolean(item))
            .filter(
              (item, indice, lista) =>
                lista.findIndex(
                  (outro) =>
                    normalizar(outro.login) === normalizar(item.login)
                ) === indice
            )
        : canalAtivo?.tipo === "direta"
        ? usuariosDiretaAtiva
        : canalAtivo?.tipo === "diretoria"
        ? usuarios.filter((usuario) => usuario.cargo === "diretoria")
        : canalAtivo?.tipo === "lideres"
        ? usuarios.filter((usuario) =>
            ["diretoria", "lider", "lider_treinamento"].includes(
              usuario.cargo
            )
          )
        : usuarios;

      const colunasChat =
        !isTablet && painelInfoChatAberto
          ? "minmax(0, 1fr) 300px"
          : "minmax(0, 1fr)";

      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          {erroChat && (
            <div
              style={{
                borderRadius: 12,
                padding: "11px 14px",
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.24)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {erroChat}
            </div>
          )}

          <div
            style={{
              minHeight: isMobile ? 760 : 650,
              display: "grid",
              gridTemplateColumns: colunasChat,
              overflow: "hidden",
              position: "relative",
              borderRadius: 18,
              border: "1px solid rgba(59,130,246,0.20)",
              background:
                "linear-gradient(180deg, rgba(7,16,31,0.98), rgba(7,18,35,0.96))",
              boxShadow: "0 22px 55px rgba(0,0,0,0.24)",
            }}
          >
            {menuChatAberto && (
              <>
                <button
                  type="button"
                  aria-label="Fechar menu de conversas"
                  onClick={() => setMenuChatAberto(false)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 50,
                    border: "none",
                    background: "rgba(2,6,23,.54)",
                    backdropFilter: "blur(2px)",
                    cursor: "default",
                  }}
                />
            <aside
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: isMobile ? "min(86vw, 320px)" : 285,
                minWidth: 0,
                padding: 14,
                overflowY: "auto",
                zIndex: 60,
                borderRight: "1px solid rgba(96,165,250,0.22)",
                background: "rgba(8,18,34,0.985)",
                boxShadow: "22px 0 55px rgba(0,0,0,.44)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".08em",
                    }}
                  >
                    CONVERSAS
                  </div>
                  <strong style={{ color: "#f8fafc" }}>Chat da equipe</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    title={
                      carregandoChat
                        ? "Carregando chat"
                        : "Conectado ao Supabase"
                    }
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: carregandoChat ? "#f59e0b" : "#22c55e",
                      boxShadow: carregandoChat
                        ? "0 0 12px rgba(245,158,11,.6)"
                        : "0 0 12px rgba(34,197,94,.6)",
                    }}
                  />

                  <button
                    type="button"
                    title="Fechar menu"
                    onClick={() => setMenuChatAberto(false)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      border: "1px solid rgba(148,163,184,.14)",
                      background: "rgba(15,23,42,.68)",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 17,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 5 }}>
                {canaisFixos.map((canal) => {
                  const ativo = canal.id === canalChatAtivoId;

                  return (
                    <button
                      key={canal.id}
                      type="button"
                      onClick={() => {
                        setCanalChatAtivoId(canal.id);
                        setMenuChatAberto(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 11px",
                        borderRadius: 10,
                        border: ativo
                          ? "1px solid rgba(59,130,246,.55)"
                          : "1px solid transparent",
                        background: ativo
                          ? "linear-gradient(90deg, rgba(37,99,235,.28), rgba(14,165,233,.10))"
                          : "transparent",
                        color: ativo ? "#e0f2fe" : "#cbd5e1",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: ativo ? 900 : 700,
                      }}
                    >
                      <span
                        style={{
                          color: ativo ? "#60a5fa" : "#64748b",
                          marginRight: 9,
                        }}
                      >
                        {canal.tipo === "diretoria"
                          ? "◆"
                          : canal.tipo === "lideres"
                          ? "♛"
                          : "#"}
                      </span>
                      {canal.nome}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  margin: "18px 4px 8px",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                }}
              >
                PROJETOS
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 5,
                  maxHeight: 190,
                  overflowY: "auto",
                  paddingRight: 3,
                }}
              >
                {projetosVisiveis
                  .slice()
                  .sort((a, b) =>
                    String(a.Projeto || "").localeCompare(
                      String(b.Projeto || ""),
                      "pt-BR"
                    )
                  )
                  .map((projeto) => {
                    const canalProjeto = canaisChat.find(
                      (canal) =>
                        canal.tipo === "projeto" &&
                        Number(canal.projeto_id) === Number(projeto.ID)
                    );

                    const ativo =
                      canalProjeto?.id === canalChatAtivoId ||
                      projetoCanalAtivo?.ID === projeto.ID;

                    return (
                      <button
                        key={projeto.ID}
                        type="button"
                        onClick={() => {
                          setMenuChatAberto(false);
                          void abrirCanalProjetoChat(projeto);
                        }}
                        style={{
                          width: "100%",
                          padding: "9px 11px",
                          borderRadius: 10,
                          border: ativo
                            ? "1px solid rgba(59,130,246,.55)"
                            : "1px solid transparent",
                          background: ativo
                            ? "linear-gradient(90deg, rgba(37,99,235,.30), rgba(14,165,233,.10))"
                            : "transparent",
                          color: ativo ? "#e0f2fe" : "#cbd5e1",
                          cursor: "pointer",
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: ativo ? 900 : 700,
                        }}
                      >
                        <span
                          style={{
                            color: ativo ? "#60a5fa" : "#64748b",
                            marginRight: 9,
                          }}
                        >
                          #
                        </span>
                        {projeto.Projeto || `Projeto ${projeto.ID}`}
                      </button>
                    );
                  })}
              </div>

              <div
                style={{
                  margin: "18px 4px 8px",
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                }}
              >
                DIRETAS
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 5,
                  maxHeight: 190,
                  overflowY: "auto",
                  paddingRight: 3,
                }}
              >
                {usuariosDiretos.map((usuario) => {
                  const conversaExistente = canaisChat.find(
                    (canal) =>
                      canal.tipo === "direta" &&
                      participantesChat.some(
                        (participante) =>
                          participante.canal_id === canal.id &&
                          normalizar(participante.usuario_login) ===
                            normalizar(usuario.login)
                      ) &&
                      participantesChat.some(
                        (participante) =>
                          participante.canal_id === canal.id &&
                          normalizar(participante.usuario_login) ===
                            normalizar(usuarioLogado?.login)
                      )
                  );

                  const ativo =
                    conversaExistente?.id === canalChatAtivoId &&
                    canalAtivo?.tipo === "direta";

                  return (
                    <button
                      key={usuario.login || usuario.nome}
                      type="button"
                      onClick={() => {
                        setMenuChatAberto(false);
                        void abrirConversaDiretaChat(usuario);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "8px 9px",
                        borderRadius: 10,
                        border: ativo
                          ? "1px solid rgba(59,130,246,.45)"
                          : "1px solid transparent",
                        background: ativo
                          ? "rgba(37,99,235,.18)"
                          : "transparent",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          background:
                            "linear-gradient(135deg, rgba(59,130,246,.9), rgba(124,58,237,.88))",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {iniciaisChat(usuario.nome || usuario.login)}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: ativo ? "#f8fafc" : "#cbd5e1",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {usuario.nome || usuario.login}
                        </strong>
                        <small style={{ color: "#64748b" }}>
                          {cargoLabel(usuario.cargo)}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
              </>
            )}

            <section
              style={{
                minWidth: 0,
                minHeight: isMobile ? 560 : 650,
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                background:
                  "radial-gradient(circle at 50% 0%, rgba(37,99,235,.08), transparent 32%), rgba(5,14,28,.84)",
              }}
            >
              <header
                style={{
                  minHeight: 72,
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(148,163,184,.13)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  title="Abrir conversas"
                  aria-label="Abrir menu de conversas"
                  onClick={() => setMenuChatAberto(true)}
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 10,
                    border: "1px solid rgba(96,165,250,.22)",
                    background: "rgba(37,99,235,.12)",
                    color: "#bfdbfe",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  ☰
                </button>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <span
                      style={{
                        color:
                          canalAtivo?.tipo === "direta"
                            ? "#a78bfa"
                            : "#60a5fa",
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      {canalAtivo?.tipo === "direta" ? "●" : "#"}
                    </span>
                    <h2
                      style={{
                        margin: 0,
                        color: "#f8fafc",
                        fontSize: 20,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tituloCanal}
                    </h2>
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 3,
                      paddingLeft: 29,
                    }}
                  >
                    {subtituloCanal}
                  </div>
                </div>

                {canalAtivo && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      title={
                        canalChatSilenciado
                          ? "Ativar notificações de novas mensagens"
                          : "Silenciar novas mensagens deste chat"
                      }
                      onClick={alternarSilenciarCanalChat}
                      disabled={alterandoSilencioChat}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: canalChatSilenciado
                          ? "1px solid rgba(245,158,11,.30)"
                          : "1px solid rgba(148,163,184,.18)",
                        background: canalChatSilenciado
                          ? "rgba(245,158,11,.11)"
                          : "rgba(15,23,42,.66)",
                        color: canalChatSilenciado
                          ? "#fbbf24"
                          : "#cbd5e1",
                        cursor: alterandoSilencioChat
                          ? "wait"
                          : "pointer",
                        opacity: alterandoSilencioChat ? 0.6 : 1,
                        fontSize: 15,
                      }}
                    >
                      {canalChatSilenciado ? "🔕" : "🔔"}
                    </button>

                    {canalAtivo.tipo === "direta" && (
                      <button
                        type="button"
                        title="Adicionar pessoas à conversa"
                        onClick={abrirAdicionarPessoasChat}
                        style={{
                          minHeight: 36,
                          borderRadius: 10,
                          border: "1px solid rgba(59,130,246,.24)",
                          background: "rgba(37,99,235,.12)",
                          color: "#bfdbfe",
                          cursor: "pointer",
                          padding: "0 11px",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ＋ Pessoa
                      </button>
                    )}

                    {!isTablet && (
                      <button
                        type="button"
                        title="Informações do canal"
                        onClick={() =>
                          setPainelInfoChatAberto((anterior) => !anterior)
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,.18)",
                          background: "rgba(15,23,42,.66)",
                          color: "#cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        ⓘ
                      </button>
                    )}
                  </div>
                )}
              </header>

              <div
                style={{
                  minHeight: 0,
                  overflowY: "auto",
                  padding: isMobile ? 14 : "18px 22px",
                }}
              >
                {!canalAtivo ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      color: "#64748b",
                      textAlign: "center",
                    }}
                  >
                    {carregandoChat
                      ? "Carregando canais..."
                      : "Selecione uma conversa para começar."}
                  </div>
                ) : carregandoMensagensChat ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Carregando mensagens...
                  </div>
                ) : mensagensChat.length === 0 ? (
                  <div
                    style={{
                      minHeight: 340,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 42, marginBottom: 10 }}>💬</div>
                      <strong style={{ color: "#f8fafc" }}>
                        Comece a conversa
                      </strong>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 5,
                        }}
                      >
                        Ainda não há mensagens neste canal.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 15 }}>
                    {mensagensChat.map((mensagem, indice) => {
                      const anterior = indice > 0 ? mensagensChat[indice - 1] : null;
                      const dataAtual = formatarDataChat(mensagem.created_at);
                      const dataAnterior = formatarDataChat(anterior?.created_at);
                      const mostrarData =
                        indice === 0 || dataAtual !== dataAnterior;

                      const minhaMensagem =
                        normalizar(mensagem.usuario_login) ===
                        normalizar(usuarioLogado?.login);

                      const mensagemExcluida = Boolean(
                        mensagem.excluido_em
                      );

                      const editandoEstaMensagem =
                        mensagemEditandoChat?.id === mensagem.id;

                      const mensagemCitada = mensagem.resposta_a_id
                        ? mensagensChat.find(
                            (item) => item.id === mensagem.resposta_a_id
                          ) || null
                        : null;

                      return (
                        <React.Fragment key={mensagem.id}>
                          {mostrarData && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                color: "#64748b",
                                fontSize: 11,
                              }}
                            >
                              <div
                                style={{
                                  height: 1,
                                  flex: 1,
                                  background: "rgba(148,163,184,.12)",
                                }}
                              />
                              <span>{dataAtual}</span>
                              <div
                                style={{
                                  height: 1,
                                  flex: 1,
                                  background: "rgba(148,163,184,.12)",
                                }}
                              />
                            </div>
                          )}

                          <div
                            id={`chat-mensagem-${mensagem.id}`}
                            style={{
                              display: "flex",
                              gap: 11,
                              alignItems: "flex-start",
                              justifyContent: minhaMensagem
                                ? "flex-end"
                                : "flex-start",
                              scrollMarginBlock: 120,
                            }}
                          >
                            {!minhaMensagem && (
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  flexShrink: 0,
                                  borderRadius: "50%",
                                  display: "grid",
                                  placeItems: "center",
                                  background:
                                    "linear-gradient(135deg, #2563eb, #7c3aed)",
                                  color: "#fff",
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {iniciaisChat(
                                  mensagem.usuario_nome ||
                                    mensagem.usuario_login
                                )}
                              </div>
                            )}

                            <div
                              style={{
                                maxWidth: isMobile ? "86%" : "76%",
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "baseline",
                                  justifyContent: minhaMensagem
                                    ? "flex-end"
                                    : "flex-start",
                                  marginBottom: 4,
                                }}
                              >
                                <strong
                                  style={{
                                    color: minhaMensagem
                                      ? "#7dd3fc"
                                      : "#c4b5fd",
                                    fontSize: 13,
                                  }}
                                >
                                  {minhaMensagem
                                    ? "Você"
                                    : mensagem.usuario_nome ||
                                      mensagem.usuario_login}
                                </strong>
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: 10,
                                  }}
                                >
                                  {formatarHoraChat(mensagem.created_at)}
                                  {mensagem.editado_em &&
                                  !mensagemExcluida
                                    ? " · editada"
                                    : ""}
                                </span>
                              </div>

                              {mensagemCitada && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `chat-mensagem-${mensagemCitada.id}`
                                      )
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      })
                                  }
                                  title="Ir para a mensagem citada"
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    borderRadius: 10,
                                    border: "1px solid rgba(96,165,250,.18)",
                                    borderLeft: "3px solid rgba(96,165,250,.75)",
                                    background: "rgba(15,23,42,.58)",
                                    color: "#cbd5e1",
                                    padding: "7px 9px",
                                    marginBottom: 5,
                                    cursor: "pointer",
                                    overflow: "hidden",
                                  }}
                                >
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#7dd3fc",
                                      fontSize: 10,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {mensagemCitada.usuario_nome ||
                                      mensagemCitada.usuario_login}
                                  </strong>
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: 11,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {mensagemCitada.excluido_em
                                      ? "Mensagem excluída"
                                      : mensagemCitada.mensagem}
                                  </span>
                                </button>
                              )}

                              <div
                                style={{
                                  borderRadius: minhaMensagem
                                    ? "15px 4px 15px 15px"
                                    : "4px 15px 15px 15px",
                                  padding: "11px 13px",
                                  background: minhaMensagem
                                    ? "linear-gradient(135deg, rgba(37,99,235,.30), rgba(14,165,233,.14))"
                                    : "rgba(15,30,52,.92)",
                                  border:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "1px solid rgba(96,165,250,.78)"
                                      : minhaMensagem
                                      ? "1px solid rgba(59,130,246,.28)"
                                      : "1px solid rgba(148,163,184,.13)",
                                  boxShadow:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "0 0 0 2px rgba(59,130,246,.18), 0 0 22px rgba(37,99,235,.30)"
                                      : "none",
                                  transform:
                                    mensagemChatDestacadaId === mensagem.id
                                      ? "scale(1.015)"
                                      : "scale(1)",
                                  transition:
                                    "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
                                  color: "#e2e8f0",
                                  lineHeight: 1.5,
                                  fontSize: 13,
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {mensagemExcluida ? (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Mensagem excluída
                                  </span>
                                ) : editandoEstaMensagem ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      minWidth: isMobile ? 220 : 320,
                                    }}
                                  >
                                    <textarea
                                      id={`chat-editar-${mensagem.id}`}
                                      value={textoEdicaoMensagemChat}
                                      onChange={(event) =>
                                        setTextoEdicaoMensagemChat(
                                          event.target.value
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                          event.preventDefault();
                                          cancelarEdicaoMensagemChat();
                                        }

                                        if (
                                          event.key === "Enter" &&
                                          (event.ctrlKey || event.metaKey)
                                        ) {
                                          event.preventDefault();
                                          void salvarEdicaoMensagemChatAtual();
                                        }
                                      }}
                                      style={{
                                        width: "100%",
                                        minHeight: 76,
                                        resize: "vertical",
                                        boxSizing: "border-box",
                                        borderRadius: 10,
                                        border:
                                          "1px solid rgba(96,165,250,.28)",
                                        background: "rgba(2,6,23,.58)",
                                        color: "#f8fafc",
                                        padding: 10,
                                        outline: "none",
                                        fontFamily: "inherit",
                                        lineHeight: 1.45,
                                      }}
                                    />

                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 7,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={cancelarEdicaoMensagemChat}
                                        disabled={salvandoEdicaoMensagemChat}
                                        style={{
                                          borderRadius: 8,
                                          border:
                                            "1px solid rgba(148,163,184,.16)",
                                          background:
                                            "rgba(15,23,42,.60)",
                                          color: "#cbd5e1",
                                          padding: "7px 10px",
                                          cursor: "pointer",
                                          fontSize: 11,
                                        }}
                                      >
                                        Cancelar
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void salvarEdicaoMensagemChatAtual()
                                        }
                                        disabled={
                                          salvandoEdicaoMensagemChat ||
                                          !textoEdicaoMensagemChat.trim()
                                        }
                                        style={{
                                          borderRadius: 8,
                                          border:
                                            "1px solid rgba(59,130,246,.30)",
                                          background:
                                            "linear-gradient(135deg, #2563eb, #0284c7)",
                                          color: "#fff",
                                          padding: "7px 11px",
                                          cursor:
                                            salvandoEdicaoMensagemChat
                                              ? "wait"
                                              : "pointer",
                                          fontWeight: 800,
                                          fontSize: 11,
                                        }}
                                      >
                                        {salvandoEdicaoMensagemChat
                                          ? "Salvando..."
                                          : "Salvar"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  mensagem.mensagem
                                )}
                              </div>

                              {!mensagemExcluida &&
                                anexosChat.some(
                                  (anexo) => anexo.mensagem_id === mensagem.id
                                ) && (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: 8,
                                    marginTop: 7,
                                  }}
                                >
                                  {anexosChat
                                    .filter(
                                      (anexo) =>
                                        anexo.mensagem_id === mensagem.id
                                    )
                                    .map((anexo) => {
                                      const tipo = String(
                                        anexo.mime_type || ""
                                      ).toLowerCase();

                                      if (tipo.startsWith("image/")) {
                                        return (
                                          <button
                                            key={anexo.id}
                                            type="button"
                                            disabled={!anexo.url_temporaria}
                                            onClick={() => {
                                              if (anexo.url_temporaria) {
                                                window.open(
                                                  anexo.url_temporaria,
                                                  "_blank",
                                                  "noopener,noreferrer"
                                                );
                                              }
                                            }}
                                            style={{
                                              border: "none",
                                              padding: 0,
                                              background: "transparent",
                                              cursor: anexo.url_temporaria
                                                ? "pointer"
                                                : "default",
                                              textAlign: "left",
                                            }}
                                          >
                                            <img
                                              src={anexo.url_temporaria}
                                              alt={anexo.nome_arquivo}
                                              style={{
                                                display: "block",
                                                width: "min(360px, 100%)",
                                                maxHeight: 280,
                                                objectFit: "cover",
                                                borderRadius: 12,
                                                border:
                                                  "1px solid rgba(148,163,184,.16)",
                                                background:
                                                  "rgba(2,6,23,.55)",
                                              }}
                                            />
                                            <div
                                              style={{
                                                color: "#64748b",
                                                fontSize: 10,
                                                marginTop: 4,
                                              }}
                                            >
                                              {anexo.nome_arquivo} ·{" "}
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </div>
                                          </button>
                                        );
                                      }

                                      if (tipo.startsWith("audio/")) {
                                        return (
                                          <div
                                            key={anexo.id}
                                            style={{
                                              width: "min(380px, 100%)",
                                              padding: 9,
                                              borderRadius: 11,
                                              border:
                                                "1px solid rgba(148,163,184,.14)",
                                              background:
                                                "rgba(2,6,23,.42)",
                                            }}
                                          >
                                            <div
                                              style={{
                                                color: "#cbd5e1",
                                                fontSize: 11,
                                                marginBottom: 7,
                                              }}
                                            >
                                              🎵 {anexo.nome_arquivo}
                                            </div>
                                            <audio
                                              controls
                                              preload="metadata"
                                              src={anexo.url_temporaria}
                                              style={{
                                                width: "100%",
                                                height: 34,
                                              }}
                                            />
                                          </div>
                                        );
                                      }

                                      if (tipo.startsWith("video/")) {
                                        return (
                                          <div
                                            key={anexo.id}
                                            style={{
                                              width: "min(400px, 100%)",
                                            }}
                                          >
                                            <video
                                              controls
                                              preload="metadata"
                                              src={anexo.url_temporaria}
                                              style={{
                                                display: "block",
                                                width: "100%",
                                                maxHeight: 280,
                                                borderRadius: 12,
                                                border:
                                                  "1px solid rgba(148,163,184,.16)",
                                                background: "#020617",
                                              }}
                                            />
                                            <div
                                              style={{
                                                color: "#64748b",
                                                fontSize: 10,
                                                marginTop: 4,
                                              }}
                                            >
                                              {anexo.nome_arquivo} ·{" "}
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }

                                      const iconeArquivo =
                                        tipo.includes("pdf")
                                          ? "📕"
                                          : tipo.includes("zip") ||
                                            tipo.includes("rar") ||
                                            tipo.includes("7z")
                                          ? "🗜️"
                                          : tipo.includes("sheet") ||
                                            tipo.includes("excel")
                                          ? "📊"
                                          : tipo.includes("word") ||
                                            tipo.includes("document")
                                          ? "📘"
                                          : "📄";

                                      return (
                                        <button
                                          key={anexo.id}
                                          type="button"
                                          disabled={!anexo.url_temporaria}
                                          onClick={() => {
                                            if (anexo.url_temporaria) {
                                              window.open(
                                                anexo.url_temporaria,
                                                "_blank",
                                                "noopener,noreferrer"
                                              );
                                            }
                                          }}
                                          style={{
                                            width: "min(390px, 100%)",
                                            display: "grid",
                                            gridTemplateColumns:
                                              "38px minmax(0,1fr) auto",
                                            gap: 9,
                                            alignItems: "center",
                                            borderRadius: 11,
                                            border:
                                              "1px solid rgba(96,165,250,.16)",
                                            background:
                                              "rgba(15,30,52,.72)",
                                            color: "#e2e8f0",
                                            padding: "9px 10px",
                                            cursor: anexo.url_temporaria
                                              ? "pointer"
                                              : "not-allowed",
                                            textAlign: "left",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 22,
                                              textAlign: "center",
                                            }}
                                          >
                                            {iconeArquivo}
                                          </span>

                                          <span style={{ minWidth: 0 }}>
                                            <strong
                                              style={{
                                                display: "block",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                fontSize: 11,
                                              }}
                                            >
                                              {anexo.nome_arquivo}
                                            </strong>
                                            <small style={{ color: "#64748b" }}>
                                              {formatarTamanhoAnexoChat(
                                                anexo.tamanho_bytes
                                              )}
                                            </small>
                                          </span>

                                          <span
                                            style={{
                                              color: "#60a5fa",
                                              fontSize: 16,
                                            }}
                                          >
                                            ↗
                                          </span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}

                              {!mensagemExcluida &&
                                !editandoEstaMensagem && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: minhaMensagem
                                        ? "flex-end"
                                        : "flex-start",
                                      alignItems: "center",
                                      gap: 2,
                                      marginTop: 4,
                                      position: "relative",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        responderMensagemChat(mensagem)
                                      }
                                      title="Responder com citação"
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#64748b",
                                        cursor: "pointer",
                                        fontSize: 11,
                                        padding: "3px 5px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      ↩ Responder
                                    </button>

                                    {minhaMensagem && (
                                      <>
                                        <button
                                          type="button"
                                          title="Mais opções"
                                          onClick={() =>
                                            setMenuMensagemAbertoId(
                                              (atual) =>
                                                atual === mensagem.id
                                                  ? null
                                                  : mensagem.id
                                            )
                                          }
                                          style={{
                                            width: 27,
                                            height: 25,
                                            borderRadius: 7,
                                            border: "none",
                                            background: "transparent",
                                            color: "#64748b",
                                            cursor: "pointer",
                                            fontSize: 16,
                                            lineHeight: 1,
                                          }}
                                        >
                                          ⋯
                                        </button>

                                        {menuMensagemAbertoId ===
                                          mensagem.id && (
                                          <div
                                            style={{
                                              position: "absolute",
                                              right: 0,
                                              bottom: 30,
                                              width: 142,
                                              zIndex: 35,
                                              overflow: "hidden",
                                              borderRadius: 10,
                                              border:
                                                "1px solid rgba(148,163,184,.16)",
                                              background:
                                                "rgba(8,18,34,.99)",
                                              boxShadow:
                                                "0 16px 38px rgba(0,0,0,.38)",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                iniciarEdicaoMensagemChat(
                                                  mensagem
                                                )
                                              }
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                borderBottom:
                                                  "1px solid rgba(148,163,184,.08)",
                                                background: "transparent",
                                                color: "#e2e8f0",
                                                padding: "9px 11px",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                fontSize: 11,
                                              }}
                                            >
                                              ✎ Editar
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                void excluirMensagemChatAtual(
                                                  mensagem
                                                )
                                              }
                                              style={{
                                                width: "100%",
                                                border: "none",
                                                background: "transparent",
                                                color: "#fca5a5",
                                                padding: "9px 11px",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                fontSize: 11,
                                              }}
                                            >
                                              🗑 Excluir
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                            </div>

                            {minhaMensagem && (
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  flexShrink: 0,
                                  borderRadius: "50%",
                                  display: "grid",
                                  placeItems: "center",
                                  background:
                                    "linear-gradient(135deg, #0ea5e9, #2563eb)",
                                  color: "#fff",
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {iniciaisChat(
                                  usuarioLogado?.nome ||
                                    usuarioLogado?.login
                                )}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    <div id="dubworks-chat-fim" />
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "12px 15px 15px",
                  borderTop: "1px solid rgba(148,163,184,.11)",
                  position: "relative",
                }}
              >
                {matchMencaoChat &&
                  usuariosMencionaveisChat.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 58,
                        right: 70,
                        bottom: mensagemRespondendoChat ? 132 : 91,
                        zIndex: 30,
                        borderRadius: 13,
                        overflow: "hidden",
                        border:
                          "1px solid rgba(96,165,250,.28)",
                        background:
                          "rgba(8,18,34,.98)",
                        boxShadow:
                          "0 18px 45px rgba(0,0,0,.38)",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 10px",
                          color: "#64748b",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: ".06em",
                          borderBottom:
                            "1px solid rgba(148,163,184,.12)",
                        }}
                      >
                        MENCIONAR PESSOA
                      </div>

                      {usuariosMencionaveisChat.map((usuario) => (
                        <button
                          key={usuario.login || usuario.nome}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selecionarMencaoChat(usuario);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: "none",
                            borderBottom:
                              "1px solid rgba(148,163,184,.08)",
                            padding: "9px 11px",
                            background: "transparent",
                            color: "#e2e8f0",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              background:
                                "linear-gradient(135deg, #2563eb, #7c3aed)",
                              color: "#fff",
                              fontWeight: 900,
                              fontSize: 11,
                            }}
                          >
                            {iniciaisChat(
                              usuario.nome || usuario.login
                            )}
                          </span>

                          <span style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: "#f8fafc",
                                fontSize: 12,
                              }}
                            >
                              {usuario.nome || usuario.login}
                            </strong>
                            <small style={{ color: "#64748b" }}>
                              {cargoLabel(usuario.cargo)}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                {mensagemRespondendoChat && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                      borderRadius: 11,
                      padding: "8px 10px",
                      border: "1px solid rgba(96,165,250,.20)",
                      borderLeft: "3px solid #60a5fa",
                      background: "rgba(15,23,42,.72)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          color: "#7dd3fc",
                          fontSize: 10,
                          fontWeight: 900,
                          marginBottom: 2,
                        }}
                      >
                        Respondendo a {mensagemRespondendoChat.usuario_nome ||
                          mensagemRespondendoChat.usuario_login}
                      </div>
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {mensagemRespondendoChat.excluido_em
                          ? "Mensagem excluída"
                          : mensagemRespondendoChat.mensagem}
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Cancelar resposta"
                      onClick={() => setMensagemRespondendoChat(null)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {arquivosChatSelecionados.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    {arquivosChatSelecionados.map((arquivo, indice) => (
                      <div
                        key={`${arquivo.name}-${arquivo.size}-${indice}`}
                        style={{
                          maxWidth: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          borderRadius: 10,
                          padding: "7px 8px",
                          border:
                            "1px solid rgba(96,165,250,.20)",
                          background: "rgba(15,30,52,.72)",
                        }}
                      >
                        <span>📎</span>
                        <span
                          style={{
                            minWidth: 0,
                            maxWidth: 220,
                            color: "#cbd5e1",
                            fontSize: 10,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {arquivo.name}
                        </span>
                        <span style={{ color: "#64748b", fontSize: 9 }}>
                          {formatarTamanhoAnexoChat(arquivo.size)}
                        </span>
                        <button
                          type="button"
                          title="Remover anexo"
                          onClick={() =>
                            removerArquivoChatSelecionado(indice)
                          }
                          disabled={enviandoAnexosChat}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#94a3b8",
                            cursor: enviandoAnexosChat
                              ? "not-allowed"
                              : "pointer",
                            padding: 2,
                            fontSize: 14,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={inputAnexoChatRef}
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
                  onChange={selecionarArquivosChat}
                  style={{ display: "none" }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0,1fr) auto auto",
                    gap: 8,
                    alignItems: "end",
                    borderRadius: 14,
                    padding: "7px 8px",
                    border: "1px solid rgba(59,130,246,.22)",
                    background: "rgba(9,22,41,.92)",
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      !canalAtivo ||
                      enviandoMensagemChat ||
                      enviandoAnexosChat
                    }
                    title="Adicionar anexo"
                    onClick={() => inputAnexoChatRef.current?.click()}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color:
                        canalAtivo && !enviandoAnexosChat
                          ? "#cbd5e1"
                          : "#64748b",
                      cursor:
                        canalAtivo &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    📎
                  </button>

                  <textarea
                    id="dubworks-chat-composer"
                    value={mensagemChat}
                    disabled={!canalAtivo || enviandoMensagemChat || enviandoAnexosChat}
                    onChange={(event) => atualizarTextoMensagemChat(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !enviandoMensagemChat
                      ) {
                        event.preventDefault();
                        enviarMensagemChatAtual();
                      }
                    }}
                    placeholder={
                      canalAtivo
                        ? "Digite uma mensagem..."
                        : "Selecione uma conversa..."
                    }
                    style={{
                      width: "100%",
                      minHeight: 38,
                      maxHeight: 110,
                      resize: "vertical",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      padding: "9px 4px 7px",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />

                  <button
                    type="button"
                    title="Adicionar emoji"
                    disabled={!canalAtivo || enviandoMensagemChat}
                    onClick={() =>
                      setMensagemChat((anterior) => `${anterior} 😊`)
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color: "#cbd5e1",
                      cursor: canalAtivo ? "pointer" : "not-allowed",
                    }}
                  >
                    ☺
                  </button>

                  <button
                    type="button"
                    onClick={enviarMensagemChatAtual}
                    disabled={
                      !canalAtivo ||
                      (!mensagemChat.trim() &&
                        arquivosChatSelecionados.length === 0) ||
                      enviandoMensagemChat ||
                      enviandoAnexosChat
                    }
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      border: "1px solid rgba(59,130,246,.35)",
                      background:
                        canalAtivo &&
                        (mensagemChat.trim() ||
                          arquivosChatSelecionados.length > 0) &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "linear-gradient(135deg, #2563eb, #0284c7)"
                          : "rgba(51,65,85,.45)",
                      color: "#fff",
                      cursor:
                        canalAtivo &&
                        (mensagemChat.trim() ||
                          arquivosChatSelecionados.length > 0) &&
                        !enviandoMensagemChat &&
                        !enviandoAnexosChat
                          ? "pointer"
                          : "not-allowed",
                      fontWeight: 900,
                    }}
                  >
                    {enviandoMensagemChat || enviandoAnexosChat ? "…" : "➤"}
                  </button>
                </div>

                <div
                  style={{
                    color: "#475569",
                    fontSize: 10,
                    marginTop: 6,
                    paddingLeft: 4,
                  }}
                >
                  Enter envia · Shift + Enter quebra a linha · @ menciona · Anexos: até 5 arquivos, 25 MB cada
                </div>
              </div>
            </section>

            {!isTablet && painelInfoChatAberto && (
              <aside
                style={{
                  minWidth: 0,
                  maxHeight: 650,
                  overflowY: "auto",
                  padding: 14,
                  borderLeft: "1px solid rgba(148,163,184,.14)",
                  background: "rgba(8,18,34,.78)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>Sobre o canal</strong>
                  <button
                    type="button"
                    onClick={() => setPainelInfoChatAberto(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(15,30,52,.76)",
                    border: "1px solid rgba(148,163,184,.13)",
                  }}
                >
                  {projetoCanalAtivo?.Capa_URL ? (
                    <img
                      src={projetoCanalAtivo.Capa_URL}
                      alt={projetoCanalAtivo.Projeto}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 11,
                        marginBottom: 12,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        marginBottom: 10,
                        background: "rgba(37,99,235,.18)",
                        color: "#60a5fa",
                        fontWeight: 900,
                        fontSize: 20,
                      }}
                    >
                      {canalAtivo?.tipo === "direta"
                        ? iniciaisChat(
                            outroUsuarioDireta?.nome || tituloCanal
                          )
                        : "#"}
                    </div>
                  )}

                  <strong
                    style={{
                      display: "block",
                      color: "#f8fafc",
                      fontSize: 16,
                    }}
                  >
                    {tituloCanal}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {subtituloCanal}
                  </span>
                </div>

                {projetoCanalAtivo && (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        padding: 14,
                        background: "rgba(15,30,52,.72)",
                        border: "1px solid rgba(148,163,184,.13)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {[
                        ["Status", projetoCanalAtivo.Status || "—"],
                        [
                          "Líder",
                          perfilLiderChat?.nome ||
                            projetoCanalAtivo.Lider ||
                            "—",
                        ],
                        [
                          "Editor",
                          perfilEditorChat?.nome ||
                            projetoCanalAtivo.Editor ||
                            "—",
                        ],
                      ].map(([label, valor]) => (
                        <div
                          key={label}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "62px 1fr",
                            gap: 8,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "#64748b" }}>{label}</span>
                          <strong
                            style={{
                              color:
                                label === "Status"
                                  ? "#7dd3fc"
                                  : "#e2e8f0",
                            }}
                          >
                            {valor}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          abrirPaginaProjeto(projetoCanalAtivo.ID);
                          setMostrarFerramentas(false);
                          setCategoriaFerramentas("inicio");
                        }}
                        style={{
                          minHeight: 52,
                          borderRadius: 11,
                          border: "1px solid rgba(59,130,246,.30)",
                          background: "rgba(37,99,235,.12)",
                          color: "#dbeafe",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        ↗ Abrir projeto
                      </button>

                      <button
                        type="button"
                        disabled={
                          !(
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                          )
                        }
                        onClick={() => {
                          const link =
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link ||
                            "";

                          if (link) {
                            window.open(
                              link,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        }}
                        style={{
                          minHeight: 52,
                          borderRadius: 11,
                          border: "1px solid rgba(59,130,246,.22)",
                          background: "rgba(15,23,42,.78)",
                          color: "#dbeafe",
                          cursor:
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                              ? "pointer"
                              : "not-allowed",
                          opacity:
                            linksProjetoChat?.pasta ||
                            projetoCanalAtivo.Drive_Pasta_Link
                              ? 1
                              : 0.45,
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        📁 Drive
                      </button>
                    </div>
                  </>
                )}

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(15,30,52,.72)",
                    border: "1px solid rgba(148,163,184,.13)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#f8fafc", fontSize: 13 }}>
                      {projetoCanalAtivo ? "Equipe vinculada" : "Membros"}
                    </strong>
                    <span style={{ color: "#60a5fa", fontSize: 11 }}>
                      {equipePainel.length}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 9,
                      marginTop: 11,
                    }}
                  >
                    {equipePainel.slice(0, 12).map((usuario) => (
                      <div
                        key={usuario.login || usuario.nome}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            background:
                              "linear-gradient(135deg, #2563eb, #7c3aed)",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {iniciaisChat(usuario.nome || usuario.login)}
                        </span>

                        <span style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              display: "block",
                              color: "#e2e8f0",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {usuario.nome || usuario.login}
                          </strong>
                          <small style={{ color: "#64748b" }}>
                            {cargoLabel(usuario.cargo)}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      );
    }

    if (categoriaFerramentas === "ia") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          {renderCabecalhoFerramenta()}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet
                ? "1fr"
                : "minmax(0, 0.85fr) minmax(320px, 1.15fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div style={painelDarkStyle}>
              <label
                style={{
                  display: "block",
                  color: "#cbd5e1",
                  fontWeight: 800,
                  marginBottom: 10,
                }}
              >
                O que você quer pedir à IA?
              </label>

              <textarea
                value={mensagemIA}
                onChange={(event) => setMensagemIA(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey) &&
                    !carregandoIA
                  ) {
                    event.preventDefault();
                    enviarMensagemIA();
                  }
                }}
                placeholder="Ex.: organize o cronograma deste projeto, revise um aviso de seleção ou monte uma lista de tarefas..."
                style={{
                  width: "100%",
                  minHeight: 220,
                  resize: "vertical",
                  boxSizing: "border-box",
                  borderRadius: 14,
                  padding: 14,
                  background: "rgba(2,6,23,0.62)",
                  border: "1px solid rgba(100,116,139,0.28)",
                  color: "#f8fafc",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={enviarMensagemIA}
                disabled={!mensagemIA.trim() || carregandoIA}
                style={{
                  ...botaoPrimarioStyle,
                  width: "100%",
                  marginTop: 14,
                  opacity: mensagemIA.trim() && !carregandoIA ? 1 : 0.55,
                  cursor:
                    mensagemIA.trim() && !carregandoIA
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {carregandoIA ? "Consultando a IA..." : "Enviar para a IA"}
              </button>

              <div
                style={{
                  marginTop: 10,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                Dica: Ctrl + Enter também envia a mensagem.
              </div>
            </div>

            <div style={painelDarkStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                    ✦ IA DubWorks
                  </h2>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    Assistente conectado ao Gemini
                  </div>
                </div>

                {historicoIA.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoricoIA([]);
                      setAcaoPendenteIA(null);
                    }}
                    style={{
                      border: "1px solid rgba(100,116,139,0.28)",
                      background: "rgba(15,23,42,0.65)",
                      color: "#cbd5e1",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Limpar conversa
                  </button>
                )}
              </div>

              {acaoPendenteIA && (
                <div
                  style={{
                    marginBottom: 14,
                    borderRadius: 14,
                    padding: 16,
                    background: "rgba(245,158,11,0.09)",
                    border: "1px solid rgba(245,158,11,0.32)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: 900,
                          marginBottom: 5,
                        }}
                      >
                        ALTERAÇÃO AGUARDANDO CONFIRMAÇÃO
                      </div>

                      <strong style={{ color: "#f8fafc", fontSize: 16 }}>
                        {acaoPendenteIA.projeto}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.34)",
                        color: "#fde68a",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {acaoPendenteIA.campo}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "minmax(0, 1fr) 34px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(2,6,23,0.54)",
                        border: "1px solid rgba(148,163,184,0.14)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        Valor atual
                      </div>
                      <strong style={{ color: "#cbd5e1" }}>
                        {acaoPendenteIA.valor_atual || "Vazio"}
                      </strong>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        color: "#fbbf24",
                        fontWeight: 900,
                      }}
                    >
                      →
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.34)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        Novo valor
                      </div>
                      <strong style={{ color: "#86efac" }}>
                        {acaoPendenteIA.novo_valor}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      disabled={salvandoAcaoIA}
                      onClick={() => setAcaoPendenteIA(null)}
                      style={{
                        border: "1px solid rgba(148,163,184,0.20)",
                        background: "rgba(15,23,42,0.70)",
                        color: "#cbd5e1",
                        borderRadius: 10,
                        padding: "9px 12px",
                        fontWeight: 800,
                        cursor: salvandoAcaoIA ? "not-allowed" : "pointer",
                        opacity: salvandoAcaoIA ? 0.55 : 1,
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={salvandoAcaoIA}
                      onClick={confirmarAcaoIA}
                      style={{
                        ...botaoPrimarioStyle,
                        padding: "9px 14px",
                        opacity: salvandoAcaoIA ? 0.65 : 1,
                        cursor: salvandoAcaoIA ? "not-allowed" : "pointer",
                      }}
                    >
                      {salvandoAcaoIA
                        ? "Salvando alteração..."
                        : "Confirmar alteração"}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  maxHeight: 520,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {historicoIA.length === 0 ? (
                  <div
                    style={{
                      minHeight: 220,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      borderRadius: 14,
                      padding: 24,
                      background: "rgba(2,6,23,0.42)",
                      border: "1px solid rgba(148,163,184,0.14)",
                      color: "#94a3b8",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 38, marginBottom: 10 }}>✦</div>
                      <strong style={{ color: "#f8fafc" }}>
                        IA DubWorks pronta
                      </strong>
                      <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
                        Envie uma mensagem para começar a conversa.
                      </p>
                    </div>
                  </div>
                ) : (
                  historicoIA.map((item, indice) => (
                    <div
                      key={`${item.autor}-${indice}`}
                      style={{
                        display: "flex",
                        justifyContent:
                          item.autor === "usuario" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.55,
                          borderRadius:
                            item.autor === "usuario"
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                          padding: "10px 12px",
                          background:
                            item.autor === "usuario"
                              ? "linear-gradient(135deg, #2563eb, #0ea5e9)"
                              : "rgba(2,6,23,0.62)",
                          border:
                            item.autor === "usuario"
                              ? "1px solid rgba(56,189,248,0.22)"
                              : "1px solid rgba(148,163,184,0.16)",
                          color: "#f8fafc",
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 5,
                            color:
                              item.autor === "usuario"
                                ? "#dbeafe"
                                : "#38bdf8",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {item.autor === "usuario" ? "Você" : "IA DubWorks"}
                        </div>

                        {item.texto}
                      </div>
                    </div>
                  ))
                )}

                {carregandoIA && (
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    ✦ A IA está pensando...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={pageHeaderDarkStyle}>
          <div>
            <div style={breadcrumbDarkStyle}>Ferramentas</div>
            <h1 style={pageTitleDarkStyle}>Central de Ferramentas</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Recursos internos de comunicação, organização e produção da
              DubWorks.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 18,
          }}
        >
          {ferramentas.map((ferramenta) => (
            <div key={ferramenta.id} style={cardFerramentaStyle}>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(56,189,248,0.10)",
                      border: "1px solid rgba(56,189,248,0.18)",
                      fontSize: 27,
                    }}
                  >
                    {ferramenta.icon}
                  </div>

                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      background:
                        ferramenta.status === "Disponível"
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(245,158,11,0.10)",
                      border:
                        ferramenta.status === "Disponível"
                          ? "1px solid rgba(34,197,94,0.34)"
                          : "1px solid rgba(245,158,11,0.20)",
                      color:
                        ferramenta.status === "Disponível"
                          ? "#86efac"
                          : "#fde68a",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {ferramenta.status}
                  </span>
                </div>

                <h2
                  style={{
                    ...tituloCardDarkStyle,
                    fontSize: 22,
                    marginTop: 18,
                  }}
                >
                  {ferramenta.titulo}
                </h2>

                <p
                  style={{
                    color: "#94a3b8",
                    lineHeight: 1.5,
                    margin: "9px 0 0",
                  }}
                >
                  {ferramenta.descricao}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCategoriaFerramentas(ferramenta.id)}
                style={{
                  ...botaoPrimarioStyle,
                  width: "100%",
                  minHeight: 44,
                }}
              >
                {ferramenta.acao}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TrainingPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={pageHeaderDarkStyle}>
        <div>
          <div style={breadcrumbDarkStyle}>
            Treinamentos › Formação de Líderes
          </div>
          <h1 style={pageTitleDarkStyle}>Treinamento de Líderes</h1>
          <p style={{ color: "#94a3b8", margin: 0 }}>
            Área interna para formar, acompanhar e avaliar líderes de projetos
            da DubWorks.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {podeGerenciarTreinamentos(usuarioLogado) && (
            <button
              onClick={() => {
                setMostrarResultadosTreinamento(!mostrarResultadosTreinamento);
                recarregarRespostasTreinamento();
              }}
              style={botaoSecundarioGrandeStyle}
            >
              {mostrarResultadosTreinamento
                ? "Ver módulos"
                : "Resultados das respostas"}
            </button>
          )}

          <button
            onClick={() => {
              setMostrarTreinamentos(false);
              setMostrarRelatorios(false);
              setMostrarUsuarios(false);
              setMostrarMembros(false);
            }}
            style={botaoSecundarioGrandeStyle}
          >
            Voltar aos projetos
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Progresso geral</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {progressoTreinamento}%
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Módulos</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {modulosTreinamentoLider.length}
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Questões corretas</div>
          <strong style={{ fontSize: 34, color: "#f8fafc" }}>
            {respostasCorretasTreinamento}/{totalPerguntasTreinamento}
          </strong>
        </div>
        <div style={cardDarkStyle}>
          <div style={{ color: "#94a3b8" }}>Status</div>
          <strong style={{ fontSize: 22, color: "#38bdf8" }}>
            {progressoTreinamento >= 100 ? "Concluído" : "Em andamento"}
          </strong>
        </div>
      </div>

      {mostrarResultadosTreinamento &&
      podeGerenciarTreinamentos(usuarioLogado) ? (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>Resultados do treinamento</h2>
          <p style={{ color: "#94a3b8" }}>
            Aqui a diretoria acompanha as respostas enviadas pelos líderes em
            treinamento.
          </p>

          <button
            type="button"
            onClick={recarregarRespostasTreinamento}
            style={botaoSecundarioGrandeStyle}
          >
            Atualizar respostas
          </button>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {carregandoRespostasTreinamento && (
              <p style={{ color: "#94a3b8" }}>Carregando respostas...</p>
            )}

            {!carregandoRespostasTreinamento &&
              respostasTreinamentoSalvas.length === 0 && (
                <p style={{ color: "#94a3b8" }}>
                  Nenhuma resposta enviada ainda.
                </p>
              )}

            {!carregandoRespostasTreinamento &&
              respostasTreinamentoSalvas.map((resposta) => (
                <div
                  key={`${resposta.id || resposta.usuario_login}-${
                    resposta.modulo_id
                  }-${resposta.data_resposta}`}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: resposta.correta
                      ? "1px solid rgba(34,197,94,.35)"
                      : "1px solid rgba(248,113,113,.35)",
                    background: resposta.correta
                      ? "rgba(34,197,94,.08)"
                      : "rgba(248,113,113,.08)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                    {resposta.usuario_nome || resposta.usuario_login} •{" "}
                    {resposta.modulo_titulo}
                  </div>

                  <div style={{ color: "#94a3b8" }}>
                    {resposta.data_resposta
                      ? new Date(resposta.data_resposta).toLocaleString("pt-BR")
                      : "Sem data registrada"}
                  </div>

                  <div style={{ color: "#cbd5e1" }}>
                    <strong>Pergunta:</strong> {resposta.pergunta}
                  </div>

                  <div style={{ color: "#cbd5e1" }}>
                    <strong>Resposta marcada:</strong>{" "}
                    {String.fromCharCode(65 + resposta.alternativa_marcada)}){" "}
                    {resposta.alternativa_texto}
                  </div>

                  <div
                    style={{
                      color: resposta.correta ? "#86efac" : "#fca5a5",
                      fontWeight: 900,
                    }}
                  >
                    {resposta.correta ? "Correta" : "Incorreta"}
                  </div>

                  <div style={{ color: "#94a3b8" }}>
                    <strong>Explicação:</strong> {resposta.explicacao}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "340px 1fr",
            gap: 18,
          }}
        >
          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>Módulos do treinamento</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {modulosTreinamentoLider.map((modulo) => (
                <button
                  key={modulo.id}
                  type="button"
                  onClick={() => setModuloTreinamentoAtivo(modulo.id)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border:
                      moduloTreinamentoAtivo === modulo.id
                        ? "1px solid rgba(56,189,248,.65)"
                        : "1px solid rgba(148,163,184,.18)",
                    background:
                      moduloTreinamentoAtivo === modulo.id
                        ? "rgba(14,165,233,.16)"
                        : "rgba(15,23,42,.42)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {modulo.titulo}
                </button>
              ))}
            </div>
          </div>

          <div style={painelDarkStyle}>
            <h2 style={tituloCardDarkStyle}>
              {moduloSelecionadoTreinamento.titulo}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 16 }}>
              {moduloSelecionadoTreinamento.descricao}
            </p>

            {moduloSelecionadoTreinamento.id === "pratica-projetos" && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 16,
                  border: "1px solid rgba(96,165,250,.28)",
                  background: "rgba(37,99,235,.10)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ color: "#f8fafc" }}>Treinamento guiado no sistema</strong>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 5 }}>
                    O guia usa apenas caixas, setas e destaques. Nenhum personagem aparece.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={iniciarTutorialPraticoProjetos}
                  style={botaoPrimarioStyle}
                >
                  Iniciar treinamento na prática
                </button>
              </div>
            )}

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <h3 style={{ color: "#f8fafc", margin: 0 }}>Conteúdo</h3>
              {moduloSelecionadoTreinamento.conteudos.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,.18)",
                    background: "rgba(2,6,23,.34)",
                    color: "#cbd5e1",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {moduloSelecionadoTreinamento.pergunta && (
              <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
                <h3 style={{ color: "#f8fafc", margin: 0 }}>
                  Pergunta para concluir o módulo
                </h3>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(56,189,248,.25)",
                    background: "rgba(14,165,233,.10)",
                    color: "#f8fafc",
                    fontWeight: 800,
                  }}
                >
                  {moduloSelecionadoTreinamento.pergunta.pergunta}
                </div>

                {moduloSelecionadoTreinamento.pergunta.alternativas.map(
                  (alternativa, index) => {
                    const selecionada =
                      respostasTreinamento[moduloSelecionadoTreinamento.id] ===
                      index;
                    const correta =
                      moduloSelecionadoTreinamento.pergunta?.correta === index;
                    const respondida =
                      respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                      undefined;

                    return (
                      <button
                        key={`${moduloSelecionadoTreinamento.id}-${index}`}
                        type="button"
                        onClick={() =>
                          responderPerguntaTreinamento(
                            moduloSelecionadoTreinamento.id,
                            index
                          )
                        }
                        style={{
                          textAlign: "left",
                          padding: 16,
                          borderRadius: 16,
                          cursor: "pointer",
                          border: selecionada
                            ? correta
                              ? "1px solid rgba(34,197,94,.75)"
                              : "1px solid rgba(248,113,113,.75)"
                            : "1px solid rgba(148,163,184,.18)",
                          background: selecionada
                            ? correta
                              ? "rgba(34,197,94,.16)"
                              : "rgba(248,113,113,.14)"
                            : "rgba(15,23,42,.42)",
                          color: "#f8fafc",
                          fontWeight: 700,
                        }}
                      >
                        {String.fromCharCode(65 + index)}) {alternativa}
                      </button>
                    );
                  }
                )}

                {respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                  undefined && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      border:
                        respostasTreinamento[
                          moduloSelecionadoTreinamento.id
                        ] === moduloSelecionadoTreinamento.pergunta.correta
                          ? "1px solid rgba(34,197,94,.45)"
                          : "1px solid rgba(248,113,113,.45)",
                      background:
                        respostasTreinamento[
                          moduloSelecionadoTreinamento.id
                        ] === moduloSelecionadoTreinamento.pergunta.correta
                          ? "rgba(34,197,94,.10)"
                          : "rgba(248,113,113,.10)",
                      color: "#cbd5e1",
                    }}
                  >
                    <strong style={{ color: "#f8fafc" }}>
                      {respostasTreinamento[moduloSelecionadoTreinamento.id] ===
                      moduloSelecionadoTreinamento.pergunta.correta
                        ? "Resposta correta. Módulo concluído."
                        : "Resposta incorreta. Revise o conteúdo deste módulo."}
                    </strong>
                    <br />
                    {moduloSelecionadoTreinamento.pergunta.explicacao}
                  </div>
                )}

                {respostasTreinamento[moduloSelecionadoTreinamento.id] !==
                  undefined && (
                  <button
                    type="button"
                    onClick={() =>
                      enviarRespostaTreinamento(moduloSelecionadoTreinamento)
                    }
                    style={{
                      background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                      border: "none",
                      color: "#fff",
                      borderRadius: 14,
                      padding: "14px 18px",
                      cursor: "pointer",
                      fontWeight: 900,
                      boxShadow: "0 0 25px rgba(37,99,235,.35)",
                    }}
                  >
                    Enviar resposta para diretoria
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={painelDarkStyle}>
        <h2 style={tituloCardDarkStyle}>Avaliação manual do líder</h2>
        <p style={{ color: "#94a3b8" }}>
          Área para a diretoria registrar uma avaliação simples do líder em
          treinamento. Nesta versão, os dados ficam na tela; depois podemos
          salvar no Supabase.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Líder avaliado</label>
            <input
              value={avaliacaoLider.lider}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, lider: e.target.value })
              }
              placeholder="Nome do líder"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Projeto relacionado</label>
            <input
              value={avaliacaoLider.projeto}
              onChange={(e) =>
                setAvaliacaoLider({
                  ...avaliacaoLider,
                  projeto: e.target.value,
                })
              }
              placeholder="Nome do projeto"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Nota</label>
            <input
              value={avaliacaoLider.nota}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, nota: e.target.value })
              }
              placeholder="0 a 10"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={avaliacaoLider.status}
              onChange={(e) =>
                setAvaliacaoLider({ ...avaliacaoLider, status: e.target.value })
              }
              style={inputStyle}
            >
              <option value="em_treinamento">Em treinamento</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="pausado">Pausado</option>
              <option value="atencao">Atenção</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Observações da diretoria</label>
          <textarea
            value={avaliacaoLider.observacoes}
            onChange={(e) =>
              setAvaliacaoLider({
                ...avaliacaoLider,
                observacoes: e.target.value,
              })
            }
            placeholder="Pontos positivos, pontos a melhorar e orientações..."
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(56,189,248,.25)",
            background: "rgba(14,165,233,.10)",
            color: "#cbd5e1",
          }}
        >
          <strong style={{ color: "#f8fafc" }}>Resumo da avaliação:</strong>
          <br />
          Líder: {avaliacaoLider.lider || "Não informado"} • Projeto:{" "}
          {avaliacaoLider.projeto || "Não informado"} • Nota:{" "}
          {avaliacaoLider.nota || "-"} • Status: {avaliacaoLider.status}
        </div>
      </div>
    </div>
  );

  const ProjectsPage = () => (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          ...pageHeaderDarkStyle,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "flex-start",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, width: isMobile ? "100%" : "auto" }}>
          <div style={breadcrumbDarkStyle}>{projetoPainel ? `Projetos › ${projetoPainel.Projeto}` : "Projetos"}</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <h1
              style={{
                ...pageTitleDarkStyle,
                fontSize: isMobile ? 32 : pageTitleDarkStyle.fontSize,
                overflowWrap: "anywhere",
                wordBreak: "normal",
                minWidth: 0,
              }}
            >
              {projetoPainel?.Projeto || "Projetos"}
            </h1>

            {projetoPainel && (
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 13,
                  color: "#38bdf8",
                  background: "rgba(37,99,235,0.22)",
                  border: "1px solid rgba(56,189,248,0.18)",
                  padding: "7px 10px",
                  borderRadius: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Projeto Ativo
              </span>
            )}
          </div>

          {projetoPainel && statusSincronizacaoAutomatica === "sincronizando" && (
            <div
              style={{
                marginTop: 7,
                color: "#7dd3fc",
                fontSize: 12,
                fontWeight: 700,
                animation: "dwPulse 1.2s ease-in-out infinite",
              }}
            >
              ↻ Sincronizando dados do projeto...
            </div>
          )}
        </div>

        <div
          style={{
            display: isMobile ? "grid" : "flex",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : undefined,
            gap: 10,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
            minWidth: 0,
          }}
        >
          {!isMobile && (
            <button
              onClick={() =>
                setMostrarNotificacoesChat((anterior) => !anterior)
              }
              style={{
                ...botaoSecundarioStyle,
                border: mostrarNotificacoesChat
                  ? "1px solid rgba(96,165,250,.52)"
                  : botaoSecundarioStyle.border,
                background: mostrarNotificacoesChat
                  ? "rgba(37,99,235,.18)"
                  : botaoSecundarioStyle.background,
              }}
              title="Abrir notificações"
            >
              🔔 Notificações ({quantidadeNotificacoesNaoLidas})
            </button>
          )}

          {projetoPainel && (
            <button
              onClick={voltarParaListaProjetos}
              style={{
                ...botaoSecundarioStyle,
                width: isMobile ? "100%" : undefined,
                gridColumn: isMobile ? "1 / -1" : undefined,
                whiteSpace: "normal",
              }}
            >
              ← Voltar aos projetos
            </button>
          )}

          {projetoPainel && usuarioLogado?.cargo === "diretoria" && (
            <button
              onClick={() =>
                alterarArquivamentoProjeto(!projetoPainel.Arquivado)
              }
              style={{
                ...botaoSecundarioStyle,
                width: isMobile ? "100%" : undefined,
                minWidth: 0,
              }}
            >
              {projetoPainel.Arquivado ? "Desarquivar" : "Arquivar"}
            </button>
          )}

          {!projetoPainel && podeCriarProjeto(usuarioLogado) && (
            <button
              data-tutorial-projetos="novo-projeto"
              onClick={() => {
                limparFormularioProjeto();
                setMostrarNovoProjeto(true);
              }}
              style={{
                ...botaoPrimarioStyle,
                width: isMobile ? "100%" : undefined,
                minWidth: 0,
              }}
            >
              Novo projeto
            </button>
          )}

          <button
            onClick={async () => {
              await recarregarProjetos();
              alert("Projetos atualizados.");
            }}
            style={{
              ...botaoSecundarioStyle,
              width: isMobile ? "100%" : undefined,
              minWidth: 0,
              gridColumn:
                isMobile && !(projetoPainel && usuarioLogado?.cargo === "diretoria")
                  ? "1 / -1"
                  : undefined,
            }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={painelDarkStyle}>
        <h2 style={tituloCardDarkStyle}>{projetoPainel ? "Estatísticas do Projeto" : "Visão Geral"}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "minmax(0, 1fr)"
              : isTablet
              ? "repeat(2, minmax(220px, 1fr))"
              : "repeat(5, minmax(180px, 220px))",
            justifyContent: "center",
            gap: 14,
            width: "100%",
            maxWidth: isMobile
              ? "100%"
              : isTablet
              ? 760
              : 1180,
            margin: "18px auto 0",
          }}
        >
          {projetoPainel ? (
            <>
              <MiniStat
                icon="👥"
                value={String(estatisticasCards.membrosElenco)}
                label="Membros no Elenco"
                color="#3b82f6"
              />
              <MiniStat
                icon="🎙️"
                value={String(estatisticasCards.videosTestes)}
                label="Vídeos/Testes"
                color="#8b5cf6"
              />
              <MiniStat
                icon="🎬"
                value={String(estatisticasCards.finalizados).padStart(2, "0")}
                label="Episódios Finalizados"
                color="#22c55e"
              />
              <MiniStat
                icon="🕒"
                value={String(estatisticasCards.registros).padStart(2, "0")}
                label="Registros Semanais"
                color="#f97316"
              />
              <MiniStat
                icon="📈"
                value={`${estatisticasCards.progresso}%`}
                label="Progresso Geral"
                color="#14b8a6"
              />
            </>
          ) : (
            <>
              <MiniStat
                icon="📁"
                value={String(projetosVisiveis.length)}
                label="Projetos no total"
                color="#f59e0b"
              />
              <MiniStat
                icon="▶"
                value={String(projetosAtivosRelatorio.length)}
                label="Projetos ativos"
                color="#22c55e"
              />
              <MiniStat
                icon="◉"
                value={String(
                  projetosVisiveis.filter((projeto) =>
                    normalizar(projeto.Status).includes("selec")
                  ).length
                )}
                label="Em seleção"
                color="#8b5cf6"
              />
              <MiniStat
                icon="■"
                value={String(
                  projetosVisiveis.filter((projeto) => {
                    const status = normalizar(projeto.Status);
                    return ["final", "conclu", "encerr"].some((termo) =>
                      status.includes(termo)
                    );
                  }).length
                )}
                label="Encerrados"
                color="#ef4444"
              />
              <MiniStat
                icon="📈"
                value={`${estatisticasCards.progresso}%`}
                label="Progresso geral"
                color="#3b82f6"
              />
            </>
          )}
        </div>
      </div>

      {!projetoPainel && (
        <>
          <div
            style={{
              ...painelDarkStyle,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 220px 220px",
              gap: 12,
              padding: 14,
            }}
          >
            <input
              placeholder="Buscar por projeto, líder, editor, gênero ou personagem..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPaginaProjetos(1);
              }}
              style={inputStyle}
            />
            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPaginaProjetos(1);
              }}
              style={inputStyle}
              aria-label="Filtrar projetos por status"
            >
              <option value="Todos">Todos os status</option>
              {statusUnicos.map((status, i) => (
                <option key={`${status}-${i}`} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={generoFiltro}
              onChange={(e) => {
                setGeneroFiltro(e.target.value);
                setPaginaProjetos(1);
              }}
              style={inputStyle}
              aria-label="Filtrar projetos por gênero ou categoria"
            >
              <option value="Todos">Todos os gêneros</option>
              {GENERO_PROJETO_OPCOES.filter((genero) => genero !== "Outro").map(
                (genero) => (
                  <option key={genero} value={genero}>
                    {genero}
                  </option>
                )
              )}
              <option value="Outro">Outros</option>
            </select>
          </div>

          {ProjectList()}
        </>
      )}

      {projetoPainel && (
        <div
          data-tutorial-projetos="abas-projeto"
          style={{
            ...tabsDarkStyle,
            overflowX: isMobile ? "auto" : tabsDarkStyle.overflowX,
            overflowY: "hidden",
            flexWrap: isMobile ? "nowrap" : tabsDarkStyle.flexWrap,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}
        >
          {[
            ["informacoes", "ⓘ Informações"],
            ["selecao", "🎭 Seleção"],
            ["elenco", "🎭 Banco & Semanas"],
            ["registros", "▣ Registro"],
            ["atividades", "↔ Atividade"],
            ["historico", "◷ Histórico"],
            ["relatorios", "▥ Relatórios"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAbaProjeto(id as any)}
              style={{
                ...tabButtonDarkStyle,
                background:
                  abaProjeto === id ? "rgba(37,99,235,0.22)" : "transparent",
                color: abaProjeto === id ? "#38bdf8" : "#cbd5e1",
                borderBottom:
                  abaProjeto === id
                    ? "2px solid #38bdf8"
                    : "2px solid transparent",
                flex: isMobile ? "0 0 auto" : tabButtonDarkStyle.flex,
                whiteSpace: "nowrap",
                minWidth: isMobile ? "max-content" : tabButtonDarkStyle.minWidth,
                paddingInline: isMobile ? 14 : tabButtonDarkStyle.paddingInline,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {projetoPainel && abaProjeto === "informacoes" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 0.95fr",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            {ProjectDetails()}
            <div style={painelDarkStyle}>
              <h2 style={tituloCardDarkStyle}>▣ Observações</h2>
              <div
                style={{
                  background: "rgba(2,6,23,0.56)",
                  border: "1px solid rgba(148,163,184,0.14)",
                  borderRadius: 12,
                  minHeight: 84,
                  padding: 14,
                  color: "#f8fafc",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                {observacoesVisiveis || "Sem observações cadastradas."}
              </div>
            </div>
          </div>
          {DrivePanel()}
        </div>
      )}

      {abaProjeto === "selecao" &&
        projetoPainel &&
        renderAbaSelecaoVisual(projetoPainel)}

      {abaProjeto === "elenco" && projetoPainel && (
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              ...painelDarkStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              border: "1px solid rgba(14,165,233,0.34)",
            }}
          >
            <div>
              <h2 style={{ ...tituloCardDarkStyle, marginBottom: 4 }}>
                🎬 Produção e Entregas
              </h2>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                {semanasProjeto.length
                  ? `${labelSemana(semanaFiltroProducao)} • ${participantesSemanaProjeto.length} participante(s) nesta semana`
                  : "Crie a primeira semana para vincular participantes. A sincronização do formulário de entregas continua disponível."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={botaoPrimarioStyle}
                disabled={
                  sincronizandoEntregas ||
                  liberandoSemana ||
                  enviandoLembretesWhatsapp
                }
                onClick={() => sincronizarEntregasProducao(projetoPainel)}
              >
                {sincronizandoEntregas
                  ? "Sincronizando formulário..."
                  : "🔄 Sincronizar formulário de entregas"}
              </button>

              {usuarioLogado?.cargo === "diretoria" && (
                <button
                  type="button"
                  style={{
                    ...botaoSecundarioStyle,
                    color: "#86efac",
                    border: "1px solid rgba(34, 197, 94, 0.30)",
                    background: "rgba(34, 197, 94, 0.10)",
                  }}
                  disabled={
                    enviandoLembretesWhatsapp ||
                    sincronizandoEntregas ||
                    liberandoSemana
                  }
                  onClick={() =>
                    enviarLembretesWhatsappPendentes(projetoPainel)
                  }
                >
                  {enviandoLembretesWhatsapp
                    ? "📱 Colocando na fila..."
                    : "📱 Enviar pendentes"}
                </button>
              )}
            </div>
          </div>

          <div style={painelDarkStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={tituloCardDarkStyle}>🎭 Banco do Projeto</h2>
                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                  Cadastre os personagens uma única vez. Preencha nome do dublador e
                  telefone quando a escalação estiver definida.
                </p>
              </div>

              {rascunho && podeEditarProjeto(usuarioLogado, projetoPainel) && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={adicionarElencoRascunho}
                    style={botaoPrimarioStyle}
                  >
                    + Adicionar personagem
                  </button>

                  <button
                    type="button"
                    onClick={salvarElencoAtual}
                    style={{
                      ...botaoSecundarioStyle,
                      color: "#86efac",
                      border: "1px solid rgba(34, 197, 94, 0.30)",
                      background: "rgba(34, 197, 94, 0.10)",
                    }}
                  >
                    Salvar Banco do Projeto
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const banco = (rascunho || projetoPainel)?.Elenco || [];
              const comDublador = banco.filter((item) =>
                Boolean(item.dublador?.trim())
              ).length;
              const papeisAbertos = banco.length - comDublador;
              const semTelefone = banco.filter(
                (item) => item.dublador?.trim() && !item.telefone_dublador?.trim()
              ).length;

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  {[
                    ["Personagens", String(banco.length)],
                    ["Com dublador", String(comDublador)],
                    ["Papéis abertos", String(papeisAbertos)],
                    ["Sem telefone", String(semTelefone)],
                  ].map(([label, valor]) => (
                    <div
                      key={label}
                      style={{
                        background: "rgba(2, 6, 23, 0.55)",
                        border: "1px solid rgba(148, 163, 184, 0.20)",
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>
                        {label}
                      </div>
                      <strong style={{ color: "#f8fafc", fontSize: 20 }}>
                        {valor}
                      </strong>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
              {((rascunho || projetoPainel)?.Elenco || []).length ? (
                ((rascunho || projetoPainel)?.Elenco || []).map((item, index) => {
                  const podeEditarBanco =
                    Boolean(rascunho) &&
                    podeEditarProjeto(usuarioLogado, projetoPainel);
                  const papelAberto = !item.dublador?.trim();

                  return (
                    <details
                      key={item.id || index}
                      style={{
                        background: "rgba(2,6,23,0.48)",
                        border: "1px solid rgba(148,163,184,0.14)",
                        borderRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          padding: "12px 14px",
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "minmax(180px,1.25fr) minmax(150px,1fr) auto",
                          gap: 10,
                          alignItems: "center",
                          color: "#f8fafc",
                          userSelect: "none",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 3 }}>
                            Personagem
                          </div>
                          <strong
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 13,
                            }}
                          >
                            {item.personagem || "Personagem sem nome"}
                          </strong>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 3 }}>
                            Dublador
                          </div>
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: papelAberto ? "#fbbf24" : "#cbd5e1",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item.dublador || "Papel aberto"}
                          </span>
                        </div>

                        <span
                          style={{
                            justifySelf: isMobile ? "start" : "end",
                            color: "#7dd3fc",
                            fontSize: 11,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Abrir detalhes
                        </span>
                      </summary>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1.1fr 1.1fr 1fr auto",
                          gap: 12,
                          alignItems: "end",
                          padding: "14px",
                          borderTop: "1px solid rgba(148,163,184,0.12)",
                          background: "rgba(15,23,42,0.38)",
                        }}
                      >
                        <div>
                          <div style={{ color: "#94a3b8", fontSize: 12 }}>
                            Personagem *
                          </div>
                          {podeEditarBanco ? (
                            <input
                              value={item.personagem || ""}
                              onChange={(e) =>
                                atualizarElencoRascunho(
                                  index,
                                  "personagem",
                                  e.target.value
                                )
                              }
                              placeholder="Nome do personagem"
                              style={inputStyle}
                            />
                          ) : (
                            <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                              {item.personagem || "-"}
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ color: "#94a3b8", fontSize: 12 }}>
                            Dublador
                          </div>
                          {podeEditarBanco ? (
                            <input
                              value={item.dublador || ""}
                              onChange={(e) =>
                                atualizarElencoRascunho(
                                  index,
                                  "dublador",
                                  e.target.value
                                )
                              }
                              placeholder="Nome do dublador"
                              style={inputStyle}
                            />
                          ) : (
                            <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                              {item.dublador || "Papel aberto"}
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ color: "#94a3b8", fontSize: 12 }}>
                            Telefone do dublador
                          </div>
                          {podeEditarBanco ? (
                            <input
                              value={item.telefone_dublador || ""}
                              onChange={(e) =>
                                atualizarElencoRascunho(
                                  index,
                                  "telefone_dublador" as any,
                                  e.target.value
                                )
                              }
                              placeholder="[00] 00000-0000"
                              style={inputStyle}
                            />
                          ) : (
                            <div style={{ color: "#f8fafc", fontWeight: 900 }}>
                              {item.telefone_dublador || "-"}
                            </div>
                          )}
                        </div>

                        {podeEditarBanco && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                            }}
                          >
                            {item.dublador?.trim() && item.id && (
                              <button
                                type="button"
                                disabled={reabrindoPapelId === String(item.id)}
                                onClick={() => reabrirPapelProjeto(item)}
                                style={{
                                  ...botaoSecundarioStyle,
                                  color: "#fde68a",
                                  border: "1px solid rgba(245,158,11,0.30)",
                                  background: "rgba(245,158,11,0.10)",
                                }}
                              >
                                {reabrindoPapelId === String(item.id)
                                  ? "Reabrindo..."
                                  : "Reabrir papel"}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => excluirElencoRascunho(item, index)}
                              style={{
                                ...botaoSecundarioStyle,
                                color: "#fca5a5",
                                border: "1px solid rgba(248,113,113,0.28)",
                                background: "rgba(220,38,38,0.12)",
                              }}
                            >
                              Retirar do banco
                            </button>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })
              ) : (
                <div
                  style={{
                    color: "#94a3b8",
                    border: "1px dashed rgba(148,163,184,0.24)",
                    borderRadius: 14,
                    padding: 18,
                    textAlign: "center",
                  }}
                >
                  Nenhum personagem cadastrado. Você pode criar o banco mesmo
                  antes de escolher os dubladores.
                </div>
              )}
            </div>
          </div>

          <div data-tutorial-projetos="semanas-projeto" style={painelDarkStyle}>
            <div>
              <h2 style={tituloCardDarkStyle}>📅 Semanas do Projeto</h2>
              <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                Cada semana possui seu próprio grupo de personagens. Alterações
                futuras no elenco não modificam as semanas anteriores.
              </p>
            </div>

            {!semanasProjeto.length ? (
              <div
                style={{
                  marginTop: 18,
                  border: "1px dashed rgba(56,189,248,0.26)",
                  background: "rgba(56,189,248,0.06)",
                  borderRadius: 16,
                  padding: 22,
                  color: "#cbd5e1",
                  textAlign: "center",
                  display: "grid",
                  gap: 14,
                  justifyItems: "center",
                }}
              >
                <div>
                  Nenhuma semana foi criada ainda. A primeira será
                  automaticamente a <strong>Semana 01</strong>.
                </div>

                {podeEditarProjeto(usuarioLogado, projetoPainel) && (
                  <button
                    type="button"
                    onClick={() => criarNovaSemanaProjeto(projetoPainel)}
                    disabled={criandoSemanaProjeto}
                    style={botaoPrimarioStyle}
                  >
                    {criandoSemanaProjeto ? "Criando..." : "+ Criar Semana 01"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {(() => {
                  const semanaAtual = semanasProjeto.find(
                    (item) => item.semana === semanaFiltroProducao
                  );
                  const prazo = String(
                    Reflect.get(Object(semanaAtual || {}), "prazo_em") || ""
                  );
                  const semanaConcluida = semanaAtual?.status === "concluida";

                  return (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "minmax(0, 1fr) auto auto",
                          gap: 10,
                          alignItems: "center",
                          marginTop: 18,
                        }}
                      >
                        <select
                          value={semanaFiltroProducao}
                          onChange={(e) =>
                            setSemanaFiltroProducao(Number(e.target.value))
                          }
                          style={inputStyle}
                        >
                          {semanasProjeto
                            .slice()
                            .sort((a, b) => a.semana - b.semana)
                            .map((semana) => (
                              <option
                                key={semana.id || semana.semana}
                                value={semana.semana}
                              >
                                {labelSemana(semana.semana)}
                              </option>
                            ))}
                        </select>

                        {podeEditarProjeto(usuarioLogado, projetoPainel) && (
                          <button
                            type="button"
                            onClick={() => criarNovaSemanaProjeto(projetoPainel)}
                            disabled={criandoSemanaProjeto}
                            style={botaoPrimarioStyle}
                          >
                            {criandoSemanaProjeto
                              ? "Criando..."
                              : "+ Criar próxima semana"}
                          </button>
                        )}

                        {podeEditarProjeto(usuarioLogado, projetoPainel) && (
                          <button
                            type="button"
                            disabled={excluindoSemanaProjeto || liberandoSemana}
                            onClick={() => excluirSemanaAtualProjeto(projetoPainel)}
                            style={{
                              ...botaoSecundarioStyle,
                              color: "#fca5a5",
                              border: "1px solid rgba(248,113,113,.34)",
                              background: "rgba(220,38,38,.12)",
                            }}
                          >
                            {excluindoSemanaProjeto
                              ? "Excluindo..."
                              : "Excluir semana"}
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                          padding: 16,
                          borderRadius: 16,
                          background: "rgba(2, 6, 23, 0.42)",
                          border: "1px solid rgba(56,189,248,0.16)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ color: "#f8fafc" }}>
                              🎬 Produção — {labelSemana(semanaFiltroProducao)}
                            </strong>

                            <span
                              style={{
                                borderRadius: 999,
                                padding: "8px 12px",
                                background: semanaConcluida
                                  ? "rgba(34,197,94,0.12)"
                                  : "rgba(56,189,248,0.12)",
                                color: semanaConcluida ? "#86efac" : "#7dd3fc",
                                border: "1px solid rgba(148,163,184,0.20)",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {semanaConcluida
                                ? "Semana concluída"
                                : "Semana aberta"}
                            </span>
                          </div>

                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 13,
                              marginTop: 6,
                            }}
                          >
                            {participantesSemanaProjeto.length} participante(s)
                            cadastrado(s) nesta semana.
                          </div>

                          {prazo && (
                            <div
                              style={{
                                color: "#94a3b8",
                                fontSize: 13,
                                marginTop: 4,
                              }}
                            >
                              Prazo: {new Date(prazo).toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            justifyContent: isMobile ? "stretch" : "flex-end",
                          }}
                        >
                          {!semanaConcluida &&
                            podeEditarProjeto(usuarioLogado, projetoPainel) && (
                              <button
                                type="button"
                                onClick={() => setMostrarAdicionarSemana(true)}
                                disabled={alterandoParticipanteSemana}
                                style={botaoSecundarioStyle}
                              >
                                + Adicionar dublador à semana
                              </button>
                            )}

                          {!semanaConcluida &&
                            podeEditarProjeto(usuarioLogado, projetoPainel) && (
                              <button
                                type="button"
                                disabled={liberandoSemana || excluindoSemanaProjeto}
                                onClick={() =>
                                  concluirSemanaAtualProjeto(projetoPainel)
                                }
                                style={botaoSecundarioStyle}
                              >
                                {liberandoSemana
                                  ? "Concluindo..."
                                  : "Concluir semana"}
                              </button>
                            )}

                          {semanaConcluida &&
                            podeEditarProjeto(usuarioLogado, projetoPainel) && (
                              <button
                                type="button"
                                disabled={liberandoSemana || excluindoSemanaProjeto}
                                onClick={() =>
                                  reabrirSemanaAtualProjeto(projetoPainel)
                                }
                                style={{
                                  ...botaoSecundarioStyle,
                                  color: "#fde68a",
                                  border: "1px solid rgba(245,158,11,.34)",
                                  background: "rgba(245,158,11,.10)",
                                }}
                              >
                                {liberandoSemana ? "Reabrindo..." : "Reabrir semana"}
                              </button>
                            )}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {(() => {
                  const elenco = participantesSemanaProjeto;
                  const entregasSemana = entregasProducao.filter(
                    (entrega) =>
                      numeroSemanaEntrega(entrega.semana) ===
                      semanaFiltroProducao
                  );
                  const totalElenco = elenco.length;
                  const totalEntregues = elenco.filter((item) =>
                    entregasSemana.some(
                      (entrega) =>
                        normalizar(entrega.personagem) ===
                        normalizar(item.personagem)
                    )
                  ).length;
                  const totalPendentes = Math.max(
                    totalElenco - totalEntregues,
                    0
                  );
                  const progresso =
                    totalElenco > 0
                      ? Math.round((totalEntregues / totalElenco) * 100)
                      : 0;
                  const semanaConcluida =
                    semanasProjeto.find(
                      (item) => item.semana === semanaFiltroProducao
                    )?.status === "concluida";

                  return (
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(4, minmax(0, 1fr))",
                          gap: 12,
                        }}
                      >
                        {[
                          ["Na semana", String(totalElenco)],
                          ["Entregues", String(totalEntregues)],
                          ["Pendentes", String(totalPendentes)],
                          ["Progresso", `${progresso}%`],
                        ].map(([label, valor]) => (
                          <div
                            key={label}
                            style={{
                              background: "rgba(15, 23, 42, 0.68)",
                              border: "1px solid rgba(148, 163, 184, 0.16)",
                              borderRadius: 14,
                              padding: 14,
                            }}
                          >
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>
                              {label}
                            </div>
                            <strong
                              style={{ color: "#f8fafc", fontSize: 20 }}
                            >
                              {valor}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(15, 23, 42, 0.85)",
                          overflow: "hidden",
                          border: "1px solid rgba(148, 163, 184, 0.16)",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${progresso}%`,
                            background:
                              "linear-gradient(135deg, #22c55e, #38bdf8)",
                          }}
                        />
                      </div>

                      {carregandoParticipantesSemana ? (
                        <div style={{ color: "#94a3b8", padding: 18 }}>
                          Carregando participantes da semana...
                        </div>
                      ) : elenco.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {elenco.map((item) => {
                            const entrega = entregasSemana.find(
                              (envio) =>
                                normalizar(envio.personagem) ===
                                normalizar(item.personagem)
                            );

                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "1fr 1fr 0.8fr 1fr 1.2fr",
                                  gap: 12,
                                  alignItems: "center",
                                  background: "rgba(15, 23, 42, 0.70)",
                                  border:
                                    "1px solid rgba(148, 163, 184, 0.14)",
                                  borderRadius: 14,
                                  padding: 14,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 11,
                                    }}
                                  >
                                    Personagem
                                  </div>
                                  <strong style={{ color: "#f8fafc" }}>
                                    {item.personagem || "-"}
                                  </strong>
                                </div>

                                <div>
                                  <div
                                    style={{
                                      color: "#94a3b8",
                                      fontSize: 11,
                                    }}
                                  >
                                    Dublador
                                  </div>
                                  <strong style={{ color: "#f8fafc" }}>
                                    {item.dublador || "-"}
                                  </strong>
                                  <div
                                    style={{
                                      color: "#64748b",
                                      fontSize: 11,
                                      marginTop: 3,
                                    }}
                                  >
                                    {item.telefone_dublador || "Sem número"}
                                  </div>
                                </div>

                                <div>
                                  <span
                                    style={{
                                      borderRadius: 999,
                                      padding: "6px 10px",
                                      background: entrega
                                        ? "rgba(34, 197, 94, 0.14)"
                                        : "rgba(245, 158, 11, 0.14)",
                                      color: entrega ? "#86efac" : "#fde68a",
                                      border:
                                        "1px solid rgba(148, 163, 184, 0.14)",
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {entrega ? "Entregue" : "Pendente"}
                                  </span>
                                </div>

                                <div>
                                  {entrega?.video_url ? (
                                    <a
                                      href={entrega.video_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: "#38bdf8",
                                        fontWeight: 800,
                                        textDecoration: "none",
                                      }}
                                    >
                                      Abrir envio ↗
                                    </a>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>
                                      Sem envio
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    justifyContent: isMobile
                                      ? "flex-start"
                                      : "flex-end",
                                  }}
                                >
                                  {entrega && (
                                    <>
                                      <button
                                        type="button"
                                        style={botaoSecundarioStyle}
                                        onClick={() =>
                                          alterarStatusEntrega(
                                            entrega,
                                            "aprovado"
                                          )
                                        }
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        style={botaoSecundarioStyle}
                                        onClick={() =>
                                          alterarStatusEntrega(
                                            entrega,
                                            "regravacao"
                                          )
                                        }
                                      >
                                        Regravar
                                      </button>
                                    </>
                                  )}

                                  {!semanaConcluida &&
                                    podeEditarProjeto(
                                      usuarioLogado,
                                      projetoPainel
                                    ) && (
                                      <button
                                        type="button"
                                        disabled={alterandoParticipanteSemana}
                                        onClick={() =>
                                          removerParticipanteDaSemana(
                                            projetoPainel,
                                            item
                                          )
                                        }
                                        style={{
                                          ...botaoSecundarioStyle,
                                          color: "#fca5a5",
                                          border:
                                            "1px solid rgba(248,113,113,0.28)",
                                          background:
                                            "rgba(220,38,38,0.10)",
                                        }}
                                      >
                                        Remover da semana
                                      </button>
                                    )}
                                </div>

                                {entrega?.video_url && (
                                  <div
                                    style={{
                                      gridColumn: isMobile ? "1" : "1 / -1",
                                      background: "rgba(2, 6, 23, 0.62)",
                                      border:
                                        "1px solid rgba(56, 189, 248, 0.16)",
                                      borderRadius: 14,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        padding: "10px 12px",
                                        borderBottom:
                                          "1px solid rgba(148, 163, 184, 0.12)",
                                      }}
                                    >
                                      <strong style={{ color: "#dbeafe" }}>
                                        ▶ Prévia do vídeo —{" "}
                                        {item.personagem || "Entrega"}
                                      </strong>
                                      <button
                                        type="button"
                                        style={{
                                          ...botaoSecundarioStyle,
                                          padding: "8px 12px",
                                        }}
                                        onClick={() =>
                                          window.open(
                                            entrega.video_url,
                                            "_blank",
                                            "noopener,noreferrer"
                                          )
                                        }
                                      >
                                        Abrir em nova aba ↗
                                      </button>
                                    </div>

                                    <iframe
                                      title={`Prévia da entrega de ${
                                        item.personagem || "personagem"
                                      }`}
                                      src={converterDriveParaPreview(
                                        entrega.video_url
                                      )}
                                      allow="autoplay"
                                      style={{
                                        width: "100%",
                                        height: isMobile ? 220 : 320,
                                        border: 0,
                                        display: "block",
                                        background: "#020617",
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            border:
                              "1px dashed rgba(148,163,184,0.24)",
                            borderRadius: 14,
                            padding: 18,
                            color: "#94a3b8",
                            textAlign: "center",
                          }}
                        >
                          Nenhum personagem foi adicionado a esta semana.
                          Clique em <strong>Adicionar dublador à semana</strong>.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}


      {projetoPainel && abaProjeto === "registros" && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>
            ▣ Registro — {projetoPainel.Projeto}
          </h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            Registre o andamento semanal do projeto. Esta área fica separada de Atividade e Histórico.
          </p>

          {(podeEditarProjeto(usuarioLogado, projetoPainel) ||
            usuarioLogado?.cargo === "diretoria" ||
            usuarioLogado?.cargo === "adm") && (
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <textarea
                placeholder="Ex.: Semana 03 concluída, elenco enviou as falas, edição iniciada..."
                value={registroSemanalTexto}
                onChange={(e) => setRegistroSemanalTexto(e.target.value)}
                style={{ ...textareaStyle, minHeight: 110 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={salvarRegistroSemanalProjeto}
                  style={botaoPrimarioStyle}
                >
                  Salvar registro
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 22,
              background: "rgba(2,6,23,0.54)",
              border: "1px solid rgba(148,163,184,0.14)",
              borderRadius: 14,
              padding: 16,
              color: "#cbd5e1",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {registroSemRelatorios(projetoPainel.Registro_Semanal) ||
              "Nenhum registro cadastrado."}
          </div>
        </div>
      )}

      {projetoPainel && abaProjeto === "atividades" && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>↔ Atividade do Projeto</h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            Atividades recentes vinculadas ao projeto selecionado.
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {notificacoesProjeto.length ? (
              notificacoesProjeto.map((item, index) => (
                <div
                  key={`${item.usuario}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    gap: 10,
                    background: "rgba(2,6,23,0.54)",
                    border: "1px solid rgba(56,189,248,0.14)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div>
                    <strong style={{ color: "#f8fafc" }}>{item.usuario}</strong>
                    <span style={{ color: "#cbd5e1" }}> — {item.acao}</span>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {item.tipo}
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>{item.data}</div>
                </div>
              ))
            ) : (
              <div style={{ color: "#94a3b8" }}>Nenhuma atividade recente.</div>
            )}
          </div>
        </div>
      )}

      {projetoPainel && abaProjeto === "historico" && (
        <div style={painelDarkStyle}>
          <h2 style={tituloCardDarkStyle}>
            ◷ Histórico — {projetoPainel.Projeto}
          </h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            Alterações e registros preservados do projeto, separados da área de atividade.
          </p>
          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {separarHistoricoProjeto(
              registroSemRelatorios(projetoPainel.Registro_Semanal)
            ).map((item, index) => (
              <div
                key={`${projetoPainel.ID}-historico-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr)",
                  gap: 12,
                  alignItems: "flex-start",
                  background: "rgba(2,6,23,0.54)",
                  border: "1px solid rgba(148,163,184,0.14)",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(14,165,233,.12)",
                    color: "#7dd3fc",
                    border: "1px solid rgba(56,189,248,.16)",
                  }}
                >
                  ◷
                </div>
                <div
                  style={{
                    color: "#cbd5e1",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                    overflowWrap: "anywhere",
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
            {!registroSemRelatorios(projetoPainel.Registro_Semanal) && (
              <div style={{ color: "#94a3b8" }}>Nenhum histórico salvo ainda.</div>
            )}
          </div>
        </div>
      )}

      {projetoPainel && abaProjeto === "relatorios" && (() => {
        const relatorios = lerRelatoriosProjeto(projetoPainel.Registro_Semanal);
        const pendenciasSubstituicao = relatorios.flatMap((relatorio) =>
          (relatorio.itens || [])
            .filter((item) => item.status === "precisa_substituir")
            .map((item) => ({ relatorio, item }))
        );

        return (
          <div
            data-tutorial-projetos="relatorios-projeto"
            style={{ display: "grid", gap: 18 }}
          >
            {pendenciasSubstituicao.length > 0 && (
              <div
                style={{
                  ...painelDarkStyle,
                  border: "1px solid rgba(245,158,11,.34)",
                  background: "rgba(120,53,15,.12)",
                }}
              >
                <h2 style={tituloCardDarkStyle}>⚠ Substituições necessárias</h2>
                <p style={{ color: "#fcd34d", marginTop: 8 }}>
                  Pendências identificadas nos relatórios semanais.
                </p>
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {pendenciasSubstituicao.map(({ relatorio, item }, index) => (
                    <div
                      key={`${relatorio.id}-${item.personagem}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        borderRadius: 12,
                        padding: 12,
                        background: "rgba(2,6,23,.44)",
                        border: "1px solid rgba(245,158,11,.22)",
                      }}
                    >
                      <div>
                        <strong>{item.personagem}</strong>
                        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                          {labelSemana(relatorio.semana || 1)} • {item.dublador || "Sem dublador"}
                        </div>
                      </div>
                      {usuarioLogado?.cargo === "diretoria" && (
                        <button
                          type="button"
                          onClick={() => void abrirVagaEmergencialPorRelatorio(item)}
                          style={botaoPrimarioStyle}
                        >
                          Abrir vaga emergencial
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={painelDarkStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={tituloCardDarkStyle}>▥ Relatório do projeto</h2>
                  <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                    A atividade semanal é calculada automaticamente. Materiais concluídos continuam podendo ser registrados manualmente.
                  </p>
                </div>
                <select
                  value={tipoRelatorioProjeto}
                  onChange={(e) =>
                    setTipoRelatorioProjeto(e.target.value as "semanal" | "material")
                  }
                  style={{ ...inputStyle, minWidth: 220 }}
                >
                  <option value="semanal">Atividade semanal automática</option>
                  <option value="material">Material/projeto concluído</option>
                </select>
              </div>

              {tipoRelatorioProjeto === "semanal" ? (
                <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
                      gap: 10,
                    }}
                  >
                    <select
                      value={semanaRelatorioProjeto}
                      onChange={(e) => {
                        const semana = Number(e.target.value);
                        setSemanaRelatorioProjeto(semana);
                        void carregarItensRelatorioSemana(projetoPainel, semana);
                      }}
                      style={inputStyle}
                    >
                      {semanasProjeto.length ? (
                        semanasProjeto.map((semana) => (
                          <option key={semana.id || semana.semana} value={semana.semana}>
                            {labelSemana(semana.semana)} • {semana.status === "aberta" ? "Aberta" : "Concluída"}
                          </option>
                        ))
                      ) : (
                        <option value={1}>Semana 01</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        void carregarItensRelatorioSemana(
                          projetoPainel,
                          semanaRelatorioProjeto
                        )
                      }
                      style={botaoSecundarioStyle}
                    >
                      ↻ Atualizar agora
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 13px",
                      borderRadius: 13,
                      border: "1px solid rgba(59,130,246,.20)",
                      background: "rgba(30,64,175,.10)",
                      color: "#bfdbfe",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontSize: 17 }}>✦</span>
                    <span>
                      <strong>Relatório automático.</strong> Os números abaixo são calculados a partir do elenco vinculado à semana e das entregas registradas no sistema.
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2,minmax(0,1fr))"
                        : "repeat(6,minmax(110px,1fr))",
                      gap: 10,
                    }}
                  >
                    {[
                      ["👥", resumoRelatorioAutomaticoProjeto.previstos, "Previstos", "#60a5fa"],
                      ["📥", resumoRelatorioAutomaticoProjeto.entregaram, "Entregaram", "#38bdf8"],
                      ["⚠", resumoRelatorioAutomaticoProjeto.naoEntregaram, "Não entregaram", "#fb7185"],
                      ["⌛", resumoRelatorioAutomaticoProjeto.pendentes, "Aguardando análise", "#fbbf24"],
                      ["✓", resumoRelatorioAutomaticoProjeto.aprovados, "Aprovados", "#4ade80"],
                      ["↻", resumoRelatorioAutomaticoProjeto.regravacoes, "Regravações", "#a78bfa"],
                    ].map(([icone, valor, label, cor]) => (
                      <div
                        key={String(label)}
                        style={{
                          padding: "13px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,.14)",
                          background: "rgba(2,6,23,.40)",
                        }}
                      >
                        <div style={{ color: String(cor), fontSize: 16, marginBottom: 5 }}>{icone}</div>
                        <div style={{ color: "#f8fafc", fontSize: 21, fontWeight: 950 }}>{valor}</div>
                        <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      ["Recebimento da semana", resumoRelatorioAutomaticoProjeto.progressoRecebimento, "entregas recebidas"],
                      ["Aprovação da semana", resumoRelatorioAutomaticoProjeto.progressoAprovacao, "entregas aprovadas"],
                    ].map(([label, valor, detalhe]) => (
                      <div
                        key={String(label)}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,.14)",
                          background: "rgba(2,6,23,.34)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong style={{ color: "#e2e8f0", fontSize: 12 }}>{label}</strong>
                          <strong style={{ color: "#93c5fd", fontSize: 12 }}>{valor}%</strong>
                        </div>
                        <div
                          style={{
                            height: 7,
                            background: "rgba(30,41,59,.90)",
                            borderRadius: 999,
                            overflow: "hidden",
                            marginTop: 9,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.max(0, Math.min(100, Number(valor)))}%`,
                              borderRadius: 999,
                              background: "linear-gradient(90deg,#2563eb,#38bdf8)",
                            }}
                          />
                        </div>
                        <div style={{ color: "#64748b", fontSize: 9, marginTop: 6 }}>{detalhe}</div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      border: "1px solid rgba(148,163,184,.14)",
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "rgba(2,6,23,.34)",
                    }}
                  >
                    {!isMobile && itensRelatorioProjeto.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(160px,1fr) minmax(160px,1fr) 180px minmax(170px,1.2fr)",
                          gap: 10,
                          padding: "10px 13px",
                          color: "#64748b",
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          borderBottom: "1px solid rgba(148,163,184,.12)",
                        }}
                      >
                        <span>Personagem</span>
                        <span>Dublador</span>
                        <span>Situação</span>
                        <span>Observação da entrega</span>
                      </div>
                    )}
                    {itensRelatorioProjeto.length ? (
                      itensRelatorioProjeto.map((item, index) => {
                        const info = infoStatusRelatorioAutomatico(item.status);
                        return (
                          <div
                            key={`${item.personagem}-${item.dublador}-${index}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile
                                ? "1fr"
                                : "minmax(160px,1fr) minmax(160px,1fr) 180px minmax(170px,1.2fr)",
                              gap: isMobile ? 7 : 10,
                              alignItems: "center",
                              padding: "12px 13px",
                              borderBottom:
                                index === itensRelatorioProjeto.length - 1
                                  ? "none"
                                  : "1px solid rgba(148,163,184,.10)",
                            }}
                          >
                            <div>
                              {isMobile && <div style={{ color: "#64748b", fontSize: 9 }}>Personagem</div>}
                              <strong style={{ color: "#f8fafc", fontSize: 12 }}>{item.personagem || "—"}</strong>
                            </div>
                            <div>
                              {isMobile && <div style={{ color: "#64748b", fontSize: 9 }}>Dublador</div>}
                              <span style={{ color: "#cbd5e1", fontSize: 12 }}>{item.dublador || "—"}</span>
                            </div>
                            <div>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "6px 9px",
                                  borderRadius: 999,
                                  color: info.color,
                                  background: info.bg,
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                {info.icon} {info.label}
                              </span>
                            </div>
                            <div style={{ color: item.observacao ? "#94a3b8" : "#475569", fontSize: 10 }}>
                              {item.observacao || "—"}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: "#94a3b8", padding: 18 }}>
                        Nenhum participante vinculado a esta semana. O relatório continuará vazio até o elenco ser adicionado à semana.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <input
                    value={materialNomeRelatorioProjeto}
                    onChange={(e) => setMaterialNomeRelatorioProjeto(e.target.value)}
                    placeholder="Ex.: Episódio 01 finalizado"
                    style={inputStyle}
                  />
                  <input
                    value={materialLinkRelatorioProjeto}
                    onChange={(e) => setMaterialLinkRelatorioProjeto(e.target.value)}
                    placeholder="Link do material finalizado"
                    style={inputStyle}
                  />
                  <textarea
                    value={materialObservacaoRelatorioProjeto}
                    onChange={(e) => setMaterialObservacaoRelatorioProjeto(e.target.value)}
                    placeholder="Observações sobre a entrega"
                    style={{ ...textareaStyle, minHeight: 90 }}
                  />
                </div>
              )}

              {tipoRelatorioProjeto === "material" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={salvandoRelatorioProjeto}
                    onClick={() => void salvarRelatorioProjetoAtual()}
                    style={botaoPrimarioStyle}
                  >
                    {salvandoRelatorioProjeto ? "Salvando..." : "Salvar material concluído"}
                  </button>
                </div>
              )}
            </div>

            <div style={painelDarkStyle}>
              <h2 style={tituloCardDarkStyle}>Relatórios salvos</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {relatorios.length ? (
                  relatorios.map((relatorio) => (
                    <details
                      key={relatorio.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,.16)",
                        background: "rgba(2,6,23,.44)",
                        padding: 14,
                      }}
                    >
                      <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                        {relatorio.tipo === "semanal"
                          ? `${labelSemana(relatorio.semana || 1)} — Relatório semanal`
                          : relatorio.materialNome || "Material concluído"}
                        <span style={{ color: "#64748b", fontWeight: 500 }}>
                          {` • ${new Date(relatorio.criadoEm).toLocaleDateString("pt-BR")} • ${relatorio.criadoPor}`}
                        </span>
                      </summary>

                      {relatorio.tipo === "semanal" ? (
                        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                          {(relatorio.itens || []).map((item, index) => (
                            <div
                              key={`${item.personagem}-${index}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 180px",
                                gap: 10,
                                color: "#cbd5e1",
                              }}
                            >
                              <span><strong>{item.personagem}</strong></span>
                              <span>{item.dublador || "—"}</span>
                              <span>{item.status.replace(/_/g, " ")}</span>
                            </div>
                          ))}
                          {relatorio.andamento && <div>Andamento: {relatorio.andamento}</div>}
                          {relatorio.dificuldades && <div>Dificuldades: {relatorio.dificuldades}</div>}
                          {relatorio.suporte && <div>Suporte: {relatorio.suporte}</div>}
                          {relatorio.observacoes && <div>Observações: {relatorio.observacoes}</div>}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8, marginTop: 12, color: "#cbd5e1" }}>
                          {relatorio.materialLink && (
                            <a
                              href={relatorio.materialLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#7dd3fc" }}
                            >
                              Abrir material ↗
                            </a>
                          )}
                          {relatorio.materialObservacao && (
                            <div>{relatorio.materialObservacao}</div>
                          )}
                        </div>
                      )}
                    </details>
                  ))
                ) : (
                  <div style={{ color: "#94a3b8" }}>Nenhum relatório salvo ainda.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}



    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 0%, rgba(37,99,235,0.16), transparent 30%), radial-gradient(circle at 95% 12%, rgba(14,165,233,0.08), transparent 32%), #050816",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <style>{estilosAnimacao}</style>

      {tutorialProjetoAtivo && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1990,
              background: "rgba(2,6,23,.62)",
              pointerEvents: "none",
            }}
          />

          {tutorialProjetoRect && (
            <div
              style={{
                position: "fixed",
                zIndex: 1995,
                left: Math.max(8, tutorialProjetoRect.left - 8),
                top: Math.max(8, tutorialProjetoRect.top - 8),
                width: Math.max(40, tutorialProjetoRect.width + 16),
                height: Math.max(40, tutorialProjetoRect.height + 16),
                borderRadius: 16,
                border: "3px solid #60a5fa",
                boxShadow:
                  "0 0 0 9999px rgba(2,6,23,.16), 0 0 34px rgba(59,130,246,.85)",
                pointerEvents: "none",
                transition: "all .22s ease",
              }}
            />
          )}

          <div
            style={{
              position: "fixed",
              zIndex: 2005,
              right: isMobile ? 12 : 24,
              bottom: isMobile ? 12 : 24,
              left: isMobile ? 12 : "auto",
              width: isMobile ? "auto" : 390,
              borderRadius: 18,
              border: "1px solid rgba(96,165,250,.42)",
              background:
                "linear-gradient(180deg, rgba(9,22,46,.99), rgba(5,15,34,.99))",
              boxShadow: "0 24px 70px rgba(0,0,0,.55)",
              padding: 18,
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 900 }}>
                  Treinamento na prática • Passo {tutorialProjetoPasso + 1} de {TUTORIAL_PROJETO_PASSOS.length}
                </div>
                <h3 style={{ color: "#f8fafc", margin: "7px 0 6px", fontSize: 19 }}>
                  {TUTORIAL_PROJETO_PASSOS[tutorialProjetoPasso]?.titulo}
                </h3>
                <p style={{ color: "#cbd5e1", lineHeight: 1.55, margin: 0 }}>
                  {TUTORIAL_PROJETO_PASSOS[tutorialProjetoPasso]?.texto}
                </p>
              </div>
              <button
                type="button"
                onClick={encerrarTutorialPraticoProjetos}
                aria-label="Fechar tutorial"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,.22)",
                  background: "rgba(15,23,42,.74)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${TUTORIAL_PROJETO_PASSOS.length}, minmax(0,1fr))`,
                gap: 5,
                marginTop: 16,
              }}
            >
              {TUTORIAL_PROJETO_PASSOS.map((_, index) => (
                <div
                  key={index}
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background:
                      index <= tutorialProjetoPasso ? "#3b82f6" : "rgba(148,163,184,.22)",
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                disabled={tutorialProjetoPasso === 0}
                onClick={() => void prepararPassoTutorialProjeto(tutorialProjetoPasso - 1)}
                style={{
                  ...botaoSecundarioStyle,
                  opacity: tutorialProjetoPasso === 0 ? .45 : 1,
                }}
              >
                ← Anterior
              </button>

              {tutorialProjetoPasso < TUTORIAL_PROJETO_PASSOS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => void prepararPassoTutorialProjeto(tutorialProjetoPasso + 1)}
                  style={botaoPrimarioStyle}
                >
                  Próximo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    encerrarTutorialPraticoProjetos();
                    abrirTelaTreinamentos();
                    setModuloTreinamentoAtivo("pratica-projetos");
                  }}
                  style={botaoPrimarioStyle}
                >
                  Concluir treinamento
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {mostrarNotificacoesChat && (
        <>
          <button
            type="button"
            aria-label="Fechar notificações"
            onClick={() => setMostrarNotificacoesChat(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1590,
              border: "none",
              background: "transparent",
              cursor: "default",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: isMobile ? 58 : 70,
              right: isMobile ? 10 : 22,
              left: isMobile ? 10 : "auto",
              width: isMobile ? "auto" : 390,
              maxHeight: "min(650px, calc(100vh - 90px))",
              zIndex: 1610,
              overflow: "hidden",
              borderRadius: 17,
              border: "1px solid rgba(96,165,250,.24)",
              background:
                "linear-gradient(180deg, rgba(8,18,34,.99), rgba(7,16,31,.99))",
              boxShadow: "0 28px 70px rgba(0,0,0,.46)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 15px",
                borderBottom:
                  "1px solid rgba(148,163,184,.12)",
              }}
            >
              <div>
                <strong
                  style={{
                    color: "#f8fafc",
                    fontSize: 15,
                  }}
                >
                  🔔 Notificações
                </strong>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {quantidadeNotificacoesNaoLidas} não lida(s)
                </div>
              </div>

              {quantidadeNotificacoesNaoLidas > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasNotificacoesLidasAtual}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#60a5fa",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {permissaoNotificacaoSistema !== "indisponivel" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(148,163,184,.10)",
                  background: "rgba(15,23,42,.46)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    Notificações no celular
                  </div>
                  <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>
                    {permissaoNotificacaoSistema === "granted"
                      ? "Ativadas neste navegador"
                      : permissaoNotificacaoSistema === "denied"
                      ? "Bloqueadas pelo navegador"
                      : "Toque em Ativar para permitir"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={ativarNotificacoesSistema}
                  disabled={permissaoNotificacaoSistema === "granted"}
                  style={{
                    flex: "0 0 auto",
                    border: "1px solid rgba(96,165,250,.25)",
                    borderRadius: 9,
                    padding: "7px 10px",
                    color:
                      permissaoNotificacaoSistema === "granted"
                        ? "#86efac"
                        : "#bfdbfe",
                    background:
                      permissaoNotificacaoSistema === "granted"
                        ? "rgba(34,197,94,.10)"
                        : "rgba(37,99,235,.14)",
                    cursor:
                      permissaoNotificacaoSistema === "granted"
                        ? "default"
                        : "pointer",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {permissaoNotificacaoSistema === "granted"
                    ? "✓ Ativadas"
                    : "Ativar"}
                </button>
              </div>
            )}

            <div
              style={{
                maxHeight: "560px",
                overflowY: "auto",
              }}
            >
              {carregandoNotificacoesChat ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  Carregando notificações...
                </div>
              ) : notificacoesChat.length ? (
                notificacoesChat.map((notificacao) => {
                  const icone =
                    notificacao.tipo === "mencao"
                      ? "@"
                      : notificacao.tipo === "resposta"
                      ? "↩"
                      : "💬";

                  return (
                    <button
                      key={notificacao.id}
                      type="button"
                      onClick={() =>
                        abrirNotificacaoChat(notificacao)
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom:
                          "1px solid rgba(148,163,184,.09)",
                        background: notificacao.lida
                          ? "transparent"
                          : "rgba(37,99,235,.10)",
                        padding: "12px 14px",
                        display: "grid",
                        gridTemplateColumns: "36px minmax(0,1fr) auto",
                        gap: 10,
                        textAlign: "left",
                        color: "#e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          display: "grid",
                          placeItems: "center",
                          background:
                            notificacao.tipo === "mencao"
                              ? "rgba(124,58,237,.22)"
                              : notificacao.tipo === "resposta"
                              ? "rgba(14,165,233,.18)"
                              : "rgba(37,99,235,.18)",
                          color:
                            notificacao.tipo === "mencao"
                              ? "#c4b5fd"
                              : "#7dd3fc",
                          fontWeight: 900,
                        }}
                      >
                        {icone}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            fontSize: 12,
                          }}
                        >
                          {notificacao.titulo}
                        </strong>
                        <span
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            color: "#94a3b8",
                            fontSize: 11,
                            lineHeight: 1.45,
                            marginTop: 3,
                          }}
                        >
                          {notificacao.texto_preview ||
                            "Abra para visualizar a mensagem."}
                        </span>
                        <small
                          style={{
                            display: "block",
                            color: "#475569",
                            marginTop: 4,
                            fontSize: 9,
                          }}
                        >
                          {new Date(
                            notificacao.created_at
                          ).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </span>

                      {!notificacao.lida && (
                        <span
                          title="Não lida"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: "#3b82f6",
                            marginTop: 5,
                            boxShadow:
                              "0 0 10px rgba(59,130,246,.65)",
                          }}
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: 28,
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 8 }}>
                    🔕
                  </div>
                  Nenhuma notificação ainda.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toastNotificacaoChat && !mostrarNotificacoesChat && (
        <button
          type="button"
          onClick={() =>
            abrirNotificacaoChat(toastNotificacaoChat)
          }
          style={{
            position: "fixed",
            top: isMobile ? 66 : 74,
            right: isMobile ? 10 : 22,
            left: isMobile ? 10 : "auto",
            width: isMobile ? "auto" : 360,
            zIndex: 1580,
            borderRadius: 15,
            border: "1px solid rgba(96,165,250,.28)",
            background: "rgba(8,18,34,.98)",
            boxShadow: "0 20px 55px rgba(0,0,0,.42)",
            padding: 12,
            display: "grid",
            gridTemplateColumns: "38px minmax(0,1fr) auto",
            gap: 10,
            textAlign: "left",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              background:
                toastNotificacaoChat.tipo === "mencao"
                  ? "rgba(124,58,237,.22)"
                  : "rgba(37,99,235,.20)",
              color: "#7dd3fc",
              fontWeight: 900,
            }}
          >
            {toastNotificacaoChat.tipo === "mencao"
              ? "@"
              : toastNotificacaoChat.tipo === "resposta"
              ? "↩"
              : "💬"}
          </span>

          <span style={{ minWidth: 0 }}>
            <strong
              style={{
                display: "block",
                color: "#f8fafc",
                fontSize: 12,
              }}
            >
              {toastNotificacaoChat.titulo}
            </strong>
            <span
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 11,
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {toastNotificacaoChat.texto_preview}
            </span>
          </span>

          <span
            onClick={(event) => {
              event.stopPropagation();
              setToastNotificacaoChat(null);
            }}
            style={{
              color: "#64748b",
              padding: 3,
              fontSize: 16,
            }}
          >
            ×
          </span>
        </button>
      )}

      {isMobile && (
        <div className="dw-mobile-topbar">
          <button
            type="button"
            className="dw-mobile-menu-button"
            onClick={() => setMenuMobileAberto(true)}
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <div className="dw-mobile-brand">
            <img src={LOGO_URL} alt="DubWorks" />
            <span>MANAGER</span>
          </div>

          <button
            type="button"
            className="dw-mobile-notify-button"
            onClick={() =>
              setMostrarNotificacoesChat((anterior) => !anterior)
            }
            aria-label="Abrir notificações"
            style={{ position: "relative" }}
          >
            🔔
            {quantidadeNotificacoesNaoLidas > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -5,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  padding: "0 4px",
                  display: "grid",
                  placeItems: "center",
                  background: "#2563eb",
                  color: "#fff",
                  border: "2px solid #050816",
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                {quantidadeNotificacoesNaoLidas > 99
                  ? "99+"
                  : quantidadeNotificacoesNaoLidas}
              </span>
            )}
          </button>
        </div>
      )}

      {isMobile && menuMobileAberto && (
        <div
          className="dw-mobile-drawer-backdrop"
          onClick={() => setMenuMobileAberto(false)}
        >
          <div
            className="dw-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dw-mobile-drawer-head">
              <img src={LOGO_URL} alt="DubWorks" />
              <button
                type="button"
                onClick={() => setMenuMobileAberto(false)}
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            <div className="dw-mobile-user-card">
              <div style={{ ...avatarStyle, width: 44, height: 44 }}>
                {usuarioLogado.nome?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <strong>{usuarioLogado.nome}</strong>
                <span>{cargoLabel(usuarioLogado.cargo)}</span>
              </div>
            </div>

            <nav className="dw-mobile-drawer-nav">
              {temAcesso(usuarioLogado, "acesso_projetos") &&
                usuarioLogado.cargo !== "marketing" && (
                  <button
                    type="button"
                    className={telaAtual === "projetos" ? "active" : ""}
                    onClick={() => {
                      setMostrarEventos(false);
                      setMostrarMarketing(false);
                      setMostrarMembros(false);
                      setMostrarAdvertencias(false);
                      setMostrarUsuarios(false);
                      setMostrarRelatorios(false);
                      setMostrarTreinamentos(false);
                      setMostrarFerramentas(false);
                      setMostrarFormNovoUsuario(false);
                      setMenuMobileAberto(false);
                    }}
                  >
                    ▣ Projetos
                  </button>
                )}

              {temAcesso(usuarioLogado, "acesso_membros") && (
                <button
                  type="button"
                  className={telaAtual === "membros" ? "active" : ""}
                  onClick={() => {
                    setMostrarEventos(false);
                    setMostrarMarketing(false);
                    setMostrarMembros(true);
                    setMostrarAdvertencias(false);
                    setMostrarUsuarios(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFerramentas(false);
                    setMostrarFormNovoUsuario(false);
                    recarregarMembros();
                    setMenuMobileAberto(false);
                  }}
                >
                  👥 {usuarioLogado.cargo === "analista_rr" ? "Central de RR" : "Membros"}
                </button>
              )}

              {temAcesso(usuarioLogado, "acesso_usuarios") && (
                <button
                  type="button"
                  className={telaAtual === "usuarios" ? "active" : ""}
                  onClick={() => {
                    setMostrarEventos(false);
                    setMostrarMarketing(false);
                    setMostrarUsuarios(true);
                    setMostrarAdvertencias(false);
                    setMostrarMembros(false);
                    setMostrarRelatorios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFerramentas(false);
                    setMenuMobileAberto(false);
                  }}
                >
                  ♙ Usuários
                </button>
              )}

              {podeVerAdvertencias && (
                <button
                  type="button"
                  className={telaAtual === "advertencias" ? "active" : ""}
                  onClick={abrirTelaAdvertencias}
                >
                  ⚠ Advertências
                </button>
              )}

              {podeCriarEventos && (
                <button
                  type="button"
                  className={telaAtual === "eventos" ? "active" : ""}
                  onClick={abrirTelaEventos}
                >
                  📅 Eventos
                </button>
              )}

              {podeVerMarketing && (
                <button
                  type="button"
                  className={telaAtual === "marketing" ? "active" : ""}
                  onClick={abrirTelaMarketing}
                >
                  📣 Marketing
                </button>
              )}

              {podeVerRelatorios && (
                <button
                  type="button"
                  className={telaAtual === "relatorios" ? "active" : ""}
                  onClick={() => {
                    setMostrarEventos(false);
                    setMostrarMarketing(false);
                    setMostrarRelatorios(true);
                    setMostrarAdvertencias(false);
                    setMostrarMembros(false);
                    setMostrarUsuarios(false);
                    setMostrarTreinamentos(false);
                    setMostrarFerramentas(false);
                    setMostrarFormNovoUsuario(false);
                    setMenuMobileAberto(false);
                  }}
                >
                  ▥ Relatórios
                </button>
              )}

              {podeVerFerramentasGerais && (
                <button
                  type="button"
                  className={telaAtual === "ferramentas" ? "active" : ""}
                  onClick={abrirTelaFerramentas}
                >
                  🧰 Ferramentas
                </button>
              )}

              {temAcesso(usuarioLogado, "acesso_treinamentos") && (
                <button
                  type="button"
                  className={telaAtual === "treinamentos" ? "active" : ""}
                  onClick={() => {
                    abrirTelaTreinamentos();
                    setMenuMobileAberto(false);
                  }}
                >
                  ◇ Treinamentos
                </button>
              )}

              <button type="button" className="danger" onClick={sair}>
                ⇢ Sair
              </button>
            </nav>
          </div>
        </div>
      )}

      {!isMobile && (
        <button
          type="button"
          aria-label="Abrir menu principal"
          title="Abrir menu"
          onClick={() => setMenuMobileAberto(true)}
          style={{
            position: "fixed",
            top: 18,
            left: 22,
            zIndex: 1450,
            width: 44,
            height: 44,
            borderRadius: 13,
            border: "1px solid rgba(96,165,250,.28)",
            background: "rgba(8,18,34,.95)",
            color: "#e2e8f0",
            cursor: "pointer",
            boxShadow: "0 12px 32px rgba(0,0,0,.30)",
            fontSize: 19,
            fontWeight: 900,
          }}
        >
          ☰
        </button>
      )}

      {!isMobile && menuMobileAberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu principal"
            onClick={() => setMenuMobileAberto(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1490,
              border: "none",
              background: "rgba(2,6,23,.58)",
              backdropFilter: "blur(2px)",
              cursor: "default",
            }}
          />

          <aside
            style={{
              width: 270,
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 1500,
              boxSizing: "border-box",
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.995), rgba(15,23,42,0.985))",
              borderRight: "1px solid rgba(96,165,250,0.22)",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              overflowY: "auto",
              padding: "28px 16px",
              gap: 22,
              boxShadow: "24px 0 60px rgba(0,0,0,.46)",
            }}
          >
            <button
              type="button"
              aria-label="Fechar menu"
              title="Fechar menu"
              onClick={() => setMenuMobileAberto(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 15,
                width: 32,
                height: 32,
                borderRadius: 9,
                border: "1px solid rgba(148,163,184,.16)",
                background: "rgba(15,23,42,.76)",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 18,
                zIndex: 2,
              }}
            >
              ×
            </button>

        <div style={{ padding: isMobile ? 0 : "0 10px" }}>
          <img
            src={LOGO_URL}
            alt="DubWorks"
            style={{
              width: isMobile ? 58 : 150,
              height: "auto",
              filter: "drop-shadow(0 0 18px rgba(56,189,248,0.18))",
            }}
          />
          {!isMobile && (
            <div
              style={{
                color: "#38bdf8",
                fontWeight: 900,
                letterSpacing: 3,
                fontSize: 11,
                marginLeft: 58,
                marginTop: -8,
              }}
            >
              MANAGER
            </div>
          )}
        </div>

        <nav
          style={{
            display: isMobile ? "flex" : "grid",
            gap: 8,
            flex: isMobile ? 1 : undefined,
            overflowX: isMobile ? "auto" : "visible",
          }}
        >
          {!isMobile && <div style={sideSectionDarkStyle}>MENU</div>}
          {temAcesso(usuarioLogado, "acesso_projetos") &&
            usuarioLogado.cargo !== "marketing" && (
              <SidebarItem
                id="projetos"
                label={isMobile ? "" : "Projetos"}
                icon="▣"
                onClick={() => {
                  setMostrarEventos(false);
                  setMostrarMarketing(false);
                  setMostrarMembros(false);
                  setMostrarAdvertencias(false);
                  setMostrarUsuarios(false);
                  setMostrarRelatorios(false);
                  setMostrarTreinamentos(false);
                  setMostrarFerramentas(false);
                  setMostrarFormNovoUsuario(false);
                  setMenuMobileAberto(false);
                }}
              />
            )}
          {temAcesso(usuarioLogado, "acesso_membros") && (
            <SidebarItem
              id="membros"
              label={
                isMobile
                  ? ""
                  : usuarioLogado.cargo === "analista_rr"
                  ? "Central de RR"
                  : "Membros"
              }
              icon="👥"
              onClick={() => {
                setMostrarEventos(false);
                setMostrarMarketing(false);
                setMostrarMembros(true);
                setMostrarAdvertencias(false);
                setMostrarUsuarios(false);
                setMostrarRelatorios(false);
                setMostrarTreinamentos(false);
                setMostrarFerramentas(false);
                setMostrarFormNovoUsuario(false);
                recarregarMembros();
                setMenuMobileAberto(false);
              }}
            />
          )}
          {temAcesso(usuarioLogado, "acesso_usuarios") && (
            <SidebarItem
              id="usuarios"
              label={isMobile ? "" : "Usuários"}
              icon="♙"
              onClick={() => {
                setMostrarEventos(false);
                setMostrarMarketing(false);
                setMostrarUsuarios(true);
                setMostrarAdvertencias(false);
                setMostrarMembros(false);
                setMostrarRelatorios(false);
                setMostrarTreinamentos(false);
                setMostrarFerramentas(false);
                setMenuMobileAberto(false);
              }}
            />
          )}
          {podeVerAdvertencias && (
            <SidebarItem
              id="advertencias"
              label={isMobile ? "" : "Advertências"}
              icon="⚠"
              onClick={abrirTelaAdvertencias}
            />
          )}

          {podeCriarEventos && (
            <SidebarItem
              id="eventos"
              label={isMobile ? "" : "Eventos"}
              icon="📅"
              onClick={abrirTelaEventos}
            />
          )}

          {podeVerMarketing && (
            <SidebarItem
              id="marketing"
              label={isMobile ? "" : "Marketing"}
              icon="📣"
              onClick={abrirTelaMarketing}
            />
          )}

          {podeVerRelatorios && (
            <SidebarItem
              id="relatorios"
              label={isMobile ? "" : "Relatórios"}
              icon="▥"
              onClick={() => {
                setMostrarEventos(false);
                setMostrarMarketing(false);
                setMostrarRelatorios(true);
                setMostrarAdvertencias(false);
                setMostrarMembros(false);
                setMostrarUsuarios(false);
                setMostrarTreinamentos(false);
                setMostrarFerramentas(false);
                setMostrarFormNovoUsuario(false);
                setMenuMobileAberto(false);
              }}
            />
          )}
          {!isMobile && podeVerFerramentasGerais && (
            <SidebarItem
              id="ferramentas"
              label="Ferramentas"
              icon="🧰"
              onClick={() => {
                abrirTelaFerramentas();
                setMenuMobileAberto(false);
              }}
            />
          )}
          {!isMobile && temAcesso(usuarioLogado, "acesso_treinamentos") && (
            <SidebarItem
              id="treinamentos"
              label="Treinamentos"
              icon="◇"
              onClick={() => {
                abrirTelaTreinamentos();
                setMenuMobileAberto(false);
              }}
            />
          )}
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
          {!isMobile && <div style={sideSectionDarkStyle}>CONFIGURAÇÕES</div>}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 10px",
                color: "#cbd5e1",
              }}
            >
              <div style={{ ...avatarStyle, width: 44, height: 44 }}>
                {usuarioLogado.nome?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: "#f8fafc" }}>
                  {usuarioLogado.nome}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>
                  {cargoLabel(usuarioLogado.cargo)}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={sair}
            style={{ ...menuTopoStyle, textAlign: "left" }}
          >
            {isMobile ? "⇢" : "⇢  Sair"}
          </button>
        </div>
          </aside>
        </>
      )}

      <main
        className="dw-main-content"
        style={{
          flex: 1,
          padding: isMobile ? 14 : "26px 26px 26px 82px",
          minWidth: 0,
        }}
      >
        {telaAtual === "ferramentas"
          ? ToolsPage()
          : telaAtual === "treinamentos"
          ? TrainingPage()
          : telaAtual === "advertencias"
          ? AdvertenciasPage()
          : telaAtual === "eventos"
          ? EventsPage()
          : telaAtual === "marketing"
          ? MarketingPage()
          : telaAtual === "membros"
          ? MembersPage()
          : telaAtual === "usuarios"
          ? UsersPage()
          : telaAtual === "relatorios"
          ? ReportsPage()
          : ProjectsPage()}
      </main>

      {modoModalAgenda && (
        <Modal
          titulo={
            modoModalAgenda === "novo"
              ? "Novo compromisso"
              : modoModalAgenda === "editar"
              ? "Editar compromisso"
              : eventoAgendaSelecionado?.titulo || "Compromisso"
          }
          onClose={() => {
            setModoModalAgenda(null);
            setEventoAgendaSelecionado(null);
          }}
        >
          {modoModalAgenda === "visualizar" && eventoAgendaSelecionado ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0,1fr))",
                  gap: 12,
                }}
              >
                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>DATA E HORÁRIO</div>
                  <strong style={{ color: "#f8fafc" }}>
                    {new Date(
                      eventoAgendaSelecionado.inicio
                    ).toLocaleString("pt-BR")}
                  </strong>
                  {eventoAgendaSelecionado.fim && (
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      até{" "}
                      {new Date(
                        eventoAgendaSelecionado.fim
                      ).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>

                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>PROJETO</div>
                  <strong style={{ color: "#f8fafc" }}>
                    {eventoAgendaSelecionado.projeto_id
                      ? projetosVisiveis.find(
                          (projeto) =>
                            Number(projeto.ID) ===
                            Number(eventoAgendaSelecionado.projeto_id)
                        )?.Projeto || "Projeto não encontrado"
                      : "Compromisso geral"}
                  </strong>
                </div>

                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>STATUS</div>
                  <strong
                    style={{
                      color:
                        eventoAgendaSelecionado.status === "aprovado"
                          ? "#86efac"
                          : eventoAgendaSelecionado.status === "rejeitado"
                          ? "#fca5a5"
                          : "#fde68a",
                    }}
                  >
                    {eventoAgendaSelecionado.status === "aprovado"
                      ? "Aprovado"
                      : eventoAgendaSelecionado.status === "rejeitado"
                      ? "Rejeitado"
                      : eventoAgendaSelecionado.status === "rascunho"
                      ? "Rascunho"
                      : "Aguardando aprovação"}
                  </strong>
                </div>
              </div>

              {eventoAgendaSelecionado.descricao && (
                <div style={agendaInfoCardStyle}>
                  <div style={agendaInfoLabelStyle}>DESCRIÇÃO</div>
                  <div
                    style={{
                      color: "#cbd5e1",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {eventoAgendaSelecionado.descricao}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {eventoAgendaSelecionado.link_reuniao && (
                  <button
                    type="button"
                    style={botaoPrimarioStyle}
                    onClick={() =>
                      window.open(
                        eventoAgendaSelecionado.link_reuniao,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    🔗 Entrar na reunião
                  </button>
                )}

                {podeAlterarEventoAgenda(eventoAgendaSelecionado) && (
                  <>
                    <button
                      type="button"
                      style={botaoSecundarioStyle}
                      onClick={() =>
                        editarCompromissoAgenda(eventoAgendaSelecionado)
                      }
                    >
                      ✎ Editar
                    </button>

                    <button
                      type="button"
                      style={{
                        ...botaoSecundarioStyle,
                        color: "#fecaca",
                        border: "1px solid rgba(248,113,113,.28)",
                        background: "rgba(127,29,29,.16)",
                      }}
                      disabled={salvandoAgenda}
                      onClick={() =>
                        excluirCompromissoAgenda(eventoAgendaSelecionado)
                      }
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  value={agendaForm.titulo}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      titulo: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Reunião de Diretores"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Início *</label>
                  <input
                    type="datetime-local"
                    value={agendaForm.inicio}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        inicio: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Término</label>
                  <input
                    type="datetime-local"
                    value={agendaForm.fim}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        fim: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select
                    value={agendaForm.tipo}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        tipo: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="compromisso">Compromisso</option>
                    <option value="reuniao">Reunião</option>
                    <option value="gravacao">Gravação</option>
                    <option value="prazo">Prazo</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Projeto relacionado</label>
                  <select
                    value={agendaForm.projeto_id}
                    onChange={(e) =>
                      setAgendaForm((anterior) => ({
                        ...anterior,
                        projeto_id: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Nenhum / geral</option>
                    {projetosVisiveis.map((projeto) => (
                      <option key={projeto.ID} value={projeto.ID}>
                        {projeto.Projeto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Link da reunião</label>
                <input
                  value={agendaForm.link_reuniao}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      link_reuniao: e.target.value,
                    }))
                  }
                  placeholder="Meet, Teams, Zoom ou outro link"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  value={agendaForm.descricao}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Pauta, orientações ou observações..."
                  style={{ ...textareaStyle, minHeight: 120 }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "center",
                  color: "#cbd5e1",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={agendaForm.dia_inteiro}
                  onChange={(e) =>
                    setAgendaForm((anterior) => ({
                      ...anterior,
                      dia_inteiro: e.target.checked,
                    }))
                  }
                />
                Evento de dia inteiro
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={botaoSecundarioStyle}
                  disabled={salvandoAgenda}
                  onClick={() => {
                    setModoModalAgenda(null);
                    setEventoAgendaSelecionado(null);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  style={botaoPrimarioStyle}
                  disabled={salvandoAgenda}
                  onClick={salvarCompromissoAgenda}
                >
                  {salvandoAgenda
                    ? "Salvando..."
                    : modoModalAgenda === "editar"
                    ? "Salvar alterações"
                    : podeAprovarEventos
                    ? "Salvar e publicar"
                    : "Enviar para aprovação"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {mostrarNovaAdvertencia && (
        <Modal
          titulo="Nova advertência"
          onClose={() => {
            if (salvandoAdvertencia) return;
            setMostrarNovaAdvertencia(false);
          }}
        >
          <div style={{ display: "grid", gap: 15 }}>
            <div
              style={{
                borderRadius: 13,
                padding: 13,
                background: "rgba(37,99,235,.09)",
                border: "1px solid rgba(59,130,246,.18)",
                color: "#bfdbfe",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Registrada por <strong>{usuarioLogado?.nome || "Usuário"}</strong>.
              Ela ficará pendente até a aprovação da Diretoria.
            </div>

            <div>
              <label style={labelStyle}>Membro / telefone do advertido *</label>
              <input
                list="membros-advertencia"
                value={novaAdvertencia.advertido_telefone}
                onChange={(event) =>
                  setNovaAdvertencia((anterior) => ({
                    ...anterior,
                    advertido_telefone: event.target.value,
                  }))
                }
                placeholder="Selecione um membro ou digite o telefone"
                style={inputStyle}
              />
              <datalist id="membros-advertencia">
                {membros
                  .filter((membro) => Boolean(membro.telefone))
                  .map((membro) => (
                    <option
                      key={`${membro.id || membro.nome}-${membro.telefone}`}
                      value={membro.telefone}
                    >
                      {membro.nome}
                    </option>
                  ))}
              </datalist>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Data da ocorrência *</label>
                <input
                  type="date"
                  value={novaAdvertencia.data_ocorrencia}
                  onChange={(event) =>
                    setNovaAdvertencia((anterior) => ({
                      ...anterior,
                      data_ocorrencia: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Pontuação</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={novaAdvertencia.valor}
                  onChange={(event) =>
                    setNovaAdvertencia((anterior) => ({
                      ...anterior,
                      valor: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Telefone do moderador</label>
              <input
                value={novaAdvertencia.moderador_telefone}
                onChange={(event) =>
                  setNovaAdvertencia((anterior) => ({
                    ...anterior,
                    moderador_telefone: event.target.value,
                  }))
                }
                placeholder="Opcional"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Descrição da ocorrência *</label>
              <textarea
                value={novaAdvertencia.descricao}
                onChange={(event) =>
                  setNovaAdvertencia((anterior) => ({
                    ...anterior,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Informe o motivo, horário, local e os detalhes relevantes..."
                style={{ ...textareaStyle, minHeight: 135 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Links das provas</label>
              <textarea
                value={novaAdvertencia.provas}
                onChange={(event) =>
                  setNovaAdvertencia((anterior) => ({
                    ...anterior,
                    provas: event.target.value,
                  }))
                }
                placeholder={"Cole um link do Drive por linha\nhttps://drive.google.com/..."}
                style={{ ...textareaStyle, minHeight: 95 }}
              />
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>
                Você pode adicionar mais de uma prova, usando uma linha para cada
                link.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={salvandoAdvertencia}
                onClick={() => setMostrarNovaAdvertencia(false)}
                style={botaoSecundarioStyle}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoAdvertencia}
                onClick={() => void salvarNovaAdvertencia()}
                style={botaoPrimarioStyle}
              >
                {salvandoAdvertencia
                  ? "Enviando..."
                  : "Enviar para aprovação"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {advertenciaSelecionada && (
        <Modal
          titulo={
            advertenciaSelecionada.origem === "sistema"
              ? `Advertência #${advertenciaSelecionada.linha}`
              : `Advertência — linha ${advertenciaSelecionada.linha}`
          }
          onClose={() => setAdvertenciaSelecionada(null)}
        >
          {(() => {
            const membro = membroDaAdvertencia(advertenciaSelecionada);
            const valor = String(advertenciaSelecionada.valor || "").trim();
            const statusModal =
              advertenciaSelecionada.status === "aprovado"
                ? {
                    label: "Advertência aprovada",
                    cor: "#86efac",
                    fundo: "rgba(22,101,52,.18)",
                    borda: "rgba(74,222,128,.26)",
                  }
                : advertenciaSelecionada.status === "rejeitado"
                ? {
                    label: "Advertência rejeitada",
                    cor: "#fca5a5",
                    fundo: "rgba(127,29,29,.18)",
                    borda: "rgba(248,113,113,.26)",
                  }
                : {
                    label: "Aguardando aprovação da Diretoria",
                    cor: "#fde68a",
                    fundo: "rgba(120,53,15,.20)",
                    borda: "rgba(245,158,11,.30)",
                  };

            return (
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    color: statusModal.cor,
                    background: statusModal.fundo,
                    border: `1px solid ${statusModal.borda}`,
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {statusModal.label}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(2,6,23,.40)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 10 }}>
                      ADVERTIDO
                    </div>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 900,
                        marginTop: 5,
                      }}
                    >
                      {membro?.nome || "Membro não vinculado"}
                    </div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {advertenciaSelecionada.advertido_telefone || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(2,6,23,.40)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 10 }}>
                      MODERADOR
                    </div>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 900,
                        marginTop: 5,
                      }}
                    >
                      {advertenciaSelecionada.moderador_nome ||
                        advertenciaSelecionada.moderador_telefone ||
                        "—"}
                    </div>
                    {advertenciaSelecionada.moderador_nome &&
                      advertenciaSelecionada.moderador_telefone && (
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {advertenciaSelecionada.moderador_telefone}
                        </div>
                      )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Dia da ocorrência",
                      advertenciaSelecionada.data_ocorrencia || "Não informado",
                    ],
                    [
                      "Registrada em",
                      advertenciaSelecionada.timestamp || "—",
                    ],
                    ["Valor / Pontos", valor || "0"],
                  ].map(([titulo, conteudo]) => (
                    <div
                      key={titulo}
                      style={{
                        borderRadius: 12,
                        padding: 11,
                        background: "rgba(15,23,42,.54)",
                        border: "1px solid rgba(148,163,184,.10)",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: 10 }}>
                        {titulo}
                      </div>
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontWeight: 800,
                          marginTop: 5,
                          fontSize: 12,
                        }}
                      >
                        {conteudo}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    DESCRIÇÃO DA OCORRÊNCIA
                  </div>
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 13,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                      color: "#e2e8f0",
                      background: "rgba(2,6,23,.42)",
                      border: "1px solid rgba(148,163,184,.12)",
                    }}
                  >
                    {advertenciaSelecionada.descricao || "Sem descrição."}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    PROVAS ({advertenciaSelecionada.provas.length})
                  </div>

                  {advertenciaSelecionada.provas.length ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {advertenciaSelecionada.provas.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          onClick={() =>
                            window.open(url, "_blank", "noopener,noreferrer")
                          }
                          style={{
                            borderRadius: 10,
                            padding: "10px 12px",
                            border: "1px solid rgba(59,130,246,.18)",
                            background: "rgba(37,99,235,.08)",
                            color: "#bfdbfe",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📎 Prova {index + 1} — abrir no Drive
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      Nenhum arquivo foi vinculado a este registro.
                    </div>
                  )}
                </div>

                {advertenciaSelecionada.decidido_por && (
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(15,23,42,.54)",
                      border: "1px solid rgba(148,163,184,.12)",
                      color: "#cbd5e1",
                      fontSize: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    Decisão por <strong>{advertenciaSelecionada.decidido_por}</strong>
                    {advertenciaSelecionada.decidido_em
                      ? ` em ${new Date(
                          advertenciaSelecionada.decidido_em
                        ).toLocaleString("pt-BR")}`
                      : ""}
                    {advertenciaSelecionada.motivo_decisao && (
                      <div style={{ marginTop: 7 }}>
                        Motivo: {advertenciaSelecionada.motivo_decisao}
                      </div>
                    )}
                  </div>
                )}

                {podeAprovarAdvertencias &&
                  advertenciaSelecionada.origem === "sistema" &&
                  advertenciaSelecionada.status === "pendente" && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        disabled={
                          decidindoAdvertenciaId === advertenciaSelecionada.linha
                        }
                        onClick={() =>
                          void decidirAdvertencia(
                            advertenciaSelecionada,
                            "rejeitado"
                          )
                        }
                        style={{
                          ...botaoSecundarioStyle,
                          color: "#fecaca",
                          border: "1px solid rgba(248,113,113,.30)",
                          background: "rgba(127,29,29,.16)",
                        }}
                      >
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        disabled={
                          decidindoAdvertenciaId === advertenciaSelecionada.linha
                        }
                        onClick={() =>
                          void decidirAdvertencia(
                            advertenciaSelecionada,
                            "aprovado"
                          )
                        }
                        style={botaoPrimarioStyle}
                      >
                        {decidindoAdvertenciaId === advertenciaSelecionada.linha
                          ? "Salvando..."
                          : "Aprovar advertência"}
                      </button>
                    </div>
                  )}
              </div>
            );
          })()}
        </Modal>
      )}

      {mostrarAdicionarPessoasChat && canalChatAtivoId && (
        <Modal
          titulo="Adicionar pessoas à conversa"
          onClose={() => {
            if (adicionandoPessoasChat) return;
            setMostrarAdicionarPessoasChat(false);
            setBuscaPessoasChat("");
            setPessoasSelecionadasChat([]);
          }}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.5 }}>
              Selecione usuários do DubWorks Manager para incluir nesta conversa.
              O histórico continua no mesmo chat, como em uma conversa em grupo.
            </p>

            <input
              value={buscaPessoasChat}
              onChange={(event) => setBuscaPessoasChat(event.target.value)}
              placeholder="Buscar pessoa por nome, e-mail ou cargo..."
              style={inputStyle}
            />

            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 340,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {usuarios
                .filter(
                  (usuario) =>
                    normalizar(usuario.login) !==
                    normalizar(usuarioLogado?.login)
                )
                .filter(
                  (usuario) =>
                    !participantesChat.some(
                      (participante) =>
                        participante.canal_id === canalChatAtivoId &&
                        normalizar(participante.usuario_login) ===
                          normalizar(usuario.login)
                    )
                )
                .filter((usuario) => {
                  const termo = normalizar(buscaPessoasChat);
                  if (!termo) return true;

                  return [
                    usuario.nome,
                    usuario.login,
                    cargoLabel(usuario.cargo),
                  ]
                    .map((valor) => normalizar(valor || ""))
                    .some((valor) => valor.includes(termo));
                })
                .map((usuario) => {
                  const selecionado = pessoasSelecionadasChat.some(
                    (loginSelecionado) =>
                      normalizar(loginSelecionado) ===
                      normalizar(usuario.login)
                  );

                  return (
                    <label
                      key={usuario.login || usuario.nome}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        borderRadius: 12,
                        padding: 11,
                        cursor: "pointer",
                        border: selecionado
                          ? "1px solid rgba(59,130,246,.45)"
                          : "1px solid rgba(148,163,184,.14)",
                        background: selecionado
                          ? "rgba(37,99,235,.13)"
                          : "rgba(2,6,23,.36)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() =>
                          setPessoasSelecionadasChat((anteriores) =>
                            selecionado
                              ? anteriores.filter(
                                  (loginSelecionado) =>
                                    normalizar(loginSelecionado) !==
                                    normalizar(usuario.login)
                                )
                              : [...anteriores, usuario.login]
                          )
                        }
                      />

                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background:
                            "linear-gradient(135deg, rgba(37,99,235,.9), rgba(124,58,237,.85))",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {iniciaisChat(usuario.nome || usuario.login)}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#f8fafc",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {usuario.nome || usuario.login}
                        </strong>
                        <small style={{ color: "#64748b" }}>
                          {cargoLabel(usuario.cargo)} · {usuario.login}
                        </small>
                      </span>
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={confirmarAdicionarPessoasChat}
              disabled={
                !pessoasSelecionadasChat.length || adicionandoPessoasChat
              }
              style={{
                ...botaoPrimarioStyle,
                width: "100%",
                opacity:
                  pessoasSelecionadasChat.length && !adicionandoPessoasChat
                    ? 1
                    : 0.5,
                cursor:
                  pessoasSelecionadasChat.length && !adicionandoPessoasChat
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {adicionandoPessoasChat
                ? "Adicionando..."
                : `Adicionar ${pessoasSelecionadasChat.length || ""} pessoa(s)`}
            </button>
          </div>
        </Modal>
      )}

      {mostrarAdicionarSemana && projetoPainel && (
        <Modal
          titulo={`Adicionar dublador à ${labelSemana(
            semanaFiltroProducao
          )}`}
          onClose={() => setMostrarAdicionarSemana(false)}
          largo
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Selecione no Banco do Projeto quem participa desta semana. O
              vínculo guarda uma fotografia da escalação atual, então trocas
              futuras de dublador não alteram esta semana.
            </p>

            {((rascunho || projetoPainel)?.Elenco || []).length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {((rascunho || projetoPainel)?.Elenco || []).map(
                  (item, index) => {
                    const idBancoValido = Number.isFinite(Number(item.id));
                    const jaAdicionado =
                      idBancoValido &&
                      participantesSemanaProjeto.some(
                        (participante) =>
                          participante.elenco_id === Number(item.id)
                      );
                    const semDublador = !item.dublador?.trim();

                    return (
                      <div
                        key={item.id || index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1.2fr 1.2fr 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          background: "rgba(2,6,23,0.54)",
                          border:
                            "1px solid rgba(148,163,184,0.14)",
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div>
                          <div
                            style={{ color: "#94a3b8", fontSize: 11 }}
                          >
                            Personagem
                          </div>
                          <strong style={{ color: "#f8fafc" }}>
                            {item.personagem || "-"}
                          </strong>
                        </div>

                        <div>
                          <div
                            style={{ color: "#94a3b8", fontSize: 11 }}
                          >
                            Dublador
                          </div>
                          <strong
                            style={{
                              color: semDublador ? "#fde68a" : "#f8fafc",
                            }}
                          >
                            {item.dublador || "Papel aberto"}
                          </strong>
                        </div>

                        <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                          {item.telefone_dublador || "Sem número"}
                        </div>

                        <button
                          type="button"
                          disabled={
                            jaAdicionado ||
                            semDublador ||
                            !idBancoValido ||
                            alterandoParticipanteSemana
                          }
                          onClick={async () => {
                            await adicionarParticipanteNaSemana(
                              projetoPainel,
                              item
                            );
                          }}
                          style={{
                            ...botaoPrimarioStyle,
                            opacity:
                              jaAdicionado || semDublador || !idBancoValido
                                ? 0.55
                                : 1,
                            cursor:
                              jaAdicionado || semDublador || !idBancoValido
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {jaAdicionado
                            ? "✓ Na semana"
                            : semDublador
                            ? "Sem dublador"
                            : !idBancoValido
                            ? "Salve o banco"
                            : "+ Adicionar"}
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div style={{ color: "#94a3b8" }}>
                O Banco do Projeto ainda está vazio.
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button
                type="button"
                onClick={() => setMostrarAdicionarSemana(false)}
                style={botaoSecundarioStyle}
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mostrarNovoProjeto && (
        <Modal
          titulo="Novo projeto"
          onClose={() => {
            setMostrarNovoProjeto(false);
            limparFormularioProjeto();
          }}
          largo
        >
          <div data-tutorial-projetos="form-novo-projeto" style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Nome do projeto *</label>
                <input
                  value={novoProjeto.Projeto || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Projeto: e.target.value,
                    }))
                  }
                  placeholder="Nome do projeto"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tipo do projeto *</label>
                <select
                  value={novoProjeto.Tipo || "Projeto"}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Tipo: e.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  {TIPO_PROJETO_OPCOES.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Gênero *</label>
                <select
                  value={novoProjeto.Genero || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Genero: e.target.value,
                    }))
                  }
                  style={{
                    ...inputStyle,
                    borderColor:
                      tentouCriarProjeto && !novoProjeto.Genero.trim()
                        ? "rgba(248,113,113,.72)"
                        : inputStyle.borderColor,
                  }}
                >
                  <option value="">Selecione o gênero</option>
                  {GENERO_PROJETO_OPCOES.map((genero) => (
                    <option key={genero} value={genero}>{genero}</option>
                  ))}
                </select>
                {tentouCriarProjeto && !novoProjeto.Genero.trim() && (
                  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                    Gênero é obrigatório.
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Categoria *</label>
                <select
                  value={novoProjetoCategoria}
                  onChange={(e) => setNovoProjetoCategoria(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor:
                      tentouCriarProjeto && !novoProjetoCategoria.trim()
                        ? "rgba(248,113,113,.72)"
                        : inputStyle.borderColor,
                  }}
                >
                  <option value="">Selecione a categoria</option>
                  {CATEGORIA_PROJETO_OPCOES.map((categoria) => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
                {tentouCriarProjeto && !novoProjetoCategoria.trim() && (
                  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                    Categoria é obrigatória.
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Prioridade</label>
                <input
                  value={novoProjeto.Prioridade || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Prioridade: e.target.value,
                    }))
                  }
                  placeholder="Prioridade do projeto"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Nome do líder *</label>
                <input
                  value={novoProjetoNomeLider}
                  onChange={(e) => setNovoProjetoNomeLider(e.target.value)}
                  placeholder="Nome do líder"
                  inputMode="text"
                  autoComplete="off"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Nome do editor</label>
                <input
                  value={novoProjetoNomeEditor}
                  onChange={(e) => setNovoProjetoNomeEditor(e.target.value)}
                  placeholder="Nome do editor"
                  inputMode="text"
                  autoComplete="off"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-mail do líder *</label>
                <input
                  value={novoProjeto.Lider || ""}
                  onChange={(e) => {
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Lider: e.target.value,
                    }));
                    setErroEmailLiderNovo("");
                  }}
                  placeholder="email@exemplo.com"
                  inputMode="email"
                  autoComplete="off"
                  style={{
                    ...inputStyle,
                    borderColor: erroEmailLiderNovo
                      ? "rgba(248,113,113,.72)"
                      : inputStyle.borderColor,
                  }}
                />
                {validandoEmailLiderNovo && (
                  <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 6 }}>
                    Verificando usuário...
                  </div>
                )}
                {erroEmailLiderNovo && (
                  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                    {erroEmailLiderNovo}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>E-mail do editor</label>
                <input
                  value={novoProjeto.Editor || ""}
                  onChange={(e) => {
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Editor: e.target.value,
                    }));
                    setErroEmailEditorNovo("");
                  }}
                  placeholder="email@exemplo.com"
                  inputMode="email"
                  autoComplete="off"
                  style={{
                    ...inputStyle,
                    borderColor: erroEmailEditorNovo
                      ? "rgba(248,113,113,.72)"
                      : inputStyle.borderColor,
                  }}
                />
                {validandoEmailEditorNovo && (
                  <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 6 }}>
                    Verificando usuário...
                  </div>
                )}
                {erroEmailEditorNovo && (
                  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
                    {erroEmailEditorNovo}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Telefone do líder *</label>
                <input
                  value={novoProjeto.Telefone_Lider || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Telefone_Lider: e.target.value,
                    }))
                  }
                  placeholder="[00] 00000-0000"
                  inputMode="tel"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone do editor</label>
                <input
                  value={novoProjeto.Telefone_Editor || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Telefone_Editor: e.target.value,
                    }))
                  }
                  placeholder="[00] 00000-0000"
                  inputMode="tel"
                  style={inputStyle}
                />
              </div>

            </div>

            <div style={painelDarkStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <label style={labelStyle}>Capa do projeto</label>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: -2 }}>
                    Você pode enviar uma imagem ou usar uma URL.
                  </div>
                </div>
                {novoProjeto.Capa_URL && (
                  <button
                    type="button"
                    onClick={() =>
                      setNovoProjeto((anterior) => ({ ...anterior, Capa_URL: "" }))
                    }
                    style={botaoSecundarioStyle}
                  >
                    Remover capa
                  </button>
                )}
              </div>

              {novoProjeto.Capa_URL && (
                <div
                  style={{
                    marginTop: 12,
                    height: isMobile ? 160 : 220,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,.16)",
                    background: `url(${novoProjeto.Capa_URL}) center/cover`,
                  }}
                />
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
                  gap: 10,
                  marginTop: 12,
                  alignItems: "center",
                }}
              >
                <input
                  value={novoProjeto.Capa_URL || ""}
                  onChange={(e) =>
                    setNovoProjeto((anterior) => ({
                      ...anterior,
                      Capa_URL: e.target.value,
                    }))
                  }
                  placeholder="Cole a URL da imagem da capa"
                  inputMode="url"
                  autoComplete="off"
                  style={inputStyle}
                />

                <label
                  style={{
                    ...botaoSecundarioStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 44,
                    cursor: enviandoCapaNovoProjeto ? "wait" : "pointer",
                    opacity: enviandoCapaNovoProjeto ? 0.7 : 1,
                  }}
                >
                  {enviandoCapaNovoProjeto ? "Enviando capa..." : "Enviar arquivo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={enviandoCapaNovoProjeto}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0] || null;
                      void enviarCapaNovoProjeto(arquivo);
                      e.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Observações</label>
              <textarea
                value={novoProjeto.Observacoes || ""}
                onChange={(e) =>
                  setNovoProjeto((anterior) => ({
                    ...anterior,
                    Observacoes: e.target.value,
                  }))
                }
                style={{ ...textareaStyle, minHeight: 100 }}
                placeholder="Observações iniciais do projeto..."
              />
            </div>

            <div style={painelDarkStyle}>
              <h3 style={{ ...tituloCardDarkStyle, marginBottom: 6 }}>
                Banco inicial de personagens
              </h3>
              <p style={{ color: "#94a3b8", margin: "0 0 14px" }}>
                Cadastre os personagens antes de criar a estrutura do Drive. Essa mesma lista
                será enviada para os menus de personagem dos formulários de seleção e entrega.
                Dublador e telefone podem ser preenchidos depois.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr)) auto",
                  gap: 12,
                }}
              >
                <input
                  placeholder="Personagem"
                  value={novoElencoProjeto.personagem}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      personagem: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Nome do dublador"
                  value={novoElencoProjeto.dublador}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      dublador: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="[00] 00000-0000"
                  value={novoElencoProjeto.telefone_dublador || ""}
                  onChange={(e) =>
                    setNovoElencoProjeto((anterior) => ({
                      ...anterior,
                      telefone_dublador: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
                <button
                  onClick={adicionarElencoNovoProjeto}
                  style={botaoSecundarioStyle}
                >
                  Adicionar
                </button>
              </div>

              {novoProjeto.Elenco.length > 0 && (
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {novoProjeto.Elenco.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        background: "rgba(2,6,23,0.54)",
                        border: "1px solid rgba(148,163,184,0.12)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div>
                        <strong>{item.personagem}</strong>
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          — {item.dublador || "Papel aberto"}
                          {item.telefone_dublador ? ` • ${item.telefone_dublador}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => removerElencoNovoProjeto(item.id)}
                        style={botaoSecundarioStyle}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  setMostrarNovoProjeto(false);
                  limparFormularioProjeto();
                }}
                style={botaoSecundarioStyle}
              >
                Cancelar
              </button>
              <button onClick={criarProjeto} style={botaoPrimarioStyle}>
                Criar projeto
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const painelDarkStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(2,6,23,0.82))",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 24px 70px rgba(0,0,0,0.26)",
};

const painelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 14,
  borderBottom: "1px solid rgba(148,163,184,0.12)",
};

const tituloCardDarkStyle: React.CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 900,
};

const pageHeaderDarkStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 4,
};

const breadcrumbDarkStyle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 14,
  marginBottom: 10,
};

const pageTitleDarkStyle: React.CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 32,
  lineHeight: 1.1,
  fontWeight: 900,
};

const tabsDarkStyle: React.CSSProperties = {
  display: "flex",
  overflowX: "auto",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 14,
  background: "rgba(15,23,42,0.58)",
};

const tabButtonDarkStyle: React.CSSProperties = {
  border: "none",
  padding: "15px 22px",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const tabelaHeaderDarkStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  color: "#e2e8f0",
  fontSize: 13,
  background: "rgba(15,23,42,0.68)",
  borderBottom: "1px solid rgba(148,163,184,0.14)",
};

const tabelaCellDarkStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "#cbd5e1",
  verticalAlign: "top",
};

const sideSectionDarkStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  letterSpacing: 1,
  fontWeight: 900,
  padding: "0 10px 6px",
};

const reportCardDarkStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(2,6,23,0.82))",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 18,
  padding: 20,
  minHeight: 120,
  color: "#f8fafc",
  textAlign: "left",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 24px 70px rgba(0,0,0,0.26)",
};

function MenuCategoriaBloco({
  titulo,
  ativo,
  onClick,
  children,
}: {
  titulo: string;
  ativo: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${ativo ? estilos.borda : "transparent"}`,
        borderRadius: 16,
        background: ativo ? "rgba(56,189,248,0.14)" : "rgba(15,23,42,0.96)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={ativo ? megaCategoriaAtivaStyle : megaCategoriaBotaoStyle}
      >
        <span>{titulo}</span>
        <span>{ativo ? "⌄" : "›"}</span>
      </button>

      {ativo && (
        <div
          style={{
            display: "grid",
            gap: 6,
            padding: "0 14px 14px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SubmenuAcao({
  titulo,
  onClick,
}: {
  titulo: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={submenuAcaoStyle}>
      {titulo}
    </button>
  );
}

function MenuFerramentaItem({
  titulo,
  descricao,
  onClick,
}: {
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={megaItemStyle}>
      <div style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 18 }}>
        {titulo}
      </div>
      <div
        style={{ color: estilos.textoSuave, marginTop: 5, lineHeight: 1.35 }}
      >
        {descricao}
      </div>
    </button>
  );
}

function RelatorioCard({
  titulo,
  texto,
  botao,
  onClick,
}: {
  titulo: string;
  texto: string;
  botao: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${estilos.borda}`,
        borderRadius: 18,
        padding: 22,
        background: "rgba(15, 23, 42, 0.82)",
        minHeight: 150,
        boxShadow: "0 12px 28px rgba(13, 71, 161, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div>
        <div
          style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 20 }}
        >
          {titulo}
        </div>
        <div
          style={{ color: estilos.textoSuave, marginTop: 8, lineHeight: 1.4 }}
        >
          {texto}
        </div>
      </div>
      <button onClick={onClick} style={botaoPrimarioStyle}>
        {botao}
      </button>
    </div>
  );
}

function AjudaCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div
      style={{
        border: `1px solid ${estilos.borda}`,
        borderRadius: 18,
        padding: 22,
        background: "rgba(15, 23, 42, 0.82)",
        minHeight: 130,
        boxShadow: "0 12px 28px rgba(13, 71, 161, 0.08)",
      }}
    >
      <div style={{ fontWeight: 900, color: estilos.azulEscuro, fontSize: 19 }}>
        {titulo}
      </div>
      <div
        style={{ color: estilos.textoSuave, marginTop: 8, lineHeight: 1.45 }}
      >
        {texto}
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...inputStyle,
          background: disabled ? "#f4f6f8" : "rgba(15,23,42,0.96)",
        }}
      />
    </div>
  );
}

function Modal({
  titulo,
  onClose,
  children,
  largo,
}: {
  titulo: string;
  onClose: () => void;
  children?: React.ReactNode;
  largo?: boolean;
}) {
  return (
    <div style={{ ...overlayStyle, animation: "dwFade .16s ease-out both" }}>
      <div
        style={{
          animation: "dwModalIn .18s ease-out both",
          width: "100%",
          maxWidth: largo ? 980 : 860,
          background: "rgba(15, 23, 42, 0.82)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 30px 80px rgba(11, 61, 145, 0.25)",
          border: `1px solid ${estilos.borda}`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 30, color: estilos.azulEscuro }}>
            {titulo}
          </h2>
          <button onClick={onClose} style={botaoSecundarioStyle}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96))",
        border: "1px solid rgba(56,189,248,0.18)",
        boxShadow:
          "0 18px 42px rgba(0,0,0,0.32), 0 0 28px rgba(56,189,248,0.10)",
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 12 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#dbeafe" }}>
        {valor}
      </div>
    </div>
  );
}

function InfoPermissao({
  podeEditar,
  podeVideo,
}: {
  podeEditar: boolean;
  podeVideo: boolean;
}) {
  let texto = "Você só pode visualizar este projeto.";
  if (podeEditar) texto = "Você pode editar este projeto.";
  if (!podeEditar && podeVideo)
    texto =
      "Você pode visualizar este projeto e subir somente o vídeo do editor.";

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 14,
        background: "rgba(15,23,42,0.78)",
        border: `1px solid ${estilos.borda}`,
        color: estilos.texto,
        fontSize: 14,
        lineHeight: 1.6,
        fontWeight: 700,
      }}
    >
      {texto}
    </div>
  );
}
function AssistenteIA({
  aberto,
  onClose,
}: {
  aberto: boolean;
  onClose: () => void;
}) {
  const [mensagem, setMensagem] = React.useState("");
  const [resposta, setResposta] = React.useState("");

  async function enviarParaIA() {
    if (!mensagem.trim()) return;

    setResposta("Analisando...");

    try {
      const retorno = await fetch("http://localhost:8000/ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensagem,
        }),
      });

      const dados = await retorno.json();

      setResposta(dados.resposta);
    } catch (erro) {
      setResposta("Erro ao conectar com a IA.");
    }
  }

  if (!aberto) return null;

  return (
    <Modal titulo="Assistente IA DubWorks" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>

        <textarea
          placeholder="Pergunte algo para a IA..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          style={textareaStyle}
        />

        <button
          onClick={enviarParaIA}
          style={botaoPrimarioStyle}
        >
          Enviar para IA
        </button>


        {resposta && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(15,23,42,0.8)",
              border: `1px solid ${estilos.borda}`,
              color: estilos.texto,
              lineHeight: 1.5,
            }}
          >
            {resposta}
          </div>
        )}

      </div>
    </Modal>
  );
}
const agendaInfoCardStyle: React.CSSProperties = {
  borderRadius: 13,
  padding: 14,
  background: "rgba(2,6,23,.48)",
  border: "1px solid rgba(148,163,184,.14)",
};

const agendaInfoLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.5,
  marginBottom: 6,
};

const estilosAnimacao = `
@keyframes dwFloat {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -16px, 0) scale(1.025); }
}

@keyframes dwFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes dwPulse {
  0%, 100% { transform: scale(1); opacity: 0.84; }
  50% { transform: scale(1.06); opacity: 1; }
}

@keyframes dwScan {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}

@keyframes dwPageIn {
  from { opacity: 0; transform: translateY(7px) scale(.995); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dwModalIn {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dwFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dw-main-content > * {
  animation: dwPageIn .20s ease-out both;
}

button, input, select, textarea {
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(1px) scale(.975);
  transition-duration: .07s;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid rgba(56, 189, 248, .55);
  outline-offset: 2px;
}

.dw-calendar-event:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 8px 20px rgba(0,0,0,.18);
}

input::placeholder, textarea::placeholder {
  color: rgba(203, 213, 225, 0.56);
}

select {
  background: rgba(2, 6, 23, 0.88) !important;
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.24) !important;
}

/* Tags da Central de Membros: estas classes têm especificidade maior que
   o estilo global de select acima, por isso as cores realmente aparecem. */
.dw-member-tag-select {
  border-radius: 999px !important;
  font-weight: 900 !important;
}
.dw-member-status-nao_definido {
  background: rgba(100, 116, 139, .30) !important;
  color: #e2e8f0 !important;
  border-color: rgba(148, 163, 184, .40) !important;
}
.dw-member-status-na_comunidade {
  background: rgba(22, 163, 74, .38) !important;
  color: #bbf7d0 !important;
  border-color: rgba(34, 197, 94, .60) !important;
}
.dw-member-status-somente_canais {
  background: rgba(2, 132, 199, .38) !important;
  color: #bae6fd !important;
  border-color: rgba(56, 189, 248, .58) !important;
}
.dw-member-status-saiu {
  background: rgba(234, 88, 12, .36) !important;
  color: #fed7aa !important;
  border-color: rgba(249, 115, 22, .58) !important;
}
.dw-member-status-banido {
  background: rgba(220, 38, 38, .38) !important;
  color: #fecaca !important;
  border-color: rgba(248, 113, 113, .62) !important;
}
.dw-member-status-pausado {
  background: rgba(202, 138, 4, .36) !important;
  color: #fef3c7 !important;
  border-color: rgba(250, 204, 21, .54) !important;
}
.dw-member-atendimento-chamar {
  background: rgba(217, 119, 6, .38) !important;
  color: #fef3c7 !important;
  border-color: rgba(245, 158, 11, .60) !important;
}
.dw-member-atendimento-01 {
  background: rgba(37, 99, 235, .42) !important;
  color: #dbeafe !important;
  border-color: rgba(96, 165, 250, .62) !important;
}
.dw-member-atendimento-02 {
  background: rgba(124, 58, 237, .42) !important;
  color: #ede9fe !important;
  border-color: rgba(167, 139, 250, .62) !important;
}
.dw-member-atendimento-concluido {
  background: rgba(22, 163, 74, .38) !important;
  color: #bbf7d0 !important;
  border-color: rgba(34, 197, 94, .60) !important;
}
.dw-member-atendimento-erro {
  background: rgba(220, 38, 38, .38) !important;
  color: #fecaca !important;
  border-color: rgba(248, 113, 113, .62) !important;
}

option {
  background: #020617;
  color: #f8fafc;
}

table {
  background: rgba(15, 23, 42, 0.86) !important;
  color: #f8fafc !important;
}

thead, tbody, tr, th, td {
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.18) !important;
}

tr {
  transition: background .18s ease;
}

tr:hover {
  background: rgba(56, 189, 248, 0.08) !important;
}

* {
  scrollbar-color: rgba(56, 189, 248, .55) rgba(15, 23, 42, .85);
}
`;

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.94))",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 22,
  padding: 18,
  boxShadow:
    "0 18px 45px rgba(0, 0, 0, 0.30), 0 0 28px rgba(56, 189, 248, 0.08)",
  backdropFilter: "blur(14px)",
  animation: "dwFadeUp .45s ease both",
};

const secaoTituloStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: estilos.azulEscuro,
  marginBottom: 14,
};

const thStyle: React.CSSProperties = {
  padding: "15px 14px",
  fontSize: 14,
  color: estilos.azulEscuro,
  borderBottom: `1px solid ${estilos.borda}`,
};

const tdStyle: React.CSSProperties = {
  padding: "15px 14px",
  fontSize: 14,
  verticalAlign: "top",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 700,
  color: estilos.textoSuave,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  borderRadius: 14,
  border: `1px solid ${estilos.borda}`,
  background: "rgba(2, 6, 23, 0.88)",
  color: estilos.texto,
  fontSize: 15,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 13,
  borderRadius: 14,
  border: `1px solid ${estilos.borda}`,
  background: "rgba(2, 6, 23, 0.88)",
  color: estilos.texto,
  fontSize: 15,
  resize: "vertical",
  outline: "none",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(8, 33, 79, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 40,
};

const submenuAcaoStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "rgba(15, 23, 42, 0.82)",
  color: estilos.texto,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const menuTopoStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: estilos.texto,
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 8px",
  fontSize: 15,
};

const avatarStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 18,
  boxShadow: "0 8px 20px rgba(19, 102, 217, 0.20)",
};

const megaCategoriaStyle: React.CSSProperties = {
  padding: "18px 22px",
  borderRadius: 14,
  fontWeight: 900,
  color: estilos.texto,
  background: "rgba(15, 23, 42, 0.88)",
  border: `1px solid ${estilos.borda}`,
};

const megaCategoriaBotaoStyle: React.CSSProperties = {
  ...megaCategoriaStyle,
  textAlign: "left",
  cursor: "pointer",
};

const megaCategoriaAtivaStyle: React.CSSProperties = {
  ...megaCategoriaBotaoStyle,
  color: estilos.azul,
  background: "rgba(59, 130, 246, 0.16)",
};

const megaItemStyle: React.CSSProperties = {
  textAlign: "left",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "14px 4px",
};

const botaoPrimarioStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  border: "none",
  borderRadius: 14,
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 8px 20px rgba(19, 102, 217, 0.22)",
};

const botaoPrimarioStyleGrande: React.CSSProperties = {
  width: "100%",
  background: "linear-gradient(135deg, #dbeafe, #1366d9)",
  color: "rgba(15,23,42,0.96)",
  border: "none",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(19, 102, 217, 0.22)",
};

const botaoSecundarioStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 14,
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: 700,
  color: estilos.azulEscuro,
};

const botaoSecundarioGrandeStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: `1px solid ${estilos.borda}`,
  borderRadius: 14,
  padding: 14,
  cursor: "pointer",
  fontWeight: 700,
  color: estilos.azulEscuro,
};
