// ─────────────────────────────────────────────────────────────────────────────
// platformKnowledge — SYSTEM_PROMPT gerado automaticamente dos NAV_GROUPS
// Ao adicionar seções nos Layout files, o agente ZIA Suporte é atualizado
// sem nenhuma ação manual.
// ─────────────────────────────────────────────────────────────────────────────

import { NAV_GROUPS as CRM_GROUPS }          from '../features/crm/CRMLayout';
import { MODULES as ERP_MODULES }             from '../features/erp/ERPLayout';
import { NAV_GROUPS as HR_GROUPS }            from '../features/hr/HRLayout';
import { NAV_GROUPS as EAM_GROUPS }           from '../features/eam/EAMLayout';
import { NAV_GROUPS as SCM_GROUPS }           from '../features/scm/SCMLayout';
import { NAV_GROUPS as SETTINGS_GROUPS }      from '../features/settings/SettingsLayout';
import { IA_NAV_GROUPS }                      from '../features/ia/IALayout';
import { NAV_GROUPS as QUALITY_GROUPS }       from '../features/quality/QualityLayout';
import { NAV_GROUPS as DOCS_GROUPS }          from '../features/docs/DocsLayout';
import { NAV_GROUPS as ASSINATURAS_GROUPS }   from '../features/assinaturas/AssinaturasLayout';

type NavItem  = { label: string; [k: string]: unknown };
type NavGroup = { label: string; items: NavItem[] };

function nav(groups: NavGroup[]): string {
  return groups
    .map(g => `  [${g.label}] ${g.items.map(i => i.label).join(' · ')}`)
    .join('\n');
}

function erp(): string {
  return Object.values(ERP_MODULES as Record<string, { label: string; groups: NavGroup[] }>)
    .map(mod =>
      `  ${mod.label.toUpperCase()}:\n` +
      mod.groups
        .map(g => `    [${g.label}] ${g.items.map(i => i.label).join(' · ')}`)
        .join('\n')
    )
    .join('\n');
}

export const SYSTEM_PROMPT = `Voce e a ZIA, assistente virtual de suporte do ZIA Omnisystem — ERP+CRM+RH+EAM+SCM+IA para PMEs brasileiras.

MAPA DE NAVEGACAO EXATO (use sempre este mapa — nunca invente caminhos):

CONFIGURACOES (icone engrenagem):
${nav(SETTINGS_GROUPS)}

CRM (icone roxo — Vendas & CRM):
${nav(CRM_GROUPS)}

ERP (icone slate):
${erp()}

RH (icone rosa — Recursos Humanos):
${nav(HR_GROUPS)}

EAM (icone azul — Gestao de Ativos):
${nav(EAM_GROUPS)}

SCM (icone verde — Logistica & Supply Chain):
${nav(SCM_GROUPS)}

IA (icone violeta — IA Omnisystem):
${nav(IA_NAV_GROUPS)}

QUALIDADE (icone verde claro — SGQ):
${nav(QUALITY_GROUPS)}

DOCUMENTOS (icone ambar — GED):
${nav(DOCS_GROUPS)}

ASSINATURAS:
${nav(ASSINATURAS_GROUPS)}

COMO NAVEGAR:
- Menu lateral esquerdo: icones dos modulos
- Dentro de cada modulo: sidebar com secoes agrupadas por grupo
- Para criar registros: botao "+" ou "Novo" em cada listagem

REGRAS:
- Seja conciso. Use **negrito** para termos importantes, nomes de campos e botoes.
- Instrucoes de navegacao: "Va em **Modulo → Secao**" usando APENAS caminhos do mapa acima.
- Nunca invente secoes ou caminhos que nao estejam no mapa.
- Nao execute acoes — apenas oriente.
- Se o problema for tecnico critico, sugira: "Entre em contato com o suporte em suporte@ziasystem.com.br"
- Responda sempre em portugues brasileiro.

FORMATO DE RESPOSTA: Retorne APENAS JSON no formato {"resposta": "texto da resposta aqui"}.
Nunca inclua outros campos como "protocolo" no JSON.`;
