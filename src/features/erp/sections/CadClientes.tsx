import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, X, MapPin, Loader2, CheckCircle, AlertCircle,
  ChevronRight, Building2, User, Phone, Mail, FileText, TrendingUp, ShoppingCart,
  Calendar, DollarSign, ExternalLink, Save,
} from 'lucide-react';
import { getClientes, createCliente, updateCliente, deleteCliente, consultarCNPJ, consultarCEP } from '../../../lib/erp';
import type { ErpCliente } from '../../../lib/erp';
import { getAllNegociacoes } from '../../crm/data/crmData';
import type { NegociacaoData, Orcamento } from '../../crm/data/crmData';

type Endereco = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string };

type DetailTab = 'dados' | 'negociacoes' | 'orcamentos';

const EMPTY_FORM: Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'> = {
  tipo: 'PJ', nome: '', cpf_cnpj: '', inscricao_estadual: null, email: null,
  telefone: null, endereco_json: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
  limite_credito: null, tabela_preco_id: null, vendedor_id: null, ativo: true,
};

function formatCpfCnpj(v: string, tipo: 'PF' | 'PJ'): string {
  const d = v.replace(/\D/g, '');
  if (tipo === 'PJ') return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
}

const STATUS_NEG: Record<string, { label: string; bg: string; color: string }> = {
  aberta:   { label: 'Aberta',   bg: 'bg-blue-100',   color: 'text-blue-700' },
  ganha:    { label: 'Ganha',    bg: 'bg-green-100',  color: 'text-green-700' },
  perdida:  { label: 'Perdida',  bg: 'bg-red-100',    color: 'text-red-700' },
  suspensa: { label: 'Suspensa', bg: 'bg-amber-100',  color: 'text-amber-700' },
};
const STATUS_ORC: Record<string, { label: string; bg: string; color: string }> = {
  rascunho: { label: 'Rascunho', bg: 'bg-slate-100',  color: 'text-slate-600' },
  enviado:  { label: 'Enviado',  bg: 'bg-blue-100',   color: 'text-blue-700' },
  aprovado: { label: 'Aprovado', bg: 'bg-green-100',  color: 'text-green-700' },
  recusado: { label: 'Recusado', bg: 'bg-red-100',    color: 'text-red-700' },
};
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// ── Aba Dados do Cliente ───────────────────────────────────────────────────────
function TabDados({
  form, setForm, editId, saving, onSave, lookingUp,
  handleCNPJLookup, handleCEPLookup,
}: {
  form: Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'>>>;
  editId: string | null;
  saving: boolean;
  onSave: () => void;
  lookingUp: boolean;
  handleCNPJLookup: () => void;
  handleCEPLookup: () => void;
}) {
  const addr = ((form.endereco_json ?? EMPTY_FORM.endereco_json) as Endereco);

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full custom-scrollbar">
      {/* Tipo */}
      <div className="flex gap-3">
        {(['PJ', 'PF'] as const).map(t => (
          <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.tipo === t ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
          </button>
        ))}
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{form.tipo === 'PJ' ? 'CNPJ' : 'CPF'} *</label>
        <div className="flex gap-2">
          <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder={form.tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
            value={form.cpf_cnpj}
            onChange={e => setForm(p => ({ ...p, cpf_cnpj: formatCpfCnpj(e.target.value, p.tipo) }))}
          />
          {form.tipo === 'PJ' && (
            <button onClick={handleCNPJLookup} disabled={lookingUp}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
              {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Buscar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Razão Social *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Insc. Estadual</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.inscricao_estadual ?? ''} onChange={e => setForm(p => ({ ...p, inscricao_estadual: e.target.value || null }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
          <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value || null }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value || null }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Limite de Crédito (R$)</label>
          <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.limite_credito ?? ''} onChange={e => setForm(p => ({ ...p, limite_credito: e.target.value ? +e.target.value : null }))} />
        </div>
      </div>

      {/* Endereço */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><MapPin className="w-3 h-3" />Endereço</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
            <div className="flex gap-1">
              <input className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={addr.cep} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cep: e.target.value } }))} />
              <button onClick={handleCEPLookup} disabled={lookingUp} className="px-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3 text-slate-500" />}
              </button>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={addr.logradouro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), logradouro: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={addr.numero} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), numero: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={addr.bairro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), bairro: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={addr.cidade} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cidade: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">UF</label>
            <input maxLength={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 uppercase"
              value={addr.uf} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), uf: e.target.value.toUpperCase() } }))} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
        <label htmlFor="ativo" className="text-sm text-slate-700">Cliente ativo</label>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editId ? 'Salvar Alterações' : 'Criar Cliente'}
        </button>
      </div>
    </div>
  );
}

// ── Aba Negociações Vinculadas ─────────────────────────────────────────────────
function TabNegociacoes({ negs }: { negs: NegociacaoData[] }) {
  if (negs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <TrendingUp className="w-10 h-10 text-slate-200 mb-3" />
        <p className="font-semibold text-slate-500">Nenhuma negociação vinculada</p>
        <p className="text-sm text-slate-400 mt-1">Vincule este cliente em uma negociação do CRM.</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full custom-scrollbar">
      {negs.map(({ negociacao: n }) => {
        const st = STATUS_NEG[n.status] ?? STATUS_NEG.aberta;
        return (
          <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{n.descricao || 'Sem descrição'}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">#{n.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{n.responsavel || '—'}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(n.dataCriacao)}</span>
              <span className="flex items-center gap-1 capitalize"><TrendingUp className="w-3 h-3" />{n.etapa.replace('-', ' ')}</span>
              {n.valor_estimado != null && (
                <span className="flex items-center gap-1 font-semibold text-slate-700"><DollarSign className="w-3 h-3" />{BRL(n.valor_estimado)}</span>
              )}
            </div>
            {n.probabilidade != null && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Probabilidade</span><span>{n.probabilidade}%</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full">
                  <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${n.probabilidade}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Aba Orçamentos Vinculados ──────────────────────────────────────────────────
function TabOrcamentos({
  negs, onViewQuote,
}: {
  negs: NegociacaoData[];
  onViewQuote: (orc: Orcamento, negName: string) => void;
}) {
  const orcs = negs.filter(n => n.orcamento).map(n => ({ orc: n.orcamento!, neg: n.negociacao }));

  if (orcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <FileText className="w-10 h-10 text-slate-200 mb-3" />
        <p className="font-semibold text-slate-500">Nenhum orçamento vinculado</p>
        <p className="text-sm text-slate-400 mt-1">Orçamentos gerados nas negociações deste cliente aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full custom-scrollbar">
      {orcs.map(({ orc, neg }) => {
        const st = STATUS_ORC[orc.status] ?? STATUS_ORC.rascunho;
        return (
          <div key={orc.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Orçamento #{orc.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Negociação: {neg.descricao || neg.clienteNome}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500 mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(orc.dataCriacao)}</span>
              <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{orc.itens.length} item(ns)</span>
              {orc.validade && <span className="flex items-center gap-1">Validade: {fmtDate(orc.validade)}</span>}
              {orc.vendedor && <span className="flex items-center gap-1"><User className="w-3 h-3" />{orc.vendedor}</span>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="font-bold text-slate-800 text-sm">{BRL(orc.total)}</span>
              <button onClick={() => onViewQuote(orc, neg.descricao || neg.clienteNome)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors">
                <ExternalLink className="w-3 h-3" /> Ver orçamento
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal de Visualização de Orçamento ────────────────────────────────────────
function OrcamentoModal({ orc, negName, onClose }: { orc: Orcamento; negName: string; onClose: () => void }) {
  const st = STATUS_ORC[orc.status] ?? STATUS_ORC.rascunho;
  const subtotal = orc.itens.reduce((s, i) => s + i.total, 0);
  const descGlobal = subtotal * (orc.desconto_global_pct / 100);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Orçamento #{orc.id.slice(0, 8).toUpperCase()}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Negociação: {negName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
            <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Informações gerais */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Criado em</span><span className="text-slate-700">{fmtDate(orc.dataCriacao)}</span></div>
            {orc.validade && <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Válido até</span><span className="text-slate-700">{fmtDate(orc.validade)}</span></div>}
            {orc.vendedor && <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Vendedor</span><span className="text-slate-700">{orc.vendedor}</span></div>}
            {orc.condicao_pagamento && <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Cond. Pagamento</span><span className="text-slate-700">{orc.condicao_pagamento}</span></div>}
            {orc.prazo_entrega && <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Prazo de entrega</span><span className="text-slate-700">{orc.prazo_entrega}</span></div>}
            {orc.local_entrega && <div><span className="text-[11px] text-slate-400 uppercase font-semibold block mb-0.5">Local de entrega</span><span className="text-slate-700">{orc.local_entrega}</span></div>}
          </div>

          {/* Itens */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Produtos / Serviços</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="text-left pb-2">Produto</th>
                  <th className="text-center pb-2 w-16">Qtd</th>
                  <th className="text-center pb-2 w-10">Un</th>
                  <th className="text-right pb-2 w-24">Preço</th>
                  <th className="text-right pb-2 w-16">Desc%</th>
                  <th className="text-right pb-2 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {orc.itens.map(item => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800 text-xs">{item.produto_nome}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.codigo}</p>
                    </td>
                    <td className="py-2.5 text-center text-xs text-slate-600">{item.quantidade}</td>
                    <td className="py-2.5 text-center text-[11px] text-slate-500">{item.unidade}</td>
                    <td className="py-2.5 text-right font-mono text-xs text-slate-600">{BRL(item.preco_unitario)}</td>
                    <td className="py-2.5 text-center text-xs text-slate-500">{item.desconto_pct > 0 ? `${item.desconto_pct}%` : '—'}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-xs text-slate-800">{BRL(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="space-y-1.5 border-t border-slate-200 pt-3">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span className="font-mono">{BRL(subtotal)}</span></div>
            {orc.desconto_global_pct > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desconto global ({orc.desconto_global_pct}%)</span><span className="font-mono">− {BRL(descGlobal)}</span></div>}
            {orc.frete > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Frete</span><span className="font-mono">{BRL(orc.frete)}</span></div>}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2"><span>TOTAL</span><span className="font-mono text-blue-700">{BRL(orc.total)}</span></div>
          </div>

          {/* Observações */}
          {orc.observacoes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[11px] text-amber-600 uppercase font-bold mb-1">Observações</p>
              <p className="text-sm text-slate-700">{orc.observacoes}</p>
            </div>
          )}
          {orc.condicoes_comerciais && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] text-slate-500 uppercase font-bold mb-1">Condições Comerciais</p>
              <p className="text-sm text-slate-700">{orc.condicoes_comerciais}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CadClientes() {
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ErpCliente | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('dados');
  const [negs, setNegs] = useState<NegociacaoData[]>([]);
  const [negsLoading, setNegsLoading] = useState(false);
  const [viewOrc, setViewOrc] = useState<{ orc: Orcamento; negName: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setClientes(await getClientes(search));
    } catch (e) {
      showToast('Erro ao carregar clientes: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Carrega negociações do CRM ao selecionar cliente
  useEffect(() => {
    if (!selected) { setNegs([]); return; }
    setNegsLoading(true);
    getAllNegociacoes()
      .then(all => {
        // Filtra por clienteId ou por nome (fallback)
        const filtered = all.filter(n =>
          n.negociacao.clienteId === selected.id ||
          n.negociacao.clienteNome?.toLowerCase() === selected.nome.toLowerCase()
        );
        setNegs(filtered);
      })
      .catch(() => setNegs([]))
      .finally(() => setNegsLoading(false));
  }, [selected]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function selectCliente(c: ErpCliente) {
    setSelected(c);
    setEditId(c.id);
    setForm({
      tipo: c.tipo, nome: c.nome, cpf_cnpj: c.cpf_cnpj,
      inscricao_estadual: c.inscricao_estadual, email: c.email, telefone: c.telefone,
      endereco_json: (c.endereco_json ?? EMPTY_FORM.endereco_json) as Endereco,
      limite_credito: c.limite_credito, tabela_preco_id: c.tabela_preco_id,
      vendedor_id: c.vendedor_id, ativo: c.ativo,
    });
    setActiveTab('dados');
  }

  function openNew() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setEditId(null);
    setActiveTab('dados');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir cliente?')) return;
    try {
      await deleteCliente(id);
      showToast('Cliente excluído.', true);
      if (selected?.id === id) setSelected(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  async function handleSave() {
    if (!form.nome || !form.cpf_cnpj) return showToast('Nome e CPF/CNPJ obrigatórios.', false);
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateCliente(editId, form);
        showToast('Cliente atualizado.', true);
        setSelected(updated);
        load();
      } else {
        const created = await createCliente(form);
        showToast('Cliente criado.', true);
        load();
        selectCliente(created);
      }
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCNPJLookup() {
    if (form.tipo !== 'PJ') return;
    setLookingUp(true);
    try {
      const data = await consultarCNPJ(form.cpf_cnpj);
      if (!data || (data as { status?: string }).status === 'ERROR') { showToast('CNPJ não encontrado.', false); return; }
      const d = data as Record<string, string>;
      setForm(prev => ({
        ...prev, nome: d.nome || prev.nome, email: d.email || prev.email,
        telefone: d.telefone || prev.telefone,
        endereco_json: { cep: d.cep?.replace(/\D/g, '') || '', logradouro: d.logradouro || '', numero: d.numero || '', bairro: d.bairro || '', cidade: d.municipio || '', uf: d.uf || '' },
      }));
      showToast('Dados preenchidos via CNPJ.', true);
    } catch { showToast('Erro ao consultar CNPJ.', false); }
    finally { setLookingUp(false); }
  }

  async function handleCEPLookup() {
    const cep = (form.endereco_json as Endereco).cep;
    if (!cep || cep.replace(/\D/g, '').length < 8) return;
    setLookingUp(true);
    try {
      const data = await consultarCEP(cep);
      if (!data) return showToast('CEP não encontrado.', false);
      const d = data as Record<string, string>;
      setForm(prev => ({ ...prev, endereco_json: { ...(prev.endereco_json as Endereco), logradouro: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || '' } }));
      showToast('Endereço preenchido.', true);
    } finally { setLookingUp(false); }
  }

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dados', label: 'Dados', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'negociacoes', label: `Negociações${negs.length > 0 ? ` (${negs.length})` : ''}`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'orcamentos', label: `Orçamentos${negs.filter(n => n.orcamento).length > 0 ? ` (${negs.filter(n => n.orcamento).length})` : ''}`, icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full overflow-hidden" translate="no">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Painel esquerdo — lista */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-slate-800">Clientes</h1>
            <button onClick={openNew} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : clientes.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">Nenhum cliente encontrado.</p>
          ) : clientes.map(c => {
            const end = (c.endereco_json ?? {}) as Partial<Endereco>;
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectCliente(c)}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {c.tipo === 'PJ' ? <Building2 className={`w-3 h-3 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} /> : <User className={`w-3 h-3 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />}
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{c.nome}</p>
                    </div>
                    <p className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{c.cpf_cnpj}</p>
                    {end.cidade && <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}><MapPin className="w-2.5 h-2.5" />{end.cidade}/{end.uf}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.ativo ? (isSelected ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-700') : (isSelected ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-500')}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-3 mt-1.5 text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {c.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{c.email}</span>}
                  {c.telefone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.telefone}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Painel direito — detalhe */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && !editId ? (
          /* Tela de novo cliente */
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Novo Cliente</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <TabDados form={form} setForm={setForm} editId={null} saving={saving} onSave={handleSave}
                lookingUp={lookingUp} handleCNPJLookup={handleCNPJLookup} handleCEPLookup={handleCEPLookup} />
            </div>
          </div>
        ) : selected ? (
          /* Detalhe do cliente selecionado */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header do detalhe */}
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selected.nome}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.cpf_cnpj} · {selected.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 bg-white shrink-0">
              <div className="flex">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo da tab */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'dados' && (
                <TabDados form={form} setForm={setForm} editId={editId} saving={saving} onSave={handleSave}
                  lookingUp={lookingUp} handleCNPJLookup={handleCNPJLookup} handleCEPLookup={handleCEPLookup} />
              )}
              {activeTab === 'negociacoes' && (
                negsLoading
                  ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                  : <TabNegociacoes negs={negs} />
              )}
              {activeTab === 'orcamentos' && (
                negsLoading
                  ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                  : <TabOrcamentos negs={negs} onViewQuote={(orc, negName) => setViewOrc({ orc, negName })} />
              )}
            </div>
          </div>
        ) : (
          /* Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Building2 className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Selecione um cliente</p>
            <p className="text-sm text-slate-300 mt-1">ou clique em "Novo" para cadastrar</p>
          </div>
        )}
      </div>

      {/* Modal de orçamento */}
      {viewOrc && <OrcamentoModal orc={viewOrc.orc} negName={viewOrc.negName} onClose={() => setViewOrc(null)} />}
    </div>
  );
}
