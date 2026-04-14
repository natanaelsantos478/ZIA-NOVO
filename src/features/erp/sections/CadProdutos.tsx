import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle, Package,
  ChevronRight, Save, FileText, GitBranch, DollarSign, Tag, ExternalLink,
  ShoppingCart, User, Image, Star, Upload, FileIcon, Repeat, Clock, Shield,
  Zap, Settings2, ListChecks, Percent,
} from 'lucide-react';
import {
  getProdutos, createProduto, updateProduto, deleteProduto, getGruposProdutos,
  getVariacoesProduto, getOrcamentosPorProduto,
  getProdutoFotos, addProdutoFoto, setCoverFoto, deleteProdutoFoto,
  getProdutoPdfs, addProdutoPdf, deleteProdutoPdf,
} from '../../../lib/erp';
import type { ErpProduto, ErpGrupoProduto, ErpProdutoFoto, ErpProdutoPdf } from '../../../lib/erp';
import { getNos, getImpostos, getGruposCusto, upsertNo } from '../../../lib/financeiro';
import type { FinNoCusto, FinImposto, FinGrupoCusto } from '../../../lib/financeiro';
import CustoFinalCard from './financeiro/CustoFinalCard';

const UNITS = ['UN', 'KG', 'CX', 'L', 'M', 'M2', 'M3', 'PC', 'PAR', 'SC', 'FD', 'ROL'];
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type ProdTab = 'cadastro' | 'variacoes' | 'orcamentos' | 'custos' | 'midias';

type SubscriptionPeriod = 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';

type ProdForm = {
  codigo_interno: string; codigo_barras: string; ncm: string;
  cst_icms: string; cst_pis: string; cst_cofins: string;
  nome: string; descricao: string; unidade_medida: string; grupo_id: string;
  preco_custo: string; preco_venda: string; estoque_minimo: string; peso_bruto_kg: string;
  ativo: boolean; is_subscription: boolean; produto_pai_id: string; variacao_nome: string;
  // Subscription config
  subscription_period: SubscriptionPeriod;
  subscription_trial_days: string;
  subscription_grace_days: string;
  subscription_min_months: string;
  subscription_setup_fee: string;
  subscription_annual_discount_pct: string;
  subscription_max_users: string;
  subscription_multi_plan: boolean;
  subscription_features: string; // newline-separated
  subscription_cost_type: 'fixo' | 'relativo';
  subscription_cost_per_unit: string;
};

const EMPTY_FORM: ProdForm = {
  codigo_interno: '', codigo_barras: '', ncm: '', cst_icms: '', cst_pis: '', cst_cofins: '',
  nome: '', descricao: '', unidade_medida: 'UN', grupo_id: '', preco_custo: '', preco_venda: '',
  estoque_minimo: '', peso_bruto_kg: '', ativo: true, is_subscription: false, produto_pai_id: '', variacao_nome: '',
  subscription_period: 'mensal', subscription_trial_days: '0', subscription_grace_days: '0',
  subscription_min_months: '1', subscription_setup_fee: '0', subscription_annual_discount_pct: '0',
  subscription_max_users: '', subscription_multi_plan: false, subscription_features: '',
  subscription_cost_type: 'fixo', subscription_cost_per_unit: '0',
};

const PERIOD_OPTIONS: { value: SubscriptionPeriod; label: string; desc: string }[] = [
  { value: 'semanal',     label: 'Semanal',     desc: 'Toda semana' },
  { value: 'mensal',      label: 'Mensal',      desc: 'Cobrança todo mês' },
  { value: 'trimestral',  label: 'Trimestral',  desc: 'A cada 3 meses' },
  { value: 'semestral',   label: 'Semestral',   desc: 'A cada 6 meses' },
  { value: 'anual',       label: 'Anual',       desc: 'Uma vez por ano' },
];

type OrcRef = {
  orcamento_id: string;
  negociacao_id: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  negociacao?: { cliente_nome: string };
};

// ── Aba Cadastro ──────────────────────────────────────────────────────────────
function TabCadastro({
  form, setForm, grupos, editId, saving, onSave,
  isPai, variacoes,
}: {
  form: ProdForm;
  setForm: React.Dispatch<React.SetStateAction<ProdForm>>;
  grupos: ErpGrupoProduto[];
  editId: string | null;
  saving: boolean;
  onSave: () => void;
  isPai: boolean;
  variacoes: ErpProduto[];
}) {
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full custom-scrollbar">
      {isPai && variacoes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-blue-700">
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          Produto pai com {variacoes.length} variação(ões) cadastrada(s). Veja a aba <strong>Variações</strong>.
        </div>
      )}

      {/* Identificação */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código Interno *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.codigo_interno} onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código de Barras (EAN)</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">NCM *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
            placeholder="0000.00.00" maxLength={10} value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Descrição *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unidade *</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.unidade_medida} onChange={e => setForm(p => ({ ...p, unidade_medida: e.target.value }))}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descrição Detalhada</label>
        <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder="Informações adicionais sobre o produto..."
          value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.grupo_id} onChange={e => setForm(p => ({ ...p, grupo_id: e.target.value }))}>
            <option value="">Sem grupo</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Peso Bruto (kg)</label>
          <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.peso_bruto_kg} onChange={e => setForm(p => ({ ...p, peso_bruto_kg: e.target.value }))} />
        </div>
      </div>

      {/* Preços */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preços e Estoque</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Custo (R$)</label>
            <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.preco_custo} onChange={e => setForm(p => ({ ...p, preco_custo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Venda (R$) *</label>
            <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.preco_venda} onChange={e => setForm(p => ({ ...p, preco_venda: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estoque Mínimo</label>
            <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.estoque_minimo} onChange={e => setForm(p => ({ ...p, estoque_minimo: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Fiscal */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dados Fiscais</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST/CSOSN ICMS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_icms} onChange={e => setForm(p => ({ ...p, cst_icms: e.target.value }))} placeholder="000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST PIS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_pis} onChange={e => setForm(p => ({ ...p, cst_pis: e.target.value }))} placeholder="07" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST COFINS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_cofins} onChange={e => setForm(p => ({ ...p, cst_cofins: e.target.value }))} placeholder="07" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="pativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
          <label htmlFor="pativo" className="text-sm text-slate-700">Produto ativo</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="psubscription" checked={form.is_subscription} onChange={e => setForm(p => ({ ...p, is_subscription: e.target.checked }))} className="rounded" />
          <label htmlFor="psubscription" className="text-sm text-slate-700 flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-blue-500" /> Este produto é uma assinatura
          </label>
        </div>
      </div>

      {/* ── Configurações de Assinatura ── */}
      {form.is_subscription && (
        <div className="border border-blue-200 rounded-xl bg-blue-50/60 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-bold text-blue-800">Configurações de Assinatura</p>
          </div>

          {/* Período de cobrança */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Período de Cobrança *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PERIOD_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(p => ({ ...p, subscription_period: opt.value }))}
                  className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-xl border-2 transition-all text-center ${
                    form.subscription_period === opt.value
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}>
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className={`text-[10px] mt-0.5 ${form.subscription_period === opt.value ? 'text-blue-100' : 'text-slate-400'}`}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trial + Carência + Contrato mínimo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Trial (dias)
              </label>
              <input type="number" min="0" step="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="0"
                value={form.subscription_trial_days}
                onChange={e => setForm(p => ({ ...p, subscription_trial_days: e.target.value }))} />
              <p className="text-[10px] text-slate-400 mt-1">0 = sem trial</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> Carência (dias)
              </label>
              <input type="number" min="0" step="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="0"
                value={form.subscription_grace_days}
                onChange={e => setForm(p => ({ ...p, subscription_grace_days: e.target.value }))} />
              <p className="text-[10px] text-slate-400 mt-1">Após vencimento antes de bloquear</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> Contrato Mín. (meses)
              </label>
              <input type="number" min="1" step="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="1"
                value={form.subscription_min_months}
                onChange={e => setForm(p => ({ ...p, subscription_min_months: e.target.value }))} />
              <p className="text-[10px] text-slate-400 mt-1">Fidelidade mínima</p>
            </div>
          </div>

          {/* Desconto anual + Limite usuários */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-violet-500" /> Desconto no Plano Anual (%)
              </label>
              <input type="number" min="0" max="100" step="0.1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="0"
                value={form.subscription_annual_discount_pct}
                onChange={e => setForm(p => ({ ...p, subscription_annual_discount_pct: e.target.value }))} />
              {+form.subscription_annual_discount_pct > 0 && +form.preco_venda > 0 && (
                <p className="text-[10px] text-violet-600 mt-1 font-semibold">
                  Valor anual: R$ {((+form.preco_venda * 12) * (1 - +form.subscription_annual_discount_pct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {' '}(economiza R$ {(+form.preco_venda * 12 * +form.subscription_annual_discount_pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-500" /> Limite de Usuários / Acessos
              </label>
              <input type="number" min="1" step="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="Ilimitado"
                value={form.subscription_max_users}
                onChange={e => setForm(p => ({ ...p, subscription_max_users: e.target.value }))} />
              <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para ilimitado</p>
            </div>
          </div>

          {/* Multi-plano */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3">
            <input type="checkbox" id="smulti" checked={form.subscription_multi_plan}
              onChange={e => setForm(p => ({ ...p, subscription_multi_plan: e.target.checked }))}
              className="rounded w-4 h-4" />
            <label htmlFor="smulti" className="text-sm text-slate-700 cursor-pointer">
              <span className="font-semibold">Permite múltiplos planos simultâneos</span>
              <span className="text-slate-400 ml-1">— o cliente pode contratar este plano mais de uma vez</span>
            </label>
          </div>

          {/* Tipo de Custo Operacional */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-green-600" /> Tipo de Custo Operacional
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button type="button"
                onClick={() => setForm(p => ({ ...p, subscription_cost_type: 'fixo' }))}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  form.subscription_cost_type === 'fixo'
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'
                }`}>
                <span className="text-xs font-bold">Fixo</span>
                <span className={`text-[10px] mt-0.5 ${form.subscription_cost_type === 'fixo' ? 'text-green-100' : 'text-slate-400'}`}>Não muda com a quantidade</span>
              </button>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, subscription_cost_type: 'relativo' }))}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  form.subscription_cost_type === 'relativo'
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'
                }`}>
                <span className="text-xs font-bold">Relativo</span>
                <span className={`text-[10px] mt-0.5 ${form.subscription_cost_type === 'relativo' ? 'text-green-100' : 'text-slate-400'}`}>Escala a cada assinatura</span>
              </button>
            </div>
            {form.subscription_cost_type === 'relativo' && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Custo por assinatura (R$)</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    placeholder="0,00"
                    value={form.subscription_cost_per_unit}
                    onChange={e => setForm(p => ({ ...p, subscription_cost_per_unit: e.target.value }))} />
                </div>
                {+form.subscription_cost_per_unit > 0 && (
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Simulação de custo</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 5, 10, 20].map(qty => (
                        <div key={qty} className="text-center">
                          <p className="text-[10px] text-slate-400">{qty} ass.</p>
                          <p className="text-xs font-bold text-green-700">
                            {(+form.subscription_cost_per_unit * qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Taxa de adesão */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-green-500" /> Taxa de Implantação / Setup (R$)
            </label>
            <input type="number" min="0" step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="0,00 = sem taxa de adesão"
              value={form.subscription_setup_fee}
              onChange={e => setForm(p => ({ ...p, subscription_setup_fee: e.target.value }))} />
            <p className="text-[10px] text-slate-400 mt-1">Cobrado uma única vez na contratação</p>
          </div>

          {/* Funcionalidades incluídas */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5 text-emerald-500" /> Funcionalidades Incluídas
            </label>
            <textarea rows={5}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
              placeholder={"Acesso completo ao painel\nSuporte via chat 24h\nAtualizações automáticas\nBackup diário\nRelatorios avancados"}
              value={form.subscription_features}
              onChange={e => setForm(p => ({ ...p, subscription_features: e.target.value }))} />
            <p className="text-[10px] text-slate-400 mt-1">Uma funcionalidade por linha — aparecerá na proposta para o cliente</p>
          </div>

          {/* Preview do plano */}
          {(form.nome || form.preco_venda) && (
            <div className="border border-blue-200 rounded-xl bg-white p-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3">Preview do Plano</p>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{form.nome || 'Nome do Plano'}</p>
                  {form.descricao && <p className="text-[11px] text-slate-400 mt-0.5">{form.descricao}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-blue-600">
                    {form.preco_venda ? `R$ ${(+form.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ —'}
                  </p>
                  <p className="text-[10px] text-slate-400">/{PERIOD_OPTIONS.find(o => o.value === form.subscription_period)?.label.toLowerCase()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-2 text-[10px]">
                {+form.subscription_trial_days > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" />{form.subscription_trial_days} dias grátis
                  </span>
                )}
                {+form.subscription_min_months > 1 && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Shield className="w-3 h-3" />Fidelidade {form.subscription_min_months} meses
                  </span>
                )}
                {+form.subscription_setup_fee > 0 && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />Setup {`R$ ${(+form.subscription_setup_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </span>
                )}
              </div>
              {form.subscription_features.trim() && (
                <ul className="space-y-1">
                  {form.subscription_features.split('\n').filter(Boolean).map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />{feat}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editId ? 'Salvar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </div>
  );
}

// ── Aba Variações ─────────────────────────────────────────────────────────────
function TabVariacoes({
  paiId, paiNome, variacoes, loadingVar, onReload, showToast,
}: {
  paiId: string;
  paiNome: string;
  variacoes: ErpProduto[];
  loadingVar: boolean;
  onReload: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProdForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editVar, setEditVar] = useState<string | null>(null);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setEditVar(null);
    setShowForm(true);
  }

  function openEdit(v: ErpProduto) {
    setForm({
      codigo_interno: v.codigo_interno, codigo_barras: v.codigo_barras ?? '',
      ncm: v.ncm, cst_icms: v.cst_icms ?? '', cst_pis: v.cst_pis ?? '',
      cst_cofins: v.cst_cofins ?? '', nome: v.nome, descricao: v.descricao ?? '',
      unidade_medida: v.unidade_medida, grupo_id: v.grupo_id ?? '',
      preco_custo: v.preco_custo?.toString() ?? '', preco_venda: v.preco_venda.toString(),
      estoque_minimo: v.estoque_minimo?.toString() ?? '', peso_bruto_kg: v.peso_bruto_kg?.toString() ?? '',
      ativo: v.ativo, is_subscription: v.is_subscription ?? false, produto_pai_id: paiId, variacao_nome: v.variacao_nome ?? '',
      subscription_period: v.subscription_period ?? 'mensal',
      subscription_trial_days: v.subscription_trial_days?.toString() ?? '0',
      subscription_grace_days: v.subscription_grace_days?.toString() ?? '0',
      subscription_min_months: v.subscription_min_months?.toString() ?? '1',
      subscription_setup_fee: v.subscription_setup_fee?.toString() ?? '0',
      subscription_annual_discount_pct: v.subscription_annual_discount_pct?.toString() ?? '0',
      subscription_max_users: v.subscription_max_users?.toString() ?? '',
      subscription_multi_plan: v.subscription_multi_plan ?? false,
      subscription_features: (v.subscription_features ?? []).join('\n'),
      subscription_cost_type: v.subscription_cost_type ?? 'fixo',
      subscription_cost_per_unit: v.subscription_cost_per_unit?.toString() ?? '0',
    });
    setEditVar(v.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.codigo_interno || (!form.nome && !form.variacao_nome) || !form.ncm) return showToast('Código, Nome e NCM são obrigatórios.', false);
    setSaving(true);
    try {
      const payload = {
        codigo_interno: form.codigo_interno, codigo_barras: form.codigo_barras || null,
        ncm: form.ncm, cst_icms: form.cst_icms || null, cst_pis: form.cst_pis || null,
        cst_cofins: form.cst_cofins || null,
        nome: form.variacao_nome ? `${paiNome} - ${form.variacao_nome}` : form.nome,
        descricao: form.descricao || null,
        unidade_medida: form.unidade_medida, grupo_id: form.grupo_id || null,
        preco_custo: form.preco_custo ? +form.preco_custo : null,
        preco_venda: +form.preco_venda || 0,
        estoque_minimo: form.estoque_minimo ? +form.estoque_minimo : null,
        peso_bruto_kg: form.peso_bruto_kg ? +form.peso_bruto_kg : null,
        ativo: form.ativo, is_subscription: false, produto_pai_id: paiId,
        variacao_nome: form.variacao_nome || null,
        subscription_period: null, subscription_trial_days: null, subscription_grace_days: null,
        subscription_min_months: null, subscription_setup_fee: null, subscription_annual_discount_pct: null,
        subscription_max_users: null, subscription_multi_plan: null, subscription_features: null,
        subscription_cost_type: null, subscription_cost_per_unit: null,
      };
      if (editVar) { await updateProduto(editVar, payload); showToast('Variação atualizada.', true); }
      else { await createProduto(payload); showToast('Variação criada.', true); }
      setShowForm(false); onReload();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta variação?')) return;
    try { await deleteProduto(id); showToast('Variação excluída.', true); onReload(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  if (loadingVar) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Variações do Produto</p>
          <p className="text-[11px] text-slate-400">{variacoes.length} variação(ões) · cada uma com código e estoque individual</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova Variação
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {variacoes.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="w-10 h-10 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-500">Nenhuma variação cadastrada</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Nova Variação" para adicionar sub-produtos.</p>
          </div>
        )}

        {/* Form inline para nova/editar variação */}
        {showForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-700">{editVar ? 'Editar Variação' : 'Nova Variação'}</p>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Código Interno *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.codigo_interno} onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nome da Variação *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="ex: Azul, P, 500ml..."
                  value={form.variacao_nome} onChange={e => setForm(p => ({ ...p, variacao_nome: e.target.value, nome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">NCM *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} placeholder="0000.00.00" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Preço de Venda (R$)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.preco_venda} onChange={e => setForm(p => ({ ...p, preco_venda: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Estoque Mínimo</label>
                <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.estoque_minimo} onChange={e => setForm(p => ({ ...p, estoque_minimo: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Unidade</label>
                <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.unidade_medida} onChange={e => setForm(p => ({ ...p, unidade_medida: e.target.value }))}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {editVar ? 'Salvar' : 'Criar Variação'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de variações */}
        {variacoes.map(v => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.codigo_interno}</span>
                <span className="font-semibold text-sm text-slate-800">{v.variacao_nome || v.nome}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {v.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{BRL(v.preco_venda)}</span>
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Estoque: <strong className={`${v.estoque_minimo && v.estoque_atual <= v.estoque_minimo ? 'text-red-600' : 'text-slate-700'}`}>{v.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong></span>
                <span>{v.unidade_medida}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aba Orçamentos Vinculados ─────────────────────────────────────────────────
function TabOrcamentosVinculados({ produtoId }: { produtoId: string }) {
  const [orcs, setOrcs] = useState<OrcRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrcamentosPorProduto(produtoId)
      .then(setOrcs)
      .catch(() => setOrcs([]))
      .finally(() => setLoading(false));
  }, [produtoId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  if (orcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <ShoppingCart className="w-10 h-10 text-slate-200 mb-3" />
        <p className="font-semibold text-slate-500">Sem orçamentos vinculados</p>
        <p className="text-sm text-slate-400 mt-1">Este produto ainda não foi incluído em nenhum orçamento do CRM.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full custom-scrollbar">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{orcs.length} orçamento(s) com este produto</p>
      {orcs.map(o => (
        <div key={o.orcamento_id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm">Orçamento #{o.orcamento_id.slice(0, 8).toUpperCase()}</p>
              {o.negociacao?.cliente_nome && (
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" />{o.negociacao.cliente_nome}</p>
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 font-mono shrink-0">{BRL(o.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />Qtd: {o.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Preço: {BRL(o.preco_unitario)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Acesse este orçamento em: CRM &rsaquo; Negociações &rsaquo; aba Orçamento
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Aba Mídias ────────────────────────────────────────────────────────────────
function TabMidias({ produtoId, showToast }: { produtoId: string; showToast: (m: string, ok: boolean) => void }) {
  const [fotos, setFotos] = useState<ErpProdutoFoto[]>([]);
  const [pdfs, setPdfs] = useState<ErpProdutoPdf[]>([]);
  const [uploading, setUploading] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [f, p] = await Promise.all([getProdutoFotos(produtoId), getProdutoPdfs(produtoId)]);
    setFotos(f); setPdfs(p);
  }, [produtoId]);

  useEffect(() => { load(); }, [load]);

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const isCover = fotos.length === 0;
      await addProdutoFoto(produtoId, file, isCover);
      showToast('Foto adicionada.', true); load();
    } catch (err) { showToast('Erro ao enviar foto: ' + (err as Error).message, false); }
    finally { setUploading(false); if (fotoRef.current) fotoRef.current.value = ''; }
  }

  async function handleSetCover(fotoId: string) {
    try { await setCoverFoto(produtoId, fotoId); showToast('Capa definida.', true); load(); }
    catch { showToast('Erro ao definir capa.', false); }
  }

  async function handleDeleteFoto(id: string, url: string) {
    if (!confirm('Remover foto?')) return;
    try { await deleteProdutoFoto(id, url); showToast('Foto removida.', true); load(); }
    catch { showToast('Erro ao remover foto.', false); }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { await addProdutoPdf(produtoId, file); showToast('PDF adicionado.', true); load(); }
    catch (err) { showToast('Erro ao enviar PDF: ' + (err as Error).message, false); }
    finally { setUploading(false); if (pdfRef.current) pdfRef.current.value = ''; }
  }

  async function handleDeletePdf(id: string, url: string) {
    if (!confirm('Remover PDF?')) return;
    try { await deleteProdutoPdf(id, url); showToast('PDF removido.', true); load(); }
    catch { showToast('Erro ao remover PDF.', false); }
  }

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full custom-scrollbar">
      {/* Fotos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fotos do Produto</p>
          <button onClick={() => fotoRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Adicionar Foto
          </button>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
        </div>
        {fotos.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center text-slate-400">
            <Image className="w-8 h-8 mb-2" /><p className="text-sm">Nenhuma foto cadastrada</p>
            <p className="text-xs mt-1">A primeira foto adicionada será a capa do produto</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {fotos.map(f => (
              <div key={f.id} className={`relative rounded-xl overflow-hidden border-2 ${f.is_cover ? 'border-blue-400' : 'border-slate-200'} group`}>
                <img src={f.url} alt="produto" className="w-full h-28 object-cover" />
                {f.is_cover && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    <Star className="w-2.5 h-2.5" /> CAPA
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!f.is_cover && (
                    <button onClick={() => handleSetCover(f.id)} className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-2 py-1 rounded-md font-semibold">
                      Definir Capa
                    </button>
                  )}
                  <button onClick={() => handleDeleteFoto(f.id, f.url)} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-md">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDFs */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos PDF</p>
          <button onClick={() => pdfRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Adicionar PDF
          </button>
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
        </div>
        {pdfs.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center text-slate-400">
            <FileIcon className="w-7 h-7 mb-2" /><p className="text-sm">Nenhum PDF cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pdfs.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <FileIcon className="w-4 h-4 text-red-500 shrink-0" />
                <a href={p.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-slate-700 hover:text-blue-600 truncate font-medium">{p.nome}</a>
                <button onClick={() => handleDeletePdf(p.id, p.url)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CadProdutos() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ErpProduto | null>(null);
  const [form, setForm] = useState<ProdForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<ProdTab>('cadastro');
  const [variacoes, setVariacoes] = useState<ErpProduto[]>([]);
  const [loadingVar, setLoadingVar] = useState(false);
  // Dados de custo — carregados ao abrir a aba Custos
  const [nosFinan, setNosFinan]             = useState<FinNoCusto[]>([]);
  const [impostosFinan, setImpostosFinan]   = useState<FinImposto[]>([]);
  const [gruposCustoFinan, setGruposCusto]  = useState<FinGrupoCusto[]>([]);
  const [loadingCusto, setLoadingCusto]     = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getProdutos(search), getGruposProdutos()]);
      setProdutos(p); setGrupos(g);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Carrega variações ao selecionar produto pai
  const loadVariacoes = useCallback(async (paiId: string) => {
    setLoadingVar(true);
    try {
      setVariacoes(await getVariacoesProduto(paiId));
    } catch { setVariacoes([]); }
    finally { setLoadingVar(false); }
  }, []);

  useEffect(() => {
    if (selected) loadVariacoes(selected.id);
    else setVariacoes([]);
  }, [selected, loadVariacoes]);

  // Dispara carregamento quando aba Custos é selecionada
  useEffect(() => {
    if (activeTab === 'custos') loadCustoData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Carrega dados de custo ao abrir a aba Custos
  async function loadCustoData() {
    if (nosFinan.length > 0) return; // já carregado
    setLoadingCusto(true);
    try {
      const [n, i, gc] = await Promise.all([getNos(), getImpostos(), getGruposCusto()]);
      setNosFinan(n); setImpostosFinan(i); setGruposCusto(gc);
    } catch { /* silently fail */ }
    finally { setLoadingCusto(false); }
  }

  async function handleAdicionarCustoEspecifico(payload: Partial<FinNoCusto>) {
    await upsertNo(payload);
    showToast('Custo adicionado!', true);
    // Recarregar nós
    const n = await getNos();
    setNosFinan(n);
  }

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  function selectProduto(p: ErpProduto) {
    setSelected(p);
    setEditId(p.id);
    setForm({
      codigo_interno: p.codigo_interno, codigo_barras: p.codigo_barras ?? '',
      ncm: p.ncm, cst_icms: p.cst_icms ?? '', cst_pis: p.cst_pis ?? '',
      cst_cofins: p.cst_cofins ?? '', nome: p.nome, descricao: p.descricao ?? '',
      unidade_medida: p.unidade_medida, grupo_id: p.grupo_id ?? '',
      preco_custo: p.preco_custo?.toString() ?? '', preco_venda: p.preco_venda.toString(),
      estoque_minimo: p.estoque_minimo?.toString() ?? '', peso_bruto_kg: p.peso_bruto_kg?.toString() ?? '',
      ativo: p.ativo, is_subscription: p.is_subscription ?? false,
      produto_pai_id: '', variacao_nome: p.variacao_nome ?? '',
      subscription_period: p.subscription_period ?? 'mensal',
      subscription_trial_days: p.subscription_trial_days?.toString() ?? '0',
      subscription_grace_days: p.subscription_grace_days?.toString() ?? '0',
      subscription_min_months: p.subscription_min_months?.toString() ?? '1',
      subscription_setup_fee: p.subscription_setup_fee?.toString() ?? '0',
      subscription_annual_discount_pct: p.subscription_annual_discount_pct?.toString() ?? '0',
      subscription_max_users: p.subscription_max_users?.toString() ?? '',
      subscription_multi_plan: p.subscription_multi_plan ?? false,
      subscription_features: (p.subscription_features ?? []).join('\n'),
      subscription_cost_type: p.subscription_cost_type ?? 'fixo',
      subscription_cost_per_unit: p.subscription_cost_per_unit?.toString() ?? '0',
    });
    setActiveTab('cadastro');
  }

  function openNew() {
    setSelected(null); setForm(EMPTY_FORM); setEditId(null); setActiveTab('cadastro');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir produto?')) return;
    try { await deleteProduto(id); showToast('Produto excluído.', true); if (selected?.id === id) setSelected(null); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!form.codigo_interno || !form.nome || !form.ncm) return showToast('Código, Nome e NCM são obrigatórios.', false);
    setSaving(true);
    try {
      const payload = {
        codigo_interno: form.codigo_interno, codigo_barras: form.codigo_barras || null,
        ncm: form.ncm, cst_icms: form.cst_icms || null, cst_pis: form.cst_pis || null,
        cst_cofins: form.cst_cofins || null, nome: form.nome, descricao: form.descricao || null,
        unidade_medida: form.unidade_medida, grupo_id: form.grupo_id || null,
        preco_custo: form.preco_custo ? +form.preco_custo : null,
        preco_venda: +form.preco_venda || 0,
        estoque_minimo: form.estoque_minimo ? +form.estoque_minimo : null,
        peso_bruto_kg: form.peso_bruto_kg ? +form.peso_bruto_kg : null,
        ativo: form.ativo, is_subscription: form.is_subscription, produto_pai_id: null, variacao_nome: null,
        subscription_period: form.is_subscription ? form.subscription_period : null,
        subscription_trial_days: form.is_subscription ? +form.subscription_trial_days : null,
        subscription_grace_days: form.is_subscription ? +form.subscription_grace_days : null,
        subscription_min_months: form.is_subscription ? +form.subscription_min_months : null,
        subscription_setup_fee: form.is_subscription ? +form.subscription_setup_fee : null,
        subscription_annual_discount_pct: form.is_subscription ? +form.subscription_annual_discount_pct : null,
        subscription_max_users: form.is_subscription && form.subscription_max_users ? +form.subscription_max_users : null,
        subscription_multi_plan: form.is_subscription ? form.subscription_multi_plan : null,
        subscription_features: form.is_subscription ? form.subscription_features.split('\n').filter(Boolean) : null,
        subscription_cost_type: form.is_subscription ? form.subscription_cost_type : null,
        subscription_cost_per_unit: form.is_subscription && form.subscription_cost_type === 'relativo' ? +form.subscription_cost_per_unit : null,
      };
      if (editId) { const up = await updateProduto(editId, payload); showToast('Produto atualizado.', true); setSelected(up); load(); }
      else { const cr = await createProduto(payload); showToast('Produto criado.', true); load(); selectProduto(cr); }
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  const isVariacao = !!selected?.produto_pai_id;
  const TABS: { id: ProdTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cadastro', label: 'Cadastro', icon: <Tag className="w-3.5 h-3.5" /> },
    ...(!isVariacao ? [{ id: 'variacoes' as ProdTab, label: `Variações${variacoes.length > 0 ? ` (${variacoes.length})` : ''}`, icon: <GitBranch className="w-3.5 h-3.5" /> }] : []),
    { id: 'orcamentos', label: 'Orçamentos', icon: <FileText className="w-3.5 h-3.5" /> },
    ...(selected ? [{ id: 'custos' as ProdTab, label: 'Custos', icon: <Zap className="w-3.5 h-3.5" /> }] : []),
    ...(selected ? [{ id: 'midias' as ProdTab, label: 'Mídias', icon: <Image className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Painel esquerdo — lista */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-slate-800">Produtos</h1>
            <button onClick={openNew} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Nenhum produto.</p>
            </div>
          ) : produtos.map(p => {
            const isSelected = selected?.id === p.id;
            const baixoEstoque = p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo;
            return (
              <div key={p.id} onClick={() => selectProduto(p)}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'}`}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>{p.codigo_interno}</span>
                    {p.produto_pai_id && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>VAR</span>}
                    {p.is_subscription && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5 ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}><Repeat className="w-2.5 h-2.5" />ASS</span>}
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                </div>
                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.nome}</p>
                <div className={`flex items-center justify-between text-[11px] mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  <span>{p.erp_grupo_produtos?.nome ?? 'Sem grupo'}</span>
                  <span className={`font-semibold ${baixoEstoque && !isSelected ? 'text-red-600' : ''}`}>
                    {p.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {p.is_subscription && p.subscription_period && <span className="font-normal opacity-70">/{p.subscription_period}</span>}
                  </span>
                </div>
                {p.is_subscription ? (
                  <div className={`flex items-center gap-3 text-[10px] mt-0.5 ${isSelected ? 'text-blue-300' : 'text-blue-500'}`}>
                    <span className="flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />Assinatura</span>
                    {p.subscription_trial_days != null && p.subscription_trial_days > 0 && (
                      <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{p.subscription_trial_days}d trial</span>
                    )}
                    {p.subscription_min_months != null && p.subscription_min_months > 1 && (
                      <span className="flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />{p.subscription_min_months}m mín.</span>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-center justify-between text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    <span>Estoque: <span className={`font-semibold ${baixoEstoque && !isSelected ? 'text-red-600' : ''}`}>{p.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span> {p.unidade_medida}</span>
                    {baixoEstoque && <span className={`text-[9px] font-bold ${isSelected ? 'text-red-300' : 'text-red-500'}`}>BAIXO</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400">{produtos.filter(p => !p.produto_pai_id).length} produto(s) · {produtos.filter(p => p.produto_pai_id).length} variação(ões)</p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && !editId ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Novo Produto</h2>
              <p className="text-xs text-slate-400 mt-0.5">Produto pai — adicione variações depois de salvar</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <TabCadastro form={form} setForm={setForm} grupos={grupos} editId={null} saving={saving}
                onSave={handleSave} isPai={false} variacoes={[]} />
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selected.nome}</h2>
                    {selected.is_subscription && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        <Repeat className="w-3 h-3" />
                        ASSINATURA{selected.subscription_period ? ` · ${selected.subscription_period.toUpperCase()}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{selected.codigo_interno} · {selected.unidade_medida} · NCM {selected.ncm}</p>
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

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'cadastro' && (
                <TabCadastro form={form} setForm={setForm} grupos={grupos} editId={editId} saving={saving}
                  onSave={handleSave} isPai={variacoes.length > 0} variacoes={variacoes} />
              )}
              {activeTab === 'variacoes' && (
                <TabVariacoes paiId={selected.id} paiNome={selected.nome} variacoes={variacoes}
                  loadingVar={loadingVar} onReload={() => loadVariacoes(selected.id)} showToast={showToast} />
              )}
              {activeTab === 'orcamentos' && (
                <TabOrcamentosVinculados produtoId={selected.id} />
              )}
              {activeTab === 'custos' && (
                <div className="p-5 overflow-y-auto h-full custom-scrollbar">
                  {loadingCusto ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : (
                    <CustoFinalCard
                      produto={selected}
                      grupos={grupos}
                      nos={nosFinan}
                      impostos={impostosFinan}
                      gruposCusto={gruposCustoFinan}
                      onAdicionarCusto={() => handleAdicionarCustoEspecifico({
                        nome: 'Custo', icone: '💰', cor_display: '#6366f1',
                        tipo_no: 'CUSTO_FOLHA',
                        estrutura_valor: { tipo: 'FIXO_UNITARIO', valor: 0, recorrencia: 'POR_UNIDADE' },
                        gatilho: { tipo: 'SEMPRE' },
                        escopo: 'PRODUTO', produto_id: selected.id, ativo: true, ordem_calculo: 0,
                      })}
                    />
                  )}
                </div>
              )}
              {activeTab === 'midias' && (
                <TabMidias produtoId={selected.id} showToast={showToast} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Package className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Selecione um produto</p>
            <p className="text-sm text-slate-300 mt-1">ou clique em "Novo" para cadastrar</p>
          </div>
        )}
      </div>
    </div>
  );
}
