// ─────────────────────────────────────────────────────────────────────────────
// NoCustoEditor.tsx — Modal de criação/edição de um Nó de Custo (5 abas)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { NoCusto, TipoNo, TipoValor, TipoGatilho, OperadorGatilho, Faixa, EscopoNo } from './types';
import { descricaoGatilho } from './costEngine';

const uid = () => `no-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const sel = inp;

const TIPO_NO_INFO: Record<TipoNo, { label: string; desc: string; icone: string }> = {
  CUSTO_FOLHA:        { label: 'Folha',         icone: '🍃', desc: 'Tem seu próprio valor. É o nó terminal da árvore.' },
  CUSTO_AGREGADOR:    { label: 'Agregador',     icone: '➕', desc: 'Soma, subtrai ou combina valores dos filhos.' },
  CUSTO_CONDICIONAL:  { label: 'Condicional',   icone: '🔀', desc: 'Escolhe UM filho baseado em condição. Funciona como IF/ELSE.' },
  CUSTO_MULTIPLICADOR:{ label: 'Multiplicador', icone: '✖️', desc: 'Multiplica o valor de um filho por um fator.' },
  CUSTO_DISTRIBUIDOR: { label: 'Distribuidor',  icone: '📦', desc: 'Distribui um valor entre produtos/grupos (rateio).' },
};

const TIPO_VALOR_INFO: Record<TipoValor, { label: string; desc: string }> = {
  FIXO:                   { label: 'Valor Fixo',                 desc: 'Custo constante todo período' },
  FIXO_UNITARIO:          { label: 'Fixo por Unidade',           desc: 'Valor × número de assinantes/itens' },
  ESCALONADO_VOLUME:      { label: 'Escalonado por Volume',      desc: 'Faixas de preço por volume (assinantes, GB…)' },
  ESCALONADO_FATURAMENTO: { label: 'Escalonado por Faturamento', desc: 'Faixas de preço por receita bruta' },
  PERCENTUAL_RECEITA:     { label: 'Percentual da Receita',      desc: '% aplicado sobre o faturamento bruto' },
  FORMULA:                { label: 'Fórmula Customizada',        desc: 'Expressão matemática com variáveis (fase 2)' },
};

const GATILHO_INFO: Record<TipoGatilho, { label: string; desc: string }> = {
  SEMPRE:            { label: 'Sempre ativo',          desc: 'Este custo sempre existe' },
  TOTAL_ASSINANTES:  { label: 'Total de Assinantes',   desc: 'Ativa quando tiver X assinantes ativos' },
  FATURAMENTO_TOTAL: { label: 'Faturamento Total',     desc: 'Ativa quando a receita bruta do mês atingir X' },
  TOTAL_PEDIDOS_MES: { label: 'Pedidos por Mês',       desc: 'Ativa quando tiver X pedidos no mês' },
  VOLUME_PRODUTO:    { label: 'Volume de Produto',     desc: 'Ativa quando um produto específico atinge X unidades' },
  VOLUME_GRUPO:      { label: 'Volume de Grupo',       desc: 'Ativa pelo volume de um grupo de produtos' },
  FATURAMENTO_GRUPO: { label: 'Faturamento de Grupo',  desc: 'Ativa pelo faturamento de um grupo de produtos' },
  VALOR_OUTRO_NO:    { label: 'Valor de Outro Nó',     desc: 'Ativa quando o resultado de outro nó atingir X' },
  DATA_CALENDARIO:   { label: 'Data de Calendário',   desc: 'Ativa em datas específicas' },
  CUSTOM_FORMULA:    { label: 'Fórmula Customizada',   desc: 'Condição via expressão matemática (fase 2)' },
};

const ESCOPO_INFO: Record<EscopoNo, { label: string; desc: string }> = {
  EMPRESA:      { label: 'Empresa',                desc: 'Aplica à empresa toda' },
  PRODUTO:      { label: 'Produto Específico',     desc: 'Aplica a um produto do catálogo' },
  GRUPO_PRODUTO:{ label: 'Grupo de Produto (ERP)', desc: 'Aplica a todos os produtos do grupo' },
  GRUPO_CUSTO:  { label: 'Grupo de Custo',         desc: 'Aplica a um grupo de custo personalizado' },
  FAIXA_PRECO:  { label: 'Faixa de Preço',         desc: 'Aplica a produtos dentro de uma faixa de preço' },
};

const OPCOES_OPERADOR: { value: OperadorGatilho; label: string }[] = [
  { value: '>',      label: 'Maior que (>)' },
  { value: '>=',     label: 'Maior ou igual (≥)' },
  { value: '<',      label: 'Menor que (<)' },
  { value: '<=',     label: 'Menor ou igual (≤)' },
  { value: '==',     label: 'Igual a (=)' },
  { value: 'between',label: 'Entre (between)' },
];

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
  no?: NoCusto;
  paiId?: string;
  onSave: (no: NoCusto) => void;
  onClose: () => void;
}

export default function NoCustoEditor({ no, onSave, onClose }: Props) {
  const [aba, setAba] = useState<'identidade' | 'valor' | 'gatilho' | 'escopo' | 'rateio'>('identidade');

  const [form, setForm] = useState<NoCusto>(() => no ?? {
    id: uid(),
    nome: '',
    descricao: '',
    icone: '💰',
    cor_display: '#6366f1',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'FIXO', valor: 0, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'SEMPRE' },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 0,
    posicao: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
  });

  const upd = (patch: Partial<NoCusto>) => setForm(f => ({ ...f, ...patch }));
  const updValor = (patch: Partial<NoCusto['estrutura_valor']>) => setForm(f => ({ ...f, estrutura_valor: { ...f.estrutura_valor, ...patch } }));
  const updGatilho = (patch: Partial<NoCusto['gatilho']>) => setForm(f => ({ ...f, gatilho: { ...f.gatilho, ...patch } }));

  // Faixas
  const addFaixa = () => {
    const faixas = [...(form.estrutura_valor.faixas ?? [])];
    const last = faixas[faixas.length - 1];
    faixas.push({ de: last ? (last.ate ?? last.de) + 1 : 0, ate: null, valor: 0 });
    updValor({ faixas });
  };
  const updFaixa = (i: number, patch: Partial<Faixa>) => {
    const faixas = (form.estrutura_valor.faixas ?? []).map((f, idx) => idx === i ? { ...f, ...patch } : f);
    updValor({ faixas });
  };
  const remFaixa = (i: number) => updValor({ faixas: (form.estrutura_valor.faixas ?? []).filter((_, idx) => idx !== i) });

  // Preview de valor (simulação rápida)
  const previewAssinantes = 47;
  const previewFaturamento = 85000;

  const ABAS: { id: string; label: string; hidden?: boolean }[] = [
    { id: 'identidade', label: 'Identidade' },
    { id: 'valor',      label: 'Valor',    hidden: form.tipo_no !== 'CUSTO_FOLHA' && form.tipo_no !== 'CUSTO_MULTIPLICADOR' },
    { id: 'gatilho',    label: 'Gatilho' },
    { id: 'escopo',     label: 'Escopo' },
    { id: 'rateio',     label: 'Rateio',   hidden: form.tipo_no !== 'CUSTO_DISTRIBUIDOR' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{form.icone}</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{no ? 'Editar Nó' : 'Novo Nó de Custo'}</h2>
              <p className="text-xs text-slate-500">{form.nome || 'Sem nome ainda…'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 px-6 shrink-0">
          {ABAS.filter(a => !a.hidden).map(a => (
            <button key={a.id} onClick={() => setAba(a.id as 'identidade' | 'valor' | 'gatilho' | 'escopo' | 'rateio')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${aba === a.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── ABA: Identidade ── */}
          {aba === 'identidade' && (
            <>
              <div className="flex gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ícone</label>
                  <input value={form.icone} onChange={e => upd({ icone: e.target.value })}
                    className="w-16 h-10 border border-slate-200 rounded-lg text-center text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Nome *</label>
                  <input value={form.nome} onChange={e => upd({ nome: e.target.value })} placeholder="Ex: Claude AI, Servidor AWS…" className={inp}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cor</label>
                  <input type="color" value={form.cor_display} onChange={e => upd({ cor_display: e.target.value })}
                    className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"/>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Descrição</label>
                <textarea rows={2} value={form.descricao ?? ''} onChange={e => upd({ descricao: e.target.value })}
                  placeholder="Descreva o que este custo representa…" className={inp + ' resize-none'}/>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-2">Tipo do Nó</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(TIPO_NO_INFO) as [TipoNo, typeof TIPO_NO_INFO[TipoNo]][]).map(([tipo, info]) => (
                    <label key={tipo} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.tipo_no === tipo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="tipo_no" value={tipo} checked={form.tipo_no === tipo}
                        onChange={() => upd({ tipo_no: tipo })} className="accent-emerald-600"/>
                      <span className="text-xl">{info.icone}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                        <p className="text-xs text-slate-500">{info.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => upd({ ativo: e.target.checked })} className="w-4 h-4 accent-emerald-600"/>
                <label htmlFor="ativo" className="text-sm text-slate-700">Nó ativo</label>
              </div>
            </>
          )}

          {/* ── ABA: Valor ── */}
          {aba === 'valor' && (form.tipo_no === 'CUSTO_FOLHA' || form.tipo_no === 'CUSTO_MULTIPLICADOR') && (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Tipo de Valor</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(TIPO_VALOR_INFO) as [TipoValor, typeof TIPO_VALOR_INFO[TipoValor]][]).map(([tipo, info]) => (
                    <label key={tipo} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.estrutura_valor.tipo === tipo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="tipo_valor" value={tipo} checked={form.estrutura_valor.tipo === tipo}
                        onChange={() => updValor({ tipo })} className="accent-emerald-600"/>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                        <p className="text-xs text-slate-500">{info.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* FIXO */}
              {form.estrutura_valor.tipo === 'FIXO' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={form.estrutura_valor.valor ?? 0}
                      onChange={e => updValor({ valor: Number(e.target.value) })} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Recorrência</label>
                    <select value={form.estrutura_valor.recorrencia ?? 'MENSAL'} onChange={e => updValor({ recorrencia: e.target.value as never })} className={sel}>
                      <option value="MENSAL">Mensal</option>
                      <option value="ANUAL">Anual</option>
                      <option value="POR_EVENTO">Por Evento</option>
                      <option value="POR_UNIDADE">Por Unidade</option>
                    </select>
                  </div>
                  <div className="col-span-2 bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700">
                    💡 Este custo será <strong>R$ {(form.estrutura_valor.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> todo mês
                  </div>
                </div>
              )}

              {/* FIXO_UNITARIO */}
              {form.estrutura_valor.tipo === 'FIXO_UNITARIO' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Valor por Unidade (R$)</label>
                      <input type="number" step="0.01" value={form.estrutura_valor.valor ?? 0}
                        onChange={e => updValor({ valor: Number(e.target.value) })} className={inp}/>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Unidade</label>
                      <input value={form.estrutura_valor.unidade_escalonamento ?? 'assinantes'}
                        onChange={e => updValor({ unidade_escalonamento: e.target.value })} className={inp} placeholder="assinantes, GB…"/>
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700">
                    💡 Com <strong>{previewAssinantes} {form.estrutura_valor.unidade_escalonamento ?? 'unidades'}</strong>: R$ {((form.estrutura_valor.valor ?? 0) * previewAssinantes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* ESCALONADO */}
              {(form.estrutura_valor.tipo === 'ESCALONADO_VOLUME' || form.estrutura_valor.tipo === 'ESCALONADO_FATURAMENTO') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Faixas de preço</label>
                    <button onClick={addFaixa} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200">
                      <Plus size={11}/> Faixa
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b">
                        <th className="text-left py-1">De</th>
                        <th className="text-left py-1">Até</th>
                        <th className="text-left py-1">Valor / unidade</th>
                        <th/>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.estrutura_valor.faixas ?? []).map((faixa, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-1 pr-2">
                            <input type="number" value={faixa.de} onChange={e => updFaixa(i, { de: Number(e.target.value) })}
                              className="w-20 border border-slate-200 rounded px-2 py-1 text-xs"/>
                          </td>
                          <td className="py-1 pr-2">
                            <input type="number" value={faixa.ate ?? ''} placeholder="∞"
                              onChange={e => updFaixa(i, { ate: e.target.value ? Number(e.target.value) : null })}
                              className="w-20 border border-slate-200 rounded px-2 py-1 text-xs"/>
                          </td>
                          <td className="py-1 pr-2">
                            <input type="number" step="0.01" value={faixa.valor}
                              onChange={e => updFaixa(i, { valor: Number(e.target.value) })}
                              className="w-24 border border-slate-200 rounded px-2 py-1 text-xs"/>
                          </td>
                          <td className="py-1">
                            <button onClick={() => remFaixa(i)} className="p-1 text-red-400 hover:text-red-600">
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Preview com slider */}
                  <div className="bg-emerald-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-emerald-700">
                      💡 Com <strong>{form.estrutura_valor.tipo === 'ESCALONADO_VOLUME' ? previewAssinantes + ' assinantes' : 'R$ ' + previewFaturamento.toLocaleString('pt-BR')}</strong>:
                      {(() => {
                        const metrica = form.estrutura_valor.tipo === 'ESCALONADO_VOLUME' ? previewAssinantes : previewFaturamento;
                        const faixa = (form.estrutura_valor.faixas ?? []).find(f => metrica >= f.de && (f.ate === null || metrica <= f.ate));
                        const total = faixa ? (form.estrutura_valor.tipo === 'ESCALONADO_VOLUME' ? faixa.valor * metrica : faixa.valor) : 0;
                        return faixa
                          ? ` Faixa [${faixa.de}–${faixa.ate ?? '∞'}] × R$ ${faixa.valor} = R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : ' Nenhuma faixa aplicável';
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* PERCENTUAL_RECEITA */}
              {form.estrutura_valor.tipo === 'PERCENTUAL_RECEITA' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Percentual (%)</label>
                    <input type="number" step="0.01" value={form.estrutura_valor.percentual ?? 0}
                      onChange={e => updValor({ percentual: Number(e.target.value) })} className={inp}/>
                  </div>
                  <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700">
                    💡 Com faturamento de R$ {previewFaturamento.toLocaleString('pt-BR')} → R$ {((previewFaturamento * (form.estrutura_valor.percentual ?? 0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ABA: Gatilho ── */}
          {aba === 'gatilho' && (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Tipo de Gatilho</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(GATILHO_INFO) as [TipoGatilho, typeof GATILHO_INFO[TipoGatilho]][]).map(([tipo, info]) => (
                    <label key={tipo} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.gatilho.tipo === tipo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="tipo_gatilho" value={tipo} checked={form.gatilho.tipo === tipo}
                        onChange={() => updGatilho({ tipo, operador: '>=', valor_referencia: 0 })} className="accent-emerald-600"/>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                        <p className="text-xs text-slate-500">{info.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.gatilho.tipo !== 'SEMPRE' && form.gatilho.tipo !== 'DATA_CALENDARIO' && form.gatilho.tipo !== 'CUSTOM_FORMULA' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Operador</label>
                    <select value={form.gatilho.operador ?? '>='} onChange={e => updGatilho({ operador: e.target.value as OperadorGatilho })} className={sel}>
                      {OPCOES_OPERADOR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Valor de referência</label>
                    <input type="number" value={form.gatilho.valor_referencia ?? 0}
                      onChange={e => updGatilho({ valor_referencia: Number(e.target.value) })} className={inp}/>
                  </div>
                  {form.gatilho.operador === 'between' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Até (para between)</label>
                      <input type="number" value={form.gatilho.valor_referencia_2 ?? ''}
                        onChange={e => updGatilho({ valor_referencia_2: Number(e.target.value) })} className={inp}/>
                    </div>
                  )}
                </div>
              )}

              {/* Preview legível do gatilho */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1 font-medium">Preview:</p>
                <p className="text-sm text-slate-700">
                  Este custo será incluído quando: <strong>{descricaoGatilho(form.gatilho)}</strong>
                </p>
              </div>
            </>
          )}

          {/* ── ABA: Escopo ── */}
          {aba === 'escopo' && (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Escopo de Aplicação</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(ESCOPO_INFO) as [EscopoNo, typeof ESCOPO_INFO[EscopoNo]][]).map(([escopo, info]) => (
                    <label key={escopo} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.escopo === escopo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="escopo" value={escopo} checked={form.escopo === escopo}
                        onChange={() => upd({ escopo })} className="accent-emerald-600"/>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                        <p className="text-xs text-slate-500">{info.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.escopo === 'FAIXA_PRECO' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Preço Mínimo (R$)</label>
                    <input type="number" value={form.faixa_preco_min ?? 0}
                      onChange={e => upd({ faixa_preco_min: Number(e.target.value) })} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Preço Máximo (R$)</label>
                    <input type="number" value={form.faixa_preco_max ?? 0}
                      onChange={e => upd({ faixa_preco_max: Number(e.target.value) })} className={inp}/>
                  </div>
                  <p className="col-span-2 text-xs text-slate-500">
                    Aplica a todos os produtos com preço entre R$ {(form.faixa_preco_min ?? 0).toLocaleString('pt-BR')} e R$ {(form.faixa_preco_max ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── ABA: Rateio ── */}
          {aba === 'rateio' && form.tipo_no === 'CUSTO_DISTRIBUIDOR' && (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Método de Rateio</label>
                {(['PROPORCIONAL_RECEITA','PROPORCIONAL_VOLUME','IGUALITARIO','PERCENTUAL_FIXO'] as const).map(m => (
                  <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all mb-2
                    ${form.config_rateio?.metodo === m ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="metodo_rateio" value={m} checked={form.config_rateio?.metodo === m}
                      onChange={() => upd({ config_rateio: { metodo: m } })} className="accent-emerald-600"/>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {{ PROPORCIONAL_RECEITA: 'Proporcional à Receita', PROPORCIONAL_VOLUME: 'Proporcional ao Volume', IGUALITARIO: 'Igualitário', PERCENTUAL_FIXO: 'Percentual Fixo por Produto' }[m]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={!form.nome.trim()}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {no ? 'Salvar Alterações' : 'Criar Nó'}
          </button>
        </div>
      </div>
    </div>
  );
}
