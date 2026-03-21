/**
 * ZIA Omnisystem — Cloudflare Worker
 *
 * Replica exatamente o comportamento do Vercel:
 *   - Arquivos estáticos (.js, .css, imagens) → servidos diretamente
 *   - Qualquer outra rota → index.html com status 200 (SPA routing)
 *
 * Isso resolve o problema de rotas como /app/backoffice, /app/ia, /app/docs
 * que no Cloudflare não abriam mas no Vercel funcionavam normalmente.
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Tenta servir o arquivo estático primeiro
    const assetResponse = await env.ASSETS.fetch(request).catch(() => null);

    // Se encontrou o arquivo (JS, CSS, imagens, etc.) → serve diretamente
    if (assetResponse && assetResponse.status !== 404) {
      return assetResponse;
    }

    // Qualquer rota que não existe como arquivo → serve index.html (SPA)
    // Replica o comportamento do vercel.json: { "source": "/(.*)", "destination": "/index.html" }
    const indexRequest = new Request(new URL('/index.html', url.origin), request);
    return env.ASSETS.fetch(indexRequest);
  },
};
