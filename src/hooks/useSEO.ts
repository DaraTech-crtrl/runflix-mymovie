import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_OG_IMAGE, resolveOgImage, SITE_URL } from '../utils/seo';

/**
 * Dynamic SEO meta tag updater.
 * Updates document title, description, OG tags, canonical URLs, and JSON-LD schemas.
 */
export function useSEO(meta: {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  schema?: Record<string, any>;
}) {
  const location = useLocation();

  useEffect(() => {
    const baseTitle = 'Runflix Entertainment';
    const ogImage = resolveOgImage(meta.image);

    document.title = meta.title
      ? `${meta.title} — ${baseTitle}`
      : `${baseTitle} — Movies & TV Series Downloads`;

    let descEl = document.querySelector('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.setAttribute('name', 'description');
      document.head.appendChild(descEl);
    }
    if (meta.description) {
      descEl.setAttribute('content', meta.description);
    }

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const fullTitle = meta.title ? `${meta.title} — ${baseTitle}` : baseTitle;
    const pageUrl = `${SITE_URL}${location.pathname}${location.search}`;

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', meta.description || 'Discover trending movies and TV series on Runflix Entertainment.');
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:secure_url', ogImage);
    setMeta('property', 'og:image:alt', fullTitle);
    setMeta('property', 'og:type', meta.type || 'website');
    setMeta('property', 'og:url', pageUrl);
    setMeta('property', 'og:site_name', baseTitle);
    setMeta('property', 'og:locale', 'en_US');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', meta.description || 'Explore trending movies and TV series with fast downloads and subtitle support.');
    setMeta('name', 'twitter:image', ogImage);
    setMeta('name', 'twitter:image:alt', fullTitle);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', pageUrl);

    let schemaScript = document.getElementById('seo-json-ld');
    if (schemaScript) {
      schemaScript.remove();
    }

    if (meta.schema) {
      const schemaWithImage = {
        ...meta.schema,
        image: meta.schema.image || ogImage,
      };
      schemaScript = document.createElement('script');
      schemaScript.setAttribute('id', 'seo-json-ld');
      schemaScript.setAttribute('type', 'application/ld+json');
      schemaScript.textContent = JSON.stringify(schemaWithImage);
      document.head.appendChild(schemaScript);
    }

    return () => {
      document.title = `${baseTitle} — Movies & TV Series Downloads`;
      setMeta('property', 'og:image', DEFAULT_OG_IMAGE);
      setMeta('property', 'og:image:secure_url', DEFAULT_OG_IMAGE);
      setMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
      const script = document.getElementById('seo-json-ld');
      if (script) {
        script.remove();
      }
    };
  }, [meta.title, meta.description, meta.image, meta.type, meta.schema, location.pathname, location.search]);
}
