// ─────────────────────────────────────────────────────────────────────────────
// useZitaIA — Hook do agente IA com autenticação multi-tenant segura
// O token é enviado via header X-Zita-Token (nunca no body).
// O servidor extrai e valida o tenant_id — o frontend não precisa conhecê-lo.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAuthToken, clearAuthToken } from '../lib/auth';

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'}/functions/v1/zita-ia-agent`;

export interface MensagemIA {
  role: 'user' | 'assistant';
  content: string;
  acoes?: AcaoExecutada[];
  erro?: boolean;
}

export interface AcaoExecutada {
  ferramenta: string;
  args?: Record<string, unknown>;
  resultado?: unknown;
  status: 'sucesso' | 'erro';
}

// ── Helpers de token ──────────────────────────────────────────────────────────
// O JWT assinado é gerenciado por lib/auth.ts (sessionStorage).
// Estas funções mantêm a interface pública para compatibilidade.

// Chamada após login — sem ação necessária (JWT já salvo pelo fluxo de autenticação)
export function salvarTokenIA(_perfilId: string, _entityId: string, _entityType: string): void {
  // no-op: o JWT de zia-auth já está em sessionStorage via setAuthToken()
}

export function limparTokenIA(): void {
  clearAuthToken();
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  try { return JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4))); }
  catch { return {}; }
}

function lerTokenIA(): string | null {
  return getAuthToken();
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useZitaIA() {
  const [loading, setLoading]     = useState(false);
  const [historico, setHistorico] = useState<MensagemIA[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [erro, setErro]           = useState<string | null>(null);

  async function enviarMensagem(mensagem: string, contextoPagina?: string): Promise<void> {
    const token = lerTokenIA();
    if (!token) {
      setErro('Sessão não encontrada. Faça login novamente.');
      return;
    }

    setErro(null);
    setLoading(true);
    setHistorico(prev => [...prev, { role: 'user', content: mensagem }]);

    try {
      // Criar conversa no banco se ainda não existe
      let cId = conversaId;
      if (!cId) {
        try {
          const claims = decodeJwtPayload(token);
          const meta = (claims.app_metadata ?? {}) as { profile_id?: string; entity_id?: string };
          const { data } = await supabase.from('ia_conversas').insert({
            tenant_id:  meta.entity_id ?? '',
            usuario_id: meta.profile_id ?? '',
            titulo:     mensagem.slice(0, 60),
            ativa:      true,
          }).select('id').single();
          if (data?.id) {
            cId = data.id as string;
            setConversaId(cId);
          }
        } catch { /* tabela pode não existir ainda */ }
      }

      const res = await fetch(AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-zita-token':  token, // ← token no header, nunca no body
        },
        body: JSON.stringify({
          mensagem,
          historico: historico.map(m => ({ role: m.role, content: m.content })),
          conversa_id:     cId,
          contexto_pagina: contextoPagina,
          // tenant_id NÃO é enviado — servidor extrai do token
        }),
      });

      if (res.status === 401) {
        limparTokenIA();
        setErro('Sessão expirada. Faça login novamente.');
        setHistorico(prev => prev.slice(0, -1)); // remove a mensagem que acabou de enviar
        return;
      }

      const data = await res.json() as {
        resposta?: string;
        acoes_executadas?: AcaoExecutada[];
        erro?: string;
      };

      if (data.erro) throw new Error(data.erro);

      const mensagemAssistente: MensagemIA = {
        role:    'assistant',
        content: data.resposta ?? '',
        acoes:   data.acoes_executadas?.length ? data.acoes_executadas : undefined,
      };

      setHistorico(prev => [...prev, mensagemAssistente]);

      // Disparar evento para recarregar telas afetadas pelas ações
      if (data.acoes_executadas?.length) {
        for (const acao of data.acoes_executadas) {
          const tabela = (acao.args as Record<string, unknown> | undefined)?.tabela as string | undefined;
          if (tabela) {
            window.dispatchEvent(new CustomEvent('ia-dados-atualizados', { detail: { tabela } }));
          }
        }
      }
    } catch (err) {
      const msg = (err as Error).message ?? 'Erro desconhecido';
      setErro(msg);
      setHistorico(prev => [...prev, { role: 'assistant', content: `❌ ${msg}`, erro: true }]);
    } finally {
      setLoading(false);
    }
  }

  function novaConversa(): void {
    setConversaId(null);
    setHistorico([]);
    setErro(null);
  }

  return {
    enviarMensagem,
    loading,
    historico,
    novaConversa,
    conversaId,
    erro,
    tokenValido: !!lerTokenIA(),
  };
}
