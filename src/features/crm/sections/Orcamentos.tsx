// ─────────────────────────────────────────────────────────────────────────────
// Orcamentos.tsx — Módulo de Orçamentos do CRM
// Todo orçamento OBRIGATORIAMENTE vinculado a uma Negociação
// Lista global + Editor (Dados / Produtos / Apresentação) + Config global
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ArrowLeft, Check, Search, Settings2, AlertCircle,
  X, Loader2, Trash2, Edit3,
  Truck, Package, Briefcase,
} from 'lucide-react';
import {
  getAllNegociacoes, setOrcamento,
  type NegociacaoData, type Orcamento as OrcBase, type ItemOrcamento, type OrcamentoStatus,
} from '../data/crmData';
import {
  getProdutos, getProdutoFotos,
  type ErpProduto, type ErpProdutoFoto,
} from '../../../lib/erp';
import ApresentacaoEditor, {
  paginaCapa, paginaProdutos, paginaContracapa,
  type PaginaApresentacao, type ConfigApresentacao,
} from './orcamentos/ApresentacaoEditor';

/* ── TYPES ─────────────────────────────────────────────────────────────────── */
type TabPrincipal  = 'lista' | 'config';
type TabEditor     = 'dados' | 'produtos' | 'apresentacao';

interface OrcEnvolvido {
  negId: string;
  negociacao: NegociacaoData;
  orcamento:  OrcBase;
  paginas:    PaginaApresentacao[];
}

/* ── CONSTANTS ──────────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<OrcamentoStatus, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho',  cls: 'bg-slate-100 text-slate-600'  },
  enviado:  { label: 'Enviado',   cls: 'bg-blue-100 text-blue-700'    },
  aprovado: { label: 'Aprovado',  cls: 'bg-green-100 text-green-700'  },
  recusado: { label: 'Recusado',  cls: 'bg-red-100 text-red-700'      },
};

const CONDICOES = ['À vista','30 dias','30/60','30/60/90','Parcelado','A negociar'];
const FORMAS_ENTREGA = ['CIF (por conta do vendedor)','FOB (por conta do comprador)','Retirada','Digital'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Math.random().toString(36).slice(2, 9);

function orcVazio(negId: string, neg: NegociacaoData): OrcEnvolvido {
  const orc: OrcBase = {
    id: uid(), status: 'rascunho',
    condicao_pagamento: 'À vista', desconto_global_pct: 0, frete: 0,
    itens: [], total: 0, dataCriacao: new Date().toISOString().slice(0,10),
    criado_por: 'usuario',
    validade: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
    prazo_entrega: '', forma_entrega: '', local_entrega: '', vendedor: neg.negociacao.responsavel,
    observacoes: '', condicoes_comerciais: '',
    numero: `ORC-${Date.now().toString().slice(-6)}`,
  };
  return { negId, negociacao: neg, orcamento: orc, paginas: [] };
}

/* ── GLOBAL CONFIG ──────────────────────────────────────────────────────────── */
const CONFIG_PADRAO: ConfigApresentacao = {
  logo: '', corPrimaria: '#7c3aed', corSecundaria: '#4f46e5',
  fontePrincipal: 'Inter, sans-serif', rodape: 'Obrigado pela preferência.',
  empresa: 'Minha Empresa',
};

/* ── VISUAL PREVIEW (quotation document preview) ────────────────────────────── */
function PreviewOrcamento({ envolvido, config }: { envolvido: OrcEnvolvido; config: ConfigApresentacao }) {
  const { negociacao: neg, orcamento: orc } = envolvido;
  const subtotal = orc.itens.reduce((s, i) => s + i.total, 0);
  const descGlobal = subtotal * (orc.desconto_global_pct / 100);
  const total = subtotal - descGlobal + orc.frete;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow text-xs" style={{ fontFamily: config.fontePrincipal }}>
      {/* Header */}
      <div style={{ background: config.corPrimaria }} className="px-4 py-3">
        {config.logo && <img src={config.logo} className="h-8 mb-2 object-contain" alt="logo"/>}
        {!config.logo && <p className="text-white font-bold text-sm mb-1">{config.empresa}</p>}
        <div className="flex justify-between text-white/80 text-xs">
          <span>{orc.numero ?? '—'}</span>
          <span>Válido até: {orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '—'}</span>
        </div>
      </div>
      {/* Client */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
        <p className="font-semibold text-slate-700">{neg.negociacao.clienteNome}</p>
        <p className="text-slate-400">{neg.negociacao.clienteEmail ?? ''}</p>
      </div>
      {/* Items */}
      <div className="px-4 py-2">
        {orc.itens.length === 0 ? (
          <p className="text-slate-400 italic py-2 text-center">Nenhum produto adicionado</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left py-1 text-slate-500 font-medium">Produto</th>
              <th className="text-center py-1 text-slate-500 font-medium">Qtd</th>
              <th className="text-right py-1 text-slate-500 font-medium">Total</th>
            </tr></thead>
            <tbody>
              {orc.itens.map(item => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="py-1 text-slate-700">{item.produto_nome}</td>
                  <td className="py-1 text-center text-slate-500">{item.quantidade}</td>
                  <td className="py-1 text-right font-semibold text-slate-800">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Totals */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 space-y-0.5">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
        {orc.desconto_global_pct > 0 && <div className="flex justify-between text-green-700"><span>Desconto ({orc.desconto_global_pct}%)</span><span>-{fmt(descGlobal)}</span></div>}
        {orc.frete > 0 && <div className="flex justify-between text-slate-500"><span>Frete</span><span>{fmt(orc.frete)}</span></div>}
        <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
          <span>TOTAL</span><span style={{ color: config.corPrimaria }}>{fmt(total)}</span>
        </div>
        <p className="text-slate-400 mt-1">Pagamento: {orc.condicao_pagamento}</p>
      </div>
    </div>
  );
}

/* ── TAB DADOS ──────────────────────────────────────────────────────────────── */
function TabDados({
  envolvido, setEnvolvido,
}: { envolvido: OrcEnvolvido; setEnvolvido: (e: OrcEnvolvido) => void }) {
  const orc = envolvido.orcamento;
  const setOrc = (patch: Partial<OrcBase>) => setEnvolvido({ ...envolvido, orcamento: { ...orc, ...patch } });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Negociação vinculada (obrigatório) */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={15} className="text-purple-600"/>
          <span className="text-sm font-bold text-purple-700">Negociação Vinculada *</span>
        </div>
        {envolvido.negociacao ? (
          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">{envolvido.negociacao.negociacao.clienteNome}</p>
              <p className="text-xs text-slate-500">{envolvido.negociacao.negociacao.descricao ?? 'Sem descrição'}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              envolvido.negociacao.negociacao.status === 'aberta' ? 'bg-blue-100 text-blue-700' :
              envolvido.negociacao.negociacao.status === 'ganha' ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-600'
            }`}>{envolvido.negociacao.negociacao.status}</span>
          </div>
        ) : (
          <p className="text-sm text-purple-500 italic">Selecione uma negociação</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Informações do Orçamento</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Número</label>
            <input value={orc.numero ?? ''} onChange={e => setOrc({ numero: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={orc.status} onChange={e => setOrc({ status: e.target.value as OrcamentoStatus })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              {(Object.entries(STATUS_MAP) as [OrcamentoStatus, {label:string}][]).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Validade</label>
            <input type="date" value={orc.validade ?? ''} onChange={e => setOrc({ validade: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Vendedor</label>
            <input value={orc.vendedor ?? ''} onChange={e => setOrc({ vendedor: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Condição de Pagamento</label>
            <select value={orc.condicao_pagamento} onChange={e => setOrc({ condicao_pagamento: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              {CONDICOES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Prazo de Entrega</label>
            <input value={orc.prazo_entrega ?? ''} onChange={e => setOrc({ prazo_entrega: e.target.value })}
              placeholder="Ex: 15 dias úteis"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Forma de Entrega</label>
            <select value={orc.forma_entrega ?? ''} onChange={e => setOrc({ forma_entrega: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">—</option>
              {FORMAS_ENTREGA.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Local de Entrega</label>
            <input value={orc.local_entrega ?? ''} onChange={e => setOrc({ local_entrega: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Condições Comerciais</label>
          <textarea rows={3} value={orc.condicoes_comerciais ?? ''} onChange={e => setOrc({ condicoes_comerciais: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"/>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Observações</label>
          <textarea rows={3} value={orc.observacoes ?? ''} onChange={e => setOrc({ observacoes: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"/>
        </div>
      </div>
    </div>
  );
}

/* ── TAB PRODUTOS ───────────────────────────────────────────────────────────── */
function TabProdutos({
  envolvido, setEnvolvido, produtos, fotos, loadingProd,
}: {
  envolvido: OrcEnvolvido; setEnvolvido: (e: OrcEnvolvido) => void;
  produtos: ErpProduto[]; fotos: Record<string, ErpProdutoFoto[]>; loadingProd: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const orc = envolvido.orcamento;
  const items = orc.itens;

  const recalcTotal = (itens: ItemOrcamento[]): OrcBase => {
    const sub = itens.reduce((s, i) => s + i.total, 0);
    const desc = sub * (orc.desconto_global_pct / 100);
    return { ...orc, itens, total: sub - desc + orc.frete };
  };

  const addItem = (prod: ErpProduto) => {
    const novoItem: ItemOrcamento = {
      id: uid(), produto_id: prod.id, produto_nome: prod.nome,
      codigo: prod.codigo_interno, unidade: prod.unidade_medida,
      quantidade: 1, preco_unitario: prod.preco_venda,
      desconto_pct: 0, total: prod.preco_venda,
    };
    setEnvolvido({ ...envolvido, orcamento: recalcTotal([...items, novoItem]) });
    setShowCatalog(false);
  };

  const updateItem = (id: string, patch: Partial<ItemOrcamento>) => {
    const updated = items.map(i => {
      if (i.id !== id) return i;
      const merged = { ...i, ...patch };
      const base = merged.preco_unitario * merged.quantidade;
      merged.total = base * (1 - merged.desconto_pct / 100);
      return merged;
    });
    setEnvolvido({ ...envolvido, orcamento: recalcTotal(updated) });
  };

  const removeItem = (id: string) => {
    setEnvolvido({ ...envolvido, orcamento: recalcTotal(items.filter(i => i.id !== id)) });
  };

  const setGlobal = (field: 'desconto_global_pct'|'frete', val: number) => {
    const sub = items.reduce((s, i) => s + i.total, 0);
    const newDesc = field === 'desconto_global_pct' ? val : orc.desconto_global_pct;
    const newFrete = field === 'frete' ? val : orc.frete;
    const total = sub * (1 - newDesc/100) + newFrete;
    setEnvolvido({ ...envolvido, orcamento: { ...orc, [field]: val, total } });
  };

  const filtrados = produtos.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo_interno.includes(busca)
  );

  const sub = items.reduce((s, i) => s + i.total, 0);
  const descGlobal = sub * (orc.desconto_global_pct / 100);
  const total = sub - descGlobal + orc.frete;

  return (
    <div className="p-6 flex gap-5 h-full overflow-hidden">
      {/* Left: items + controls */}
      <div className="flex-1 flex flex-col overflow-hidden space-y-4 min-w-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCatalog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
            <Plus size={15}/> Adicionar do Catálogo
          </button>
          {loadingProd && <Loader2 size={15} className="text-slate-400 animate-spin"/>}
        </div>

        {/* Product list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 min-h-0">
          <div className="bg-slate-700 text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide">SERVIÇOS / PRODUTOS</span>
            <span className="text-xs text-slate-300">{items.length} item(s)</span>
          </div>
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Package size={32} className="mx-auto mb-2 text-slate-300"/>
              Nenhum produto. Clique em "Adicionar do Catálogo".
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar h-full">
              {items.map(item => {
                const prod = produtos.find(p => p.id === item.produto_id);
                const foto = prod ? fotos[prod.id]?.[0]?.url : undefined;
                return (
                  <div key={item.id} className="border-b border-slate-100 last:border-0 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {foto ? <img src={foto} className="w-full h-full object-cover" alt=""/> : <Package size={20} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.produto_nome}</p>
                        <p className="text-xs text-slate-400">{item.codigo} · {item.unidade}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14}/></button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-0.5">Qtd</label>
                        <input type="number" min={1} value={item.quantidade} onChange={e => updateItem(item.id, { quantidade: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-0.5">Preço unitário</label>
                        <input type="number" min={0} step={0.01} value={item.preco_unitario} onChange={e => updateItem(item.id, { preco_unitario: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-0.5">Desc. % (item)</label>
                        <input type="number" min={0} max={100} step={0.1} value={item.desconto_pct} onChange={e => updateItem(item.id, { desconto_pct: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-0.5">Total</label>
                        <p className="text-sm font-bold text-slate-800 pt-1">{fmt(item.total)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-slate-700 text-white rounded-xl p-4 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Desconto Global (%)</label>
              <input type="number" min={0} max={100} step={0.1} value={orc.desconto_global_pct}
                onChange={e => setGlobal('desconto_global_pct', Number(e.target.value))}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none"/>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 flex items-center gap-1"><Truck size={11}/>Frete (R$)</label>
              <input type="number" min={0} step={0.01} value={orc.frete}
                onChange={e => setGlobal('frete', Number(e.target.value))}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none"/>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-600">
            <div className="flex justify-between text-sm text-slate-300 mb-0.5"><span>Subtotal</span><span>{fmt(sub)}</span></div>
            {orc.desconto_global_pct > 0 && <div className="flex justify-between text-sm text-green-400 mb-0.5"><span>Desconto ({orc.desconto_global_pct}%)</span><span>-{fmt(descGlobal)}</span></div>}
            {orc.frete > 0 && <div className="flex justify-between text-sm text-slate-300 mb-0.5"><span>Frete</span><span>{fmt(orc.frete)}</span></div>}
            <div className="flex justify-between font-bold text-base mt-1"><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="w-64 shrink-0 space-y-3">
        <p className="text-xs font-bold text-slate-500 tracking-wide">PRÉVIA DO DOCUMENTO</p>
        <PreviewOrcamento envolvido={envolvido} config={CONFIG_PADRAO}/>
      </div>

      {/* Catalog modal */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">Catálogo de Produtos</h3>
              <button onClick={() => setShowCatalog(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou código..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {loadingProd && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-500" size={24}/></div>}
              {filtrados.map(prod => {
                const foto = fotos[prod.id]?.[0]?.url;
                const jaAdicionado = items.some(i => i.produto_id === prod.id);
                return (
                  <div key={prod.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-purple-50/50 cursor-pointer"
                    onClick={() => !jaAdicionado && addItem(prod)}>
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                      {foto ? <img src={foto} className="w-full h-full object-cover" alt=""/> : <Package size={18} className="text-slate-300"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{prod.nome}</p>
                      <p className="text-xs text-slate-400">{prod.codigo_interno} · {prod.unidade_medida}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-700">{fmt(prod.preco_venda)}</p>
                      {jaAdicionado ? (
                        <span className="text-xs text-green-600 flex items-center gap-0.5"><Check size={11}/> Adicionado</span>
                      ) : (
                        <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">+ Adicionar</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loadingProd && filtrados.length === 0 && (
                <p className="text-center text-slate-400 py-8">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── EDITOR ─────────────────────────────────────────────────────────────────── */
function EditorOrcamento({
  envolvido, onSave, onCancel, produtos, fotos, loadingProd, configGlobal,
}: {
  envolvido: OrcEnvolvido;
  onSave: (e: OrcEnvolvido) => void;
  onCancel: () => void;
  produtos: ErpProduto[];
  fotos: Record<string, ErpProdutoFoto[]>;
  loadingProd: boolean;
  configGlobal: ConfigApresentacao;
}) {
  const [local, setLocal] = useState<OrcEnvolvido>(envolvido);
  const [tab, setTab] = useState<TabEditor>('dados');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await setOrcamento(local.negId, local.orcamento);
      onSave({ ...local, orcamento: saved });
    } catch {
      onSave(local); // fallback: save locally
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: TabEditor; label: string }[] = [
    { id: 'dados',        label: 'Dados Gerais'   },
    { id: 'produtos',     label: 'Produtos'        },
    { id: 'apresentacao', label: 'Apresentação'    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">{local.orcamento.numero ?? 'Novo Orçamento'}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_MAP[local.orcamento.status].cls}`}>
              {STATUS_MAP[local.orcamento.status].label}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Briefcase size={11}/>{local.negociacao.negociacao.clienteNome} — {local.negociacao.negociacao.descricao ?? ''}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
          Salvar Orçamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        {tab === 'dados' && <div className="h-full overflow-y-auto"><TabDados envolvido={local} setEnvolvido={setLocal}/></div>}
        {tab === 'produtos' && <TabProdutos envolvido={local} setEnvolvido={setLocal} produtos={produtos} fotos={fotos} loadingProd={loadingProd}/>}
        {tab === 'apresentacao' && (
          <ApresentacaoEditor
            paginas={local.paginas.length > 0 ? local.paginas : [paginaCapa(configGlobal), paginaProdutos(), paginaContracapa(configGlobal)]}
            onChange={p => setLocal({ ...local, paginas: p })}
            config={configGlobal}
            negociacao={local.negociacao}
            orcamento={local.orcamento}
            produtos={produtos}
            fotos={fotos}
          />
        )}
      </div>
    </div>
  );
}

/* ── CONFIG GLOBAL ──────────────────────────────────────────────────────────── */
function ConfigGlobal({ config, setConfig }: { config: ConfigApresentacao; setConfig: (c: ConfigApresentacao) => void }) {
  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';
  return (
    <div className="p-6 space-y-6 max-w-xl overflow-y-auto h-full">
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Configurações de Orçamentos</h2>
        <p className="text-sm text-slate-400">Estas configurações valem para todos os orçamentos.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Identidade Visual</h3>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Nome da Empresa</label>
          <input value={config.empresa} onChange={e => setConfig({ ...config, empresa: e.target.value })} className={inp}/>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">URL do Logo</label>
          <input value={config.logo} onChange={e => setConfig({ ...config, logo: e.target.value })} placeholder="https://..." className={inp}/>
          {config.logo && <img src={config.logo} className="mt-2 h-12 object-contain border border-slate-200 rounded p-1" alt="preview"/>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Cor Primária</label>
            <div className="flex items-center gap-2">
              <input type="color" value={config.corPrimaria} onChange={e => setConfig({ ...config, corPrimaria: e.target.value })} className="w-10 h-9 border border-slate-200 rounded cursor-pointer"/>
              <input value={config.corPrimaria} onChange={e => setConfig({ ...config, corPrimaria: e.target.value })} className={inp + ' flex-1'}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Cor Secundária</label>
            <div className="flex items-center gap-2">
              <input type="color" value={config.corSecundaria} onChange={e => setConfig({ ...config, corSecundaria: e.target.value })} className="w-10 h-9 border border-slate-200 rounded cursor-pointer"/>
              <input value={config.corSecundaria} onChange={e => setConfig({ ...config, corSecundaria: e.target.value })} className={inp + ' flex-1'}/>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Fonte Principal</label>
          <select value={config.fontePrincipal} onChange={e => setConfig({ ...config, fontePrincipal: e.target.value })} className={inp}>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Rodapé</label>
          <input value={config.rodape} onChange={e => setConfig({ ...config, rodape: e.target.value })} className={inp}/>
        </div>
      </div>
      {/* Preview */}
      <div>
        <p className="text-xs font-bold text-slate-500 mb-2">PRÉVIA DA CAPA</p>
        <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: config.corPrimaria, padding: 32, fontFamily: config.fontePrincipal }}>
          {config.logo && <img src={config.logo} className="h-10 mb-4 object-contain" alt="logo"/>}
          {!config.logo && <div className="w-16 h-16 rounded-xl bg-white/20 mb-4 flex items-center justify-center"><span className="text-white/60 text-xs">LOGO</span></div>}
          <p className="text-white font-bold text-2xl mb-1">Proposta Comercial</p>
          <p className="text-white/70 text-sm">{config.empresa}</p>
          <p className="text-white/50 text-xs mt-2">{config.rodape}</p>
        </div>
      </div>
    </div>
  );
}

/* ── LISTA DE ORÇAMENTOS ────────────────────────────────────────────────────── */
function ListaOrcamentos({
  negociacoes, loading, onEditar,
}: {
  negociacoes: NegociacaoData[]; loading: boolean;
  onEditar: (e: OrcEnvolvido) => void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<OrcamentoStatus | 'todos'>('todos');
  const [showNovaNeg, setShowNovaNeg] = useState(false);
  const [negBusca, setNegBusca] = useState('');

  // Collect all quotations from negotiations
  const todos: OrcEnvolvido[] = negociacoes
    .filter(n => n.orcamento)
    .map(n => ({ negId: n.negociacao.id, negociacao: n, orcamento: n.orcamento!, paginas: [] }));

  const filtrados = todos.filter(e => {
    const matchBusca = !busca || e.negociacao.negociacao.clienteNome.toLowerCase().includes(busca.toLowerCase()) || (e.orcamento.numero ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || e.orcamento.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // Negotiations without quotations (can create new ones)
  const semOrcamento = negociacoes.filter(n => !n.orcamento).filter(n =>
    !negBusca || n.negociacao.clienteNome.toLowerCase().includes(negBusca.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Orçamentos</h1>
          <p className="text-sm text-slate-400">{todos.length} orçamento(s) vinculados a negociações</p>
        </div>
        <button onClick={() => setShowNovaNeg(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
          <Plus size={15}/> Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar orçamento ou cliente..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['todos','rascunho','enviado','aprovado','recusado'] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroStatus === s ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-xs text-blue-700">
        <AlertCircle size={13}/>
        Todo orçamento está obrigatoriamente vinculado a uma negociação. Negociações sem orçamento: <strong>{negociacoes.filter(n => !n.orcamento).length}</strong>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" size={24}/></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nº Orçamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Negociação</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Itens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Validade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Criado por</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Nenhum orçamento encontrado</td></tr>
              )}
              {filtrados.map(e => (
                <tr key={e.orcamento.id} className="border-b border-slate-50 hover:bg-purple-50/30 cursor-pointer" onClick={() => onEditar(e)}>
                  <td className="px-4 py-3 font-semibold text-purple-700">{e.orcamento.numero ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{e.negociacao.negociacao.clienteNome}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.negociacao.negociacao.descricao?.slice(0,40) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[e.orcamento.status].cls}`}>{STATUS_MAP[e.orcamento.status].label}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{e.orcamento.itens.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(e.orcamento.total)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.orcamento.validade ? new Date(e.orcamento.validade).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${e.orcamento.criado_por === 'ia' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {e.orcamento.criado_por === 'ia' ? '🤖 IA' : '👤 Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEditar(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50"><Edit3 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: select negotiation for new quotation */}
      {showNovaNeg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800">Selecionar Negociação</h3>
                <p className="text-xs text-slate-400 mt-0.5">O orçamento será vinculado a esta negociação</p>
              </div>
              <button onClick={() => setShowNovaNeg(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={negBusca} onChange={e => setNegBusca(e.target.value)}
                  placeholder="Buscar negociação..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {semOrcamento.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">Todas as negociações já têm orçamento</p>}
              {semOrcamento.map(n => (
                <div key={n.negociacao.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-purple-50 cursor-pointer"
                  onClick={() => { onEditar(orcVazio(n.negociacao.id, n)); setShowNovaNeg(false); }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{n.negociacao.clienteNome}</p>
                    <p className="text-xs text-slate-400">{n.negociacao.descricao?.slice(0,50) ?? 'Sem descrição'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-700">{fmt(n.negociacao.valor_estimado ?? 0)}</p>
                    <p className="text-xs text-slate-400">{n.negociacao.etapa}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN EXPORT ────────────────────────────────────────────────────────────── */
export default function Orcamentos() {
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>('lista');
  const [editando, setEditando] = useState<OrcEnvolvido | null>(null);
  const [negociacoes, setNegociacoes] = useState<NegociacaoData[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [fotos, setFotos] = useState<Record<string, ErpProdutoFoto[]>>({});
  const [loadingNeg, setLoadingNeg] = useState(true);
  const [loadingProd, setLoadingProd] = useState(true);
  const [configGlobal, setConfigGlobal] = useState<ConfigApresentacao>(CONFIG_PADRAO);

  useEffect(() => {
    getAllNegociacoes().then(data => { setNegociacoes(data); setLoadingNeg(false); }).catch(() => setLoadingNeg(false));
  }, []);

  useEffect(() => {
    getProdutos().then(async prods => {
      setProdutos(prods);
      setLoadingProd(false);
      // Load cover photos for first 20 products
      const fMap: Record<string, ErpProdutoFoto[]> = {};
      await Promise.all(prods.slice(0, 20).map(async p => {
        try { fMap[p.id] = await getProdutoFotos(p.id); } catch { fMap[p.id] = []; }
      }));
      setFotos(fMap);
    }).catch(() => setLoadingProd(false));
  }, []);

  const handleSaveEnvolvido = useCallback((e: OrcEnvolvido) => {
    setNegociacoes(ns => ns.map(n => n.negociacao.id === e.negId ? { ...n, orcamento: e.orcamento } : n));
    setEditando(null);
  }, []);

  if (editando) {
    return (
      <div className="h-full">
        <EditorOrcamento
          envolvido={editando}
          onSave={handleSaveEnvolvido}
          onCancel={() => setEditando(null)}
          produtos={produtos}
          fotos={fotos}
          loadingProd={loadingProd}
          configGlobal={configGlobal}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
        {([
          { id: 'lista' as const, label: 'Lista de Orçamentos' },
          { id: 'config' as const, label: 'Configurações' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTabPrincipal(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${tabPrincipal === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.id === 'config' && <Settings2 size={14}/>}{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden bg-slate-50">
        {tabPrincipal === 'lista' && (
          <ListaOrcamentos
            negociacoes={negociacoes}
            loading={loadingNeg}
            onEditar={setEditando}
          />
        )}
        {tabPrincipal === 'config' && (
          <ConfigGlobal config={configGlobal} setConfig={setConfigGlobal}/>
        )}
      </div>
    </div>
  );
}
