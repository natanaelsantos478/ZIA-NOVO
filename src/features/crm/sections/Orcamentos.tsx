// ─────────────────────────────────────────────────────────────────────────────
// Orcamentos.tsx — Módulo de Orçamentos CRM (ZIA Omnisystem)
// Todo orçamento OBRIGATORIAMENTE vinculado a uma Negociação
// Cards grid | Editor (Dados · Produtos · Apresentação Canva) | Config global
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SketchPicker } from 'react-color';
import {
  Plus, ArrowLeft, Check, Search, Settings2, AlertCircle,
  X, Loader2, Trash2, Edit3, Briefcase, Truck, Package,
  Calendar, DollarSign, Link2, Eye, Copy, ChevronRight,
  Upload, ToggleLeft, ToggleRight, FileText,
} from 'lucide-react';
import {
  getAllNegociacoes, setOrcamento,
  type NegociacaoData, type Orcamento as OrcBase,
  type ItemOrcamento, type OrcamentoStatus,
} from '../data/crmData';
import {
  getProdutos, getProdutoFotos,
  type ErpProduto, type ErpProdutoFoto,
} from '../../../lib/erp';
import {
  getOrcConfig, salvarOrcConfig, getApresentacao, salvarApresentacao, uploadLogoConfig,
} from './orcamentos/orcamentoData';
import { gerarPaginasIniciais, exportarOrcamentoPDF } from './orcamentos/pdf';
import { ORC_CONFIG_PADRAO, type OrcConfig, type Apresentacao, type PaginaCanvas } from './orcamentos/types';
import CanvasEditor from './orcamentos/canvas/CanvasEditor';

/* ── CONSTANTS ─────────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<OrcamentoStatus, { label: string; cls: string; dot: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  enviado:  { label: 'Enviado',  cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'  },
  aprovado: { label: 'Aprovado', cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  recusado: { label: 'Recusado', cls: 'bg-red-100 text-red-700',       dot: 'bg-red-500'   },
};
const CONDICOES = ['À vista','30 dias','30/60','30/60/90','Parcelado','A negociar'];
const FORMAS_ENTREGA = ['CIF (por conta do vendedor)','FOB (por conta do comprador)','Retirada','Digital'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Math.random().toString(36).slice(2, 9);

/* ── TYPES ─────────────────────────────────────────────────────────────────── */
interface OrcCard {
  negId: string;
  negociacao: NegociacaoData;
  orcamento: OrcBase;
  paginas: PaginaCanvas[];
  apresentacaoId?: string;
}

type TabPrincipal = 'lista' | 'config';
type TabEditor    = 'dados' | 'produtos' | 'apresentacao';

/* ── HELPERS ───────────────────────────────────────────────────────────────── */
function orcVazio(neg: NegociacaoData): OrcCard {
  return {
    negId: neg.negociacao.id, negociacao: neg,
    orcamento: {
      id: uid(), status: 'rascunho',
      condicao_pagamento: 'À vista', desconto_global_pct: 0, frete: 0,
      itens: [], total: 0, dataCriacao: new Date().toISOString().slice(0, 10),
      criado_por: 'usuario',
      validade: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      prazo_entrega: '', forma_entrega: '', local_entrega: '',
      vendedor: neg.negociacao.responsavel, observacoes: '',
      condicoes_comerciais: '', numero: `ORC-${Date.now().toString().slice(-6)}`,
    },
    paginas: [],
  };
}

/* ── PREVIEW DOCUMENTO ─────────────────────────────────────────────────────── */
function PreviewDocumento({ card, config }: { card: OrcCard; config: OrcConfig }) {
  const orc = card.orcamento;
  const sub = orc.itens.reduce((s, i) => s + i.total, 0);
  const desc = sub * (orc.desconto_global_pct / 100);
  const total = sub - desc + orc.frete;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden text-xs"
      style={{ fontFamily: config.fonte_padrao + ', sans-serif' }}>
      <div style={{ background: config.cor_primaria }} className="px-4 py-3">
        {config.logo_url
          ? <img src={config.logo_url} className="h-8 mb-2 object-contain" alt="logo"/>
          : <p className="text-white font-bold text-sm mb-1">{config.empresa}</p>
        }
        <div className="flex justify-between text-white/80 text-xs mt-1">
          <span>{orc.numero}</span>
          <span>Válido: {orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '—'}</span>
        </div>
      </div>
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
        <p className="font-semibold text-slate-700">{card.negociacao.negociacao.clienteNome}</p>
      </div>
      <div className="px-4 py-2">
        {orc.itens.length === 0
          ? <p className="text-slate-400 italic py-3 text-center">Sem produtos</p>
          : <table className="w-full"><tbody>
              {orc.itens.map(item => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="py-1 text-slate-700 truncate max-w-[100px]">{item.produto_nome}</td>
                  <td className="py-1 text-center text-slate-400">{item.quantidade}</td>
                  <td className="py-1 text-right font-semibold text-slate-800">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody></table>
        }
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 space-y-0.5">
        <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{fmt(sub)}</span></div>
        {orc.desconto_global_pct > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Desconto {orc.desconto_global_pct}%</span><span>-{fmt(desc)}</span>
          </div>
        )}
        {orc.frete > 0 && <div className="flex justify-between text-slate-400"><span>Frete</span><span>{fmt(orc.frete)}</span></div>}
        <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
          <span>TOTAL</span><span style={{ color: config.cor_primaria }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── TAB DADOS ─────────────────────────────────────────────────────────────── */
function TabDados({ card, setCard }: { card: OrcCard; setCard: (c: OrcCard) => void }) {
  const orc = card.orcamento;
  const setOrc = (patch: Partial<OrcBase>) => setCard({ ...card, orcamento: { ...orc, ...patch } });
  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';

  return (
    <div className="p-6 space-y-5 max-w-2xl overflow-y-auto h-full">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={14} className="text-purple-600"/>
          <span className="text-sm font-bold text-purple-700">Negociação Vinculada *</span>
        </div>
        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-200">
          <div>
            <p className="text-sm font-semibold text-slate-800">{card.negociacao.negociacao.clienteNome}</p>
            <p className="text-xs text-slate-500">{card.negociacao.negociacao.descricao?.slice(0, 60) ?? '—'}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
            ${card.negociacao.negociacao.status === 'aberta' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {card.negociacao.negociacao.status}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Informações do Orçamento</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Número</label>
            <input value={orc.numero ?? ''} onChange={e => setOrc({ numero: e.target.value })} className={inp}/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={orc.status} onChange={e => setOrc({ status: e.target.value as OrcamentoStatus })} className={inp}>
              {(Object.entries(STATUS_MAP) as [OrcamentoStatus, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Validade</label>
            <input type="date" value={orc.validade ?? ''} onChange={e => setOrc({ validade: e.target.value })} className={inp}/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Vendedor</label>
            <input value={orc.vendedor ?? ''} onChange={e => setOrc({ vendedor: e.target.value })} className={inp}/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Condição de Pagamento</label>
            <select value={orc.condicao_pagamento} onChange={e => setOrc({ condicao_pagamento: e.target.value })} className={inp}>
              {CONDICOES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Prazo de Entrega</label>
            <input value={orc.prazo_entrega ?? ''} onChange={e => setOrc({ prazo_entrega: e.target.value })} placeholder="Ex: 15 dias úteis" className={inp}/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Forma de Entrega</label>
            <select value={orc.forma_entrega ?? ''} onChange={e => setOrc({ forma_entrega: e.target.value })} className={inp}>
              <option value="">—</option>
              {FORMAS_ENTREGA.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Local de Entrega</label>
            <input value={orc.local_entrega ?? ''} onChange={e => setOrc({ local_entrega: e.target.value })} className={inp}/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Condições Comerciais</label>
          <textarea rows={3} value={orc.condicoes_comerciais ?? ''} onChange={e => setOrc({ condicoes_comerciais: e.target.value })} className={inp + ' resize-none'}/>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Observações</label>
          <textarea rows={2} value={orc.observacoes ?? ''} onChange={e => setOrc({ observacoes: e.target.value })} className={inp + ' resize-none'}/>
        </div>
      </div>
    </div>
  );
}

/* ── TAB PRODUTOS ──────────────────────────────────────────────────────────── */
function TabProdutos({
  card, setCard, produtos, fotos, config, loadingProd,
}: {
  card: OrcCard; setCard: (c: OrcCard) => void;
  produtos: ErpProduto[]; fotos: Record<string, ErpProdutoFoto[]>;
  config: OrcConfig; loadingProd: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const orc = card.orcamento;
  const items = orc.itens;

  const recalc = (itens: ItemOrcamento[]): OrcBase => {
    const sub = itens.reduce((s, i) => s + i.total, 0);
    const d = sub * (orc.desconto_global_pct / 100);
    return { ...orc, itens, total: sub - d + orc.frete };
  };

  const addItem = (prod: ErpProduto) => {
    const item: ItemOrcamento = {
      id: uid(), produto_id: prod.id, produto_nome: prod.nome,
      codigo: prod.codigo_interno, unidade: prod.unidade_medida,
      quantidade: 1, preco_unitario: prod.preco_venda, desconto_pct: 0, total: prod.preco_venda,
    };
    setCard({ ...card, orcamento: recalc([...items, item]) });
    setShowCatalog(false);
  };

  const updItem = (id: string, patch: Partial<ItemOrcamento>) => {
    const updated = items.map(i => {
      if (i.id !== id) return i;
      const m = { ...i, ...patch };
      m.total = m.preco_unitario * m.quantidade * (1 - m.desconto_pct / 100);
      return m;
    });
    setCard({ ...card, orcamento: recalc(updated) });
  };

  const rmItem = (id: string) => setCard({ ...card, orcamento: recalc(items.filter(i => i.id !== id)) });

  const setGlobal = (field: 'desconto_global_pct' | 'frete', val: number) => {
    const sub = items.reduce((s, i) => s + i.total, 0);
    const d = field === 'desconto_global_pct' ? val : orc.desconto_global_pct;
    const fr = field === 'frete' ? val : orc.frete;
    setCard({ ...card, orcamento: { ...orc, [field]: val, total: sub * (1 - d / 100) + fr } });
  };

  const filtrados = produtos.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo_interno.includes(busca)
  );
  const sub = items.reduce((s, i) => s + i.total, 0);
  const descGlobal = sub * (orc.desconto_global_pct / 100);
  const total = sub - descGlobal + orc.frete;

  return (
    <div className="flex gap-5 p-6 h-full overflow-hidden">
      {/* Product list */}
      <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0">
        <button onClick={() => setShowCatalog(true)}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
          <Plus size={14}/> Adicionar do Catálogo
        </button>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="bg-slate-700 text-white px-4 py-2.5 flex justify-between shrink-0">
            <span className="text-xs font-bold tracking-wide">ITENS DO ORÇAMENTO</span>
            <span className="text-xs text-slate-300">{items.length} item(s)</span>
          </div>
          {items.length === 0
            ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Package size={32} className="text-slate-300"/>
                <p className="text-sm">Adicione produtos do catálogo</p>
              </div>
            : <div className="overflow-y-auto custom-scrollbar flex-1">
                {items.map(item => {
                  const prod = produtos.find(p => p.id === item.produto_id);
                  const foto = prod ? fotos[prod.id]?.[0]?.url : undefined;
                  return (
                    <div key={item.id} className="border-b border-slate-100 last:border-0 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                          {foto ? <img src={foto} className="w-full h-full object-cover" alt=""/> : <Package size={20} className="text-slate-300"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.produto_nome}</p>
                          <p className="text-xs text-slate-400">{item.codigo} · {item.unidade}</p>
                        </div>
                        <button onClick={() => rmItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {([
                          { label: 'Qtd', field: 'quantidade' as const, min: 1, step: 1 },
                          { label: 'Preço Unit.', field: 'preco_unitario' as const, min: 0, step: 0.01 },
                          { label: 'Desc. %', field: 'desconto_pct' as const, min: 0, max: 100, step: 0.1 },
                        ] as { label: string; field: keyof ItemOrcamento; min: number; max?: number; step: number }[]).map(({ label, field, min, max, step }) => (
                          <div key={field as string}>
                            <label className="text-xs text-slate-400 block mb-0.5">{label}</label>
                            <input type="number" min={min} max={max} step={step}
                              value={item[field] as number}
                              onChange={e => updItem(item.id, { [field]: Number(e.target.value) })}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                          </div>
                        ))}
                        <div>
                          <label className="text-xs text-slate-400 block mb-0.5">Total</label>
                          <p className="text-sm font-bold text-slate-800 pt-1">{fmt(item.total)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        <div className="bg-slate-700 text-white rounded-xl p-4 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1 flex items-center gap-1">
                <DollarSign size={11}/>Desconto Global (%)
              </label>
              <input type="number" min={0} max={100} step={0.1} value={orc.desconto_global_pct}
                onChange={e => setGlobal('desconto_global_pct', Number(e.target.value))}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none"/>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 flex items-center gap-1">
                <Truck size={11}/>Frete (R$)
              </label>
              <input type="number" min={0} step={0.01} value={orc.frete}
                onChange={e => setGlobal('frete', Number(e.target.value))}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none"/>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-600 space-y-0.5">
            <div className="flex justify-between text-sm text-slate-300"><span>Subtotal</span><span>{fmt(sub)}</span></div>
            {orc.desconto_global_pct > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Desconto ({orc.desconto_global_pct}%)</span><span>-{fmt(descGlobal)}</span>
              </div>
            )}
            {orc.frete > 0 && <div className="flex justify-between text-sm text-slate-300"><span>Frete</span><span>{fmt(orc.frete)}</span></div>}
            <div className="flex justify-between font-bold text-base mt-1"><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="w-64 shrink-0 space-y-3">
        <p className="text-xs font-bold text-slate-500 tracking-wide">PRÉVIA DO DOCUMENTO</p>
        <PreviewDocumento card={card} config={config}/>
        <p className="text-xs text-slate-400 text-center">Atualiza em tempo real</p>
      </div>

      {/* Catalog modal */}
      <AnimatePresence>
        {showCatalog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
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
                  const jaAdd = items.some(i => i.produto_id === prod.id);
                  return (
                    <div key={prod.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-all ${jaAdd ? 'opacity-60' : 'hover:bg-purple-50/50'}`}
                      onClick={() => !jaAdd && addItem(prod)}>
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {foto ? <img src={foto} className="w-full h-full object-cover" alt=""/> : <Package size={18} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{prod.nome}</p>
                        <p className="text-xs text-slate-400">{prod.codigo_interno} · {prod.unidade_medida}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-purple-700">{fmt(prod.preco_venda)}</p>
                        {jaAdd
                          ? <span className="text-xs text-green-600 flex items-center gap-0.5"><Check size={10}/>Adicionado</span>
                          : <span className="text-xs text-purple-600 font-medium">+ Adicionar</span>
                        }
                      </div>
                    </div>
                  );
                })}
                {!loadingProd && filtrados.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Nenhum produto encontrado</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── EDITOR ────────────────────────────────────────────────────────────────── */
function EditorOrcamento({
  card, onSave, onCancel, produtos, fotos, config, loadingProd,
}: {
  card: OrcCard; onSave: (c: OrcCard) => void; onCancel: () => void;
  produtos: ErpProduto[]; fotos: Record<string, ErpProdutoFoto[]>;
  config: OrcConfig; loadingProd: boolean;
}) {
  const [local, setLocal] = useState<OrcCard>(card);
  const [tab, setTab] = useState<TabEditor>('dados');
  const [saving, setSaving] = useState(false);
  const [apresentacao, setApresentacao] = useState<Apresentacao | null>(null);
  const [loadingApres, setLoadingApres] = useState(false);

  const imageMap: Record<string, string[]> = {};
  Object.entries(fotos).forEach(([pid, fts]) => { imageMap[pid] = fts.map(f => f.url); });

  useEffect(() => {
    if (tab !== 'apresentacao') return;
    setLoadingApres(true);
    getApresentacao(local.orcamento.id).then(a => {
      if (a) { setApresentacao(a); }
      else {
        const paginas = gerarPaginasIniciais(config.cor_primaria, config.cor_secundaria);
        setApresentacao({ orcamento_id: local.orcamento.id, nome: 'Apresentação', orientacao: 'portrait', tamanho_pagina: 'A4', paginas });
      }
      setLoadingApres(false);
    }).catch(() => setLoadingApres(false));
  }, [tab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await setOrcamento(local.negId, local.orcamento);
      if (apresentacao && apresentacao.paginas.length > 0) {
        await salvarApresentacao(saved.id, apresentacao);
      }
      onSave({ ...local, orcamento: saved });
    } catch { onSave(local); }
    finally { setSaving(false); }
  };

  const handleExportPDF = async (getPage: (idx: number) => Promise<string>) => {
    await exportarOrcamentoPDF(
      getPage,
      apresentacao?.paginas.length ?? 0,
      { numero: local.orcamento.numero, cliente_nome: local.negociacao.negociacao.clienteNome },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">{local.orcamento.numero}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_MAP[local.orcamento.status].cls}`}>
              {STATUS_MAP[local.orcamento.status].label}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Briefcase size={11}/>{local.negociacao.negociacao.clienteNome}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Salvar
        </button>
      </div>

      <div className="flex border-b border-slate-200 bg-white shrink-0 px-5">
        {([
          { id: 'dados'        as const, label: 'Dados Gerais'   },
          { id: 'produtos'     as const, label: 'Produtos'        },
          { id: 'apresentacao' as const, label: '✦ Apresentação'  },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50">
        {tab === 'dados' && <div className="h-full"><TabDados card={local} setCard={setLocal}/></div>}
        {tab === 'produtos' && (
          <TabProdutos card={local} setCard={setLocal} produtos={produtos} fotos={fotos} config={config} loadingProd={loadingProd}/>
        )}
        {tab === 'apresentacao' && (
          loadingApres
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" size={24}/></div>
            : apresentacao
              ? <CanvasEditor
                  paginas={apresentacao.paginas}
                  onChange={p => setApresentacao(a => a ? { ...a, paginas: p } : null)}
                  config={config}
                  negociacao={local.negociacao}
                  orcamento={local.orcamento}
                  imageMap={imageMap}
                  onExportPDF={handleExportPDF}
                />
              : <div className="flex items-center justify-center h-full text-slate-400">Erro ao carregar apresentação</div>
        )}
      </div>
    </div>
  );
}

/* ── CARD ORÇAMENTO ────────────────────────────────────────────────────────── */
function OrcamentoCard({ card, onEditar }: { card: OrcCard; onEditar: () => void }) {
  const orc = card.orcamento;
  const st = STATUS_MAP[orc.status];
  const vencido = orc.validade && new Date(orc.validade) < new Date();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group overflow-hidden"
      onClick={onEditar}>
      <div className="h-1.5" style={{
        background: orc.status === 'aprovado' ? '#16a34a' : orc.status === 'recusado' ? '#dc2626' : orc.status === 'enviado' ? '#2563eb' : '#94a3b8'
      }}/>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-purple-600">{orc.numero}</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5 leading-tight">{card.negociacao.negociacao.clienteNome}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
          </span>
        </div>

        {card.negociacao.negociacao.descricao && (
          <p className="text-xs text-slate-500 mb-3 truncate flex items-center gap-1">
            <Briefcase size={10}/>{card.negociacao.negociacao.descricao}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-slate-800">{fmt(orc.total)}</span>
          <div className={`flex items-center gap-1 text-xs ${vencido ? 'text-red-500' : 'text-slate-400'}`}>
            <Calendar size={11}/>
            {orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '—'}
            {vencido && ' · Vencido'}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
          <Package size={11}/>{orc.itens.length} item(s)
          <span className="mx-1">·</span>
          <span>{orc.criado_por === 'ia' ? '🤖 IA' : '👤 Manual'}</span>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEditar(); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100">
            <Edit3 size={11}/> Editar
          </button>
          <button onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100" title="Ver apresentação">
            <Eye size={14}/>
          </button>
          <button onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100" title="Duplicar">
            <Copy size={14}/>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── LISTA ─────────────────────────────────────────────────────────────────── */
function ListaOrcamentos({ negociacoes, loading, onEditar }: {
  negociacoes: NegociacaoData[]; loading: boolean; onEditar: (c: OrcCard) => void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<OrcamentoStatus | 'todos'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [negBusca, setNegBusca] = useState('');

  const todos: OrcCard[] = negociacoes
    .filter(n => n.orcamento)
    .map(n => ({ negId: n.negociacao.id, negociacao: n, orcamento: n.orcamento!, paginas: [] }));

  const filtrados = todos.filter(c => {
    const matchB = !busca || c.negociacao.negociacao.clienteNome.toLowerCase().includes(busca.toLowerCase())
      || (c.orcamento.numero ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchS = filtroStatus === 'todos' || c.orcamento.status === filtroStatus;
    return matchB && matchS;
  });

  const semOrcamento = negociacoes.filter(n => !n.orcamento).filter(n =>
    !negBusca || n.negociacao.clienteNome.toLowerCase().includes(negBusca.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Orçamentos</h1>
          <p className="text-sm text-slate-400">
            {todos.length} orçamento(s) · {negociacoes.filter(n => !n.orcamento).length} negociação(ões) sem orçamento
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 shadow">
          <Plus size={15}/> Novo Orçamento
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-xs text-blue-700">
        <AlertCircle size={13}/>
        Todo orçamento é obrigatoriamente vinculado a uma negociação.
        Negociações sem orçamento: <strong>{negociacoes.filter(n => !n.orcamento).length}</strong>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['todos','rascunho','enviado','aprovado','recusado'] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filtroStatus === s ? 'bg-purple-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading
        ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" size={24}/></div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map(c => (
              <OrcamentoCard key={c.orcamento.id} card={c} onEditar={() => onEditar(c)}/>
            ))}
            {filtrados.length === 0 && (
              <div className="col-span-full flex flex-col items-center py-16 text-slate-400 gap-2">
                <FileText size={40} className="text-slate-300"/>
                <p className="text-sm">Nenhum orçamento encontrado</p>
              </div>
            )}
          </div>
      }

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Selecionar Negociação</h3>
                  <p className="text-xs text-slate-400 mt-0.5">O orçamento será vinculado a esta negociação</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
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
                {semOrcamento.length === 0
                  ? <p className="text-center text-slate-400 py-6 text-sm">Todas as negociações já têm orçamento</p>
                  : semOrcamento.map(n => (
                      <div key={n.negociacao.id}
                        className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-purple-50 cursor-pointer"
                        onClick={() => { onEditar(orcVazio(n)); setShowModal(false); }}>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{n.negociacao.clienteNome}</p>
                          <p className="text-xs text-slate-400">{n.negociacao.descricao?.slice(0, 50) ?? '—'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-700">{fmt(n.negociacao.valor_estimado ?? 0)}</p>
                            <p className="text-xs text-slate-400">{n.negociacao.etapa}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400"/>
                        </div>
                      </div>
                    ))
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── CONFIG GLOBAL ─────────────────────────────────────────────────────────── */
function ConfigGlobal({ config, setConfig }: { config: OrcConfig; setConfig: (c: OrcConfig) => void }) {
  const [saving, setSaving] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showCS, setShowCS] = useState(false);
  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)} className={`transition-all ${value ? 'text-purple-600' : 'text-slate-300'}`}>
      {value ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
    </button>
  );

  const handleSave = async () => {
    setSaving(true);
    try { await salvarOrcConfig(config); } finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadLogoConfig(file); setConfig({ ...config, logo_url: url }); } catch { /* silent */ }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Configurações de Orçamentos</h2>
            <p className="text-sm text-slate-400">Configurações globais — valem para todos os orçamentos</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Salvar
          </button>
        </div>

        {/* 1. Identidade Visual */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">1. Identidade Visual</h3>
          <div className="flex gap-5">
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Nome da Empresa</label>
                <input value={config.empresa} onChange={e => setConfig({ ...config, empresa: e.target.value })} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Logo</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:border-purple-400 text-xs text-slate-500">
                    <Upload size={13}/> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload}/>
                  </label>
                  {config.logo_url && <img src={config.logo_url} className="h-10 object-contain border border-slate-200 rounded p-1" alt="logo"/>}
                </div>
                <input value={config.logo_url} onChange={e => setConfig({ ...config, logo_url: e.target.value })} placeholder="Ou URL..." className={inp + ' mt-2'}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Cor Primária */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Cor Primária</label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowCP(o => !o)} className="w-8 h-8 rounded border border-slate-200 flex-shrink-0" style={{ background: config.cor_primaria }}/>
                      <input value={config.cor_primaria} onChange={e => setConfig({ ...config, cor_primaria: e.target.value })} className={inp + ' flex-1'}/>
                    </div>
                    {showCP && (
                      <div className="absolute top-full left-0 mt-1 z-50">
                        <div className="fixed inset-0" onClick={() => setShowCP(false)}/>
                        <div className="relative z-10"><SketchPicker color={config.cor_primaria} onChange={c => setConfig({ ...config, cor_primaria: c.hex })}/></div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Cor Secundária */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Cor Secundária</label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowCS(o => !o)} className="w-8 h-8 rounded border border-slate-200 flex-shrink-0" style={{ background: config.cor_secundaria }}/>
                      <input value={config.cor_secundaria} onChange={e => setConfig({ ...config, cor_secundaria: e.target.value })} className={inp + ' flex-1'}/>
                    </div>
                    {showCS && (
                      <div className="absolute top-full left-0 mt-1 z-50">
                        <div className="fixed inset-0" onClick={() => setShowCS(false)}/>
                        <div className="relative z-10"><SketchPicker color={config.cor_secundaria} onChange={c => setConfig({ ...config, cor_secundaria: c.hex })}/></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Fonte Padrão</label>
                <select value={config.fonte_padrao} onChange={e => setConfig({ ...config, fonte_padrao: e.target.value })} className={inp}>
                  {['Inter','Arial','Georgia','Montserrat','Playfair Display','Open Sans','Roboto'].map(f => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Live preview */}
            <div className="w-52 shrink-0">
              <p className="text-xs font-bold text-slate-400 mb-2">PRÉVIA AO VIVO</p>
              <div className="rounded-xl overflow-hidden shadow" style={{ fontFamily: config.fonte_padrao + ', sans-serif' }}>
                <div style={{ background: config.cor_primaria }} className="p-4">
                  {config.logo_url
                    ? <img src={config.logo_url} className="h-8 mb-2 object-contain" alt="logo"/>
                    : <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-2"><span className="text-white/50 text-xs">LOGO</span></div>
                  }
                  <p className="text-white font-bold text-lg leading-tight">Proposta</p>
                  <p className="text-white/80 text-sm">{config.empresa}</p>
                </div>
                <div style={{ background: config.cor_secundaria }} className="p-3">
                  <p className="text-xs" style={{ color: config.cor_texto }}>{config.texto_rodape || 'Rodapé'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Textos Padrão */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">2. Textos Padrão</h3>
          {[
            { label: 'Texto de Validade', field: 'texto_validade' as const, rows: 2 },
            { label: 'Condições Comerciais Padrão', field: 'texto_condicoes' as const, rows: 3 },
            { label: 'Texto de Rodapé', field: 'texto_rodape' as const, rows: 2 },
          ].map(({ label, field, rows }) => (
            <div key={field}>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
              <textarea rows={rows} value={config[field]} onChange={e => setConfig({ ...config, [field]: e.target.value })} className={inp + ' resize-none'}/>
            </div>
          ))}
        </div>

        {/* 3. Itens */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">3. Itens do Orçamento</h3>
          {([
            { label: 'Mostrar código do produto',   field: 'mostrar_codigo_produto'    },
            { label: 'Mostrar NCM',                 field: 'mostrar_ncm'               },
            { label: 'Mostrar estoque disponível',  field: 'mostrar_estoque'           },
            { label: 'Mostrar desconto por item',   field: 'mostrar_desconto_por_item' },
            { label: 'Mostrar imagens dos produtos',field: 'mostrar_imagens_produto'   },
          ] as { label: string; field: keyof OrcConfig }[]).map(({ label, field }) => (
            <div key={field as string} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <Toggle value={config[field] as boolean} onChange={v => setConfig({ ...config, [field]: v })}/>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Máx. imagens por produto (1–5)</label>
            <input type="number" min={1} max={5} value={config.max_imagens_por_produto}
              onChange={e => setConfig({ ...config, max_imagens_por_produto: Number(e.target.value) })}
              className={inp + ' w-24'}/>
          </div>
        </div>

        {/* 4. Numeração */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">4. Numeração Automática</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Prefixo</label>
              <input value={config.prefixo_numero} onChange={e => setConfig({ ...config, prefixo_numero: e.target.value })} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Próximo número</label>
              <input type="number" min={1} value={config.proximo_numero} onChange={e => setConfig({ ...config, proximo_numero: Number(e.target.value) })} className={inp}/>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Próximo orçamento: <strong className="text-purple-700">
              {config.prefixo_numero}-{String(config.proximo_numero).padStart(4, '0')}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN EXPORT ───────────────────────────────────────────────────────────── */
export default function Orcamentos() {
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>('lista');
  const [editando, setEditando] = useState<OrcCard | null>(null);
  const [negociacoes, setNegociacoes] = useState<NegociacaoData[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [fotos, setFotos] = useState<Record<string, ErpProdutoFoto[]>>({});
  const [loadingNeg, setLoadingNeg] = useState(true);
  const [loadingProd, setLoadingProd] = useState(true);
  const [config, setConfig] = useState<OrcConfig>(ORC_CONFIG_PADRAO);

  useEffect(() => {
    getAllNegociacoes().then(d => { setNegociacoes(d); setLoadingNeg(false); }).catch(() => setLoadingNeg(false));
    getOrcConfig().then(c => setConfig(c)).catch(() => {});
  }, []);

  useEffect(() => {
    getProdutos().then(async prods => {
      setProdutos(prods);
      setLoadingProd(false);
      const fMap: Record<string, ErpProdutoFoto[]> = {};
      await Promise.allSettled(prods.slice(0, 30).map(async p => {
        try { fMap[p.id] = await getProdutoFotos(p.id); } catch { fMap[p.id] = []; }
      }));
      setFotos(fMap);
    }).catch(() => setLoadingProd(false));
  }, []);

  const handleSave = useCallback((c: OrcCard) => {
    setNegociacoes(ns => ns.map(n => n.negociacao.id === c.negId ? { ...n, orcamento: c.orcamento } : n));
    setEditando(null);
  }, []);

  if (editando) {
    return (
      <div className="h-full">
        <EditorOrcamento
          card={editando}
          onSave={handleSave}
          onCancel={() => setEditando(null)}
          produtos={produtos}
          fotos={fotos}
          config={config}
          loadingProd={loadingProd}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
        {([
          { id: 'lista'  as const, label: 'Lista de Orçamentos', icon: null },
          { id: 'config' as const, label: 'Configurações',       icon: <Settings2 size={14}/> },
        ]).map(t => (
          <button key={t.id} onClick={() => setTabPrincipal(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${tabPrincipal === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden bg-slate-50">
        {tabPrincipal === 'lista' && (
          <ListaOrcamentos negociacoes={negociacoes} loading={loadingNeg} onEditar={setEditando}/>
        )}
        {tabPrincipal === 'config' && (
          <ConfigGlobal config={config} setConfig={setConfig}/>
        )}
      </div>
    </div>
  );
}
