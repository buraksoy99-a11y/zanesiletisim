const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const {renderToString} = require('react-dom/server');

(async () => {
  const dist = path.join(__dirname, 'dist');
  // Only generated files in this dedicated output directory are replaced.
  fs.rmSync(dist, {recursive: true, force: true});
  fs.mkdirSync(dist, {recursive: true});
  fs.cpSync(path.join(__dirname, 'public'), dist, {recursive: true});
  for (const file of ['favicon.svg', 'robots.txt', 'sitemap.xml']) {
    fs.copyFileSync(path.join(__dirname, file), path.join(dist, file));
  }

  const client = await esbuild.build({
    absWorkingDir: __dirname,
    entryPoints: {app: 'src/main.jsx'},
    outdir: 'dist',
    entryNames: 'assets/[name]-[hash]',
    bundle: true,
    external: ['/assets/*'],
    minify: true,
    metafile: true,
    sourcemap: false,
    define: {'process.env.NODE_ENV': '"production"'},
    logLevel: 'info',
  });

  // Publish complete HTML for crawlers and no-JavaScript visitors, then hydrate it.
  await esbuild.build({
    absWorkingDir: __dirname,
    entryPoints: ['src/App.jsx'],
    outfile: '.build/app.cjs',
    platform: 'node',
    format: 'cjs',
    bundle: true,
    external: ['react', 'react-dom'],
    define: {'process.env.NODE_ENV': '"production"'},
  });
  const App = require('./.build/app.cjs').default;
  const rendered = renderToString(React.createElement(App));
  const [jsPath, jsMetadata] = Object.entries(client.metafile.outputs).find(([,meta]) => meta.entryPoint === 'src/main.jsx');
  const assetUrl = file => '/' + path.relative(dist, path.resolve(__dirname, file)).split(path.sep).join('/');
  const js = assetUrl(jsPath);
  const css = assetUrl(jsMetadata.cssBundle);
  const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const html = template
    .replace('<!--app-html-->', rendered)
    .replace('<!--app-css-->', `<link rel="stylesheet" href="${css}">`)
    .replace('<!--app-script-->', `<script defer src="${js}"></script>`);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  const headers = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '/',
    '  Cache-Control: public, max-age=0, must-revalidate',
    js,
    '  Cache-Control: public, max-age=31536000, immutable',
    css,
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join(String.fromCharCode(10));
  fs.writeFileSync(path.join(dist, '_headers'), headers);
  console.log(`Prerendered ${rendered.length} characters; fingerprinted JS and CSS are ready.`);
})().catch(error => {console.error(error); process.exitCode = 1;});
