import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, publicBusinessApi } from '@/lib/api';
import { applyTheme } from '@/lib/theme';

function applyFavicon(iconUrl?: string) {
  if (!iconUrl) return;

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = 'image/png';
  link.href = iconUrl;
}

function getSlugFromPath() {
  const match = window.location.pathname.match(/^\/empresa\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useBranding() {
  const token = localStorage.getItem('washsync_token');
  const slug = getSlugFromPath();
  const savedBusinessSlug = localStorage.getItem('washsync_business_slug');
  const savedUserRaw = localStorage.getItem('washsync_user');
  const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
  const isAdmin = savedUser?.role === 'ADMIN';

  useEffect(() => {
    const cached = localStorage.getItem('branding');
    if (cached) {
      const parsed = JSON.parse(cached);
      applyTheme(parsed);
      applyFavicon(parsed.iconUrl || parsed.logoUrl);
    }
  }, []);

  useEffect(() => {
    const currentSlug = getSlugFromPath();

    if (!currentSlug) return;

    if (!token) {
      localStorage.removeItem('branding');
      return;
    }

    if (!isAdmin && savedBusinessSlug && currentSlug !== savedBusinessSlug) {
      localStorage.removeItem('branding');
    }
  }, [slug, token, isAdmin, savedBusinessSlug]);

  const shouldBlockCrossCompanyBranding =
    !!token &&
    !isAdmin &&
    !!slug &&
    !!savedBusinessSlug &&
    slug !== savedBusinessSlug;

  const { data } = useQuery({
    queryKey: ['branding-global', slug, !!token, savedBusinessSlug],
    queryFn: async () => {
      if (shouldBlockCrossCompanyBranding) {
        return publicBusinessApi.getBySlug(slug!);
      }

      if (slug) {
        return publicBusinessApi.getBySlug(slug);
      }

      if (token) {
        const [branding, business] = await Promise.all([
          adminApi.getBusinessBranding(),
          adminApi.getBusiness(),
        ]);

        return {
          ...branding,
          name: business?.name || 'WashSync',
          slug: business?.slug || null,
        };
      }

      return null;
    },
    enabled: !!slug || (!!token && !slug),
    staleTime: 60000,
  });

  useEffect(() => {
    if (data) {
      applyTheme(data);
      applyFavicon(data.iconUrl || data.logoUrl);
      localStorage.setItem('branding', JSON.stringify(data));

      if (data.slug && (!token || isAdmin)) {
        localStorage.setItem('washsync_business_slug', data.slug);
      }
    }
  }, [data, token, isAdmin]);
}