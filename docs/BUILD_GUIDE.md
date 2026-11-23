# Nava Wilson Website: Build Guide

Rebuilding navawilson.law (WordPress + Elementor on Cloudways) as an Astro static site, following the same approach as prcoach.ca.
This file is the progress log and the record of decisions. Page content lives in `src/content/` (imported from WordPress), not here.

**Decisions**
- Separate repo, owned by saru29 next to the iClosed repos.
- Astro 7 on Node 22 (`.nvmrc`). Plain CSS with variables, zero JS except analytics and the two embedded forms.
- Colours stay as on the live site: red `#ce2028`, dark grey `#434141`, pale lavender panels `#f1f1fa`, white. Spacing and layout can be tidied.
- All 61 blog posts move over at their existing URLs (search traffic).
- Wills & Estate Questionnaire (WPForms, file uploads, sensitive data): a placeholder page with call/email for now. A secure destination (likely an iClosed intake) must be chosen before the domain switch.
- Hosting: to decide before the domain switch.

---

## Progress

| Step | What | Status |
|---|---|---|
| 1 | Create Astro project (Node 22, sitemap) | ✅ |
| 2 | Inventory the live site (sitemap, REST API, forms, design tokens) | ✅ |
| 3 | Import script: posts, pages, team, images from the WordPress API | ✅ |
| 4 | Layout, header (Practice Areas dropdown), footer, homepage | ✅ |
| 5 | Blog index, posts, categories, legal pages, About, Contact, team, 404, redirects | ✅ |
| 6 | Practice-area pages: rebuild the Elementor layouts (tabs, step timelines, FAQs) as components | ⏳ next |
| 7 | Contact form service (Web3Forms key for info@navawilson.law) | ⏳ |
| 8 | Wills questionnaire destination | ⏳ needs decision |
| 9 | GitHub repo under saru29, hosting, DNS switch (name.com) | ⏳ |

---

## Step 2: Inventory of the live site

- `navawilson.law` (no www; `www` 301s to the apex). DNS at **name.com**, A record `155.138.136.125` (Cloudways). Email is Google Workspace (MX records must not change).
- Yoast sitemap `sitemap_index.xml`: 61 posts, 33 pages, 5 team URLs, 7 categories, 21 tags, 2 authors.
- WordPress REST API is public (`/wp-json/wp/v2/...`), so content is exported rather than scraped.
- Theme: Hello Elementor + Elementor Pro, Unlimited Elements, NitroPack (CDN `cdn-ilaehol.nitrocdn.com`).
- Analytics: Google Tag Manager `GTM-M6H6DWP` (kept, production builds only) and a LinkedIn Insight pixel (not carried over; GTM can load it).

**Forms on the live site**

| Page | Form | New site |
|---|---|---|
| Home, About, Contact, Get Started Today | Elementor form (name, email, phone, service, referral, message) | `ContactForm.astro` posting to Web3Forms. Shows call/email buttons until `WEB3FORMS_ACCESS_KEY` is set |
| `/wills-and-estates/wills-and-estate-questionnaire/` | WPForms #5731, long, with file uploads | Placeholder page (see Decisions) |
| `/nava-wilson-pc-pr-assessment/` | PR Coach iframe (`partner_id=2007`) | Same iframe, resize listener checks the origin |
| `/adult-guardianship-intake/` | Fillout embed `pMicjSmwfLus` | Same embed |

**Not carried over**: `/home-copy/` (Elementor leftover), `/category/uncategorized/`, the 21 `/tag/*` pages, date archives. They'll return the 404 page.

## Step 3: Import script

`npm run import:wp` (`scripts/import-wordpress.mjs`) fetches posts, pages, team, categories and media from the API and writes:

- `src/content/blog/<slug>.md`: title, Yoast SEO title and description, date, categories, featured image, body
- `src/content/pages/<path>.md`: practice-area and legal pages (`kind: service | legal`)
- `src/content/team/<slug>.md`: name, role, photo, bio
- `public/wp-content/uploads/...`: only images the content references, at their original paths, so old image URLs keep working

It's re-runnable and overwrites those files, so **edit content only after the final import**, or stop running it.

How it cleans Elementor HTML: Turndown converts HTML to Markdown; scripts, styles, SVG icons and forms are dropped; bold spans stay bold; tab navigation lists and date-archive links are removed; the first `<h1>` becomes `heading` in the frontmatter; links to `navawilson.law` become relative, and old URLs are rewritten using `src/data/redirects.mjs`.

Dates are WordPress local times written with a `Z` suffix and formatted in UTC, so the site shows the same day as WordPress on any build machine.

## Steps 4–5: Site structure

| Path | Purpose |
|---|---|
| `src/data/site.ts` | Phone, address, nav, footer links, socials, GTM ID, Web3Forms key |
| `src/data/redirects.mjs` | Old URLs that 301 on WordPress; used by `astro.config.mjs` and the import |
| `src/layouts/BaseLayout.astro` | `<head>`, SEO, Open Graph, Poppins, GTM |
| `src/components/Header.astro` | Practice Areas dropdown (`<details>`, no JS), hamburger under 1024px |
| `src/components/home/*` | Hero, Services, About, Insights (latest 3 posts), Testimonials (scroll-snap, no JS) |
| `src/pages/[...slug].astro` | Every blog post and imported page, at the WordPress URL |
| `src/pages/blogs/`, `category/[slug]` | Blog index and the 6 category pages |
| `src/pages/our-team/[slug].astro` | Team bios (`/our-team/` redirects to About) |

**Checked**: 105 pages build; every internal link and image resolves; every live sitemap URL exists, except those listed as not carried over; post dates match the live site.

**Redirects**: Astro writes a small redirect page for each entry in `redirects`. Configure real 301s on the host too once hosting is chosen.

## Open questions for the firm

- Firm name: the logo and footer say "Nava Wilson PC / Professional Corporation", but the About text, reviews and team bios say "Nava Wilson LLP". Which is current?
- Team bios are cut off ("…") on the live site too. Are full bios available?
- Testimonial typo fixed: "guide ne" → "guide me".
- `/litigation-lawyerss/` has a double "s" in its URL. Keep it (it's indexed) or rename with a redirect?
