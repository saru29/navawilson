import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const live = import.meta.env.PUBLIC_SITE_LIVE === 'true';
  const body = live
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
