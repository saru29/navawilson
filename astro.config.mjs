// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { OLD_URLS } from './src/data/redirects.mjs';

export default defineConfig({
  site: 'https://navawilson.law',

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],

  redirects: {
    ...Object.fromEntries(Object.entries(OLD_URLS).map(([from, to]) => [from.replace(/\/$/, ''), to])),
    '/our-team': '/about-us/',
    '/author/admin': '/blogs/',
    '/author/varnesh': '/blogs/',
  },

  integrations: [sitemap({ filter: (page) => !page.includes('/contact-us/thanks/') })],
});
