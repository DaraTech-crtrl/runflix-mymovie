import { getAdminAuthHeaders } from './adminAuth';

export interface SiteDomainStats {
  pageviews: number;
  uniqueToday: number;
}

export interface AnalyticsStats {
  totalPageviews: number;
  todayPageviews: number;
  todayDate: string;
  uniqueVisitorsToday: number;
  activeLast5Min: number;
  domains: {
    main: SiteDomainStats;
    subdomain: SiteDomainStats;
  };
  topPages: { path: string; count: number }[];
  recentPageviews: { path: string; domain: string; at: number }[];
  updatedAt: number;
}

const API_URL = `${import.meta.env.BASE_URL}analytics_api.php`.replace(/\/{2,}/g, '/');
const VISITOR_KEY = 'rf_visitor_id';

export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `v_${Date.now()}`;
  }
}

/** Lightweight pageview beacon — does not block UI. */
export function trackPageView(path: string): void {
  const body = JSON.stringify({
    path: path || '/',
    visitorId: getOrCreateVisitorId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(API_URL, blob);
      return;
    }
  } catch {
    /* fetch fallback */
  }

  void fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Daratech dashboard — real server-wide analytics. */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  const res = await fetch(`${API_URL}?_=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminAuthHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || 'Analytics unavailable');
  }
  const d = json.data;
  return {
    totalPageviews: Number(d?.totalPageviews) || 0,
    todayPageviews: Number(d?.todayPageviews) || 0,
    todayDate: d?.todayDate || '',
    uniqueVisitorsToday: Number(d?.uniqueVisitorsToday) || 0,
    activeLast5Min: Number(d?.activeLast5Min) || 0,
    domains: {
      main: {
        pageviews: Number(d?.domains?.main?.pageviews) || 0,
        uniqueToday: Number(d?.domains?.main?.uniqueToday) || 0,
      },
      subdomain: {
        pageviews: Number(d?.domains?.subdomain?.pageviews) || 0,
        uniqueToday: Number(d?.domains?.subdomain?.uniqueToday) || 0,
      },
    },
    topPages: Array.isArray(d?.topPages) ? d.topPages : [],
    recentPageviews: Array.isArray(d?.recentPageviews) ? d.recentPageviews : [],
    updatedAt: Number(d?.updatedAt) || 0,
  };
}

export function pickDomainStats(
  stats: AnalyticsStats,
  site: 'merged' | 'main' | 'subdomain'
): { pageviews: number; unique: number } {
  if (site === 'main') {
    return {
      pageviews: stats.domains.main.pageviews,
      unique: stats.domains.main.uniqueToday,
    };
  }
  if (site === 'subdomain') {
    return {
      pageviews: stats.domains.subdomain.pageviews,
      unique: stats.domains.subdomain.uniqueToday,
    };
  }
  return {
    pageviews: stats.domains.main.pageviews + stats.domains.subdomain.pageviews,
    unique: stats.uniqueVisitorsToday,
  };
}
