import { createClient } from "@supabase/supabase-js";
import { guardedFetch } from "./safeFetch";

/**
 * Supabase do DubWorks Manager.
 *
 * BASE OFICIAL: projeto Supabase do primeiro Dubworks-Manager2.0.
 * As variáveis de ambiente continuam podendo ser usadas, mas o fallback também
 * aponta para essa base original. No modo TESTE, guardedFetch bloqueia escritas
 * antes de qualquer requisição chegar ao Supabase.
 */
export const SUPABASE_URL = String(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://omgjbafqukpzdhhpdlaa.supabase.co"
).trim().replace(/\/$/, "");

export const SUPABASE_ANON_KEY = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT"
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: guardedFetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
