# navawilson.law

Static Astro site for Nava Wilson PC, replacing the WordPress site.

```sh
npm install
npm run dev         # http://localhost:4321
npm run build       # static site in dist/
npm run preview     # serve dist/
npm run import:wp   # re-import content from the live WordPress API (overwrites src/content)
```

Requires Node 22 (`.nvmrc`). Progress, decisions and open questions: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md).
