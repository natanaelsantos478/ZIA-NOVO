// ─────────────────────────────────────────────────────────────────────────────
// conectores.ts — Suporte ao card conector_externo_saida nos runners IA
//
// Carrega conectores de saída ativos do agente, expõe a tool
// chamar_webhook_externo e gera bloco de prompt com conectores disponíveis.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConectorSaida {
  id: string;
  nome: string;
  descricao: string;
  target_url: string;
  method: string;           // GET | POST | PUT | PATCH | DELETE
  headers_raw: string;      // "Key: Value\nKey2: Value2"
  content_type: string;     // application/json | application/x-www-form-urlencoded
}

/**
 * Carrega todos os conectores de saída ativos ligados ao agente.
 * Retorna array vazio se nenhum card conectado.
 */
// deno-lint-ignore no-explicit-any
export async function loadConectoresSaida(sb: any, agentId: string): Promise<ConectorSaida[]> {
  const { data } = await sb
    .from('ia_agent_cards')
    .select('ia_cards(id, tipo, config, ativo, nome)')
    .eq('agente_id', agentId);

  const cards = (data ?? [])
    // deno-lint-ignore no-explicit-any
    .map((r: any) => r.ia_cards)
    // deno-lint-ignore no-explicit-any
    .filter((c: any) => c?.tipo === 'conector_externo_saida' && c?.ativo === true);

  // deno-lint-ignore no-explicit-any
  return cards.map((c: any) => {
    const cfg = c.config ?? {};
    const url: string = cfg.target_url ?? '';
    if (!url.startsWith('https://') && !url.startsWith('http://')) return null;
    return {
      id:           c.id,
      nome:         c.nome ?? cfg.nome ?? 'Conector',
      descricao:    cfg.descricao ?? '',
      target_url:   url,
      method:       (cfg.method ?? 'POST').toUpperCase(),
      headers_raw:  cfg.headers ?? '',
      content_type: cfg.content_type ?? 'application/json',
    } satisfies ConectorSaida;
  // deno-lint-ignore no-explicit-any
  }).filter(Boolean) as any[];
}

/**
 * Converte string "Key: Value\nKey2: Value2" em objeto de headers.
 */
export function parseHeaders(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

/**
 * Executa uma chamada de webhook para um conector de saída.
 * Retorna { ok, status, resposta } — resposta truncada a 2 KB.
 */
export async function executarConectorSaida(
  conector: ConectorSaida,
  payload: unknown,
): Promise<{ ok: boolean; status: number; resposta: string }> {
  const headers: Record<string, string> = {
    ...parseHeaders(conector.headers_raw),
  };

  let body: string | undefined;
  if (conector.method !== 'GET' && conector.method !== 'DELETE') {
    if (conector.content_type === 'application/x-www-form-urlencoded') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(payload as Record<string, string>).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }
  }

  let url = conector.target_url;
  if ((conector.method === 'GET' || conector.method === 'DELETE') && payload) {
    const qs = new URLSearchParams(payload as Record<string, string>).toString();
    if (qs) url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
  }

  const resp = await fetch(url, { method: conector.method, headers, body });
  const rawText = await resp.text();
  const truncated = rawText.length > 2048 ? rawText.slice(0, 2048) + '…[truncado]' : rawText;

  return { ok: resp.ok, status: resp.status, resposta: truncated };
}

/**
 * Gera bloco de system prompt listando conectores disponíveis.
 * Retorna string vazia se nenhum conector.
 */
export function buildConectoresPromptSection(conectores: ConectorSaida[]): string {
  if (conectores.length === 0) return '';
  const linhas = conectores.map(c =>
    `• ID: ${c.id} | Nome: ${c.nome}${c.descricao ? ` | Descrição: ${c.descricao}` : ''} | Método: ${c.method}`
  );
  return `\n\n=== CONECTORES EXTERNOS DISPONÍVEIS ===\n${linhas.join('\n')}\nUse chamar_webhook_externo(conector_id, payload) para acionar um conector. O campo "conector_id" deve ser o ID exato listado acima.`;
}
