import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import path from 'path';
import fs from 'fs';

function getVersionFromPython(): string {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  return pkg.version || '0.0.0';
}

const isMt = process.env.MJSWAN_MT === '1';
const isDebug = process.env.MJSWAN_DEBUG === '1';
const coiSwPath = path.resolve(__dirname, '_mt/coi-serviceworker.js');
const ortDistDir = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist');

function ortPlugin(): Plugin {
  return {
    name: 'mjswan-ort',
    configureServer(server) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const urlPath = (req.url || '').split('?')[0].replace(/^\/+/, '');
        const filePath = path.join(ortDistDir, urlPath);
        if (!filePath.startsWith(ortDistDir) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        const ext = path.extname(filePath);
        const type =
          ext === '.wasm' ? 'application/wasm' :
          ext === '.mjs' ? 'application/javascript' :
          'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        fs.createReadStream(filePath).pipe(res);
      });
    },
    generateBundle() {
      for (const file of fs.readdirSync(ortDistDir)) {
        if (!/\.(wasm|mjs)$/.test(file)) continue;
        this.emitFile({
          type: 'asset',
          fileName: `ort/${file}`,
          source: fs.readFileSync(path.join(ortDistDir, file)),
        });
      }
    },
  };
}

function mtPlugin(enabled: boolean): Plugin | null {
  if (!enabled) return null;
  return {
    name: 'mjswan-mt',
    configureServer(server) {
      // Serve the SW file during `vite dev` so the browser can register it.
      server.middlewares.use('/coi-serviceworker.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(fs.readFileSync(coiSwPath, 'utf-8'));
      });
    },
    generateBundle() {
      // Emit the SW file only when building the mt variant.
      this.emitFile({
        type: 'asset',
        fileName: 'coi-serviceworker.js',
        source: fs.readFileSync(coiSwPath, 'utf-8'),
      });
    },
    transformIndexHtml(html: string) {
      // Register the COOP/COEP service worker early in <head>.
      // Required for GitHub Pages hosting (cannot set response headers).
      // On Netlify / Cloudflare Pages / Vercel the _headers file is used instead.
      const swScript =
        `<script>\n` +
        `    /* Register COOP/COEP service worker — required for GitHub Pages hosting */\n` +
        `    if (!window.crossOriginIsolated && 'serviceWorker' in navigator) {\n` +
        `      document.documentElement.style.display = 'none';\n` +
        `      navigator.serviceWorker.register('coi-serviceworker.js').then(function() {\n` +
        `        window.location.reload();\n` +
        `      });\n` +
        `    }\n` +
        `  </script>`;
      return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n  ${swScript}`);
    },
  };
}

function gtmPlugin(gtmId: string | undefined) {
  if (!gtmId) return null;
  return {
    name: 'mjswan-gtm',
    transformIndexHtml(html: string) {
      const headScript =
        `<!-- Google Tag Manager -->\n` +
        `    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n` +
        `    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n` +
        `    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n` +
        `    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n` +
        `    })(window,document,'script','dataLayer','${gtmId}');</script>\n` +
        `    <!-- End Google Tag Manager -->`;
      const bodyNoscript =
        `<!-- Google Tag Manager (noscript) -->\n` +
        `    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"\n` +
        `    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n` +
        `    <!-- End Google Tag Manager -->`;
      return html
        .replace('</head>', `    ${headScript}\n  </head>`)
        .replace('<body>', `<body>\n    ${bodyNoscript}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), mtPlugin(isMt), ortPlugin(), gtmPlugin(process.env.MJSWAN_GTM_ID)],
  esbuild: {
    drop: isDebug ? [] : ['console', 'debugger'],
  },
  base: process.env.MJSWAN_BASE_PATH || '/',
  define: {
    __APP_VERSION__: JSON.stringify(getVersionFromPython()),
    __MUJOCO_MT__: JSON.stringify(isMt),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['mujoco', 'mujoco/mt'],
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 8000,
    host: true,
    headers: isMt ? {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    } : {},
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 11000,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      onwarn(warning, warn) {
        // mujoco.js is an Emscripten-generated file that imports Node.js built-ins
        // (module, worker_threads) behind runtime environment checks that are never
        // reached in the browser.  Suppress the harmless externalization warnings.
        if (
          warning.message.includes('mujoco') &&
          warning.message.includes('externalized for browser compatibility')
        ) return;
        warn(warning);
      },
    },
  },
  worker: {
    format: 'es',
  },
});
