import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { buscarPerfilPorEmail } from "../services/appServices";
import type { Usuario } from "../types";

async function carregarPerfilDaSessao(session: Session | null) {
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return buscarPerfilPorEmail(email);
}

/**
 * Fonte única do perfil autenticado da interface.
 * O perfil não é restaurado de localStorage; a sessão do Supabase Auth é a
 * autoridade, e só depois dela o perfil da tabela usuarios é carregado.
 */
export function useDubworksSession() {
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [sessaoInicialCarregada, setSessaoInicialCarregada] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function aplicarSessao(session: Session | null) {
      try {
        const perfil = await carregarPerfilDaSessao(session);
        if (ativo) setUsuarioLogado(perfil);
      } catch (error) {
        console.error("Erro ao carregar perfil da sessão:", error);
        if (ativo) setUsuarioLogado(null);
      } finally {
        if (ativo) setSessaoInicialCarregada(true);
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => aplicarSessao(data.session))
      .catch((error) => {
        console.error("Erro ao restaurar sessão:", error);
        if (ativo) {
          setUsuarioLogado(null);
          setSessaoInicialCarregada(true);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Evita executar uma consulta de banco dentro da pilha interna do Auth.
        queueMicrotask(() => void aplicarSessao(session));
      }
    );

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    usuarioLogado,
    setUsuarioLogado,
    sessaoInicialCarregada,
  };
}
