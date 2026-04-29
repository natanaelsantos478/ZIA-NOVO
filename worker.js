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

    // Raiz "/" → landing page (verificar ANTES dos assets — o SPA handler retorna index.html com 200 para "/" e nunca chegaria aqui)
    if (pathname === '/' || pathname === '') {
      const homeRequest = new Request(new URL('/home.html', url.origin), request);
      const res = await env.ASSETS.fetch(homeRequest);
      const newRes = new Response(res.body, res);
      newRes.headers.set('Cache-Control', 'no-store, must-revalidate');
      return newRes;
    }

    // Arquivos estáticos (.js, .css, imagens, fontes, etc.) → serve diretamente
    const assetResponse = await env.ASSETS.fetch(request).catch(() => null);
    if (assetResponse && assetResponse.status !== 404) {
      return assetResponse;
    }

    // Tudo mais (/app, /app/*, /admin, /vagas, /privacidade, /oauth/*, etc.) → SPA React
    const indexRequest = new Request(new URL('/index.html', url.origin), request);
    return env.ASSETS.fetch(indexRequest);
  },
};
