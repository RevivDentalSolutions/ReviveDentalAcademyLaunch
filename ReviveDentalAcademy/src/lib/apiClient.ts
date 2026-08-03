import { supabase } from './supabase';

export function apiUrl(path: string, explicitBaseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = explicitBaseUrl || import.meta.env.VITE_API_BASE_URL || '';
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to continue.');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function authenticatedJsonFetch(path: string, init: RequestInit = {}, explicitBaseUrl?: string): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers = new Headers(init.headers);
  headers.set('Authorization', authHeaders.Authorization);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(apiUrl(path, explicitBaseUrl), { ...init, headers });
}
