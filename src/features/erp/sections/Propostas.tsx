// ERP — Propostas Comerciais
import { useState } from 'react';
import { ClipboardList, Plus, X, CheckCircle, AlertCircle, Search, DollarSign, Calendar, User, ChevronRight } from 'lucide-react';

interface Proposta {
  id: string;
  numero: string;
  titulo: string;
  cliente: string;
  contato: string;
  valor: number;
  validadeAte: string;
  dataCriacao: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'EM_NEGOCIACAO' | 'APROVADA' | 'REJEITADA' | 'EXPIRADA';
  responsavel: string;
  descricao: string;
}

const MOCK: Proposta[] = [
  {
    id: '1', numero: 'PROP-0001', titulo: 'Implantação ERP Completo', cliente: 'Tech Solutions Ltda',
    contato: 'João Diretor', valor: 48000, validadeAte: '2026-04-01', dataCriacao: '2026-03-01',
    status: 'EM_NEGOCIACAO', responsavel: 'Vendedor A',
    descricao: 'Proposta para implantação completa do ERP com módulos ERP, RH, CRM e Qualidade',
  },
  {
    id: '2', numero: 'PROP-0002', titulo: 'Módulo RH + Folha de Pagamento', cliente: 'Comércio Beta S/A',
    contato: 'Maria RH', valor: 18500, validadeAte: '2026-03-30', dataCriacao: '2026-03-05',
    status: 'APROVADA', responsavel: 'Vendedor B',
    descricao: 'Módulo de Recursos Humanos com gestão de ponto, folha e benefícios',
  },
  {
    id: '3', numero: 'PROP-0003', titulo: 'Suporte Técnico Anual', cliente: 'Indústria Norte ME',
    contato: 'Pedro TI', valor: 12000, validadeAte: '2026-03-25', dataCriacao: '2026-03-10',
    status: 'ENVIADA', responsavel: 'Vendedor A',
    descricao: 'Contrato anual de suporte técnico remoto e presencial — plano Gold',
  },
  {
    id: '4', numero: 'PROP-0004', titulo: 'Consultoria de Processos', cliente: 'Grupo Delta',
    contato: 'Carlos CEO', valor: 35000, validadeAte: '2026-03-15', dataCriacao: '2026-02-20',
    status: 'EXPIRADA', responsavel: 'Vendedor C',
    descricao: 'Levantamento e mapeamento de processos para implantação de sistema integrado',
  },
];

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:       'bg-slate-100 text-slate-600',
  ENVIADA:        'bg-blue-100 text-blue-700',
  EM_NEGOCIACAO:  'bg-yellow-100 text-yellow-700',
  APROVADA:       'bg-green-100 text-green-700',
  REJEITADA:      'bg-red-100 text-red-700',
  EXPIRADA:       'bg-gray-100 text-gray-500',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Propostas() {
  const [propostas, setPropostas] = useState<Proposta[]>(MOCK);
  const [aba, setAba] = useState<'lista' | 'nova'>('lista');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODAS');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<Proposta | null>(null);

  const [form, setForm] = useState({
    titulo: '', cliente: '', contato: '', valor: '', validadeAte: '',
    responsavel: '', descricao: '',
  });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function handleSalvar() {
    if (!form.titulo.trim() || !form.cliente.trim() || !form.valor) {
      showToast('Preencha título, cliente e valor.', false); return;
    }
    const nova: Proposta = {
      id: String(Date.now()),
      numero: `PROP-${String(propostas.length + 1).padStart(4, '0')}`,
      titulo: form.titulo, cliente: form.cliente, contato: form.contato,
      valor: parseFloat(form.valor) || 0, validadeAte: form.validadeAte,
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'RASCUNHO', responsavel: form.responsavel, descricao: form.descricao,
    };
    setPropostas(prev => [nova, ...prev]);
    showToast('Proposta criada com sucesso!', true);
    setAba('lista');
  }

  const filtradas = propostas.filter(p => {
    const matchBusca = p.numero.toLowerCase().includes(busca.toLowerCase()) || p.cliente.toLowerCase().includes(busca.toLowerCase()) || p.titulo.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODAS' || p.status === statusFiltro;
    return matchBusca && matchStatus;
  });

  const totalAprovado = propostas.filter(p => p.status === 'APROVADA').reduce((s, p) => s + p.valor, 0);
  const totalNegociacao = propostas.filter(p => p.status === 'EM_NEGOCIACAO').reduce((s, p) => s + p.valor, 0);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono font-bold text-slate-800">{detalhe.numero}</span>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-3">{detalhe.titulo}</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{detalhe.cliente}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Valor</span><span className="font-bold text-green-700">{BRL(detalhe.valor)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Validade</span><span>{detalhe.validadeAte ? new Date(detalhe.validadeAte + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Responsável</span><span>{detalhe.responsavel}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detalhe.status]}`}>{detalhe.status.replace(/_/g, ' ')}</span></div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{detalhe.descricao}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setPropostas(prev => prev.map(p => p.id === detalhe.id ? { ...p, status: 'ENVIADA' } : p)); setDetalhe(null); showToast('Status atualizado!', true); }}
                disabled={detalhe.status !== 'RASCUNHO'}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                Marcar como Enviada
              </button>
              <button onClick={() => setDetalhe(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> Propostas Comerciais
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle e acompanhamento de propostas enviadas a clientes</p>
        </div>
        <button onClick={() => setAba(aba === 'lista' ? 'nova' : 'lista')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          {aba === 'lista' ? <><Plus className="w-4 h-4" /> Nova Proposta</> : <><X className="w-4 h-4" /> Cancelar</>}
        </button>
      </div>

      {aba === 'lista' && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-lg font-bold text-green-700">{BRL(totalAprovado)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Valor Aprovado</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-lg font-bold text-yellow-700">{BRL(totalNegociacao)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Em Negociação</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-700">{propostas.filter(p => p.status === 'ENVIADA').length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Aguardando Resposta</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-700">{Math.round(propostas.filter(p => p.status === 'APROVADA').length / Math.max(propostas.filter(p => p.status !== 'RASCUNHO').length, 1) * 100)}%</div>
            <div className="text-xs text-slate-500 mt-0.5">Taxa de Aprovação</div>
          </div>
        </div>
      )}

      {aba === 'nova' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nova Proposta</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Título da Proposta *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Implantação ERP Módulo Financeiro" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contato</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor *</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Válida até</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.validadeAte} onChange={e => setForm(f => ({ ...f, validadeAte: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição / Escopo</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => setAba('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Criar Proposta</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buscar proposta, cliente…" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {['TODAS', 'RASCUNHO', 'ENVIADA', 'EM_NEGOCIACAO', 'APROVADA', 'REJEITADA'].map(s => (
                <button key={s} onClick={() => setStatusFiltro(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'TODAS' ? 'Todas' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtradas.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">Nenhuma proposta encontrada</div>
            )}
            {filtradas.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => setDetalhe(p)}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="font-mono text-xs text-slate-500">{p.numero}</span>
                    <h3 className="font-semibold text-slate-800 text-sm mt-0.5">{p.titulo}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.cliente}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{BRL(p.valor)}</span>
                  {p.validadeAte && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />até {new Date(p.validadeAte + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                  <span>{p.responsavel}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
