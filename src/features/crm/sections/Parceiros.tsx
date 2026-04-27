// ─────────────────────────────────────────────────────────────────────────────
// Parceiros — Portal de Parceiros com IA de Prospecção + Histórico + Relatórios
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Users2, Plus, Search, CheckCircle2, Phone, Mail, Target, XCircle,
  History, FileText, ChevronRight, Building2, X, Download,
} from 'lucide-react';
import ProspeccaoIA, { type ProspectEmpresa, type ProspeccaoSession } from './ProspeccaoIA';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';

// ── Histórico Supabase ─────────────────────────────────────────────────────────

interface ConsultaRecord {
  id: string;
  createdAt: string;
  session: ProspeccaoSession;
  empresasAdicionadas: number;
}

async function loadHistoryFromDB(tenantId: string): Promise<ConsultaRecord[]> {
  const { data, error } = await supabase
    .from('crm_parceiros_historico')
    .select('id, created_at, session_data, empresas_adicionadas')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    createdAt: row.created_at,
    session: row.session_data as ProspeccaoSession,
    empresasAdicionadas: row.empresas_adicionadas,
  }));
}

// Migra registros antigos do localStorage para o Supabase (executa uma única vez)
async function migrateLocalStorage(tenantId: string): Promise<ConsultaRecord[]> {
  const LEGACY_KEY = 'zia_parceiros_historico_v1';
  const MIGRATED_KEY = `zia_parceiros_migrated_${tenantId}`;
  if (localStorage.getItem(MIGRATED_KEY)) return [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) { localStorage.setItem(MIGRATED_KEY, '1'); return []; }
    const legacy = JSON.parse(raw) as ConsultaRecord[];
    if (!Array.isArray(legacy) || legacy.length === 0) { localStorage.setItem(MIGRATED_KEY, '1'); return []; }
    const rows = legacy.map(r => ({
      tenant_id: tenantId,
      session_data: r.session,
      empresas_adicionadas: r.empresasAdicionadas ?? 0,
      created_at: r.createdAt,
    }));
    const { data } = await supabase
      .from('crm_parceiros_historico')
      .insert(rows)
      .select('id, created_at, session_data, empresas_adicionadas');
    localStorage.setItem(MIGRATED_KEY, '1');
    if (!data) return [];
    return data.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      session: row.session_data as ProspeccaoSession,
      empresasAdicionadas: row.empresas_adicionadas,
    }));
  } catch { return []; }
}

async function addToHistoryDB(
  tenantId: string,
  session: ProspeccaoSession,
  empresasAdicionadas: number,
): Promise<ConsultaRecord | null> {
  const { data, error } = await supabase
    .from('crm_parceiros_historico')
    .insert({ tenant_id: tenantId, session_data: session, empresas_adicionadas: empresasAdicionadas })
    .select('id, created_at, session_data, empresas_adicionadas')
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    createdAt: data.created_at,
    session: data.session_data as ProspeccaoSession,
    empresasAdicionadas: data.empresas_adicionadas,
  };
}

// ── Report Modal ──────────────────────────────────────────────────────────────

function ReportModal({ record, onClose }: { record: ConsultaRecord; onClose: () => void }) {
  const { session } = record;
  const c = session.criterios;

  function downloadCSV() {
    const header = ['Empresa', 'CNPJ', 'Cidade', 'Estado', 'Situação', 'Capital Social', 'Serasa', 'WhatsApp Enviado', 'Contatos'];
    const rows = session.empresas.map(e => [
      e.nome,
      e.cnpj ?? '',
      e.cidade ?? '',
      e.estado ?? '',
      e.situacao ?? '',
      e.capitalSocialStr ?? '',
      e.serasaStatus ?? '',
      e.whatsappEnviado ? 'Sim' : 'Não',
      (e.contatos ?? []).map(c => `${c.nome}${c.telefone ? ' ' + c.telefone : ''}`).join('; '),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospeccao-${record.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">Relatório de Prospecção</h3>
            <p className="text-xs text-slate-400 mt-0.5">{new Date(record.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Buscadas',   value: session.totalBuscadas,    color: 'bg-blue-50 text-blue-700'    },
              { label: 'Qualificadas',     value: session.totalQualificadas, color: 'bg-green-50 text-green-700'  },
              { label: 'Descartadas',      value: session.totalDescartadas,  color: 'bg-red-50 text-red-600'      },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-semibold mt-0.5 opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Critérios de busca */}
          {(c.setor || c.estado || c.regioes?.length) && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Critérios de Busca</p>
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {c.setor      && <div><span className="text-slate-400 text-xs">Setor: </span><span className="font-medium text-slate-700">{c.setor}</span></div>}
                {c.porte      && <div><span className="text-slate-400 text-xs">Porte: </span><span className="font-medium text-slate-700">{c.porte}</span></div>}
                {(c.regioes?.length ? c.regioes.join(', ') : c.estado) && (
                  <div><span className="text-slate-400 text-xs">Região: </span><span className="font-medium text-slate-700">{c.regioes?.join(', ') ?? c.estado}</span></div>
                )}
                {c.capitalMin ? <div><span className="text-slate-400 text-xs">Capital mín: </span><span className="font-medium text-slate-700">R$ {c.capitalMin.toLocaleString('pt-BR')}</span></div> : null}
                {c.palavrasChave && <div><span className="text-slate-400 text-xs">Palavras-chave: </span><span className="font-medium text-slate-700">{c.palavrasChave}</span></div>}
              </div>
            </div>
          )}

          {/* Dados da empresa atual (contexto) */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Empresas Consultadas</p>
            <div className="space-y-2">
              {session.empresas.map((e, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{e.nome}</p>
                      {e.serasaStatus === 'ok' && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">Serasa OK</span>}
                      {e.serasaStatus === 'restrito' && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Serasa Restrito</span>}
                      {e.whatsappEnviado && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">WhatsApp ✓</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {e.cnpj && <span className="text-[11px] font-mono text-slate-400">{e.cnpj}</span>}
                      {(e.cidade || e.estado) && <span className="text-[11px] text-slate-400">{e.cidade}/{e.estado}</span>}
                      {e.situacao && <span className="text-[11px] text-slate-400">{e.situacao}</span>}
                      {e.capitalSocialStr && <span className="text-[11px] text-slate-400">Cap: {e.capitalSocialStr}</span>}
                    </div>
                    {(e.contatos ?? []).length > 0 && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {e.contatos!.slice(0, 2).map((ct, j) => (
                          <span key={j} className="text-[11px] text-slate-500 flex items-center gap-1">
                            {ct.telefone && <><Phone className="w-3 h-3" />{ct.telefone}</>}
                            {ct.email && <><Mail className="w-3 h-3" />{ct.email}</>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {session.empresas.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma empresa nesta sessão.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Parceiro extends ProspectEmpresa {
  captadoEm: string;
}

export default function Parceiros() {
  const { activeProfile }         = useProfiles();
  const tenantId                  = activeProfile?.entityId ?? '';
  const [tab, setTab]             = useState<'parceiros' | 'historico'>('parceiros');
  const [showIA, setShowIA]       = useState(false);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [search, setSearch]       = useState('');
  const [history, setHistory]     = useState<ConsultaRecord[]>([]);
  const [reportRecord, setReportRecord] = useState<ConsultaRecord | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    // Carregar parceiros do prosp_empresas
    supabase
      .from('prosp_empresas')
      .select('id,nome_fantasia,cnpj,municipio,uf,cnpj_situacao,capital_social,telefone_principal,telefone_secundario,email_contato,serasa_status,socios,descricao_google,created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const loaded: Parceiro[] = data.map(r => ({
            id:           r.id,
            nome:         r.nome_fantasia ?? '',
            cnpj:         r.cnpj ?? undefined,
            cidade:       r.municipio ?? undefined,
            estado:       r.uf ?? undefined,
            situacao:     r.cnpj_situacao ?? undefined,
            capitalSocial: r.capital_social ?? undefined,
            telefone:     r.telefone_principal ?? undefined,
            email:        r.email_contato ?? undefined,
            serasaStatus: (r.serasa_status as 'ok' | 'restrito' | 'unknown') ?? undefined,
            socios:       r.socios ?? undefined,
            descricao:    r.descricao_google ?? undefined,
            contatos:     r.telefone_principal ? [{ nome: '', telefone: r.telefone_principal, email: r.email_contato ?? undefined }] : [],
            captadoEm:    r.created_at,
          }));
          setParceiros(loaded);
        }
      });

    migrateLocalStorage(tenantId).then(migrated => {
      loadHistoryFromDB(tenantId).then(dbHistory => {
        setHistory(dbHistory.length > 0 ? dbHistory : migrated);
      });
    });
  }, [tenantId]);

  const filtered = parceiros.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.cnpj && p.cnpj.includes(search)) ||
    (p.cidade?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  async function handleAdded(empresas: ProspectEmpresa[], session: ProspeccaoSession) {
    const novos: Parceiro[] = empresas.map(e => ({ ...e, captadoEm: new Date().toISOString() }));
    setParceiros(prev => {
      const existing = new Set(prev.map(p => p.cnpj || p.nome));
      return [...prev, ...novos.filter(n => !existing.has(n.cnpj || n.nome))];
    });
    if (tenantId) {
      const record = await addToHistoryDB(tenantId, session, novos.length);
      if (record) setHistory(prev => [record, ...prev]);
    }
    setShowIA(false);
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Portal de Parceiros</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} cadastrado{parceiros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
          <button
            onClick={() => setShowIA(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-600/20"
          >
            <Target className="w-4 h-4" /> Captar Parceiros
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-100 flex gap-6">
        {([
          { id: 'parceiros', label: 'Parceiros', icon: Users2 },
          { id: 'historico', label: `Histórico${history.length > 0 ? ` (${history.length})` : ''}`, icon: History },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Parceiros ── */}
      {tab === 'parceiros' && (
        <>
          {parceiros.length > 0 && (
            <div className="px-6 py-3 border-b border-slate-100">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar parceiro..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {parceiros.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                  <Users2 className="w-8 h-8 text-violet-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-700 mb-2">Nenhum parceiro ainda</h2>
                <p className="text-sm text-slate-400 max-w-xs mb-6">
                  Use a IA de Prospecção para encontrar e captar parceiros automaticamente em 5 etapas inteligentes.
                </p>
                <button
                  onClick={() => setShowIA(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
                >
                  <Target className="w-4 h-4" /> Captar Parceiros com IA
                </button>
              </div>
            ) : (
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Empresa', 'CNPJ', 'Status', 'Capital Social', 'Serasa', 'Contatos', 'WhatsApp'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{p.nome}</p>
                          {(p.cidade || p.estado) && <p className="text-xs text-slate-400">{p.cidade}/{p.estado}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{p.cnpj || '—'}</td>
                        <td className="py-3.5 px-4">
                          {p.situacao === 'ATIVA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          ) : p.situacao ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs">{p.situacao}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{p.capitalSocialStr || '—'}</td>
                        <td className="py-3.5 px-4">
                          {p.serasaStatus === 'ok'
                            ? <span className="text-xs text-green-600 font-semibold">OK</span>
                            : p.serasaStatus === 'restrito'
                            ? <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Restrito</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {p.contatos?.slice(0, 1).map((ct, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {ct.telefone && <a href={`tel:${ct.telefone}`} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><Phone className="w-3.5 h-3.5" /></a>}
                                {ct.email && <a href={`mailto:${ct.email}`} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><Mail className="w-3.5 h-3.5" /></a>}
                              </span>
                            ))}
                            {(p.contatos?.length ?? 0) === 0 && <span className="text-slate-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.whatsappEnviado
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> Enviado</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Histórico ── */}
      {tab === 'historico' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <History className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Nenhuma consulta realizada</p>
              <p className="text-sm text-slate-400">Após captar parceiros com a IA, o histórico de sessões aparece aqui.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {history.map(record => {
                const c = record.session.criterios;
                return (
                  <button
                    key={record.id}
                    onClick={() => setReportRecord(record)}
                    className="w-full text-left bg-white border border-slate-200 hover:border-violet-300 rounded-2xl p-4 transition-all hover:shadow-sm group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800 text-sm">
                            Prospecção: {c.setor || 'Sem setor definido'}
                          </p>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500 shrink-0 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(record.createdAt).toLocaleString('pt-BR')}
                          {c.estado && ` · ${c.estado}`}
                          {c.regioes?.length && ` · ${c.regioes.join(', ')}`}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            {record.session.totalBuscadas} buscadas
                          </span>
                          <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            {record.session.totalQualificadas} qualificadas
                          </span>
                          {record.session.totalDescartadas > 0 && (
                            <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                              {record.session.totalDescartadas} descartadas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showIA && <ProspeccaoIA onClose={() => setShowIA(false)} onParceirosAdded={handleAdded} />}
      {reportRecord && <ReportModal record={reportRecord} onClose={() => setReportRecord(null)} />}
    </div>
  );
}
