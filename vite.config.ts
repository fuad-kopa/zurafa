import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { staticPages, sitemap, ROBOTS } from './scripts/static-pages';

/**
 * Writes sw.js at build time: the app shell (hashed bundles, fonts, icons) is precached so games against the
 * computer work offline. Pictures (carved pieces, piece photos) are not precached: every new visitor would pay
 * ~2.6 MB for them up front; they are cached as they are first shown instead, so after one game the board works
 * offline all the same. Videos and music stay network-only; the encyclopedia texts of the other languages and
 * the accounts library load only for those who use them.
 */
function serviceWorker(): Plugin {
  const PUBLIC_PRECACHE = [/^favicon\.svg$/, /^manifest\.webmanifest$/, /^img\/icon-(192|512)\.png$/];
  const SKIP_BUILT = [/^assets\/(uz|tr|zh|hi)-[^/]+\.js$/, /^assets\/dist-[^/]+\.js$/];
  const listPublic = (dir: string, prefix = ''): { path: string; size: number }[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      const rel = prefix + name;
      return statSync(full).isDirectory() ? listPublic(full, rel + '/') : [{ path: rel, size: statSync(full).size }];
    });
  return {
    name: 'zurafa-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle).filter((f) => !/\.(map|html|xml|txt)$/.test(f) && !SKIP_BUILT.some((re) => re.test(f)));
      const pub = listPublic('public').filter((f) => PUBLIC_PRECACHE.some((re) => re.test(f.path)));
      const files = ['./', ...built.map((f) => './' + f), ...pub.map((f) => './' + f.path)];
      const version = createHash('sha1').update(files.join('\n') + pub.map((f) => f.size).join(',')).digest('hex').slice(0, 10);
      const template = readFileSync('src/sw-template.js', 'utf8');
      const source = template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/** Crawlable encyclopedia and rules pages, a sitemap and robots.txt (see scripts/static-pages.ts). */
function seoPages(): Plugin {
  return {
    name: 'zurafa-seo',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const font = (re: RegExp): string => Object.keys(bundle).find((f) => re.test(f)) ?? '';
      const pages = staticPages({ serif: font(/piazzolla-(?!italic)[^/]*\.woff2$/), serifItalic: font(/piazzolla-italic-[^/]*\.woff2$/), sans: font(/ysabeau-office-[^/]*\.woff2$/) });
      for (const p of pages) this.emitFile({ type: 'asset', fileName: p.path, source: p.html });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages, new Date().toISOString().slice(0, 10)) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: ROBOTS });
    },
  };
}

// Relative base: the build can be dropped on any static host, including a GitHub Pages sub-path.
export default defineConfig({
  // build date, sent with feedback so a report can be matched to a release
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022' },
  plugins: [serviceWorker(), seoPages()],
});
