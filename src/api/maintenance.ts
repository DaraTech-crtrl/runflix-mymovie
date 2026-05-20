import { getAdminAuthHeaders } from './adminAuth';

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  updatedAt: number;
}

const API_URL = `${import.meta.env.BASE_URL}maintenance_api.php`.replace(/\/{2,}/g, '/');
const JSON_URL = `${import.meta.env.BASE_URL}maintenance.json`.replace(/\/{2,}/g, '/');

async function parseMaintenanceResponse(res: Response): Promise<MaintenanceConfig> {
  const json = await res.json();
  const data = json?.data ?? json;
  return {
    enabled: Boolean(data?.enabled),
    message:
      typeof data?.message === 'string' && data.message.trim()
        ? data.message
        : 'We are performing scheduled core upgrades. Runflix Entertainment will be back online shortly!',
    updatedAt: Number(data?.updatedAt) || 0,
  };
}

/** Fetch global maintenance status (all visitors / devices). */
export async function fetchMaintenanceStatus(): Promise<MaintenanceConfig> {
  const url = `${API_URL}?_=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      return parseMaintenanceResponse(res);
    }
  } catch {
    /* fall through to static JSON */
  }

  const fallback = await fetch(`${JSON_URL}?_=${Date.now()}`, { cache: 'no-store' });
  if (!fallback.ok) {
    throw new Error('Maintenance status unavailable');
  }
  return parseMaintenanceResponse(fallback);
}

/** Update global maintenance (Daratech admin only). */
export async function updateMaintenanceStatus(
  enabled: boolean,
  message: string
): Promise<MaintenanceConfig> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify({ enabled, message }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || 'Failed to update maintenance mode');
  }
  const data = json?.data ?? json;
  return {
    enabled: Boolean(data?.enabled),
    message:
      typeof data?.message === 'string' && data.message.trim()
        ? data.message
        : message,
    updatedAt: Number(data?.updatedAt) || Date.now(),
  };
}
