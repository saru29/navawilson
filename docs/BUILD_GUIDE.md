# Nava Wilson Website: Build Guide

Rebuilding navawilson.law (WordPress + Elementor on Cloudways) as an Astro static site, following the same approach as prcoach.ca.
This file is the progress log and the record of decisions. Page content lives in `src/content/` (imported from WordPress), not here.

**Decisions**
- **Convert the site as it is.** Same content, wording, layout and colours as the live site. Small style tweaks (spacing, polish) are fine and listed under Step 6. Anything that looks wrong goes in "Questions for the consultant" below instead of being changed. That list becomes a document for the consultant at the end.
- Separate repo, owned by saru29 next to the iClosed repos.
- Astro 7 on Node 22 (`.nvmrc`). Plain CSS with variables. JS only where the live site has interaction (carousels), plus analytics and the two embedded forms.
- All 61 blog posts move over at their existing URLs.
- Wills & Estate Questionnaire (WPForms, file uploads, sensitive data): placeholder page with call/email until a secure destination is chosen.
- Hosting: decide before the domain switch.

---

## Progress

| Step | What | Status |
|---|---|---|
| 1 | Create Astro project (Node 22, sitemap) | ✅ |
| 2 | Inventory the live site (sitemap, REST API, forms, design tokens) | ✅ |
| 3 | Import script: posts, text pages, team, images | ✅ |
| 4 | Layout, header (Practice Areas dropdown), footer, homepage | ✅ |
| 5 | Blog index, posts, categories, team, legal pages, 404, redirects | ✅ |
| 6 | Elementor converter: 22 practice-area/About/Contact pages rebuilt from their live layout | ✅ |
| 7 | Contact form service (Web3Forms key for info@navawilson.law) | ⏳ |
| 8 | Wills questionnaire destination | ⏳ needs decision |
| 9 | Consultant document from the questions list | ⏳ at the end |
| 10 | GitHub repo under saru29, hosting, DNS switch (name.com) | ⏳ |

---

## Step 2: Inventory of the live site

- `navawilson.law` (no www; `www` 301s to the apex). DNS at **name.com**, A record `155.138.136.125` (Cloudways). Email is Google Workspace (MX records must not change).
- Yoast sitemap `sitemap_index.xml`: 61 posts, 33 pages, 5 team URLs, 7 categories, 21 tags, 2 authors.
- WordPress REST API is public (`/wp-json/wp/v2/...`), so content is exported rather than scraped.
- Theme: Hello Elementor + Elementor Pro, Unlimited Elements, NitroPack (CDN `cdn-ilaehol.nitrocdn.com`).
- Analytics: Google Tag Manager `GTM-M6H6DWP` (kept, production builds only).

**Forms on the live site**

| Page | Form | New site |
|---|---|---|
| Home, About, Contact, Get Started Today, some practice pages | Elementor form (name, email, phone, service, referral, message) | `ContactForm.astro` posting to Web3Forms. Shows call/email buttons until `WEB3FORMS_ACCESS_KEY` is set |
| `/wills-and-estates/wills-and-estate-questionnaire/` | WPForms #5731, long, with file uploads | Placeholder page |
| `/nava-wilson-pc-pr-assessment/` | PR Coach iframe (`partner_id=2007`) | Same iframe |
| `/adult-guardianship-intake/` | Fillout embed `pMicjSmwfLus` | Same embed |

**Not carried over**: `/home-copy/`, `/category/uncategorized/`, the 21 `/tag/*` pages, date archives. They return the 404 page.

## Step 3: Import script

`npm run import:wp` (`scripts/import-wordpress.mjs`) writes:

- `src/content/blog/<slug>.md`: posts (Turndown HTML → Markdown)
- `src/content/pages/<path>.md`: text-only pages (legal pages, real estate glossary)
- `src/content/layouts/<path>.json`: Elementor pages, via the converter (Step 6)
- `src/content/team/<slug>.md`: team bios
- `public/wp-content/uploads/...`: only the images the content references, at their original paths

It's re-runnable and overwrites those files, so **edit content only after the final import**, or stop running it.

Dates are WordPress local times written with a `Z` suffix and formatted in UTC, so the site shows the same day as WordPress.

## Steps 4–5: Site structure

| Path | Purpose |
|---|---|
| `src/data/site.ts` | Phone, address, nav, footer links, socials, GTM ID, Web3Forms key |
| `src/data/redirects.mjs` | Old URLs that 301 on WordPress; used by `astro.config.mjs` and the import |
| `src/components/Header.astro` | Practice Areas dropdown (`<details>`), hamburger under 1024px |
| `src/components/home/*` | Homepage sections, hand-built to match the live homepage |
| `src/components/PostCarousel.astro` | "Featured Insights" carousel (homepage and practice pages) |
| `src/pages/[...slug].astro` | Every post, text page and Elementor page, at its WordPress URL |

## Step 6: Elementor converter

`scripts/lib/elementor.mjs` turns each live Elementor page into JSON, and `src/components/elementor/Blocks.astro` renders it with `src/styles/elementor.css`.

- **Input**: the live rendered page, plus NitroPack's combined stylesheets. Tab panels embed other Elementor templates, which aren't in the API content.
- **Structure**: section → columns (width %) → widgets, recursively. Elements hidden on every device are dropped (e.g. the lorem-ipsum "Closing Cost Calculation" blocks).
- **Widgets**: heading, text, button, image, icon, icon box, icon list, accordion (FAQ and plain), tabs, posts carousel, form, HTML.
- **Styles read from Elementor's per-element CSS**: backgrounds and gradients, radius, padding, borders, alignment, heading sizes and colours, icon sizes and colours, widget widths, absolute positions, column alignment.
- **Layout model**: like Elementor, a column is a flex-wrap row of widgets with 10px padding. Widgets are full width unless Elementor gave them a width, which is how icon + heading sit side by side.
- **Tabs** use radio inputs and accordions use `<details>`, so neither needs JS.

**Checked**: desktop compared side by side with the live pages (Buying, Real Estate Lawyers, Landlord and Tenant Board, Wills and Estates, Corporate Lawyers, Start a New Business, About, Contact); phone width checked; 105 pages build; no broken internal links; every live sitemap URL exists except those listed as not carried over.

- **Buttons** use Elementor's defaults and size presets (`elementor-size-md` etc.), overridden by each button's own CSS.
- **Widths** follow Elementor's boxed container: 1140px rows, so widgets are 1120px wide, as on live.
- Some pages (the Wills sub-pages) aren't served through NitroPack and link their CSS with single quotes and `?ver=`; the importer handles both.

**Checked again (Nov 23)**: all 18 pages in the Practice Areas menu measured against live in a browser (heading sizes and heights, button size and radius, content width). Phone width has no sideways scroll.

**Known gaps**: on phones the "Why Choose Us" timeline dots are hidden. Elementor uses separate mobile offsets, which the converter doesn't read.

**Deliberate differences from live** (style only; content and colours unchanged):
- Tighter spacing everywhere (Nov 23, requested): Elementor's percentage paddings are capped (hero 56/64px, sections 24px), homepage sections 48px apart, smaller gaps around cards, carousel and footer.
- Homepage hero has no red dots; service cards have a soft shadow and lift on hover; review arrows and "View All" sit beside the quote mark.
- The General Will & POA Planning heading scrolls sideways on phones on the live site; the new site lets it wrap.

---

## Questions for the consultant

Collected while converting. The site copies the live version in each case; nothing here has been changed.

**Content**
1. Firm name: the logo and footer say "Nava Wilson PC / Professional Corporation", but the About page, reviews and team bios say "Nava Wilson LLP". Which is current?
2. Team bios are cut off ("…") on the live site. Are full bios available?
3. The About page shows 2 of the 4 team members. Malliha Wilson and Sutharsan Vasanthan have bio pages but aren't listed. Intended?
4. The homepage lists four service areas. Immigration is hidden there and missing from the menu, though it has its own page. Intended?
5. The Immigration page links to libertasimmigration.ca (14 links) for family sponsorship, work, study and visit pages. Is that a partner firm, and should those links stay?
6. Typos on the live site: a review says "guide ne through" ("me"); the contact form label says "Service Requried"; the Real Estate Law page's internal title is "Real State Law Service".
7. `/litigation-lawyerss/` has a double "s" in its URL. Keep it (it's indexed) or rename with a redirect?
8. There's no copyright line in the live footer. Add one?
9. The Wills and Estates column in the Practice Areas menu is empty on the live site. The new site lists the three existing Wills pages under it (General Will & POA Planning, Will & POA for Couples, High-Income / Legacy Estate Planning). OK?

**Forms and integrations**
10. Contact form: who should receive enquiries (info@navawilson.law?). We need a form service key (Web3Forms, free) for that address.
11. Wills & Estate Questionnaire: it collects sensitive details and file uploads. Where should it go now: an iClosed intake, a secure form service, or email only?
12. The reviews "View All" button opens a Google search. Is there a Google Business Profile link to use instead?
13. Analytics: GTM `GTM-M6H6DWP` is kept. The live site also loads a LinkedIn Insight pixel. Still needed? It can be added through GTM.

**Pages not carried over** (they'll return "page not found")
14. `/home-copy/` (an old draft of the homepage), `/category/uncategorized/` and the 21 tag pages (`/tag/...`). OK to drop?
