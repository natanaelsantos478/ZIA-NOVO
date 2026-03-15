// ─────────────────────────────────────────────────────────────────────────────
// ArestaEditor.tsx — Modal de criação/edição de uma Aresta (relação entre nós)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { ArestaCusto, NoCusto, TipoRelacao, OperadorGatilho, TipoGatilho } from './types';
import { descricaoGatilho } from './costEngine';

const uid = () => `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

const RELACAO_INFO: Record<TipoRelacao, { label: string; desc: string; cor: string }> = {
  SOMA:          { label: 'Soma',          cor: '#16a34a', desc: 'pai += valor do filho' },
  SUBTRAI:       { label: 'Subtrai',       cor: '#dc2626', desc: 'pai -= valor do filho' },
  SUBSTITUI:     { label: 'Substitui',     cor: '#2563eb', desc: 'filho substitui completamente o pai (para Condicional)' },
  MULTIPLICA_POR:{ label: 'Multiplica por',cor: '#ca8a04', desc: 'pai *= fator × valor do filho' },
  DIVIDE_POR:    { label: 'Divide por',    cor: '#9333ea', desc: 'pai /= valor do filho' },
  ATIVA_SE:      { label: 'Ativa Se',      cor: '#0891b2', desc: 'filho só incluído se condição for verdadeira' },
  MODIFICA_FAIXA:{ label: 'Modifica Faixa',cor: '#94a3b8', desc: 'filho altera a faixa ativa do pai' },
};

interface Props {
  aresta?: ArestaCusto;
  nos: NoCusto[];
  onSave: (a: ArestaCusto) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ArestaEditor({ aresta, nos, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<ArestaCusto>(() => aresta ?? {
    id: uid(),
    no_pai_id: nos[0]?.id ?? '',
    no_filho_id: nos[1]?.id ?? '',
    tipo_relacao: 'SOMA',
    condicao_aresta: { tipo: 'SEMPRE' },
    prioridade: 0,
    fator: 1,
    ativo: true,
  });

  const upd = (patch: Partial<ArestaCusto>) => setForm(f => ({ ...f, ...patch }));
  const updCond = (patch: Partial<ArestaCusto['condicao_aresta']>) => setForm(f => ({ ...f, condicao_aresta: { ...f.condicao_aresta, ...patch } }));

  const noPai  = nos.find(n => n.id === form.no_pai_id);
  const noFilho = nos.find(n => n.id === form.no_filho_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">{aresta ? 'Editar Relação' : 'Nova Relação entre Nós'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={18}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nó pai e filho */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nó Pai</label>
              <select value={form.no_pai_id} onChange={e => upd({ no_pai_id: e.target.value })} className={inp}>
                {nos.map(n => <option key={n.id} value={n.id}>{n.icone} {n.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nó Filho</label>
              <select value={form.no_filho_id} onChange={e => upd({ no_filho_id: e.target.value })} className={inp}>
                {nos.filter(n => n.id !== form.no_pai_id).map(n => (
                  <option key={n.id} value={n.id}>{n.icone} {n.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Seta visual */}
          {noPai && noFilho && (
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-center gap-3 text-sm">
              <span className="font-semibold text-slate-700">{noPai.icone} {noPai.nome}</span>
              <span className="text-slate-400 text-lg">→</span>
              <span className="font-semibold text-slate-700">{noFilho.icone} {noFilho.nome}</span>
            </div>
          )}

          {/* Tipo de relação */}
          <div>
            <label className="text-xs text-slate-400 block mb-2">Tipo de Relação</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(RELACAO_INFO) as [TipoRelacao, typeof RELACAO_INFO[TipoRelacao]][]).map(([tipo, info]) => (
                <label key={tipo} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form.tipo_relacao === tipo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="tipo_relacao" value={tipo} checked={form.tipo_relacao === tipo}
                    onChange={() => upd({ tipo_relacao: tipo })} className="accent-emerald-600"/>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: info.cor }}/>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                      <p className="text-xs text-slate-500 font-mono">{info.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Fator (para MULTIPLICA_POR) */}
          {form.tipo_relacao === 'MULTIPLICA_POR' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fator de Multiplicação</label>
              <input type="number" step="0.01" value={form.fator ?? 1}
                onChange={e => upd({ fator: Number(e.target.value) })} className={inp}/>
            </div>
          )}

          {/* Condição da aresta */}
          <div>
            <label className="text-xs text-slate-500 font-semibold block mb-2">Condição desta Aresta</label>
            <p className="text-xs text-slate-400 mb-2">Quando esta relação é válida? (além do gatilho do nó pai)</p>
            <select value={form.condicao_aresta.tipo} onChange={e => updCond({ tipo: e.target.value as TipoGatilho, operador: '>=', valor_referencia: 0 })} className={inp}>
              <option value="SEMPRE">Sempre (sem condição extra)</option>
              <option value="TOTAL_ASSINANTES">Assinantes ativos</option>
              <option value="FATURAMENTO_TOTAL">Faturamento total</option>
              <option value="TOTAL_PEDIDOS_MES">Pedidos no mês</option>
              <option value="VOLUME_PRODUTO">Volume de produto</option>
              <option value="FATURAMENTO_GRUPO">Faturamento de grupo</option>
            </select>

            {form.condicao_aresta.tipo !== 'SEMPRE' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Operador</label>
                  <select value={form.condicao_aresta.operador ?? '>='} onChange={e => updCond({ operador: e.target.value as OperadorGatilho })} className={inp}>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                    <option value="between">between</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Valor</label>
                  <input type="number" value={form.condicao_aresta.valor_referencia ?? 0}
                    onChange={e => updCond({ valor_referencia: Number(e.target.value) })} className={inp}/>
                </div>
                {form.condicao_aresta.operador === 'between' && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Até</label>
                    <input type="number" value={form.condicao_aresta.valor_referencia_2 ?? ''}
                      onChange={e => updCond({ valor_referencia_2: Number(e.target.value) })} className={inp}/>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Prioridade</label>
              <input type="number" value={form.prioridade} onChange={e => upd({ prioridade: Number(e.target.value) })} className={inp}/>
              <p className="text-[10px] text-slate-400 mt-0.5">Maior = avaliado primeiro (para Condicional)</p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1 font-medium">Preview:</p>
            <p className="text-sm text-slate-700">
              Se <strong>{descricaoGatilho(form.condicao_aresta)}</strong>, o nó <strong>{noFilho?.nome ?? '?'}</strong> será {RELACAO_INFO[form.tipo_relacao]?.label.toLowerCase() ?? '?'} ao nó <strong>{noPai?.nome ?? '?'}</strong>
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => upd({ ativo: e.target.checked })} className="w-4 h-4 accent-emerald-600"/>
            <span className="text-sm text-slate-700">Relação ativa</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0">
          {aresta ? (
            <button onClick={() => onDelete(form.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100">
              <Trash2 size={14}/> Excluir
            </button>
          ) : <div/>}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={() => onSave(form)}
              disabled={!form.no_pai_id || !form.no_filho_id || form.no_pai_id === form.no_filho_id}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {aresta ? 'Salvar' : 'Criar Relação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
