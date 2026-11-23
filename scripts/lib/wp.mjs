import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { OLD_URLS } from '../../src/data/redirects.mjs';

export const SITE = 'https://navawilson.law';
export const API = `${SITE}/wp-json/wp/v2`;
export const ROOT = new URL('../..', import.meta.url).pathname;

export async function getAll(type) {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}/${type}?per_page=100&page=${page}`);
    if (!res.ok) break;
    out.push(...(await res.json()));
    if (page >= Number(res.headers.get('x-wp-totalpages') ?? 1)) break;
  }
  return out;
}

export const decode = (s = '') =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

const UPLOAD_RE = /(?:https?:)?\/\/[^\s"'()]*?navawilson\.law(\/wp-content\/uploads\/[^\s"'()?#]+)/g;
export const uploads = new Set();

export function localiseUrls(html) {
  return html
    .replace(UPLOAD_RE, (_, path) => {
      const decoded = decodeURI(path);
      if (!/\.(css|js)$/i.test(decoded)) uploads.add(decoded);
      return encodeURI(decoded);
    })
    .replace(/https?:\/\/(www\.)?navawilson\.law(?=\/|"|$)/g, '')
    .replace(/href="(\/[^"]*)"/g, (m, href) => (OLD_URLS[href] ? `href="${OLD_URLS[href]}"` : m));
}

export const localiseUrl = (url = '') => {
  const out = localiseUrls(url);
  return OLD_URLS[out] ?? (out || '/');
};

export async function write(rel, content) {
  const file = join(ROOT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

// photo-1024x210.jpg falls back to photo.jpg when the original is in the media library.
export async function downloadUploads(mediaPaths) {
  let done = 0;
  const failed = [];
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
