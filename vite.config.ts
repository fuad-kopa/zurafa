import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes sw.js at build time: the app shell (hashed bundles, icons, carved pieces, piece photos) is
 * precached so games against the computer work offline; videos and music stay network-only.
 */
function serviceWorker(): Plugin {
  const PUBLIC_PRECACHE = [/^favicon\.svg$/, /^manifest\.webmanifest$/, /^img\/icon-(192|512)\.png$/, /^img\/p-[^/]+\.jpg$/, /^img\/m-[^/]+\.jpg$/, /^carved\/[^/]+\.png$/];
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
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const pub = listPublic('public').filter((f) => PUBLIC_PRECACHE.some((re) => re.test(f.path)));
      const files = ['./', ...built.map((f) => './' + f), ...pub.map((f) => './' + f.path)];
      const version = createHash('sha1').update(files.join('\n') + pub.map((f) => f.size).join(',')).digest('hex').slice(0, 10);
      const template = readFileSync('src/sw-template.js', 'utf8');
      const source = template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Relative base: the build can be dropped on any static host, including a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022' },
  plugins: [serviceWorker()],
});
