// ─────────────────────────────────────────────────────────────────────────────
// IAPermissoes — Permissões globais da IA por módulo (Supabase-integrado)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PermGlobal {
  modulo: string;
  pode_ler: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_deletar: boolean;
}

interface Config {
  modo_autonomia: 'ASSISTIDO' | 'SEMI_AUTOMATICO' | 'AUTONOMO';
  campos_sensiveis: string[];
}

const MODULOS = [
  { key: 'CRM — Negociações',  cat: 'CRM'          },
  { key: 'CRM — Clientes',     cat: 'CRM'          },
  { key: 'ERP — Pedidos',      cat: 'ERP'          },
  { key: 'ERP — Financeiro',   cat: 'ERP'          },
  { key: 'RH — Funcionários',  cat: 'RH'           },
  { key: 'RH — Folha',         cat: 'RH'           },
  { key: 'SCM — Estoque',      cat: 'SCM'          },
  { key: 'Qualidade',          cat: 'Qualidade'    },
  { key: 'Documentos',         cat: 'Documentos'   },
];

const AUTONOMIA_OPTS = [
  { id: 'ASSISTIDO',       emoji: '🟡', label: 'Assistido',       desc: 'IA sempre pede aprovação antes de criar, editar ou deletar' },
  { id: 'SEMI_AUTOMATICO', emoji: '🟠', label: 'Semi-Automático', desc: 'IA age em operações simples, pede aprovação em críticas'     },
  { id: 'AUTONOMO',        emoji: '🔴', label: 'Autônomo',        desc: 'IA age livremente — use com cautela'                        },
];

const DEFAULT_PERMS: PermGlobal[] = MODULOS.map(m => ({
  modulo: m.key, pode_ler: true, pode_criar: false, pode_editar: false, pode_deletar: false,
}));

export default function IAPermissoes() {
  const [perms, setPerms] = useState<PermGlobal[]>(DEFAULT_PERMS);
  const [config, setConfig] = useState<Config>({ modo_autonomia: 'ASSISTIDO', campos_sensiveis: [] });
  const [campoInput, setCampoInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [permRes, cfgRes] = await Promise.all([
        supabase.from('ia_permissoes').select('*').is('agente_id', null),
        supabase.from('ia_config_tenant').select('modo_autonomia,campos_sensiveis').single(),
      ]);
      if (permRes.data && permRes.data.length > 0) {
        setPerms(MODULOS.map(m => {
          const p = (permRes.data as PermGlobal[]).find(x => x.modulo === m.key);
          return p ?? { modulo: m.key, pode_ler: false, pode_criar: false, pode_editar: false, pode_deletar: false };
        }));
      }
      if (cfgRes.data) {
        setConfig({
          modo_autonomia: (cfgRes.data.modo_autonomia as Config['modo_autonomia']) ?? 'ASSISTIDO',
          campos_sensiveis: Array.isArray(cfgRes.data.campos_sensiveis) ? cfgRes.data.campos_sensiveis : [],
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  function toggle(modulo: string, field: keyof PermGlobal, val: boolean) {
    setPerms(prev => prev.map(p =>
      p.modulo !== modulo ? p : {
        ...p, [field]: val,
        ...(field !== 'pode_ler' && val ? { pode_ler: true } : {}),
        ...(field === 'pode_ler' && !val ? { pode_criar: false, pode_editar: false, pode_deletar: false } : {}),
      }
    ));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    // Upsert permissões globais (sem agente_id)
    await supabase.from('ia_permissoes').delete().is('agente_id', null);
    const toInsert = perms.filter(p => p.pode_ler || p.pode_criar || p.pode_editar || p.pode_deletar)
      .map(p => ({ ...p, agente_id: null }));
    if (toInsert.length > 0) await supabase.from('ia_permissoes').insert(toInsert);
    // Upsert config
    await supabase.from('ia_config_tenant').upsert({
      modo_autonomia: config.modo_autonomia,
      campos_sensiveis: config.campos_sensiveis,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function addCampo() {
    const v = campoInput.trim().toLowerCase();
    if (!v || config.campos_sensiveis.includes(v)) return;
    setConfig(c => ({ ...c, campos_sensiveis: [...c.campos_sensiveis, v] }));
    setCampoInput('');
    setSaved(false);
  }

  const cats = [...new Set(MODULOS.map(m => m.cat))];

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Permissões Globais da IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Controle o que todos os agentes podem acessar. Agentes podem ter permissões menores, nunca maiores.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPerms(DEFAULT_PERMS); setSaved(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
            <RotateCcw className="w-4 h-4" /> Restaurar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Modo de Autonomia */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="font-bold text-slate-200 mb-3">Modo de Autonomia</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AUTONOMIA_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setConfig(c => ({ ...c, modo_autonomia: opt.id as Config['modo_autonomia'] }))}
              className={`p-4 rounded-xl border text-left transition-all ${
                config.modo_autonomia === opt.id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
              }`}>
              <p className="font-bold text-slate-100 text-sm mb-1">{opt.emoji} {opt.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
        {config.modo_autonomia === 'AUTONOMO' && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">Modo Autônomo permite que a IA execute ações sem aprovação. Use apenas em ambiente controlado.</p>
          </div>
        )}
      </div>

      {/* Campos sensíveis */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="font-bold text-slate-200 mb-1">Campos Sempre Bloqueados</p>
        <p className="text-xs text-slate-500 mb-3">Nenhum agente poderá acessar estes campos, mesmo com permissão no módulo.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.campos_sensiveis.map(c => (
            <span key={c} className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-mono font-semibold">
              {c}
              <button onClick={() => setConfig(prev => ({ ...prev, campos_sensiveis: prev.campos_sensiveis.filter(x => x !== c) }))}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={campoInput} onChange={e => setCampoInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCampo()}
            placeholder="Ex: salario, cpf, senha_hash…"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono" />
          <button onClick={addCampo} className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold">Adicionar</button>
        </div>
      </div>

      {/* Permissions table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {cats.map(cat => (
            <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-800/50 border-b border-slate-800">
                <span className="font-bold text-slate-200 text-sm">{cat}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase">Módulo</th>
                      {['Leitura', 'Criar', 'Editar', 'Deletar'].map(h => (
                        <th key={h} className="text-center px-4 py-2.5 text-xs font-bold text-slate-500 uppercase w-24">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {MODULOS.filter(m => m.cat === cat).map(m => {
                      const p = perms.find(x => x.modulo === m.key) ?? { modulo: m.key, pode_ler: false, pode_criar: false, pode_editar: false, pode_deletar: false };
                      return (
                        <tr key={m.key} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3 text-slate-200 font-medium">{m.key}</td>
                          {(['pode_ler','pode_criar','pode_editar','pode_deletar'] as const).map(f => (
                            <td key={f} className="text-center px-4 py-3">
                              <button onClick={() => toggle(m.key, f, !p[f])}
                                className={`w-10 h-6 rounded-full relative transition-colors mx-auto block ${p[f] ? 'bg-violet-600' : 'bg-slate-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${p[f] ? 'left-5' : 'left-1'}`} />
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400">Permissões globais salvas. Os agentes respeitarão as novas restrições na próxima execução.</p>
        </div>
      )}
    </div>
  );
}
