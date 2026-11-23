// Pulls posts, pages and team bios from WordPress (npm run import:wp). Re-runnable; overwrites src/content.

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { SITE, decode, downloadUploads, getAll, localiseUrls, write } from './lib/wp.mjs';
import { convertPage, stylesheetUrls } from './lib/elementor.mjs';

// Rebuilt by hand in src/pages, or not carried over.
const SKIP_PAGES = new Set([
  '', 'home-copy', 'blogs',
  'wills-and-estate-questionnaire', 'nava-wilson-pc-pr-assessment', 'adult-guardianship-intake',
]);
// Roles and order as shown on the live About page; not stored in the API.
const TEAM_ROLES = {
  'kubes-navaratnam': ['Managing Lawyer', 1],
  'gathya-manoharan': ['Litigation Lawyer', 2],
  'malliha-wilson': [undefined, 3],
  'sutharsan-vasanthan': [undefined, 4],
};

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
td.use(gfm);
td.remove(['script', 'style', 'svg', 'link', 'noscript', 'form', 'iframe']);
td.addRule('dateArchiveLinks', {
  filter: (node) => node.nodeName === 'A' && /^\/\d{4}\/\d{2}\/(\d{2}\/)?$/.test(node.getAttribute('href') ?? ''),
  replacement: (content) => content,
});
td.addRule('boldSpan', {
  filter: (node) => node.nodeName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(node.getAttribute('style') ?? ''),
  replacement: (content) => (content.trim() ? `**${content.trim()}**` : content),
});
td.addRule('plainHeadings', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content, node) => {
    const text = content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    return text ? `\n\n${'#'.repeat(Number(node.nodeName[1]))} ${text}\n\n` : '';
  },
});

const toMarkdown = (html) =>
  td.turndown(localiseUrls(html)).replace(/ /g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

// The first <h1> in Elementor content duplicates the page title; lift it out.
function splitHeading(md) {
  const m = md.match(/^# (.+)\n+/m);
  if (!m || m.index > 400) return { heading: undefined, body: md };
  return { heading: m[1].trim(), body: (md.slice(0, m.index) + md.slice(m.index + m[0].length)).trim() };
}

function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

const isTextOnly = (html) => {
  const widgets = [...html.matchAll(/data-widget_type="([^"]+)"/g)].map(([, w]) => w);
  return widgets.length <= 2 && widgets.every((w) => w === 'text-editor.default' || w === 'heading.default');
};

const [posts, pages, team, categories, users, media] = await Promise.all(
  ['posts', 'pages', 'our-team', 'categories', 'users', 'media'].map(getAll),
);
const catName = new Map(categories.map((c) => [c.id, decode(c.name)]));
const userName = new Map(users.map((u) => [u.id, decode(u.name)]));
const mediaById = new Map(media.map((m) => [m.id, m]));
const mediaPaths = new Set(media.map((m) => decodeURI(m.source_url.replace(SITE, ''))));
const postSlug = new Map(posts.map((p) => [p.id, p.slug]));
const featured = (id) => (mediaById.has(id) ? localiseUrls(mediaById.get(id).source_url) : undefined);

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

const cssCache = new Map();
const fetchCss = (url) => {
  if (!cssCache.has(url)) cssCache.set(url, fetch(url).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
  return cssCache.get(url);
};

let textPages = 0;
let layoutPages = 0;
for (const p of pages) {
  const path = p.link.replace(SITE, '').replace(/^\/|\/$/g, '');
  if (SKIP_PAGES.has(p.slug) || SKIP_PAGES.has(path)) continue;
  const seo = p.yoast_head_json ?? {};
  const meta = {
    title: decode(p.title.rendered),
    seoTitle: seo.title ? decode(seo.title) : undefined,
    description: seo.description ? decode(seo.description) : undefined,
  };

  if (isTextOnly(p.content.rendered)) {
    const { heading, body } = splitHeading(toMarkdown(p.content.rendered));
    await write(`src/content/pages/${path}.md`, frontmatter({ ...meta, heading }) + body + '\n');
    textPages++;
    continue;
  }

  // Tab panels embed other Elementor templates, so convert the rendered page rather than the API content.
  const html = await (await fetch(`${SITE}/${path}/`)).text();
  const sheets = await Promise.all(stylesheetUrls(html).map(fetchCss));
  const { sections, unknown } = convertPage(html, { postSlug, externalCss: sheets.join('\n') });
  if (unknown.length) console.log(`  ${path}: unknown widgets ${unknown.join(', ')}`);
  await write(`src/content/layouts/${path}.json`, JSON.stringify({ ...meta, sections }, null, 2) + '\n');
  layoutPages++;
}
console.log(`pages: ${textPages} text, ${layoutPages} layout`);

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
