// Converts a rendered Elementor page into a JSON tree of sections, columns and widgets.

import * as cheerio from 'cheerio';
import { localiseUrl, localiseUrls } from './wp.mjs';

const KEEP_PROPS = new Set([
  'background-color', 'background-image', 'border-radius', 'text-align', 'color', 'fill', 'font-size', 'font-weight',
  'width', 'max-width', 'height', 'padding', 'border-style', 'border-width', 'border-color',
  'left', 'right', 'top', 'bottom', 'align-self', '--container-widget-width',
  'justify-content', 'align-content', 'align-items', 'text-transform', 'text-decoration',
]);
const ID_SELECTOR = /^(?:body:not\(\.rtl\) )?\.elementor-\d+ \.elementor-element\.elementor-element-([0-9a-f]{6,8})(.*)$/;
// Selector suffix → which part of the widget the rule styles.
const TARGETS = {
  '': 'self',
  ' > .elementor-widget-container': 'self',
  ' > .elementor-element-populated': 'self',
  ' > .elementor-widget-wrap': 'self',
  ' > .elementor-motion-effects-container > .elementor-motion-effects-layer': 'self',
  '.elementor-column > .elementor-widget-wrap': 'self',
  '.elementor-column.elementor-element[data-element_type="column"] > .elementor-widget-wrap.elementor-element-populated': 'self',
  ' .elementor-heading-title': 'title',
  ' .elementor-icon-box-title': 'title',
  ' .elementor-icon-box-description': 'desc',
  ' .elementor-icon': 'icon',
  '.elementor-view-stacked .elementor-icon': 'icon',
  '.elementor-view-framed .elementor-icon': 'iconAlt',
  '.elementor-view-default .elementor-icon': 'iconAlt',
  ' .elementor-icon svg': 'svg',
  '.elementor-view-stacked .elementor-icon svg': 'svg',
  '.elementor-view-framed .elementor-icon svg': 'svgAlt',
  '.elementor-view-default .elementor-icon svg': 'svgAlt',
  ' .elementor-icon-list-icon svg': 'listIcon',
  ' .elementor-icon-list-text': 'listText',
  ' .elementor-button': 'button',
  ' a.elementor-button': 'button',
  ' .elementor-button:not(#e)': 'button',
};
const normaliseSuffix = (suffix) =>
  suffix
    .replace(/:not\(\.elementor-motion-effects-element-type-background\)|:not\(\.nitro-lazy\)/g, '')
    .replace(/\s*>\s*/g, ' > ')
    .replace(/\s+/g, ' ')
    .replace(/^ $/, '');

function eachRule(css, cb) {
  let media = null;
  let depth = 0;
  let buf = '';
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      if (head.startsWith('@')) {
        if (depth === 0) media = head;
        depth++;
        continue;
      }
      const end = css.indexOf('}', i);
      cb(depth > 0 ? media : null, head, css.slice(i + 1, end));
      i = end;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) media = null;
      buf = '';
    } else {
      buf += ch;
    }
  }
}

function parseCss(css) {
  const styles = new Map();
  eachRule(css, (media, head, body) => {
    const desktop = media && /min-width:\s*(768|1025)px/.test(media);
    if (media && !desktop) return;
    for (const sel of head.split(',')) {
      const m = sel.trim().match(ID_SELECTOR);
      const target = m && TARGETS[normaliseSuffix(m[2])];
      if (!target) continue;
      const entry = styles.get(m[1]) ?? {};
      const part = (entry[target] ??= {});
      for (const decl of body.split(';')) {
        const idx = decl.indexOf(':');
        if (idx < 0) continue;
        const prop = decl.slice(0, idx).trim();
        const value = decl.slice(idx + 1).trim().replace(/\s*!important$/, '');
        if (!KEEP_PROPS.has(prop) || value.includes('var(--e-global-color-text)')) continue;
        if (desktop && target === 'self' && prop === 'width') entry.colWidth = value;
        else if (!desktop) part[prop] = value;
      }
      styles.set(m[1], entry);
    }
  });
  return styles;
}

const hidden = (cls) => ['desktop', 'tablet', 'mobile'].filter((d) => cls.includes(`elementor-hidden-${d}`));
const LAYOUT_CLASSES = {
  'elementor-widget__width-auto': 'w-auto',
  'elementor-widget__width-initial': 'w-initial',
  'elementor-absolute': 'abs',
  'elementor-view-stacked': 'view-stacked',
  'elementor-view-framed': 'view-framed',
  'elementor-shape-circle': 'shape-circle',
  'elementor-shape-rounded': 'shape-rounded',
  'elementor-align-left': 'align-left',
  'elementor-align-center': 'align-center',
  'elementor-align-right': 'align-right',
  'elementor-align-justify': 'align-justify',
};
const customClasses = (cls) =>
  cls.split(/\s+/).flatMap((c) => (LAYOUT_CLASSES[c] ? [LAYOUT_CLASSES[c]] : c && !/^(elementor|e-|uc|ue-|swiper|nitro)/.test(c) ? [c] : []));

function styleOf(styles, id) {
  const entry = styles.get(id);
  if (!entry) return undefined;
  const { colWidth, ...parts } = entry;
  const out = {};
  for (const [part, props] of Object.entries(parts)) {
    if (props['background-image']?.startsWith('url(')) {
      props['background-image'] = localiseUrls(props['background-image'].replace(/["']/g, ''));
    }
    if (Object.keys(props).length) out[part] = props;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanHtml($, el) {
  const $el = $(el).clone();
  $el.find('script, style, noscript').remove();
  $el.find('span, font').each((_, node) => {
    const $n = $(node);
    const bold = /font-weight:\s*(bold|[6-9]00)/.test($n.attr('style') ?? '');
    if (bold && $n.text().trim()) $n.replaceWith(`<strong>${$n.html()}</strong>`);
    else $n.replaceWith($n.html() ?? '');
  });
  $el.find('*').each((_, node) => {
    const keep = { a: ['href', 'target'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] }[node.tagName] ?? [];
    for (const attr of Object.keys(node.attribs ?? {})) {
      if (attr === 'nitro-lazy-src' && node.tagName === 'img') $(node).attr('src', node.attribs[attr]);
      if (!keep.includes(attr)) $(node).removeAttr(attr);
    }
  });
  $el.find('p').each((_, node) => {
    if (!$(node).text().trim() && !$(node).find('img').length) $(node).remove();
  });
  return localiseUrls(($el.html() ?? '').replace(/ /g, ' ').replace(/\s+\n/g, '\n').trim());
}

function iconOf($, $scope) {
  const svg = $scope.find('svg').first();
  if (svg.length) {
    svg.removeAttr('id').removeAttr('data-name');
    svg.find('[id]').removeAttr('id');
    return { svg: $.html(svg) };
  }
  const img = $scope.find('img').first();
  if (img.length) return { img: localiseUrl(img.attr('nitro-lazy-src') ?? img.attr('src') ?? '') };
  const i = $scope.find('i').first().attr('class');
  return i ? { fa: i } : undefined;
}

function headingHtml($, $h) {
  const $c = $h.clone();
  $c.find('.clr-red').each((_, n) => $(n).replaceWith(`<em>${$(n).html()?.trim()}</em>`));
  $c.find('.bg-letter').each((_, n) => $(n).replaceWith(`<mark>${$(n).html()?.trim()}</mark>`));
  $c.find('span').each((_, n) => {
    const style = ($(n).attr('style') ?? '').split(';').map((d) => d.trim())
      .filter((d) => /^(font-size|white-space|display|vertical-align)\s*:/.test(d)).join(';');
    if (/font-size|white-space/.test(style)) $(n).attr('data-style', style);
    else $(n).replaceWith($(n).html() ?? '');
  });
  $c.find('*').each((_, n) => {
    const style = n.attribs?.['data-style'];
    for (const attr of Object.keys(n.attribs ?? {})) if (attr !== 'href') $(n).removeAttr(attr);
    if (style) $(n).attr('style', style);
  });
  return localiseUrls(($c.html() ?? '').replace(/\s+/g, ' ').trim());
}

function convertWidget($, el, ctx) {
  const $el = $(el);
  const type = ($el.attr('data-widget_type') ?? '').replace(/\.default$/, '');
  const $c = $el.children('.elementor-widget-container');

  switch (type) {
    case 'heading': {
      const $h = $c.find('.elementor-heading-title').first();
      return { type, tag: $h.prop('tagName')?.toLowerCase() ?? 'h2', html: headingHtml($, $h), href: $h.find('a').attr('href') };
    }
    case 'text-editor':
      return { type: 'text', html: cleanHtml($, $c) };
    case 'button': {
      const $a = $c.find('a.elementor-button').first();
      const size = $a.attr('class')?.match(/elementor-size-(xs|sm|md|lg|xl)/)?.[1];
      const label = $a.text().replace(/\s+/g, ' ').trim();
      const popup = popupId($a.attr('href'));
      if (popup) {
        ctx.popups.add(popup);
        return { type, label, popup, size };
      }
      return { type, label, href: localiseUrl($a.attr('href')), size };
    }
    case 'image': {
      const $img = $c.find('img').first();
      const src = $img.attr('nitro-lazy-src') ?? $img.attr('data-src') ?? $img.attr('src') ?? '';
      if (!src || src.startsWith('data:')) return null;
      return {
        type,
        src: localiseUrl(src),
        alt: $img.attr('alt') ?? '',
        width: Number($img.attr('width')) || undefined,
        height: Number($img.attr('height')) || undefined,
        href: $c.find('a').attr('href') ? localiseUrl($c.find('a').attr('href')) : undefined,
      };
    }
    case 'icon':
      return { type, icon: iconOf($, $c), href: $c.find('a').attr('href') ? localiseUrl($c.find('a').attr('href')) : undefined };
    case 'icon-box': {
      const $link = $c.find('a').first();
      return {
        type,
        icon: iconOf($, $c.find('.elementor-icon-box-icon')),
        title: $c.find('.elementor-icon-box-title').text().replace(/\s+/g, ' ').trim(),
        text: cleanHtml($, $c.find('.elementor-icon-box-description')),
        href: $link.length ? localiseUrl($link.attr('href')) : undefined,
      };
    }
    case 'icon-list':
      return {
        type,
        items: $c.find('.elementor-icon-list-item').map((_, li) => {
          const $li = $(li);
          const href = $li.find('a').attr('href');
          return {
            text: $li.find('.elementor-icon-list-text').text().replace(/\s+/g, ' ').trim(),
            icon: iconOf($, $li.find('.elementor-icon-list-icon')),
            href: href ? localiseUrl(href) : undefined,
          };
        }).get(),
      };
    case 'ucaddon_uc_icon_accordion':
      return {
        type: 'accordion',
        items: $c.find('.uc_ac_box').map((_, box) => ({
          title: $(box).find('.ue_title').first().text().replace(/\s+/g, ' ').trim(),
          html: cleanHtml($, $(box).find('.uc_content').first()),
        })).get(),
      };
    case 'ucaddon_content_tabs': {
      const labels = $c.find('.uc_tab_nav a').map((_, a) => $(a).text().replace(/\s+/g, ' ').trim()).get();
      const panels = $c.find('.tab-container').map((_, panel) => [convertChildren($, $(panel).children().first(), ctx)]).get();
      return { type: 'tabs', tabs: labels.map((label, i) => ({ label, items: panels[i] ?? [] })) };
    }
    case 'loop-carousel.post': {
      const ids = new Set();
      $c.find('.e-loop-item').each((_, item) => {
        const m = ($(item).attr('class') ?? '').match(/e-loop-item-(\d+)/);
        if (m) ids.add(Number(m[1]));
      });
      return { type: 'posts', slugs: [...ids].map((id) => ctx.postSlug.get(id)).filter(Boolean) };
    }
    case 'form':
    case 'wpforms':
      return { type: 'form' };
    case 'html':
      return { type, html: localiseUrls($c.html()?.trim() ?? '') };
    case 'spacer':
    case 'divider':
      return { type };
    default:
      ctx.unknown.add(type);
      return { type: 'unknown', name: type, html: cleanHtml($, $c) };
  }
}

function convertNode($, el, ctx) {
  const $el = $(el);
  const cls = $el.attr('class') ?? '';
  const id = $el.attr('data-id');
  if (hidden(cls).length === 3) return null;
  const base = { id, hide: hidden(cls), cls: customClasses(cls), style: id ? styleOf(ctx.styles, id) : undefined };

  if ($el.is('section.elementor-section')) {
    const columns = $el.children('.elementor-container').children('.elementor-column').map((_, col) => {
      const $col = $(col);
      const colId = $col.attr('data-id');
      const colCls = $col.attr('class') ?? '';
      const fromClass = Number(colCls.match(/elementor-col-(\d+)/)?.[1] ?? 100);
      const fromCss = parseFloat(ctx.styles.get(colId)?.colWidth ?? '');
      if (hidden(colCls).length === 3) return null;
      return {
        id: colId,
        width: Number.isFinite(fromCss) ? fromCss : fromClass,
        hide: hidden(colCls),
        cls: customClasses(colCls),
        style: styleOf(ctx.styles, colId),
        items: convertChildren($, $col.children('.elementor-widget-wrap'), ctx),
      };
    }).get();
    return { type: 'section', inner: cls.includes('elementor-inner-section'), ...base, columns };
  }
  if ($el.is('.elementor-widget')) {
    const widget = convertWidget($, el, ctx);
    return widget && { ...base, ...widget };
  }
  if ($el.is('.elementor, .elementor-section-wrap')) {
    return convertChildren($, $el, ctx);
  }
  return null;
}

function convertChildren($, $parent, ctx) {
  return $parent.children().map((_, child) => {
    const out = convertNode($, child, ctx);
    return Array.isArray(out) ? out : out ? [out] : [];
  }).get().flat();
}

// NitroPack puts its <link> tags where cheerio reads them as text, so match the raw HTML.
export const stylesheetUrls = (html) =>
  [...new Set([...html.matchAll(/href=["'](https:[^"']+\.css)(?:\?[^"']*)?["']/g)].map((m) => m[1]))]
    .filter((href) => /combinedCss|elementor\/css/.test(href));

// "#elementor-action:action=popup:open&settings=<base64 {"id":"4667"}>" -> "4667"
function popupId(href = '') {
  const settings = decodeURIComponent(href).match(/action=popup:open&settings=([A-Za-z0-9+/=]+)/)?.[1];
  if (!settings) return undefined;
  try {
    return String(JSON.parse(Buffer.from(settings, 'base64').toString()).id);
  } catch {
    return undefined;
  }
}

export function convertPage(html, { postSlug, externalCss = '' }) {
  const $ = cheerio.load(html);
  const css = externalCss + '\n' + $('style').map((_, el) => $(el).text()).get().join('\n');
  const ctx = { styles: parseCss(css), postSlug, unknown: new Set(), popups: new Set() };
  const root = $('[data-elementor-type="wp-page"]').first();
  const sections = convertChildren($, root, ctx);
  const popups = {};
  for (const id of ctx.popups) {
    const $popup = $(`[data-elementor-type="popup"][data-elementor-id="${id}"]`).first();
    if ($popup.length) popups[id] = convertChildren($, $popup, ctx);
  }
  return { sections, popups, unknown: [...ctx.unknown] };
}
