import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../api/analytics';

/** Records route changes to server analytics (skipped on Daratech admin). */
export default function AnalyticsBeacon() {
  const { pathname, search } = useLocation();
  const lastRef = useRef('');

  useEffect(() => {
    if (pathname.startsWith('/daratech')) return;

    const path = search ? `${pathname}${search}` : pathname;
    if (path === lastRef.current) return;
    lastRef.current = path;

    trackPageView(path);
  }, [pathname, search]);

  return null;
}
