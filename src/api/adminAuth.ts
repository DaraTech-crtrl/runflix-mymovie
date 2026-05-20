const AUTH_URL = `${import.meta.env.BASE_URL}/admin_auth_api.php`.replace(/\/{2,}/g, '/');
const TOKEN_KEY = 'rf_admin_token';
const AUTH_FLAG_KEY = 'daratech_auth';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminSession(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

export function isAdminSessionFlagged(): boolean {
  try {
    return localStorage.getItem(AUTH_FLAG_KEY) === 'true' && !!getAdminToken();
  } catch {
    return false;
  }
}

/** Verify PIN on server — returns session token (PIN is not stored client-side). */
export async function verifyAdminPin(pin: string): Promise<{ token: string; expiresAt: number }> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success || !json?.token) {
    throw new Error(json?.error || 'Invalid PIN');
  }
  return { token: json.token, expiresAt: json.expiresAt ?? 0 };
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  if (token) {
    return { 'X-Admin-Token': token };
  }
  return {};
}
