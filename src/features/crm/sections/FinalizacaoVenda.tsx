// ─────────────────────────────────────────────────────────────────────────────
// CRM — Finalização de Venda
// Aparece quando orçamento é marcado como "aprovado"
// Coleta: tipo de pagamento, recorrência, comissão de vendedor
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  CheckCircle, X, Repeat, CreditCard, User, DollarSign,
  Calendar, Clock, TrendingUp, Check, Loader2, ChevronDown, Award,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type TipoPagamento  = 'unico' | 'recorrente';
export type PeriodoRecorrencia = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type DuracaoRecorrencia = 'meses' | 'anos' | 'indefinido';

export interface FinalizacaoVendaData {
  orcamentoId: string;
  negociacaoId: string;
  tipoPagamento: TipoPagamento;
  // Recorrência
  recorrenciaAtiva?: boolean;
  periodoRecorrencia?: PeriodoRecorrencia;
  duracaoTipo?: DuracaoRecorrencia;
  duracaoValor?: number;     // null = indefinido
  dataInicio?: string;       // YYYY-MM-DD
  // Comissão
  temComissao: boolean;
  vendedorId?: string;
  vendedorNome?: string;
  comissaoPct?: number;
  comissaoRecorrente?: boolean;
  comissaoValor?: number;    // calculado
  // Meta
  totalVenda: number;
  status: 'ativa' | 'encerrada' | 'cancelada';
  criadoEm: string;
}

// ── Helper para localStorage (até ter tabela no Supabase) ─────────────────────
const LS_KEY = 'zia_finalizacoes_v1';

export function salvarFinalizacao(data: FinalizacaoVendaData) {
  const all = carregarFinalizacoes();
  const idx = all.findIndex(f => f.orcamentoId === data.orcamentoId);
  if (idx >= 0) all[idx] = data; else all.push(data);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

export function carregarFinalizacoes(): FinalizacaoVendaData[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
}

export function buscarFinalizacao(orcamentoId: string): FinalizacaoVendaData | undefined {
  return carregarFinalizacoes().find(f => f.orcamentoId === orcamentoId);
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  orcamentoId: string;
  negociacaoId: string;
  totalVenda: number;
  clienteNome: string;
  onSave: (data: FinalizacaoVendaData) => void;
  onClose: () => void;
}

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ColaboradorSimples {
  id: string;
  nome: string;
  comissao_pct: number;
}

export default function FinalizacaoVenda({
  orcamentoId, negociacaoId, totalVenda, clienteNome, onSave, onClose,
}: Props) {
  // ── Estado ────────────────────────────────────────────────────────────────
  const [tipoPag, setTipoPag]         = useState<TipoPagamento>('unico');
  const [periodo, setPeriodo]         = useState<PeriodoRecorrencia>('mensal');
  const [duracaoTipo, setDuracaoTipo] = useState<DuracaoRecorrencia>('meses');
  const [duracaoVal,  setDuracaoVal]  = useState<number>(12);
  const [dataInicio,  setDataInicio]  = useState(new Date().toISOString().split('T')[0]);
  const [temComissao, setTemComissao] = useState(false);
  const [vendedorId,  setVendedorId]  = useState('');
  const [vendedorNome,setVendedorNome]= useState('');
  const [comissaoPct, setComissaoPct] = useState(0);
  const [comRecorrente, setComRecorrente] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [colaboradores, setColaboradores] = useState<ColaboradorSimples[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);

  // Existente no localStorage?
  useEffect(() => {
    const existing = buscarFinalizacao(orcamentoId);
    if (existing) {
      setTipoPag(existing.tipoPagamento);
      setPeriodo(existing.periodoRecorrencia ?? 'mensal');
      setDuracaoTipo(existing.duracaoTipo ?? 'meses');
      setDuracaoVal(existing.duracaoValor ?? 12);
      setDataInicio(existing.dataInicio ?? new Date().toISOString().split('T')[0]);
      setTemComissao(existing.temComissao);
      setVendedorId(existing.vendedorId ?? '');
      setVendedorNome(existing.vendedorNome ?? '');
      setComissaoPct(existing.comissaoPct ?? 0);
      setComRecorrente(existing.comissaoRecorrente ?? false);
    }
  }, [orcamentoId]);

  // Carrega colaboradores do ERP (para comissão)
  useEffect(() => {
    if (!temComissao) return;
    setLoadingColabs(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('hr_employees')
          .select('id, full_name')
          .eq('status', 'Ativo')
          .limit(100);
        setColaboradores(
          (data ?? []).map(e => ({
            id: e.id,
            nome: e.full_name,
            comissao_pct: 0,
          }))
        );
      } finally {
        setLoadingColabs(false);
      }
    })();
  }, [temComissao]);

  function handleVendedorChange(id: string) {
    const found = colaboradores.find(c => c.id === id);
    setVendedorId(id);
    setVendedorNome(found?.nome ?? '');
    if (found?.comissao_pct) setComissaoPct(found.comissao_pct);
  }

  const comissaoValor = totalVenda * (comissaoPct / 100);

  function handleSave() {
    setSaving(true);
    const data: FinalizacaoVendaData = {
      orcamentoId,
      negociacaoId,
      tipoPagamento: tipoPag,
      recorrenciaAtiva: tipoPag === 'recorrente',
      periodoRecorrencia: tipoPag === 'recorrente' ? periodo : undefined,
      duracaoTipo: tipoPag === 'recorrente' ? duracaoTipo : undefined,
      duracaoValor: tipoPag === 'recorrente' && duracaoTipo !== 'indefinido' ? duracaoVal : undefined,
      dataInicio: tipoPag === 'recorrente' ? dataInicio : undefined,
      temComissao,
      vendedorId:         temComissao ? vendedorId   : undefined,
      vendedorNome:       temComissao ? vendedorNome : undefined,
      comissaoPct:        temComissao ? comissaoPct  : undefined,
      comissaoRecorrente: temComissao ? comRecorrente : undefined,
      comissaoValor:      temComissao ? comissaoValor : undefined,
      totalVenda,
      status: 'ativa',
      criadoEm: new Date().toISOString(),
    };
    salvarFinalizacao(data);
    setSaving(false);
    onSave(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Finalização de Venda</h2>
              <p className="text-sm text-slate-500">Cliente: <strong>{clienteNome}</strong> · {BRL(totalVenda)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tipo de pagamento */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-3">Tipo de Pagamento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoPag('unico')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${tipoPag === 'unico' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tipoPag === 'unico' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <CreditCard className={`w-5 h-5 ${tipoPag === 'unico' ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${tipoPag === 'unico' ? 'text-emerald-700' : 'text-slate-700'}`}>Pagamento Único</p>
                  <p className="text-xs text-slate-400">Cobrança única</p>
                </div>
                {tipoPag === 'unico' && <Check className="w-4 h-4 text-emerald-600 ml-auto" />}
              </button>

              <button
                onClick={() => setTipoPag('recorrente')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${tipoPag === 'recorrente' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tipoPag === 'recorrente' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <Repeat className={`w-5 h-5 ${tipoPag === 'recorrente' ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${tipoPag === 'recorrente' ? 'text-blue-700' : 'text-slate-700'}`}>Pagamento Recorrente</p>
                  <p className="text-xs text-slate-400">Assinatura / mensalidade</p>
                </div>
                {tipoPag === 'recorrente' && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Configurações de Recorrência */}
          {tipoPag === 'recorrente' && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <Repeat className="w-4 h-4" /> Configurações de Recorrência
              </p>

              {/* Período */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Periodicidade</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mensal', 'trimestral', 'semestral', 'anual'] as PeriodoRecorrencia[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodo(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border-2 transition-all capitalize ${periodo === p ? 'border-blue-500 bg-white text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data de início */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  <Calendar className="w-3 h-3 inline mr-1" /> A partir de
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Duração */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" /> Duração
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    {(['meses', 'anos', 'indefinido'] as DuracaoRecorrencia[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDuracaoTipo(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all capitalize ${duracaoTipo === d ? 'border-blue-500 bg-white text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {duracaoTipo !== 'indefinido' && (
                    <input
                      type="number"
                      min={1}
                      value={duracaoVal}
                      onChange={e => setDuracaoVal(Number(e.target.value))}
                      className="w-20 border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  )}
                  {duracaoTipo !== 'indefinido' && (
                    <span className="text-xs text-slate-500">{duracaoTipo}</span>
                  )}
                  {duracaoTipo === 'indefinido' && (
                    <span className="text-xs text-blue-600 font-medium">sem prazo de encerramento</span>
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-white rounded-xl p-3 border border-blue-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Resumo da Recorrência</p>
                <p className="text-sm text-blue-700 font-medium">
                  {BRL(totalVenda)} {periodo} ·{' '}
                  {duracaoTipo === 'indefinido' ? 'por tempo indeterminado' : `por ${duracaoVal} ${duracaoTipo}`} ·{' '}
                  início {new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Comissão */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm font-bold text-slate-800">Comissão de Vendedor</label>
              <button
                onClick={() => setTemComissao(!temComissao)}
                className={`relative w-10 h-5 rounded-full transition-colors ${temComissao ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${temComissao ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {temComissao && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Configurar Comissão
                </p>

                {/* Vendedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    <User className="w-3 h-3 inline mr-1" /> Vendedor Responsável
                  </label>
                  {loadingColabs ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Carregando colaboradores...
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={vendedorId}
                        onChange={e => handleVendedorChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none pr-8"
                      >
                        <option value="">Selecione o vendedor</option>
                        {colaboradores.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* % de comissão */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    <TrendingUp className="w-3 h-3 inline mr-1" /> Percentual de Comissão (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={comissaoPct}
                      onChange={e => setComissaoPct(Number(e.target.value))}
                      className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-xs text-slate-500">= {BRL(comissaoValor)} sobre {BRL(totalVenda)}</span>
                  </div>
                </div>

                {/* Recorrência de comissão */}
                {tipoPag === 'recorrente' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600">Comissão Recorrente</label>
                    <button
                      onClick={() => setComRecorrente(!comRecorrente)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${comRecorrente ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${comRecorrente ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-slate-400">
                      {comRecorrente ? `${BRL(comissaoValor)} por ${periodo}` : 'Somente na primeira cobrança'}
                    </span>
                  </div>
                )}

                {/* Preview */}
                {vendedorNome && (
                  <div className="bg-white rounded-xl p-3 border border-amber-200">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Resumo da Comissão</p>
                    <p className="text-sm text-amber-700 font-medium">
                      <strong>{vendedorNome}</strong> receberá{' '}
                      {BRL(comissaoValor)} ({comissaoPct}%)
                      {tipoPag === 'recorrente' && comRecorrente ? ` a cada ${periodo}` : ' (pagamento único)'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total da Venda */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800">Total da Venda</span>
              </div>
              <span className="text-2xl font-black text-emerald-700">{BRL(totalVenda)}</span>
            </div>
            {tipoPag === 'recorrente' && (
              <p className="text-xs text-emerald-600 mt-1.5 text-right">
                Receita total estimada:{' '}
                {duracaoTipo === 'indefinido'
                  ? 'contínua'
                  : BRL(totalVenda * (duracaoTipo === 'meses' ? duracaoVal : duracaoVal * 12))}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (temComissao && !vendedorId)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar Venda
          </button>
        </div>
      </div>
    </div>
  );
}
