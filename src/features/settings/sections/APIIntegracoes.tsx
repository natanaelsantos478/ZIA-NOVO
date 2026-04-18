// ─────────────────────────────────────────────────────────────────────────────
// APIIntegracoes — Seção "API & Integrações de IA" em Configurações
// Permite criar/gerenciar API Keys para IAs externas (Flowise, n8n, Make, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Webhook, Plus, RefreshCw, AlertCircle, ShieldOff, Key,
  Activity, BookOpen, Info, Plug, MessageCircle, Brain, Zap,
  Layers, Globe, Settings, FileText, Rocket, Check,
} from 'lucide-react';
import { getApiKeys, type ApiKey } from '../../../lib/apiKeys';
import { useProfiles } from '../../../context/ProfileContext';
import { SCOPE_IDS_KEY } from '../../../context/ProfileContext';
import ApiKeyCard from './components/ApiKeyCard';
import ApiKeyModal, { ApiKeyRevealModal } from './components/ApiKeyModal';
import ApiLogsTable from './components/ApiLogsTable';
import ApiDocsSection from './components/ApiDocsSection';

type Tab = 'chaves' | 'servicos' | 'logs' | 'docs';

const TABS: { id: Tab; label: string; icon: typeof Key }[] = [
  { id: 'chaves',   label: 'Chaves de API',      icon: Key       },
  { id: 'servicos', label: 'Serviços Externos',   icon: Plug      },
  { id: 'logs',     label: 'Logs de Uso',         icon: Activity  },
  { id: 'docs',     label: 'Documentação',        icon: BookOpen  },
];

type ServicoConfig = { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string };

const SERVICO_CONFIG: Record<string, ServicoConfig> = {
  whatsapp: { label: 'WhatsApp',             icon: MessageCircle, color: 'text-green-600',   bg: 'bg-green-100'   },
  flowise:  { label: 'Flowise',              icon: Brain,         color: 'text-purple-600',  bg: 'bg-purple-100'  },
  n8n:      { label: 'n8n',                  icon: Zap,           color: 'text-orange-600',  bg: 'bg-orange-100'  },
  make:     { label: 'Make (Integromat)',     icon: Layers,        color: 'text-blue-600',    bg: 'bg-blue-100'    },
  webhook:  { label: 'Webhook genérico',      icon: Webhook,       color: 'text-indigo-600',  bg: 'bg-indigo-100'  },
  excel:    { label: 'Excel / Power Automate',icon: FileText,      color: 'text-emerald-600', bg: 'bg-emerald-100' },
  runway:   { label: 'Runway',               icon: Rocket,        color: 'text-sky-600',     bg: 'bg-sky-100'     },
  custom:   { label: 'Integração customizada',icon: Globe,         color: 'text-slate-600',   bg: 'bg-slate-100'   },
};

function ServicoCard({
  apiKey, onEdit, onRevoke,
}: { apiKey: ApiKey; onEdit: (k: ApiKey) => void; onRevoke: (k: ApiKey) => void }) {
  const tipo = apiKey.integracao_tipo ?? 'custom';
  const cfg  = SERVICO_CONFIG[tipo] ?? SERVICO_CONFIG.custom;
  const Icon = cfg.icon;
  const hasCredentials = Object.keys(apiKey.integracao_config ?? {}).length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={`w-12 h-12 ${cfg.bg} rounded-2xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="font-semibold text-slate-800 text-sm">{apiKey.nome}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            apiKey.status === 'ativo'    ? 'bg-green-100 text-green-700' :
            apiKey.status === 'inativo'  ? 'bg-amber-100 text-amber-700' :
                                           'bg-red-100 text-red-600'
          }`}>
            {apiKey.status}
          </span>
        </div>
        <p className="text-[12px] text-slate-500 truncate">
          {cfg.label}{apiKey.integracao_url ? ` · ${apiKey.integracao_url}` : ''}
        </p>
        {apiKey.descricao && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{apiKey.descricao}</p>
        )}
        <div className="mt-1">
          {hasCredentials ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <Check className="w-3 h-3" /> Credenciais configuradas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
              <AlertCircle className="w-3 h-3" /> Sem credenciais — clique em editar
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {apiKey.status !== 'revogado' && (
          <>
            <button
              onClick={() => onEdit(apiKey)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Editar credenciais"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRevoke(apiKey)}
              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Remover integração"
            >
              <ShieldOff className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal de confirmação de revogação ─────────────────────────────────────────
function RevokeConfirmModal({
  apiKey, onConfirm, onCancel,
}: { apiKey: ApiKey; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <ShieldOff className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="font-bold text-slate-800 text-lg mb-1">Revogar chave?</h2>
        <p className="text-[13px] text-slate-500 mb-2">
          Você está prestes a revogar a chave <strong>"{apiKey.nome}"</strong>.
        </p>
        <p className="text-[12px] text-red-500 mb-6">
          Esta ação é <strong>irreversível</strong>. A chave será permanentemente invalidada
          e qualquer integração que a use deixará de funcionar.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Revogar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function APIIntegracoes() {
  const { activeProfile } = useProfiles();

  // Obter tenantIds do localStorage (mesmo padrão do projeto)
  const [tenantIds, setTenantIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SCOPE_IDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [tab, setTab]           = useState<Tab>('chaves');
  const [keys, setKeys]         = useState<ApiKey[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modais
  const [showModal, setShowModal]           = useState(false);
  const [editTarget, setEditTarget]         = useState<ApiKey | null>(null);
  const [revokeTarget, setRevokeTarget]     = useState<ApiKey | null>(null);
  const [revealKey, setRevealKey]           = useState<string | null>(null);

  // Logs — navegar para chave específica
  const [logsKeyId, setLogsKeyId] = useState<string | null>(null);

  // Verificar nível de acesso (apenas admins)
  const isAdmin = activeProfile ? activeProfile.level <= 3 : false;

  const loadKeys = useCallback(async () => {
    if (tenantIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getApiKeys(tenantIds);
      setKeys(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar chaves');
    } finally {
      setLoading(false);
    }
  }, [tenantIds]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  // Sincronizar tenantIds se localStorage mudar (ex: troca de perfil)
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(SCOPE_IDS_KEY);
        setTenantIds(raw ? JSON.parse(raw) : []);
      } catch { /* ignora */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  function handleCreated(key: ApiKey, rawKey: string) {
    setShowModal(false);
    setKeys(prev => [key, ...prev]);
    // Integrações de saída não geram rawKey (createApiKey retorna ''). Chaves
    // de entrada geram zita_xxx que precisa ser exibida uma única vez.
    if (rawKey) {
      setRevealKey(rawKey);
    } else {
      setSuccessMsg(`Integração "${key.nome}" salva com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  }

  function handleUpdated(key: ApiKey) {
    setShowModal(false);
    setEditTarget(null);
    setKeys(prev => prev.map(k => k.id === key.id ? key : k));
    setSuccessMsg(`"${key.nome}" atualizada com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      const { revokeApiKey } = await import('../../../lib/apiKeys');
      await revokeApiKey(revokeTarget.id);
      setKeys(prev => prev.map(k =>
        k.id === revokeTarget.id ? { ...k, status: 'revogado' as const } : k,
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao revogar chave');
    } finally {
      setRevokeTarget(null);
    }
  }

  function handleCopy(key: ApiKey) {
    // Copia o prefixo visível; a chave completa só é exibida no momento de criação
    navigator.clipboard.writeText(key.key_prefix).catch(() => {});
    // Toast feedback visual simples
    const el = document.getElementById(`copy-feedback-${key.id}`);
    if (el) {
      el.textContent = 'Copiado!';
      setTimeout(() => { if (el) el.textContent = ''; }, 2000);
    }
  }

  function handleViewLogs(key: ApiKey) {
    setLogsKeyId(key.id);
    setTab('logs');
  }

  const activeKeys   = keys.filter(k => k.status === 'ativo');
  const inactiveKeys = keys.filter(k => k.status === 'inativo');
  const revokedKeys  = keys.filter(k => k.status === 'revogado');

  // Serviços externos: chaves criadas para ZIA usar (têm integracao_tipo definido)
  const servicoKeys = keys.filter(k => k.integracao_tipo !== null);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso restrito</h2>
          <p className="text-slate-500 text-sm">
            O gerenciamento de API Keys é disponível apenas para gestores (nível 1 a 3).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800">API & Integrações de IA</h1>
          </div>
          <p className="text-sm text-slate-500">
            Gerencie chaves de API para IAs externas (Flowise, n8n, Make, WhatsApp…) operarem dentro do ZITA.
          </p>
        </div>
        {(tab === 'chaves' || tab === 'servicos') && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadKeys}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { setEditTarget(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {tab === 'servicos' ? 'Nova integração' : 'Nova chave'}
            </button>
          </div>
        )}
      </div>

      {/* Banner info */}
      <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
        <p>
          As IAs autenticadas via API Key operam <strong>dentro do escopo do seu tenant</strong>,
          com as permissões granulares que você definir. Todos os acessos são registrados nos logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-white shadow text-indigo-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.id === 'chaves' && keys.length > 0 && (
              <span className="bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {keys.length}
              </span>
            )}
            {t.id === 'servicos' && servicoKeys.length > 0 && (
              <span className="bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {servicoKeys.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Erro global */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {/* Sucesso integração salva */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
          <span className="w-4 h-4 shrink-0 flex items-center justify-center rounded-full bg-green-600 text-white text-[10px] font-bold">✓</span>
          {successMsg}
        </div>
      )}

      {/* ── Tab: Chaves de API ─────────────────────────────────────────────────── */}
      {tab === 'chaves' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Carregando chaves...
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Key className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Nenhuma chave de API cadastrada</p>
              <p className="text-[12px] text-slate-400 mb-4">
                Crie uma chave para permitir que IAs externas acessem o ZITA.
              </p>
              <button
                onClick={() => { setEditTarget(null); setShowModal(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Criar primeira chave
              </button>
            </div>
          ) : (
            <>
              {/* Chaves ativas */}
              {activeKeys.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Ativas ({activeKeys.length})
                  </h2>
                  <div className="space-y-3">
                    {activeKeys.map(k => (
                      <div key={k.id} className="relative">
                        <ApiKeyCard
                          apiKey={k}
                          onEdit={key => { setEditTarget(key); setShowModal(true); }}
                          onRevoke={setRevokeTarget}
                          onCopy={handleCopy}
                          onViewLogs={handleViewLogs}
                        />
                        <span
                          id={`copy-feedback-${k.id}`}
                          className="absolute top-2 right-2 text-xs text-green-600 font-semibold pointer-events-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chaves inativas */}
              {inactiveKeys.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Inativas ({inactiveKeys.length})
                  </h2>
                  <div className="space-y-3">
                    {inactiveKeys.map(k => (
                      <ApiKeyCard
                        key={k.id}
                        apiKey={k}
                        onEdit={key => { setEditTarget(key); setShowModal(true); }}
                        onRevoke={setRevokeTarget}
                        onCopy={handleCopy}
                        onViewLogs={handleViewLogs}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Chaves revogadas */}
              {revokedKeys.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Revogadas ({revokedKeys.length})
                  </h2>
                  <div className="space-y-3 opacity-70">
                    {revokedKeys.map(k => (
                      <ApiKeyCard
                        key={k.id}
                        apiKey={k}
                        onEdit={() => {}}
                        onRevoke={() => {}}
                        onCopy={() => {}}
                        onViewLogs={handleViewLogs}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Serviços Externos ────────────────────────────────────────────── */}
      {tab === 'servicos' && (
        <div className="space-y-4">
          {/* Explicação */}
          <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-700">
            <Plug className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
            <p>
              Aqui você armazena as credenciais de <strong>serviços externos que o ZITA usa</strong> —
              como WhatsApp (Z-API / Twilio), Flowise, n8n etc.
              Ao contrário das Chaves de API (que permitem acesso externo ao ZITA), estas credenciais
              são usadas pelo ZITA para <em>chamar</em> esses serviços.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Carregando serviços...
            </div>
          ) : servicoKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Plug className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Nenhum serviço externo configurado</p>
              <p className="text-[12px] text-slate-400 mb-4">
                Adicione credenciais de WhatsApp, Flowise, n8n e outros serviços que o ZITA irá usar.
              </p>
              <button
                onClick={() => { setEditTarget(null); setShowModal(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar serviço
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {servicoKeys.map(k => (
                <ServicoCard
                  key={k.id}
                  apiKey={k}
                  onEdit={key => { setEditTarget(key); setShowModal(true); }}
                  onRevoke={setRevokeTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Logs ─────────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <ApiLogsTable
          tenantIds={tenantIds}
          apiKeys={keys}
          selectedKeyId={logsKeyId}
          onBack={logsKeyId ? () => setLogsKeyId(null) : undefined}
        />
      )}

      {/* ── Tab: Documentação ─────────────────────────────────────────────────── */}
      {tab === 'docs' && <ApiDocsSection />}

      {/* ── Modal criar/editar ──────────────────────────────────────────────────── */}
      {showModal && (
        <ApiKeyModal
          tenantId={tenantIds[0] ?? ''}
          editKey={editTarget}
          employees={[]}
          criadorId={activeProfile?.id}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {/* ── Modal reveal da chave recém-criada ──────────────────────────────────── */}
      {revealKey && (
        <ApiKeyRevealModal
          rawKey={revealKey}
          onClose={() => setRevealKey(null)}
        />
      )}

      {/* ── Modal confirmação de revogação ──────────────────────────────────────── */}
      {revokeTarget && (
        <RevokeConfirmModal
          apiKey={revokeTarget}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
