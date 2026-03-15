// ─────────────────────────────────────────────────────────────────────────────
// Impostos.tsx — Cadastro de impostos com alíquotas e faixas progressivas
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Landmark, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Imposto, TipoCalculoImposto, FaixaProgressiva } from './types';
import { IMPOSTOS_MOCK } from './mockData';

const uid = () => `imp-${Date.now()}`;
const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

const TIPO_INFO: Record<TipoCalculoImposto, { label: string; desc: string }> = {
  ALIQUOTA_FIXA:        { label: 'Alíquota Fixa',         desc: '% constante sobre a base' },
  ALIQUOTA_PROGRESSIVA: { label: 'Alíquota Progressiva',  desc: 'Tabelas de faixas (Simples Nacional, IRPJ…)' },
  VALOR_FIXO_MENSAL:    { label: 'Valor Fixo Mensal',     desc: 'Montante fixo todo mês' },
  VINCULADO_NO_CUSTO:   { label: 'Vinculado ao Nó de Custo', desc: 'Calculado pelo motor de árvore' },
};

// Preview de cálculo
function calcularImposto(imp: Imposto, receita: number): number {
  switch (imp.tipo_calculo) {
    case 'ALIQUOTA_FIXA':
      return receita * ((imp.aliquota_pct ?? 0) / 100);
    case 'VALOR_FIXO_MENSAL':
      return imp.valor_fixo ?? 0;
    case 'ALIQUOTA_PROGRESSIVA': {
      const faixa = (imp.faixas_progressivas ?? []).find(f =>
        receita >= f.receita_min && (f.receita_max === null || receita <= (f.receita_max ?? Infinity))
      );
      if (!faixa) return 0;
      return receita * (faixa.aliquota / 100) - faixa.deducao;
    }
    default: return 0;
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ImpostoModal({ imposto, onSave, onClose }: { imposto?: Imposto; onSave: (i: Imposto) => void; onClose: () => void }) {
  const [form, setForm] = useState<Imposto>(() => imposto ?? {
    id: uid(),
    nome: '',
    sigla: '',
    descricao: '',
    regime: '',
    tipo_calculo: 'ALIQUOTA_FIXA',
    aliquota_pct: 0,
    base_calculo: 'RECEITA_BRUTA',
    competencia: 'MENSAL',
    ativo: true,
  });

  const upd = (p: Partial<Imposto>) => setForm(f => ({ ...f, ...p }));
  const previewReceita = 85000;

  const addFaixa = () => {
    const faixas = [...(form.faixas_progressivas ?? [])];
    const last = faixas[faixas.length - 1];
    faixas.push({ receita_min: last ? (last.receita_max ?? last.receita_min) + 1 : 0, receita_max: null, aliquota: 0, deducao: 0 });
    upd({ faixas_progressivas: faixas });
  };
  const updFaixa = (i: number, patch: Partial<FaixaProgressiva>) => {
    upd({ faixas_progressivas: (form.faixas_progressivas ?? []).map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };

  const imposto_preview = calcularImposto(form, previewReceita);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">{imposto ? 'Editar Imposto' : 'Novo Imposto'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Nome *</label>
              <input value={form.nome} onChange={e => upd({ nome: e.target.value })} className={inp} placeholder="Ex: Simples Nacional"/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Sigla *</label>
              <input value={form.sigla} onChange={e => upd({ sigla: e.target.value })} className={inp} placeholder="SN, PIS…"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Regime Tributário</label>
              <input value={form.regime ?? ''} onChange={e => upd({ regime: e.target.value })} className={inp} placeholder="Simples Nacional…"/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Competência</label>
              <select value={form.competencia} onChange={e => upd({ competencia: e.target.value as Imposto['competencia'] })} className={inp}>
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Tipo de Cálculo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TIPO_INFO) as [TipoCalculoImposto, typeof TIPO_INFO[TipoCalculoImposto]][]).map(([tipo, info]) => (
                <label key={tipo} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form.tipo_calculo === tipo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="tipo_calculo" value={tipo} checked={form.tipo_calculo === tipo}
                    onChange={() => upd({ tipo_calculo: tipo })} className="accent-emerald-600 mt-0.5"/>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                    <p className="text-xs text-slate-500">{info.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.tipo_calculo === 'ALIQUOTA_FIXA' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Alíquota (%)</label>
                <input type="number" step="0.01" value={form.aliquota_pct ?? 0}
                  onChange={e => upd({ aliquota_pct: Number(e.target.value) })} className={inp}/>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Base de Cálculo</label>
                <select value={form.base_calculo} onChange={e => upd({ base_calculo: e.target.value as Imposto['base_calculo'] })} className={inp}>
                  <option value="RECEITA_BRUTA">Receita Bruta</option>
                  <option value="LUCRO_LIQUIDO">Lucro Líquido</option>
                  <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                  <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
                </select>
              </div>
            </div>
          )}

          {form.tipo_calculo === 'VALOR_FIXO_MENSAL' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Valor Mensal (R$)</label>
              <input type="number" step="0.01" value={form.valor_fixo ?? 0}
                onChange={e => upd({ valor_fixo: Number(e.target.value) })} className={inp}/>
            </div>
          )}

          {form.tipo_calculo === 'ALIQUOTA_PROGRESSIVA' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Faixas Progressivas</label>
                <button onClick={addFaixa} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200">
                  <Plus size={11}/> Faixa
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b">
                      <th className="text-left py-1">Receita De</th>
                      <th className="text-left py-1">Receita Até</th>
                      <th className="text-left py-1">Alíquota %</th>
                      <th className="text-left py-1">Dedução R$</th>
                      <th/>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.faixas_progressivas ?? []).map((f, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1 pr-2">
                          <input type="number" value={f.receita_min}
                            onChange={e => updFaixa(i, { receita_min: Number(e.target.value) })}
                            className="w-24 border border-slate-200 rounded px-2 py-1 text-xs"/>
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" value={f.receita_max ?? ''} placeholder="∞"
                            onChange={e => updFaixa(i, { receita_max: e.target.value ? Number(e.target.value) : null })}
                            className="w-24 border border-slate-200 rounded px-2 py-1 text-xs"/>
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" step="0.01" value={f.aliquota}
                            onChange={e => updFaixa(i, { aliquota: Number(e.target.value) })}
                            className="w-20 border border-slate-200 rounded px-2 py-1 text-xs"/>
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" step="0.01" value={f.deducao}
                            onChange={e => updFaixa(i, { deducao: Number(e.target.value) })}
                            className="w-24 border border-slate-200 rounded px-2 py-1 text-xs"/>
                        </td>
                        <td>
                          <button onClick={() => upd({ faixas_progressivas: (form.faixas_progressivas ?? []).filter((_, idx) => idx !== i) })}
                            className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-600 font-medium mb-1">Preview — Receita de R$ {previewReceita.toLocaleString('pt-BR')}</p>
            <p className="text-base font-bold text-emerald-800">
              Imposto: R$ {imposto_preview.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              {form.tipo_calculo === 'ALIQUOTA_FIXA' && form.aliquota_pct
                ? ` (${form.aliquota_pct}%)`
                : ''}
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => upd({ ativo: e.target.checked })} className="w-4 h-4 accent-emerald-600"/>
            <span className="text-sm text-slate-700">Imposto ativo</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nome.trim() || !form.sigla.trim()}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {imposto ? 'Salvar' : 'Criar Imposto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function Impostos() {
  const [impostos, setImpostos] = useState<Imposto[]>(IMPOSTOS_MOCK);
  const [modal, setModal] = useState<{ aberto: boolean; imp?: Imposto }>({ aberto: false });

  const receitaPreview = 85000;
  const cargaTotal = impostos.filter(i => i.ativo).reduce((s, i) => s + calcularImposto(i, receitaPreview), 0);
  const pctCarga = receitaPreview > 0 ? (cargaTotal / receitaPreview * 100).toFixed(1) : '0';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Impostos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastre alíquotas e regimes tributários</p>
        </div>
        <button onClick={() => setModal({ aberto: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
          <Plus size={15}/> Novo Imposto
        </button>
      </div>

      {/* Carga tributária total */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 mb-6 text-white">
        <p className="text-sm opacity-80 mb-1">Carga tributária estimada (receita R$ {receitaPreview.toLocaleString('pt-BR')})</p>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold">{pctCarga}%</p>
            <p className="text-sm opacity-75">da receita bruta</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold">R$ {cargaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-sm opacity-75">{impostos.filter(i => i.ativo).length} impostos ativos</p>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {impostos.map(imp => (
          <div key={imp.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${imp.ativo ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Landmark size={18} className={imp.ativo ? 'text-emerald-600' : 'text-slate-400'}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-slate-800">{imp.nome}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">{imp.sigla}</span>
                {!imp.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-500">Inativo</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{TIPO_INFO[imp.tipo_calculo]?.label}</span>
                <span>·</span>
                <span>{imp.regime ?? '—'}</span>
                <span>·</span>
                <span className="font-semibold text-emerald-600">
                  R$ {calcularImposto(imp, receitaPreview).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês
                </span>
              </div>
            </div>
            <button onClick={() => setImpostos(prev => prev.map(i => i.id === imp.id ? { ...i, ativo: !i.ativo } : i))}
              className="text-slate-400 hover:text-emerald-600 transition-colors">
              {imp.ativo ? <ToggleRight size={22} className="text-emerald-500"/> : <ToggleLeft size={22}/>}
            </button>
            <button onClick={() => setModal({ aberto: true, imp })} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
            <button onClick={() => setImpostos(prev => prev.filter(i => i.id !== imp.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
          </div>
        ))}

        {impostos.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Landmark size={32} className="mx-auto mb-3 opacity-30"/>
            <p>Nenhum imposto cadastrado</p>
          </div>
        )}
      </div>

      {modal.aberto && (
        <ImpostoModal
          imposto={modal.imp}
          onSave={(i) => {
            setImpostos(prev => {
              const idx = prev.findIndex(x => x.id === i.id);
              return idx >= 0 ? prev.map(x => x.id === i.id ? i : x) : [...prev, i];
            });
            setModal({ aberto: false });
          }}
          onClose={() => setModal({ aberto: false })}
        />
      )}
    </div>
  );
}
