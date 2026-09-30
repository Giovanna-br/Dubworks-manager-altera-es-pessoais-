import { permissoesDisponiveis } from "../config/appConfig";
import type { Cargo, ChavePermissao, Projeto, Usuario } from "../types";

export const ROLES: Record<string, Cargo> = {
  DIRETORIA: "diretoria",
  ADM: "adm",
  ADM_TREINAMENTO: "adm_treinamento",
  MODERADOR: "moderador",
  ANALISTA_RR: "analista_rr",
  MARKETING: "marketing",
  EVENTOS: "eventos",
  LIDER: "lider",
  LIDER_TREINAMENTO: "lider_treinamento",
  EDITOR: "editor",
  MEMBRO: "membro",
} as const;

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function permissaoPadraoPorCargo(cargo: Cargo, chave: ChavePermissao) {
  if (cargo === ROLES.DIRETORIA) return true;

  if (cargo === ROLES.ADM) {
    return [
      "acesso_projetos",
      "acesso_membros",
      "acesso_usuarios",
      "acesso_advertencias",
      "acesso_relatorios_projetos",
      "acesso_relatorios_elenco",
      "acesso_exportacoes",
    ].includes(chave);
  }

  if (cargo === ROLES.ADM_TREINAMENTO) {
    return ["acesso_usuarios", "acesso_treinamentos"].includes(chave);
  }

  if (cargo === ROLES.MODERADOR) {
    return ["acesso_membros", "acesso_advertencias"].includes(chave);
  }

  if (cargo === ROLES.ANALISTA_RR) {
    return [
      "acesso_membros",
      "acesso_relatorios_membros",
      "acesso_relatorios_entrada_saida",
    ].includes(chave);
  }

  if (cargo === ROLES.MARKETING) {
    return ["acesso_projetos_finalizados"].includes(chave);
  }

  if (cargo === ROLES.EVENTOS) {
    return ["acesso_projetos", "acesso_eventos"].includes(chave);
  }

  if (cargo === ROLES.LIDER || cargo === ROLES.LIDER_TREINAMENTO) {
    return [
      "acesso_projetos",
      "acesso_relatorios_elenco",
      "acesso_exportacoes",
    ].includes(chave);
  }

  if (cargo === ROLES.EDITOR) return chave === "acesso_projetos";
  return false;
}

export function temAcesso(usuario: Usuario | null, chave: ChavePermissao) {
  if (!usuario) return false;

  // A permissão individual tem prioridade sobre o padrão do cargo. Assim,
  // o cargo define a configuração inicial, mas cada usuário pode receber
  // acessos extras ou bloqueios específicos sem precisar trocar de cargo.
  const configured = usuario[chave];
  return typeof configured === "boolean"
    ? configured
    : permissaoPadraoPorCargo(usuario.cargo, chave);
}

export function permissoesPadraoUsuario(cargo: Cargo) {
  return permissoesDisponiveis.reduce((acc, item) => {
    acc[item.chave] = permissaoPadraoPorCargo(cargo, item.chave);
    return acc;
  }, {} as Record<ChavePermissao, boolean>);
}

export function podeVerProjeto(usuario: Usuario | null, projeto: Projeto) {
  if (!usuario) return false;

  const cargo = normalize(usuario.cargo);
  const vinculo = normalize(usuario.vinculo);
  const login = normalize(usuario.login);
  const nome = normalize(usuario.nome);
  const lider = normalize(projeto.Lider);
  const editor = normalize(projeto.Editor);

  if (cargo === ROLES.MARKETING) {
    return (
      temAcesso(usuario, "acesso_projetos_finalizados") &&
      normalize(projeto.Status) === "finalizado"
    );
  }

  if (!temAcesso(usuario, "acesso_projetos")) return false;
  if ([ROLES.DIRETORIA, ROLES.ADM, ROLES.ADM_TREINAMENTO].includes(cargo as Cargo)) return true;
  if (cargo === ROLES.EVENTOS) return true;

  if (cargo === ROLES.LIDER || cargo === ROLES.LIDER_TREINAMENTO) {
    return Boolean(lider && [vinculo, login, nome].filter(Boolean).includes(lider));
  }

  if (cargo === ROLES.EDITOR) {
    return Boolean(editor && [vinculo, login, nome].filter(Boolean).includes(editor));
  }

  return false;
}

export function podeEditarProjeto(usuario: Usuario | null, projeto: Projeto | null) {
  if (!usuario || !projeto) return false;
  const cargo = normalize(usuario.cargo);
  const lider = normalize(projeto.Lider);
  const identificadores = [usuario.vinculo, usuario.login, usuario.nome]
    .map(normalize)
    .filter(Boolean);

  if (cargo === ROLES.DIRETORIA || cargo === ROLES.ADM) return true;
  if (cargo === ROLES.LIDER || cargo === ROLES.LIDER_TREINAMENTO) {
    return Boolean(lider && identificadores.includes(lider));
  }
  return false;
}

export function podeCriarProjeto(usuario: Usuario | null) {
  return Boolean(
    usuario &&
      [ROLES.DIRETORIA, ROLES.ADM, ROLES.LIDER, ROLES.LIDER_TREINAMENTO].includes(
        usuario.cargo
      )
  );
}

export function podeSubirVideoEditor(usuario: Usuario | null, projeto: Projeto | null) {
  if (!usuario || !projeto) return false;
  const cargo = normalize(usuario.cargo);
  if (cargo === ROLES.DIRETORIA || cargo === ROLES.ADM) return true;
  if (cargo !== ROLES.EDITOR) return false;

  const editor = normalize(projeto.Editor);
  const identificadores = [usuario.vinculo, usuario.login, usuario.nome]
    .map(normalize)
    .filter(Boolean);
  return Boolean(editor && identificadores.includes(editor));
}

export const podeGerenciarUsuarios = (usuario: Usuario | null) =>
  temAcesso(usuario, "acesso_usuarios");
export const podeGerenciarMembros = (usuario: Usuario | null) =>
  temAcesso(usuario, "acesso_membros");
export const podeGerenciarTreinamentos = (usuario: Usuario | null) =>
  temAcesso(usuario, "acesso_treinamentos");

export function podeVerNotificacoesGerais(usuario: Usuario | null) {
  return Boolean(
    usuario && [ROLES.DIRETORIA, ROLES.ADM].includes(usuario.cargo)
  );
}

export function podeExcluirUsuario(usuarioLogado: Usuario | null, alvo: Usuario) {
  if (!usuarioLogado) return false;
  if (alvo.cargo === ROLES.DIRETORIA && usuarioLogado.cargo !== ROLES.DIRETORIA) return false;
  if (usuarioLogado.cargo === ROLES.DIRETORIA) return true;
  if (usuarioLogado.cargo === ROLES.ADM) return alvo.cargo !== ROLES.DIRETORIA;
  if (usuarioLogado.cargo === ROLES.ADM_TREINAMENTO) {
    return alvo.cargo === ROLES.LIDER_TREINAMENTO;
  }
  return false;
}

export function cargosPermitidosParaCriar(usuario: Usuario | null): Cargo[] {
  if (!usuario) return [];
  if (usuario.cargo === ROLES.DIRETORIA) {
    return Object.values(ROLES);
  }
  if (usuario.cargo === ROLES.ADM) {
    return [
      ROLES.MODERADOR,
      ROLES.ANALISTA_RR,
      ROLES.MARKETING,
      ROLES.EVENTOS,
      ROLES.LIDER,
      ROLES.LIDER_TREINAMENTO,
      ROLES.EDITOR,
      ROLES.MEMBRO,
    ];
  }
  if (usuario.cargo === ROLES.ADM_TREINAMENTO) return [ROLES.LIDER_TREINAMENTO];
  return [];
}
