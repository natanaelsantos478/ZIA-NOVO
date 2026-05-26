// ─────────────────────────────────────────────────────────────────────────────
// editor-interno.ts — Enforcement do card editor_interno nos runners IA
// v2 — 2026-05-26
//
// Carrega o card editor_interno ativo do agente, valida acesso por
// (tabela, ação) e gera bloco de prompt com módulos autorizados.
//
// Default sem card conectado: ALLOW ALL (backwards-compatible).
// ─────────────────────────────────────────────────────────────────────────────

// Mapa tabela → módulo do editor_interno
export const TABLE_TO_MODULE: Record<string, string> = {
  // CRM
  'crm_negociacoes': 'crm', 'crm_orcamentos': 'crm', 'crm_orcamento_itens': 'crm',
  'crm_contatos': 'crm', 'crm_leads': 'crm', 'crm_atividades': 'crm',
  'crm_clientes': 'crm', 'crm_compromissos': 'crm', 'crm_anotacoes': 'crm',
  'crm_atendimentos': 'crm', 'crm_funis': 'crm', 'crm_funil_etapas': 'crm',
  // ERP Vendas
  'erp_pedidos': 'erp_vendas', 'erp_produtos': 'erp_vendas', 'erp_clientes': 'erp_vendas',
  'erp_orcamentos': 'erp_vendas', 'erp_notas_fiscais': 'erp_vendas',
  'erp_comissoes_lancamentos': 'erp_vendas', 'erp_assinaturas': 'erp_vendas',
  // ERP Financeiro
  'erp_financeiro_lancamentos': 'erp_financeiro', 'fin_nos_custo': 'erp_financeiro',
  'fin_contas_pagar': 'erp_financeiro', 'fin_contas_receber': 'erp_financeiro',
  'fin_transacoes': 'erp_financeiro', 'fin_caixa': 'erp_financeiro',
  // ERP Estoque
  'erp_estoque_movimentos': 'erp_estoque', 'erp_fornecedores': 'erp_estoque',
  // RH
  'employees': 'rh', 'hr_employees': 'rh', 'hr_alerts': 'rh',
  'hr_payroll': 'rh', 'hr_absences': 'rh', 'hr_timesheet': 'rh',
  'salary_history': 'rh', 'position_history': 'rh', 'schedules': 'rh',
  // EAM
  'assets': 'eam', 'asset_work_orders': 'eam', 'asset_maintenance_plans': 'eam',
  'eam_asset_alerts': 'eam', 'eam_assets': 'eam', 'eam_maintenance_orders': 'eam',
  'eam_work_orders': 'eam',
  // SCM
  'scm_estoque': 'scm', 'scm_pedidos_compra': 'scm', 'scm_fornecedores': 'scm',
  // IA
  'ia_agentes': 'ia', 'ia_conversas': 'ia', 'ia_mensagens': 'ia',
  'ia_memorias': 'ia', 'ia_solicitacoes': 'ia', 'ia_acoes_log': 'ia',
  'wa_agent_chats': 'ia', 'wa_agent_chat_messages': 'ia',
  'wa_agent_numeros_confianca': 'ia',
  // GED
  'ia_arquivos': 'ged', 'ged_documentos': 'ged', 'ged_categorias': 'ged',
  'ged_pastas': 'ged',
};

export const ACTION_TO_PERM: Record<string, 'ver' | 'criar' | 'editar' | 'apagar'> = {
  buscar_dados: 'ver',
  criar_registro: 'criar',
  editar_registro: 'editar',
  deletar_registro: 'apagar',
};

export type ModuloPermissao = {
  ativo: boolean;
  permissoes: string[];
  submodulos: string[];
};

export type EditorConfig = {
  modulos: Record<string, ModuloPermissao>;
};

export interface EditorGuard {
  hasCard: boolean;
  config: EditorConfig | null;
}

// deno-lint-ignore no-explicit-any
export async function loadEditorGuard(sb: any, agentId: string): Promise<EditorGuard> {
  const { data } = await sb.from('ia_agent_cards')
    .select('ia_cards(tipo, config, ativo)')
    .eq('agente_id', agentId);
  const card = (data ?? [])
    // deno-lint-ignore no-explicit-any
    .map((r: any) => r.ia_cards)
    // deno-lint-ignore no-explicit-any
    .find((c: any) => c?.tipo === 'editor_interno' && c?.ativo === true);
  if (!card) return { hasCard: false, config: null };
  return {
    hasCard: true,
    config: (card.config ?? { modulos: {} }) as EditorConfig,
  };
}

/**
 * Retorna null se permitido, ou string de erro descrevendo o bloqueio.
 * Default (sem card): allow all.
 */
export function checkEditorAccess(
  guard: EditorGuard,
  tabela: string,
  action: keyof typeof ACTION_TO_PERM,
): string | null {
  if (!guard.hasCard) return null; // backwards-compatible
  const modulo = TABLE_TO_MODULE[tabela];
  if (!modulo) {
    return `Tabela '${tabela}' não está mapeada a nenhum módulo do Editor Interno. Acesso negado.`;
  }
  const m = guard.config?.modulos?.[modulo];
  if (!m?.ativo) {
    return `Módulo '${modulo}' não está autorizado para este agente no card Editor Interno.`;
  }
  const perm = ACTION_TO_PERM[action];
  if (!m.permissoes?.includes(perm)) {
    return `Ação '${perm}' não permitida no módulo '${modulo}' (Editor Interno).`;
  }
  return null;
}

export function buildEditorPromptSection(guard: EditorGuard): string {
  if (!guard.hasCard) return '';
  const mods = guard.config?.modulos ?? {};
  const ativos = Object.entries(mods).filter(([_, v]) => v?.ativo);
  if (ativos.length === 0) {
    return `\n\n=== EDITOR INTERNO ===\nNenhum módulo autorizado. Você NÃO pode usar buscar_dados/criar_registro/editar_registro/deletar_registro.`;
  }
  const linhas = ativos.map(([id, v]) => {
    const subs = (v.submodulos ?? []).join(', ') || 'todos';
    return `• ${id}: permissões=[${(v.permissoes ?? []).join(',')}] submódulos=[${subs}]`;
  });
  return `\n\n=== EDITOR INTERNO — MÓDULOS AUTORIZADOS ===\n${linhas.join('\n')}\n` +
    `Use buscar_dados/criar_registro/editar_registro/deletar_registro APENAS em tabelas pertencentes a esses módulos e respeitando as permissões listadas.`;
}
