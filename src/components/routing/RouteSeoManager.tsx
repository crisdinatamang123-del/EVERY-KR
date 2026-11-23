import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getRouteSeoMetadata } from '../../utils/seoRoutes';

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let element = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonicalLink(url: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

const CANONICAL_EVERYKR_ORIGIN = 'https://everykr.com';
const HREFLANG_CODES = ['en', 'bn', 'ko', 'ne', 'ur', 'hi', 'ar', 'zh', 'ja'] as const;

function upsertHreflangLinks(canonicalUrl: string) {
  HREFLANG_CODES.forEach((langCode) => {
    let link = document.head.querySelector(
      `link[rel="alternate"][hreflang="${langCode}"]`
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', langCode);
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
  });

  let xDefault = document.head.querySelector(
    'link[rel="alternate"][hreflang="x-default"]'
  ) as HTMLLinkElement | null;
  if (!xDefault) {
    xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    document.head.appendChild(xDefault);
  }
  xDefault.setAttribute('href', canonicalUrl);
}

function upsertStructuredData(title: string, description: string, canonicalUrl: string, language: string) {
  let script = document.head.querySelector('script#everykr-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'everykr-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EveryKR',
    alternateName: 'EveryKR',
    headline: title,
    url: canonicalUrl,
    inLanguage: language,
    availableLanguage: HREFLANG_CODES,
    description
  });
}

export const RouteSeoManager: React.FC = () => {
  const location = useLocation();
  const { universitiesList, approvedUniversitiesList, language, t } = useApp();

  useEffect(() => {
    const baseMeta = getRouteSeoMetadata(location.pathname, universitiesList);
    const normalizedPath = baseMeta.canonicalPath === '/' ? '/' : baseMeta.canonicalPath;
    const canonicalUrl = `${CANONICAL_EVERYKR_ORIGIN}${normalizedPath}`;

    // Ensure HTML lang and dir attributes stay synchronized
    const isRtl = language === 'ur' || language === 'ar';
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

    let localizedTitle = baseMeta.title;
    let localizedDesc = baseMeta.description || t('hero_subhead');

    if (location.pathname === '/') {
      localizedTitle = `EveryKR – ${t('hero_headline')}`;
      localizedDesc = t('hero_subhead');
    } else if (
      location.pathname === '/login' ||
      location.pathname === '/register' ||
      location.pathname === '/signup' ||
      location.pathname === '/reset-password'
    ) {
      localizedTitle = `EveryKR – ${t('nav_login')}`;
    } else if (location.pathname === '/universities') {
      localizedTitle = `EveryKR – ${t('nav_universities')} (${approvedUniversitiesList.length})`;
    } else if (location.pathname === '/programs') {
      localizedTitle = `EveryKR – ${t('nav_programs')}`;
    } else if (location.pathname === '/deadlines') {
      localizedTitle = `EveryKR – ${t('nav_admission_deadlines')}`;
    } else if (location.pathname === '/application-guide') {
      localizedTitle = `EveryKR – ${t('nav_application_guide')}`;
    } else if (location.pathname === '/scholarships') {
      localizedTitle = `EveryKR – ${t('nav_scholarships')}`;
    } else if (location.pathname === '/visa') {
      localizedTitle = `EveryKR – ${t('nav_visa')}`;
    } else if (location.pathname === '/housing') {
      localizedTitle = `EveryKR – ${t('nav_accommodation')}`;
    } else if (location.pathname === '/jobs') {
      localizedTitle = `EveryKR – ${t('nav_jobs')}`;
    } else if (location.pathname === '/community') {
      localizedTitle = `EveryKR – ${t('nav_community')}`;
    } else if (location.pathname === '/about') {
      localizedTitle = `EveryKR – ${t('nav_about')}`;
    } else if (location.pathname === '/contact') {
      localizedTitle = `EveryKR – ${t('nav_contact')}`;
    }

    document.title = localizedTitle;
    upsertMetaTag('name', 'description', localizedDesc);
    upsertMetaTag('name', 'application-name', 'EveryKR');
    upsertMetaTag('name', 'apple-mobile-web-app-title', 'EveryKR');
    upsertMetaTag('property', 'og:title', localizedTitle);
    upsertMetaTag('property', 'og:description', localizedDesc);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:site_name', 'EveryKR');
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', localizedTitle);
    upsertMetaTag('name', 'twitter:description', localizedDesc);
    upsertCanonicalLink(canonicalUrl);
    upsertHreflangLinks(canonicalUrl);
    upsertStructuredData(localizedTitle, localizedDesc, canonicalUrl, language);
  }, [location.pathname, universitiesList, approvedUniversitiesList, language, t]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return null;
};
