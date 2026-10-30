// Talks to the backend exactly as docs/api-contract.md says. The session keeps its own guest id, so
// this maps it to the server's and creates or updates the server's copy whenever the profile changes.
import type { Guest, GuestInput, MatchResponse } from '../types';

const API_URL: string = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:4000`;
const STORAGE_KEY = 'matchmaker.serverGuests';
const HEALTH_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 10000;

interface ServerGuest {
  id: string;
  /** The profile last sent, to tell whether it needs sending again. */
  sent: string;
}

const readMap = (): Record<string, ServerGuest> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, ServerGuest>;
  } catch {
    return {};
  }
};

const writeMap = (map: Record<string, ServerGuest>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Without storage the guest is simply created again next time.
  }
};

async function request<T>(path: string, init: RequestInit = {}, timeout = REQUEST_TIMEOUT_MS): Promise<T> {
  const timer = AbortSignal.timeout(timeout);
  const signal = init.signal ? AbortSignal.any([init.signal, timer]) : timer;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    signal,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    throw Object.assign(new Error(body?.error?.message ?? 'The matching service did not respond.'), {
      code: body?.error?.code,
    });
  }
  return (await response.json()) as T;
}

export async function isApiUp(): Promise<boolean> {
  try {
    return (await request<{ ok: boolean }>('/api/health', {}, HEALTH_TIMEOUT_MS)).ok;
  } catch {
    return false;
  }
}

const toInput = ({ id: _id, updatedAt: _updatedAt, ...input }: Guest): GuestInput => input;

/** The server's id for this guest, sending the profile first if the server's copy is missing or stale. */
async function syncGuest(guest: Guest, signal?: AbortSignal): Promise<string> {
  const body = JSON.stringify(toInput(guest));
  const map = readMap();
  const known = map[guest.id];
  if (known?.sent === body) return known.id;
  if (known) {
    try {
      await request(`/api/guests/${encodeURIComponent(known.id)}`, { method: 'PUT', body, signal });
      writeMap({ ...map, [guest.id]: { id: known.id, sent: body } });
      return known.id;
    } catch (error) {
      if ((error as { code?: string }).code !== 'GUEST_NOT_FOUND') throw error;
    }
  }
  const created = await request<Guest>('/api/guests', { method: 'POST', body, signal });
  writeMap({ ...map, [guest.id]: { id: created.id, sent: body } });
  return created.id;
}

export async function fetchRecommendations(guest: Guest, signal?: AbortSignal): Promise<MatchResponse> {
  const id = await syncGuest(guest, signal);
  try {
    return await request<MatchResponse>(`/api/guests/${encodeURIComponent(id)}/recommendations`, { signal });
  } catch (error) {
    if ((error as { code?: string }).code !== 'GUEST_NOT_FOUND') throw error;
    // The server lost this guest (a fresh deployment, say): send the profile again.
    const { [guest.id]: _stale, ...rest } = readMap();
    writeMap(rest);
    const created = await syncGuest(guest, signal);
    return request<MatchResponse>(`/api/guests/${encodeURIComponent(created)}/recommendations`, { signal });
  }
}

/** Best effort: the visit list works from this device even if the server can't be reached. */
export async function syncBookmark(guest: Guest, exhibitorId: string, saved: boolean): Promise<void> {
  try {
    const id = await syncGuest(guest);
    await request(`/api/guests/${encodeURIComponent(id)}/bookmarks/${encodeURIComponent(exhibitorId)}`, {
      method: saved ? 'PUT' : 'DELETE',
    });
  } catch {
    // Offline; the local list stays correct.
  }
}
