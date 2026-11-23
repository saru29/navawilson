// Pulls posts, pages and team bios from the WordPress REST API into Markdown (npm run import:wp).

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { OLD_URLS } from '../src/data/redirects.mjs';

const SITE = 'https://navawilson.law';
const API = `${SITE}/wp-json/wp/v2`;
const ROOT = new URL('..', import.meta.url).pathname;

// Pages rebuilt by hand in src/pages, or not carried over.
const SKIP_PAGES = new Set([
  '', 'home-copy', 'blogs', 'contact-us', 'about-us',
  'wills-and-estate-questionnaire', 'nava-wilson-pc-pr-assessment', 'adult-guardianship-intake',
]);
const LEGAL_PAGES = new Set(['terms-of-use', 'privacy-policy-2', 'retainer-policy', 'know-your-client']);
// Roles and order as shown on the live About page; not stored in the API.
const TEAM_ROLES = {
  'kubes-navaratnam': ['Managing Lawyer', 1],
  'gathya-manoharan': ['Litigation Lawyer', 2],
  'malliha-wilson': [undefined, 3],
  'sutharsan-vasanthan': [undefined, 4],
};

async function getAll(type) {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}`);
    if (!res.ok) break;
    const batch = await res.json();
    out.push(...batch);
    if (page >= Number(res.headers.get('x-wp-totalpages') ?? 1)) break;
  }
  return out;
}

const decode = (s = '') =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

const UPLOAD_RE = /(?:https?:)?\/\/[^\s"'()]*?navawilson\.law(\/wp-content\/uploads\/[^\s"'()?#]+)/g;
const uploads = new Set();

function localiseUrls(html) {
  return html
    .replace(UPLOAD_RE, (_, path) => {
      const decoded = decodeURI(path);
      uploads.add(decoded);
      return encodeURI(decoded);
    })
    .replace(/https?:\/\/(www\.)?navawilson\.law(?=\/|")/g, '')
    .replace(/href="(\/[^"]*)"/g, (m, href) => (OLD_URLS[href] ? `href="${OLD_URLS[href]}"` : m));
}

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
td.use(gfm);
td.remove(['script', 'style', 'svg', 'link', 'noscript', 'form', 'iframe']);
td.addRule('dateArchiveLinks', {
  filter: (node) => node.nodeName === 'A' && /^\/\d{4}\/\d{2}\/(\d{2}\/)?$/.test(node.getAttribute('href') ?? ''),
  replacement: (content) => content,
});
td.addRule('elementorTabs', {
  filter: (node) => ['UL', 'OL'].includes(node.nodeName)
    && Array.from(node.getElementsByTagName('a')).some((a) => (a.getAttribute('href') ?? '').startsWith('#uc_')),
  replacement: () => '',
});
td.addRule('boldSpan', {
  filter: (node) => node.nodeName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(node.getAttribute('style') ?? ''),
  replacement: (content) => (content.trim() ? `**${content.trim()}**` : content),
});
td.addRule('plainHeadings', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content, node) => {
    const level = Number(node.nodeName[1]);
    const text = content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    return text ? `\n\n${'#'.repeat(level)} ${text}\n\n` : '';
  },
});

function toMarkdown(html) {
  let md = td.turndown(localiseUrls(html));
  md = md.replace(/ /g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

// The first <h1> in Elementor content duplicates the page title; lift it out.
function splitHeading(md) {
  const m = md.match(/^# (.+)\n+/m);
  if (!m || m.index > 400) return { heading: undefined, body: md };
  return { heading: m[1].trim(), body: (md.slice(0, m.index) + md.slice(m.index + m[0].length)).trim() };
}

const yaml = (v) => JSON.stringify(v);

function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${yaml(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

async function write(rel, content) {
  const file = join(ROOT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

// photo-1024x210.jpg falls back to photo.jpg when the original is in the media library.
async function downloadUploads(mediaPaths) {
  let done = 0, failed = [];
  for (const path of uploads) {
    const original = path.replace(/-\d+x\d+(\.\w+)$/, '$1');
    const source = path !== original && mediaPaths.has(original) ? original : path;
    const dest = join(ROOT, 'public', path);
    if (await exists(dest)) continue;
    const res = await fetch(SITE + encodeURI(source));
    if (!res.ok) { failed.push(path); continue; }
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    done++;
  }
  console.log(`uploads: ${done} downloaded, ${uploads.size} referenced`);
  if (failed.length) console.log('failed:', failed);
}

const [posts, pages, team, categories, users, media] = await Promise.all(
  ['posts', 'pages', 'our-team', 'categories', 'users', 'media'].map(getAll),
);
const catName = new Map(categories.map((c) => [c.id, decode(c.name)]));
const userName = new Map(users.map((u) => [u.id, decode(u.name)]));
const mediaById = new Map(media.map((m) => [m.id, m]));
const mediaPaths = new Set(media.map((m) => decodeURI(m.source_url.replace(SITE, ''))));

const featured = (id) => {
  const m = mediaById.get(id);
  return m ? localiseUrls(m.source_url) : undefined;
};

for (const p of posts) {
  const seo = p.yoast_head_json ?? {};
  const { heading, body } = splitHeading(toMarkdown(p.content.rendered));
  await write(`src/content/blog/${p.slug}.md`, frontmatter({
    title: decode(p.title.rendered),
    heading: heading && heading !== decode(p.title.rendered) ? heading : undefined,
    seoTitle: seo.title ? decode(seo.title) : undefined,
    description: seo.description ? decode(seo.description) : undefined,
    date: `${p.date}Z`,
    updated: `${p.modified}Z`,
    author: userName.get(p.author),
    categories: p.categories.map((id) => catName.get(id)).filter((c) => c && c !== 'Uncategorized'),
    image: featured(p.featured_media),
  }) + body + '\n');
}
console.log(`posts: ${posts.length}`);

let pageCount = 0;
for (const p of pages) {
  const path = p.link.replace(SITE, '').replace(/^\/|\/$/g, '');
  if (SKIP_PAGES.has(p.slug) || SKIP_PAGES.has(path)) continue;
  const seo = p.yoast_head_json ?? {};
  const { heading, body } = splitHeading(toMarkdown(p.content.rendered));
  await write(`src/content/pages/${path}.md`, frontmatter({
    title: decode(p.title.rendered),
    heading,
    seoTitle: seo.title ? decode(seo.title) : undefined,
    description: seo.description ? decode(seo.description) : undefined,
    kind: LEGAL_PAGES.has(p.slug) ? 'legal' : 'service',
    updated: `${p.modified}Z`,
  }) + body + '\n');
  pageCount++;
}
console.log(`pages: ${pageCount}`);

for (const t of team) {
  const seo = t.yoast_head_json ?? {};
  await write(`src/content/team/${t.slug}.md`, frontmatter({
    name: decode(t.title.rendered),
    role: TEAM_ROLES[t.slug]?.[0],
    description: seo.description ? decode(seo.description) : undefined,
    photo: featured(t.featured_media),
    order: TEAM_ROLES[t.slug]?.[1] ?? 99,
  }) + toMarkdown(t.content.rendered) + '\n');
}
console.log(`team: ${team.length}`);

await downloadUploads(mediaPaths);
