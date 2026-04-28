/**
 * ZIA Omnisystem — Cloudflare Worker
 *
 *   /          → home.html  (landing page pública)
 *   /app*      → index.html (SPA React — login + módulos)
 *   /admin*    → index.html
 *   assets     → servidos diretamente (JS, CSS, imagens)
 *   qualquer outra rota → index.html (SPA fallback)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Arquivos estáticos (.js, .css, imagens, fontes, etc.) → serve diretamente
    const assetResponse = await env.ASSETS.fetch(request).catch(() => null);
    if (assetResponse && assetResponse.status !== 404) {
      return assetResponse;
    }

    // Raiz "/" → landing page
    if (pathname === '/' || pathname === '') {
      const homeRequest = new Request(new URL('/home.html', url.origin), request);
      return env.ASSETS.fetch(homeRequest);
    }

    // Tudo mais (/app, /app/*, /admin, /vagas, /privacidade, /oauth/*, etc.) → SPA React
    const indexRequest = new Request(new URL('/index.html', url.origin), request);
    return env.ASSETS.fetch(indexRequest);
  },
};
