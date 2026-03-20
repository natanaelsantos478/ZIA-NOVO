/**
 * ZIA Omnisystem — Cloudflare Worker
 *
 * Este worker serve os assets estáticos do build Vite e habilita o runtime
 * JavaScript no Cloudflare Workers, o que permite:
 *   - Configurar variáveis de ambiente e segredos (via wrangler secret / painel CF)
 *   - Adicionar lógica server-side futura (ex: proxy de API, auth, rate limiting)
 *
 * Os segredos configurados no Cloudflare ficam disponíveis via `env`:
 *   env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, etc.
 *
 * Nota: as variáveis VITE_* são injetadas no bundle pelo Vite em build time.
 * Para que o build use os valores corretos, eles devem estar disponíveis como
 * variáveis de ambiente no momento do `npm run build` (ex: GitHub Actions secrets).
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    return env.ASSETS.fetch(request);
  },
};
