// ─────────────────────────────────────────────────────────────────────────────
// GoogleOAuthCallback — rota /oauth/google/callback
//
// Recebe ?code=...&state=... do Google, chama a Edge Function
// google-oauth-callback para trocar o code por tokens, e posta o resultado
// para a janela pai (window.opener) via postMessage.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTenantId } from '../lib/auth';

export default function GoogleOAuthCallback() {
  const [status, setStatus] = useState<'processando' | 'sucesso' | 'erro'>('processando');
  const [mensagem, setMensagem] = useState('Trocando código de autorização por tokens...');

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const code  = qs.get('code');
        const error = qs.get('error');
        if (error) throw new Error(`Google retornou erro: ${error}`);
        if (!code) throw new Error('Sem code na URL.');

        const tenantId = await getTenantId();
        if (!tenantId) throw new Error('Sem tenant_id na sessão.');

        const redirectUri = `${window.location.origin}/oauth/google/callback`;
        const { data, error: fnErr } = await supabase.functions.invoke('google-oauth-callback', {
          body: { code, redirect_uri: redirectUri, tenant_id: tenantId },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error ?? 'Falha desconhecida');

        setStatus('sucesso');
        setMensagem(`Conta conectada: ${data.email}`);
        try {
          window.opener?.postMessage({ type: 'google-oauth-result', ok: true, email: data.email }, '*');
        } catch { /* noop */ }
        setTimeout(() => { try { window.close(); } catch { /* noop */ } }, 1500);
      } catch (e) {
        setStatus('erro');
        setMensagem(String(e));
        try {
          window.opener?.postMessage({ type: 'google-oauth-result', ok: false, error: String(e) }, '*');
        } catch { /* noop */ }
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">
          {status === 'processando' && 'Conectando Google…'}
          {status === 'sucesso'     && 'Sucesso!'}
          {status === 'erro'        && 'Erro na conexão'}
        </h1>
        <p className="text-sm text-slate-400">{mensagem}</p>
        {status === 'sucesso' && <p className="text-xs text-slate-500">Esta janela fechará automaticamente.</p>}
        {status === 'erro'    && <p className="text-xs text-slate-500">Você pode fechar esta janela e tentar novamente.</p>}
      </div>
    </div>
  );
}
