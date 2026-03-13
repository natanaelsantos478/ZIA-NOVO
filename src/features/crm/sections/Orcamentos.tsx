// ─────────────────────────────────────────────────────────────────────────────
// Orcamentos.tsx — Gestão de orçamentos do CRM
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Plus, ArrowLeft, FileDown, Settings2, Eye, EyeOff, Trash2, Edit3,
  Copy, ChevronUp, ChevronDown, Search, Truck, CreditCard, Tag,
  X, MoreHorizontal, FileSpreadsheet, DollarSign, Percent, Check,
  ClipboardList,
} from 'lucide-react';

/* ── TYPES ─────────────────────────────────────────────────────────────────── */
type ValorTipo  = '%' | 'R$';
type Operacao   = '+' | '-' | '*' | '/';
type OrcStatus  = 'rascunho' | 'enviado' | 'aprovado' | 'reprovado' | 'expirado';
type TabId      = 'dados' | 'produtos' | 'status' | 'config';

interface Desconto { id: string; label: string; valor: number; tipo: ValorTipo; }

interface Item {
  id: string; nome: string; nomeVariante: string; nomeOriginal: string;
  fabricante: string; imagem: string; quantidade: number; unidade: string;
  precoUnitario: number; descontos: Desconto[]; notaInterna: string;
  visivel: boolean; expandido: boolean;
}
interface FormaPgto {
  id: string; metodo: string; descValor: number; descTipo: ValorTipo; parcelas: number;
}
interface CampoExtra {
  id: string; nome: string; opA: string; opAFixo: number; operacao: Operacao;
  opB: string; opBFixo: number; negrito: boolean; visivel: boolean; posicao: number;
}
interface ConfigColuna { chave: string; label: string; negrito: boolean; visivel: boolean; }
interface Orcamento {
  id: string; numero: string; cliente: string; responsavel: string;
  dataEmissao: string; dataValidade: string; status: OrcStatus;
  observacoes: string; observacoesInternas: string; frete: number;
  itens: Item[]; formasPgto: FormaPgto[]; cupom: string;
  camposExtras: CampoExtra[]; colunas: ConfigColuna[];
}

/* ── CONSTANTS ──────────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<OrcStatus, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-slate-100 text-slate-600'  },
  enviado:   { label: 'Enviado',   cls: 'bg-blue-100 text-blue-700'    },
  aprovado:  { label: 'Aprovado',  cls: 'bg-green-100 text-green-700'  },
  reprovado: { label: 'Reprovado', cls: 'bg-red-100 text-red-700'      },
  expirado:  { label: 'Expirado',  cls: 'bg-amber-100 text-amber-700'  },
};

const COLUNAS_PADRAO: ConfigColuna[] = [
  { chave: 'produto',    label: 'Produto',          negrito: false, visivel: true },
  { chave: 'quantidade', label: 'Quantidade',        negrito: false, visivel: true },
  { chave: 'preco_unit', label: 'Preço Unitário',    negrito: false, visivel: true },
  { chave: 'descontos',  label: 'Descontos/Acrésc.', negrito: false, visivel: true },
  { chave: 'total',      label: 'Total Item',        negrito: true,  visivel: true },
  { chave: 'nota',       label: 'Nota Interna',      negrito: false, visivel: true },
];

const OPERANDOS = [
  { value: 'subtotal',        label: 'Subtotal (itens)' },
  { value: 'total_desconto',  label: 'Total Desconto'   },
  { value: 'frete',           label: 'Frete'            },
  { value: 'total_orcamento', label: 'Total Orçamento'  },
  { value: 'valor_fixo',      label: 'Valor fixo'       },
];

const METODOS_PGTO = [
  'Boleto Bancário','PIX','Cartão de Crédito','Cartão de Débito',
  'Transferência','Dinheiro','Cheque','Depósito Bancário',
];

/* ── UTILS ──────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR',{ minimumFractionDigits:2, maximumFractionDigits:2 })}`;

function applyDescontos(base: number, descontos: Desconto[]): number {
  return descontos.reduce((acc, d) =>
    d.tipo === '%' ? acc * (1 - d.valor / 100) : Math.max(0, acc - d.valor), base);
}
function calcTotalItem(item: Item): number {
  return applyDescontos(item.precoUnitario, item.descontos) * item.quantidade;
}
function calcSubtotal(itens: Item[]): number {
  return itens.filter(i => i.visivel).reduce((s, i) => s + calcTotalItem(i), 0);
}
function calcTotalOrc(orc: Orcamento): number {
  return calcSubtotal(orc.itens) + orc.frete;
}
function calcTotalPgto(base: number, fp: FormaPgto): number {
  const t = fp.descTipo === '%' ? base * (1 + fp.descValor / 100) : base + fp.descValor;
  return Math.max(0, t);
}
function resolveOp(key: string, fixo: number, ctx: Record<string, number>): number {
  return key === 'valor_fixo' ? fixo : (ctx[key] ?? 0);
}
function calcExtra(c: CampoExtra, ctx: Record<string, number>): number {
  const a = resolveOp(c.opA, c.opAFixo, ctx);
  const b = resolveOp(c.opB, c.opBFixo, ctx);
  switch(c.operacao) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
  }
}

function novoOrc(): Orcamento {
  return {
    id: uid(), numero: `ORC-2026-${String(Date.now()).slice(-3)}`,
    cliente:'', responsavel:'João Silva',
    dataEmissao: new Date().toISOString().slice(0,10),
    dataValidade: new Date(Date.now()+30*86400000).toISOString().slice(0,10),
    status:'rascunho', observacoes:'', observacoesInternas:'', frete:0,
    itens:[], formasPgto:[], cupom:'', camposExtras:[],
    colunas: COLUNAS_PADRAO.map(c=>({...c})),
  };
}

function exportarPDF(orc: Orcamento) {
  const sub   = calcSubtotal(orc.itens);
  const total = calcTotalOrc(orc);
  const w = window.open('', '_blank');
  if (!w) return;
  const itensHtml = orc.itens.filter(i=>i.visivel).map(item => {
    const fp = applyDescontos(item.precoUnitario, item.descontos);
    const ti = fp * item.quantidade;
    const dscs = item.descontos.map(d=>{
      const after = applyDescontos(item.precoUnitario,[d]) * item.quantidade;
      return `<tr><td style="padding:2px 8px">${d.label} (${d.valor}${d.tipo})</td><td style="padding:2px 8px;text-align:right">${fmt(after)}</td></tr>`;
    }).join('');
    return `
      <div style="border-bottom:1px solid #ddd;padding:12px 0">
        <table style="width:100%"><tr>
          <td style="width:50%;font-weight:600">${item.nome}</td>
          <td style="text-align:center">${item.quantidade} ${item.unidade}</td>
          <td style="text-align:right">${fmt(item.precoUnitario)}</td>
          <td style="text-align:right;font-weight:700">${fmt(ti)}</td>
        </tr></table>
        ${dscs ? `<table style="margin-top:4px;font-size:11px;color:#555">${dscs}</table>` : ''}
        ${item.notaInterna ? `<p style="font-size:11px;color:#888;margin:4px 0 0">Nota: ${item.notaInterna}</p>` : ''}
      </div>`;
  }).join('');
  const cpExtras = orc.camposExtras.filter(c=>c.visivel).map(c=>{
    const ctx = { subtotal:sub, total_desconto:0, frete:orc.frete, total_orcamento:total };
    const val = calcExtra(c, ctx);
    return `<p style="${c.negrito?'font-weight:700':''}">${c.nome}: ${fmt(val)}</p>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${orc.numero}</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:2cm}
  h1{font-size:22px;margin-bottom:4px}th{text-align:left;padding:4px 8px;background:#eee}
  @media print{@page{margin:2cm}}</style></head><body>
  <div style="border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:20px">
    <h1>Orçamento ${orc.numero}</h1>
    <p style="margin:2px 0"><strong>Cliente:</strong> ${orc.cliente || '—'}</p>
    <p style="margin:2px 0"><strong>Responsável:</strong> ${orc.responsavel}</p>
    <p style="margin:2px 0"><strong>Emissão:</strong> ${orc.dataEmissao} &nbsp;|&nbsp; <strong>Validade:</strong> ${orc.dataValidade}</p>
  </div>
  <table style="width:100%;margin-bottom:4px"><thead><tr>
    <th>Produto</th><th>Qtd.</th><th>Preço Un.</th><th style="text-align:right">Total</th>
  </tr></thead></table>
  ${itensHtml}
  <div style="margin-top:20px;text-align:right">
    <p>Subtotal: ${fmt(sub)}</p>
    ${orc.frete>0?`<p>Frete: ${fmt(orc.frete)}</p>`:''}
    ${cpExtras}
    <p style="font-size:16px;font-weight:700">TOTAL: ${fmt(total)}</p>
  </div>
  ${orc.observacoes?`<div style="margin-top:20px"><strong>Observações:</strong><p>${orc.observacoes}</p></div>`:''}
  </body></html>`;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* ── MOCK DATA ──────────────────────────────────────────────────────────────── */
const MOCK_ORCAMENTOS: Orcamento[] = [
  {
    id:'o1', numero:'ORC-2026-001', cliente:'Empresa Alpha Ltda',
    responsavel:'João Silva', dataEmissao:'2026-02-10', dataValidade:'2026-03-10',
    status:'enviado', observacoes:'Prazo de entrega: 15 dias úteis.',
    observacoesInternas:'Cliente solicitou urgência.', frete:350,
    itens:[{
      id:'i1', nome:'ESCRIVANINHA VELL - MICROTEXTURA', imagem:'',
      nomeVariante:'ESCRIVANINHA VELL - 140 X 050.5 X 080 H - [P] AVO MT X [C] DENVER SEAL GREY X [A] ROSE',
      nomeOriginal:'ESCRIVANINHA VELL - MICROTEXTURA - 140 X 050.5 X 080 H',
      fabricante:'BEACH & COUNTRY', quantidade:1, unidade:'UN', precoUnitario:33756,
      descontos:[
        {id:'d1', label:'Desconto de Fábrica', valor:7.5,  tipo:'%'},
        {id:'d2', label:'Desconto Especial',    valor:16.75, tipo:'%'},
      ],
      notaInterna:'', visivel:true, expandido:true,
    }],
    formasPgto:[{id:'fp1', metodo:'Boleto Bancário', descValor:0, descTipo:'%', parcelas:1}],
    cupom:'', camposExtras:[], colunas:COLUNAS_PADRAO.map(c=>({...c})),
  },
  {
    id:'o2', numero:'ORC-2026-002', cliente:'Beta Comércio S.A.',
    responsavel:'Maria Santos', dataEmissao:'2026-03-01', dataValidade:'2026-03-31',
    status:'rascunho', observacoes:'', observacoesInternas:'', frete:0,
    itens:[], formasPgto:[], cupom:'', camposExtras:[],
    colunas:COLUNAS_PADRAO.map(c=>({...c})),
  },
  {
    id:'o3', numero:'ORC-2026-003', cliente:'Gama Indústria Ltda',
    responsavel:'Pedro Costa', dataEmissao:'2026-01-15', dataValidade:'2026-02-14',
    status:'aprovado', observacoes:'Aprovado em 20/01/2026.', observacoesInternas:'', frete:500,
    itens:[], formasPgto:[], cupom:'', camposExtras:[],
    colunas:COLUNAS_PADRAO.map(c=>({...c})),
  },
];

/* ── MODAL ADICIONAR PRODUTO ────────────────────────────────────────────────── */
interface AddProdModalProps { onAdd:(item:Item)=>void; onClose:()=>void; }
function AddProdModal({ onAdd, onClose }: AddProdModalProps) {
  const [nome, setNome]             = useState('');
  const [nomeVar, setNomeVar]       = useState('');
  const [nomeOrig, setNomeOrig]     = useState('');
  const [fabricante, setFabricante] = useState('');
  const [qtd, setQtd]               = useState(1);
  const [unid, setUnid]             = useState('UN');
  const [preco, setPreco]           = useState(0);
  const [descontos, setDescontos]   = useState<Desconto[]>([]);

  const addDesc = () => setDescontos(d=>[...d,{id:uid(),label:'',valor:0,tipo:'%'}]);
  const removeDesc = (id:string) => setDescontos(d=>d.filter(x=>x.id!==id));
  const updateDesc = (id:string, field:keyof Desconto, val:string|number) =>
    setDescontos(d=>d.map(x=>x.id===id?{...x,[field]:val}:x));

  const handleAdd = () => {
    if (!nome.trim()) return;
    onAdd({
      id:uid(), nome, nomeVariante:nomeVar, nomeOriginal:nomeOrig, fabricante,
      imagem:'', quantidade:qtd, unidade:unid, precoUnitario:preco,
      descontos, notaInterna:'', visivel:true, expandido:true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Adicionar Produto / Serviço</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome do produto *</label>
            <input value={nome} onChange={e=>setNome(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Ex: Mesa de escritório"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da variante</label>
            <input value={nomeVar} onChange={e=>setNomeVar(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Cor, tamanho, modelo..."/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nome original</label>
              <input value={nomeOrig} onChange={e=>setNomeOrig(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fabricante</label>
              <input value={fabricante} onChange={e=>setFabricante(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Quantidade</label>
              <input type="number" min={1} value={qtd} onChange={e=>setQtd(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Unidade</label>
              <input value={unid} onChange={e=>setUnid(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Preço unitário (R$)</label>
              <input type="number" min={0} step={0.01} value={preco} onChange={e=>setPreco(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
          </div>
          {/* Descontos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Descontos / Acréscimos</label>
              <button onClick={addDesc} className="text-xs text-purple-600 hover:text-purple-800 font-medium">+ Adicionar</button>
            </div>
            {descontos.map(d => (
              <div key={d.id} className="flex items-center gap-2 mb-2">
                <input value={d.label} onChange={e=>updateDesc(d.id,'label',e.target.value)}
                  placeholder="Descrição (ex: Desconto de fábrica)"
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                <input type="number" step={0.01} value={d.valor} onChange={e=>updateDesc(d.id,'valor',Number(e.target.value))}
                  className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                <select value={d.tipo} onChange={e=>updateDesc(d.id,'tipo',e.target.value as ValorTipo)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                  <option value="%">%</option>
                  <option value="R$">R$</option>
                </select>
                <button onClick={()=>removeDesc(d.id)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleAdd}
            className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
            Adicionar Produto
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TAB: PRODUTOS ──────────────────────────────────────────────────────────── */
function TabProdutos({ orc, setOrc }: { orc: Orcamento; setOrc:(o:Orcamento)=>void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editandoFrete, setEditandoFrete] = useState(false);
  const [freteInput, setFreteInput] = useState(String(orc.frete));
  const [cupomInput, setCupomInput] = useState(orc.cupom);
  const [cupomAtivo, setCupomAtivo] = useState(!!orc.cupom);

  const sub   = calcSubtotal(orc.itens);
  const total = calcTotalOrc(orc);
  const ctx   = { subtotal: sub, total_desconto: 0, frete: orc.frete, total_orcamento: total };

  // Item helpers
  const setItem = (id:string, fn:(i:Item)=>Item) =>
    setOrc({...orc, itens: orc.itens.map(i=>i.id===id?fn(i):i)});
  const removeItem = (id:string) =>
    setOrc({...orc, itens: orc.itens.filter(i=>i.id!==id)});
  const dupItem = (id:string) => {
    const it = orc.itens.find(i=>i.id===id);
    if (it) setOrc({...orc, itens:[...orc.itens, {...it, id:uid()}]});
  };

  // Discount helpers dentro de item
  const addDesc = (itemId:string) =>
    setItem(itemId, i=>({...i, descontos:[...i.descontos,{id:uid(),label:'',valor:0,tipo:'%'}]}));
  const removeDesc = (itemId:string, dId:string) =>
    setItem(itemId, i=>({...i, descontos:i.descontos.filter(d=>d.id!==dId)}));
  const updateDesc = (itemId:string, dId:string, field:keyof Desconto, val:string|number) =>
    setItem(itemId, i=>({...i, descontos:i.descontos.map(d=>d.id===dId?{...d,[field]:val}:d)}));

  // Formas de pagamento
  const addFp = () =>
    setOrc({...orc, formasPgto:[...orc.formasPgto,{id:uid(),metodo:'PIX',descValor:0,descTipo:'%',parcelas:1}]});
  const removeFp = (id:string) => setOrc({...orc, formasPgto:orc.formasPgto.filter(f=>f.id!==id)});
  const updateFp = (id:string, field:keyof FormaPgto, val:string|number) =>
    setOrc({...orc, formasPgto:orc.formasPgto.map(f=>f.id===id?{...f,[field]:val}:f)});

  const col = (k:string) => orc.colunas.find(c=>c.chave===k);
  const colVisible = (k:string) => col(k)?.visivel !== false;
  const colBold = (k:string) => col(k)?.negrito === true;

  return (
    <div className="p-6 space-y-6">
      {showAddModal && (
        <AddProdModal
          onAdd={item=>{ setOrc({...orc, itens:[...orc.itens,item]}); setShowAddModal(false); }}
          onClose={()=>setShowAddModal(false)}
        />
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
          <Plus size={16}/> Adicionar Produto
        </button>
        <button onClick={()=>setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-50">
          <FileSpreadsheet size={15}/> Adicionar produtos rápido <span className="text-xs bg-purple-100 px-1.5 py-0.5 rounded">(Ctrl+H)</span>
        </button>
        <button className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
          <ClipboardList size={15}/> Gerar Pedido
        </button>
      </div>

      {/* Produtos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between bg-slate-700 text-white px-4 py-2.5">
          <span className="text-xs font-bold tracking-wide">SERVIÇOS / PRODUTOS</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">{orc.itens.length} item(s)</span>
          </div>
        </div>
        {orc.itens.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
          </div>
        ) : (
          <>
            {/* Cabeçalho da tabela */}
            <div className="grid gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500"
              style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
              {colVisible('produto')    && <span>PRODUTO</span>}
              {colVisible('quantidade') && <span>QUANT.</span>}
              {colVisible('preco_unit') && <span>PREÇO UN. (R$)</span>}
              {colVisible('total')      && <span className="text-right">TOTAL (R$)</span>}
              <span />
            </div>
            {orc.itens.map(item => {
              const precoFinal = applyDescontos(item.precoUnitario, item.descontos);
              const totalI     = precoFinal * item.quantidade;
              let   acumPreco  = item.precoUnitario;
              return (
                <div key={item.id} className="border-b border-slate-100 last:border-b-0">
                  {/* Linha principal */}
                  <div className="grid gap-2 items-center px-4 py-3"
                    style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
                    {colVisible('produto') && (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {item.imagem
                            ? <img src={item.imagem} className="w-full h-full object-cover rounded-lg" alt=""/>
                            : <MoreHorizontal size={18} className="text-slate-300"/>}
                        </div>
                        <div>
                          <p className={`text-sm ${colBold('produto')?'font-bold':'font-medium'} text-slate-800 leading-tight`}>{item.nome}</p>
                          {item.nomeVariante && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.nomeVariante}</p>}
                        </div>
                      </div>
                    )}
                    {colVisible('quantidade') && (
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} value={item.quantidade}
                          onChange={e=>setItem(item.id, i=>({...i, quantidade:Number(e.target.value)}))}
                          className="w-14 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                        <span className="text-xs text-slate-500">{item.unidade}</span>
                      </div>
                    )}
                    {colVisible('preco_unit') && (
                      <input type="number" min={0} step={0.01} value={item.precoUnitario}
                        onChange={e=>setItem(item.id, i=>({...i, precoUnitario:Number(e.target.value)}))}
                        className="w-28 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                    )}
                    {colVisible('total') && (
                      <p className={`text-sm text-right ${colBold('total')?'font-bold':'font-medium'} text-slate-800`}>{fmt(totalI)}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setItem(item.id,i=>({...i,visivel:!i.visivel}))}
                        className={`p-1.5 rounded-lg ${item.visivel?'text-slate-400 hover:text-slate-600':'text-slate-300'}`}>
                        {item.visivel ? <Eye size={15}/> : <EyeOff size={15}/>}
                      </button>
                      <button onClick={()=>setItem(item.id,i=>({...i,expandido:!i.expandido}))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                        {item.expandido ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                      </button>
                      <button onClick={()=>dupItem(item.id)} className="px-2 py-1 rounded text-xs border border-slate-200 text-slate-500 hover:bg-slate-50">Dup.</button>
                      <button onClick={()=>removeItem(item.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600"><Trash2 size={15}/></button>
                    </div>
                  </div>

                  {/* Detalhe expandido */}
                  {item.expandido && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-4 py-3 text-xs text-slate-500">
                        {item.nomeOriginal && <p><span className="font-medium">Nome Original:</span> {item.nomeOriginal}</p>}
                        {item.fabricante   && <p><span className="font-medium">Fábrica:</span> {item.fabricante}</p>}
                      </div>

                      {/* Linha de descontos / acréscimos */}
                      {colVisible('descontos') && (
                        <div className="space-y-2 mb-3">
                          {item.descontos.map(d => {
                            const precoAntes = acumPreco;
                            const precoDepois = d.tipo === '%'
                              ? acumPreco * (1 - d.valor/100)
                              : Math.max(0, acumPreco - d.valor);
                            acumPreco = precoDepois;
                            const totalDepois = precoDepois * item.quantidade;
                            return (
                              <div key={d.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-200">
                                <input value={d.label} onChange={e=>updateDesc(item.id,d.id,'label',e.target.value)}
                                  placeholder="Descrição do desconto"
                                  className="flex-1 text-xs border-0 bg-transparent focus:outline-none text-slate-700"/>
                                <input type="number" step={0.01} value={d.valor}
                                  onChange={e=>updateDesc(item.id,d.id,'valor',Number(e.target.value))}
                                  className="w-16 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                                <select value={d.tipo} onChange={e=>updateDesc(item.id,d.id,'tipo',e.target.value as ValorTipo)}
                                  className="text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400">
                                  <option value="%">%</option>
                                  <option value="R$">R$</option>
                                </select>
                                <span className="text-xs text-slate-500 w-32 text-right">1x de {fmt(precoDepois)}</span>
                                <span className="text-xs font-semibold text-slate-700 w-28 text-right">{fmt(totalDepois)}</span>
                                <button onClick={()=>removeDesc(item.id,d.id)} className="text-red-400 hover:text-red-600 ml-1"><X size={13}/></button>
                              </div>
                            );
                          })}
                          <button onClick={()=>addDesc(item.id)}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                            + Adicionar desconto / acréscimo
                          </button>
                        </div>
                      )}

                      {/* A partir de */}
                      {item.descontos.length > 0 && (
                        <div className="flex justify-end gap-8 mb-3 text-xs">
                          <span className="text-slate-500 italic">A partir de</span>
                          <span className="font-bold text-slate-800">{fmt(precoFinal * item.quantidade)}</span>
                        </div>
                      )}

                      {/* Nota interna */}
                      {colVisible('nota') && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Nota interna</p>
                          <input value={item.notaInterna}
                            onChange={e=>setItem(item.id,i=>({...i,notaInterna:e.target.value}))}
                            placeholder="Observação interna sobre este item..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"/>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-600 tracking-wide">OBSERVAÇÕES</span>
        </div>
        <textarea rows={4} value={orc.observacoes}
          onChange={e=>setOrc({...orc,observacoes:e.target.value})}
          placeholder="Observações sobre o orçamento"
          className="w-full px-4 py-3 text-sm text-slate-700 focus:outline-none resize-y"/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-600 tracking-wide">OBSERVAÇÕES INTERNAS</span>
        </div>
        <textarea rows={4} value={orc.observacoesInternas}
          onChange={e=>setOrc({...orc,observacoesInternas:e.target.value})}
          placeholder="Observações internas do orçamento"
          className="w-full px-4 py-3 text-sm text-slate-700 focus:outline-none resize-y"/>
      </div>

      {/* Frete */}
      <div className="bg-slate-600 text-white rounded-xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Truck size={16}/>
          <div>
            <p className="text-xs font-bold tracking-wide">FRETE</p>
            <p className="text-xs text-slate-300">(Desconto do orçamento não interfere no valor do frete)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editandoFrete ? (
            <>
              <span className="text-sm text-slate-300">R$</span>
              <input type="number" min={0} step={0.01} value={freteInput}
                onChange={e=>setFreteInput(e.target.value)}
                className="w-28 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"/>
              <button onClick={()=>{ setOrc({...orc,frete:Number(freteInput)}); setEditandoFrete(false); }}
                className="p-1.5 bg-green-500 rounded-lg hover:bg-green-600"><Check size={14}/></button>
              <button onClick={()=>setEditandoFrete(false)} className="p-1.5 bg-red-500 rounded-lg hover:bg-red-600"><X size={14}/></button>
            </>
          ) : (
            <>
              <span className="font-bold text-sm">{fmt(orc.frete)}</span>
              <button onClick={()=>{ setFreteInput(String(orc.frete)); setEditandoFrete(true); }}
                className="p-1.5 bg-green-500 rounded-lg hover:bg-green-600"><Edit3 size={14}/></button>
            </>
          )}
        </div>
      </div>

      {/* Total Orçamento */}
      <div className="bg-slate-700 text-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-bold tracking-wide">TOTAL ORÇAMENTO</span>
          <span className="text-xs text-slate-300">{orc.itens.filter(i=>i.visivel).length} item(s)</span>
          <span className="text-base font-bold">{fmt(total)}</span>
        </div>
        {/* Campos extras */}
        {orc.camposExtras.filter(c=>c.visivel).map(c=>{
          const val = calcExtra(c, ctx);
          return (
            <div key={c.id} className="flex justify-between px-4 py-2 border-t border-slate-600 text-sm">
              <span className={c.negrito?'font-bold':''} >{c.nome}</span>
              <span className={c.negrito?'font-bold':''}>{fmt(val)}</span>
            </div>
          );
        })}

        {/* Formas de Pagamento */}
        <div className="border-t border-slate-600 px-4 py-3">
          <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-slate-300">
            <span>Formas de pagamento</span>
            <span>Desconto/Acréscimo</span>
            <span>Parcelas</span>
            <span className="text-right">Total</span>
          </div>
          {orc.formasPgto.map(fp => {
            const tFp = calcTotalPgto(total, fp);
            return (
              <div key={fp.id} className="grid grid-cols-4 gap-2 items-center mb-2">
                <select value={fp.metodo} onChange={e=>updateFp(fp.id,'metodo',e.target.value)}
                  className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs text-white focus:outline-none">
                  {METODOS_PGTO.map(m=><option key={m}>{m}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" step={0.01} value={fp.descValor}
                    onChange={e=>updateFp(fp.id,'descValor',Number(e.target.value))}
                    className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs text-white focus:outline-none"/>
                  <select value={fp.descTipo} onChange={e=>updateFp(fp.id,'descTipo',e.target.value as ValorTipo)}
                    className="bg-slate-600 border border-slate-500 rounded px-1 py-1 text-xs text-white focus:outline-none">
                    <option value="%">%</option>
                    <option value="R$">R$</option>
                  </select>
                </div>
                <input type="number" min={1} value={fp.parcelas}
                  onChange={e=>updateFp(fp.id,'parcelas',Number(e.target.value))}
                  className="w-14 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs text-white focus:outline-none"/>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-right flex-1">{fmt(tFp)}</span>
                  <button onClick={()=>removeFp(fp.id)} className="ml-2 text-red-400 hover:text-red-300"><X size={14}/></button>
                </div>
              </div>
            );
          })}
          <button onClick={addFp}
            className="mt-1 text-xs text-purple-300 hover:text-purple-200 font-medium flex items-center gap-1">
            <Plus size={13}/> Adicionar forma de pagamento
          </button>
        </div>

        {/* Cupom */}
        <div className="flex items-center justify-between border-t border-slate-600 px-4 py-3">
          <div className="flex items-center gap-2">
            <Tag size={14}/>
            <span className="text-xs font-bold tracking-wide">INSERIR CUPOM</span>
          </div>
          <div className="flex items-center gap-2">
            {cupomAtivo ? (
              <div className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-lg">
                <Check size={13}/>
                <span className="text-xs font-semibold">{orc.cupom}</span>
                <button onClick={()=>{ setOrc({...orc,cupom:''}); setCupomAtivo(false); setCupomInput(''); }}
                  className="text-green-200 hover:text-white"><X size={13}/></button>
              </div>
            ) : (
              <>
                <input value={cupomInput} onChange={e=>setCupomInput(e.target.value)}
                  placeholder="Código do cupom"
                  className="bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none w-36"/>
                <button onClick={()=>{ if(cupomInput.trim()){ setOrc({...orc,cupom:cupomInput.trim()}); setCupomAtivo(true); }}}
                  className="px-3 py-1.5 bg-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-700">
                  Aplicar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── TAB: DADOS GERAIS ──────────────────────────────────────────────────────── */
function TabDados({ orc, setOrc }: { orc: Orcamento; setOrc:(o:Orcamento)=>void }) {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Informações do Orçamento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Número</label>
            <input value={orc.numero} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <select value={orc.status} onChange={e=>setOrc({...orc,status:e.target.value as OrcStatus})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              {(Object.entries(STATUS_MAP) as [OrcStatus,{label:string}][]).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente *</label>
            <input value={orc.cliente} onChange={e=>setOrc({...orc,cliente:e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Nome do cliente"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Responsável</label>
            <input value={orc.responsavel} onChange={e=>setOrc({...orc,responsavel:e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Data de Emissão</label>
            <input type="date" value={orc.dataEmissao} onChange={e=>setOrc({...orc,dataEmissao:e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Data de Validade</label>
            <input type="date" value={orc.dataValidade} onChange={e=>setOrc({...orc,dataValidade:e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── TAB: STATUS ────────────────────────────────────────────────────────────── */
function TabStatus({ orc, setOrc }: { orc: Orcamento; setOrc:(o:Orcamento)=>void }) {
  const historico = [
    { data: orc.dataEmissao, status: 'rascunho', desc: 'Orçamento criado' },
    ...(orc.status !== 'rascunho' ? [{ data: orc.dataEmissao, status: orc.status, desc: `Status alterado para ${STATUS_MAP[orc.status].label}` }] : []),
  ];
  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Status Atual</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_MAP[orc.status].cls}`}>
            {STATUS_MAP[orc.status].label}
          </span>
        </div>
        <label className="text-xs font-medium text-slate-500 mb-2 block">Alterar status</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(STATUS_MAP) as [OrcStatus,{label:string;cls:string}][]).map(([k,v])=>(
            <button key={k} onClick={()=>setOrc({...orc,status:k})}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${orc.status===k?'border-purple-500 '+v.cls:'border-transparent '+v.cls+' opacity-70 hover:opacity-100'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Histórico</h3>
        <div className="space-y-3">
          {historico.map((h,i)=>(
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0"/>
              <div>
                <p className="text-xs text-slate-500">{h.data}</p>
                <p className="text-sm text-slate-700">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── TAB: CONFIGURAÇÃO ──────────────────────────────────────────────────────── */
function TabConfig({ orc, setOrc }: { orc: Orcamento; setOrc:(o:Orcamento)=>void }) {
  const setColunas = (fn:(cs:ConfigColuna[])=>ConfigColuna[]) =>
    setOrc({...orc, colunas: fn(orc.colunas)});
  const updateColuna = (chave:string, field:keyof ConfigColuna, val:boolean) =>
    setColunas(cs=>cs.map(c=>c.chave===chave?{...c,[field]:val}:c));

  const setCampos = (fn:(cs:CampoExtra[])=>CampoExtra[]) =>
    setOrc({...orc, camposExtras: fn(orc.camposExtras)});
  const addCampo = () => {
    if (orc.camposExtras.length >= 5) return;
    setCampos(cs=>[...cs,{
      id:uid(), nome:'Novo Campo', opA:'subtotal', opAFixo:0,
      operacao:'+', opB:'valor_fixo', opBFixo:0,
      negrito:false, visivel:true, posicao:cs.length,
    }]);
  };
  const removeCampo = (id:string) => setCampos(cs=>cs.filter(c=>c.id!==id));
  const updateCampo = (id:string, field:keyof CampoExtra, val:string|number|boolean) =>
    setCampos(cs=>cs.map(c=>c.id===id?{...c,[field]:val}:c));
  const moveCampo = (id:string, dir:-1|1) => {
    setCampos(cs=>{
      const idx = cs.findIndex(c=>c.id===id);
      if (idx+dir < 0 || idx+dir >= cs.length) return cs;
      const arr = [...cs];
      [arr[idx], arr[idx+dir]] = [arr[idx+dir], arr[idx]];
      return arr.map((c,i)=>({...c,posicao:i}));
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Colunas padrão */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-1">Colunas do Orçamento</h3>
        <p className="text-xs text-slate-400 mb-4">Escolha quais colunas aparecem e se estão em negrito</p>
        <div className="space-y-2">
          {orc.colunas.map(col=>(
            <div key={col.chave} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
              <span className={`text-sm ${col.negrito?'font-bold':'font-medium'} text-slate-700`}>{col.label}</span>
              <div className="flex items-center gap-3">
                <button onClick={()=>updateColuna(col.chave,'negrito',!col.negrito)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                    ${col.negrito?'bg-purple-100 border-purple-300 text-purple-700':'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  <span className="font-bold">N</span> Negrito
                </button>
                <button onClick={()=>updateColuna(col.chave,'visivel',!col.visivel)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                    ${col.visivel?'bg-green-100 border-green-300 text-green-700':'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {col.visivel?<><Eye size={12}/> Visível</>:<><EyeOff size={12}/> Oculto</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campos extras */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-700">Campos Personalizados</h3>
          <span className="text-xs text-slate-400">{orc.camposExtras.length}/5 campos</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Crie campos calculados que aparecem no resumo do orçamento (ex: Taxa de Instalação = Total × 0,05)</p>
        <div className="space-y-4">
          {orc.camposExtras.map((c,idx)=>(
            <div key={c.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input value={c.nome} onChange={e=>updateCampo(c.id,'nome',e.target.value)}
                  placeholder="Nome do campo"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                <div className="flex items-center gap-1">
                  <button onClick={()=>moveCampo(c.id,-1)} disabled={idx===0}
                    className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><ChevronUp size={14}/></button>
                  <button onClick={()=>moveCampo(c.id,1)} disabled={idx===orc.camposExtras.length-1}
                    className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><ChevronDown size={14}/></button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Valor A</label>
                  <select value={c.opA} onChange={e=>updateCampo(c.id,'opA',e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                    {OPERANDOS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {c.opA==='valor_fixo' && (
                    <input type="number" value={c.opAFixo} onChange={e=>updateCampo(c.id,'opAFixo',Number(e.target.value))}
                      className="w-full mt-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" placeholder="0,00"/>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Operação</label>
                  <select value={c.operacao} onChange={e=>updateCampo(c.id,'operacao',e.target.value as Operacao)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-400">
                    <option value="+">+ Somar</option>
                    <option value="-">− Diminuir</option>
                    <option value="*">× Multiplicar</option>
                    <option value="/">÷ Dividir</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Valor B</label>
                  <select value={c.opB} onChange={e=>updateCampo(c.id,'opB',e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">
                    {OPERANDOS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {c.opB==='valor_fixo' && (
                    <input type="number" value={c.opBFixo} onChange={e=>updateCampo(c.id,'opBFixo',Number(e.target.value))}
                      className="w-full mt-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" placeholder="0,00"/>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={()=>updateCampo(c.id,'negrito',!c.negrito)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                    ${c.negrito?'bg-purple-100 border-purple-300 text-purple-700':'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  <span className="font-bold">N</span> Negrito
                </button>
                <button onClick={()=>updateCampo(c.id,'visivel',!c.visivel)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all
                    ${c.visivel?'bg-green-100 border-green-300 text-green-700':'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {c.visivel?<><Eye size={12}/> Visível</>:<><EyeOff size={12}/> Oculto</>}
                </button>
                <button onClick={()=>removeCampo(c.id)}
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 border border-red-200">
                  <Trash2 size={12}/> Remover
                </button>
              </div>
            </div>
          ))}
        </div>
        {orc.camposExtras.length < 5 && (
          <button onClick={addCampo}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50 w-full justify-center">
            <Plus size={16}/> Adicionar Campo Personalizado
          </button>
        )}
      </div>
    </div>
  );
}

/* ── EDITOR ─────────────────────────────────────────────────────────────────── */
function OrcamentoEditor({
  orcamento, onSave, onCancel,
}: { orcamento: Orcamento; onSave:(o:Orcamento)=>void; onCancel:()=>void; }) {
  const [orc, setOrc]     = useState<Orcamento>(orcamento);
  const [tab, setTab]     = useState<TabId>('dados');

  const TABS: {id:TabId;label:string}[] = [
    {id:'dados',    label:'Dados Gerais'},
    {id:'produtos', label:'Produtos'},
    {id:'status',   label:'Status'},
    {id:'config',   label:'Configuração'},
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{orc.numero}</h2>
            <p className="text-xs text-slate-400">{orc.cliente || 'Sem cliente'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[orc.status].cls}`}>
            {STATUS_MAP[orc.status].label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>exportarPDF(orc)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
            <FileDown size={15}/> Exportar PDF
          </button>
          <button onClick={()=>onSave(orc)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
            <Check size={15}/> Salvar Orçamento
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all
              ${tab===t.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {tab==='dados'    && <TabDados    orc={orc} setOrc={setOrc}/>}
        {tab==='produtos' && <TabProdutos orc={orc} setOrc={setOrc}/>}
        {tab==='status'   && <TabStatus   orc={orc} setOrc={setOrc}/>}
        {tab==='config'   && <TabConfig   orc={orc} setOrc={setOrc}/>}
      </div>
    </div>
  );
}

/* ── LIST ───────────────────────────────────────────────────────────────────── */
function OrcamentosList({
  orcamentos, onNovo, onEditar, onDuplicar, onExcluir,
}: {
  orcamentos: Orcamento[];
  onNovo:()=>void;
  onEditar:(o:Orcamento)=>void;
  onDuplicar:(o:Orcamento)=>void;
  onExcluir:(id:string)=>void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<OrcStatus|'todos'>('todos');

  const filtrados = orcamentos.filter(o=>{
    const matchBusca = !busca || o.numero.toLowerCase().includes(busca.toLowerCase()) || o.cliente.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus==='todos' || o.status===filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Orçamentos</h1>
          <p className="text-sm text-slate-400">{orcamentos.length} orçamento(s) no total</p>
        </div>
        <button onClick={onNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
          <Plus size={16}/> Novo Orçamento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e=>setBusca(e.target.value)}
            placeholder="Buscar por número ou cliente..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['todos','rascunho','enviado','aprovado','reprovado','expirado'] as const).map(s=>(
            <button key={s} onClick={()=>setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroStatus===s?'bg-purple-600 text-white':'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {s==='todos'?'Todos':STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Responsável</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Emissão</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Validade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Itens</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Total</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhum orçamento encontrado</td></tr>
            )}
            {filtrados.map(o=>(
              <tr key={o.id} className="border-b border-slate-50 hover:bg-purple-50/30 cursor-pointer transition-colors"
                onClick={()=>onEditar(o)}>
                <td className="px-4 py-3 font-semibold text-purple-700">{o.numero}</td>
                <td className="px-4 py-3 text-slate-700">{o.cliente || <span className="text-slate-400 italic">—</span>}</td>
                <td className="px-4 py-3 text-slate-500">{o.responsavel}</td>
                <td className="px-4 py-3 text-slate-500">{o.dataEmissao}</td>
                <td className="px-4 py-3 text-slate-500">{o.dataValidade}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[o.status].cls}`}>
                    {STATUS_MAP[o.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{o.itens.length}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(calcTotalOrc(o))}</td>
                <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={()=>onEditar(o)} className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50"><Edit3 size={15}/></button>
                    <button onClick={()=>onDuplicar(o)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Copy size={15}/></button>
                    <button onClick={()=>onExcluir(o.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MAIN EXPORT ────────────────────────────────────────────────────────────── */
export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(MOCK_ORCAMENTOS);
  const [editando, setEditando]     = useState<Orcamento | null>(null);

  const handleSave = (orc: Orcamento) => {
    setOrcamentos(os => os.some(o=>o.id===orc.id) ? os.map(o=>o.id===orc.id?orc:o) : [...os, orc]);
    setEditando(null);
  };
  const handleNovo = () => setEditando(novoOrc());
  const handleDuplicar = (o: Orcamento) => setEditando({...o, id:uid(), numero:`${o.numero}-CÓPIA`, status:'rascunho'});
  const handleExcluir = (id: string) => setOrcamentos(os=>os.filter(o=>o.id!==id));

  if (editando) {
    return (
      <div className="h-full flex flex-col">
        <OrcamentoEditor orcamento={editando} onSave={handleSave} onCancel={()=>setEditando(null)}/>
      </div>
    );
  }

  return (
    <OrcamentosList
      orcamentos={orcamentos}
      onNovo={handleNovo}
      onEditar={setEditando}
      onDuplicar={handleDuplicar}
      onExcluir={handleExcluir}
    />
  );
}
