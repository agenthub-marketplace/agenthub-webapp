import { supabase } from "@/integrations/supabase/client";

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error ?? `HTTP ${res.status}`);
  return json as T;
}

export function formatEuro(n: number): string {
  return `€ ${Math.round(n).toLocaleString("fr-FR")}`;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.round(h / 24);
  return `Il y a ${d}j`;
}
