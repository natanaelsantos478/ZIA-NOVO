// ERP — Ordem de Serviço
import { useState } from 'react';
import { Wrench, Plus, X, CheckCircle, AlertCircle, Search } from 'lucide-react';

interface OS {
  id: string;
  numero: string;
  cliente: string;
  contato: string;
  telefone: string;
  tipo: 'CORRETIVA' | 'PREVENTIVA' | 'INSTALACAO' | 'CONSULTORIA';
  descricaoProblema: string;
  equipamento: string;
  tecnico: string;
  dataAbertura: string;
  dataPrevista: string;
  dataFechamento?: string;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'AGUARDANDO_CLIENTE' | 'CONCLUIDA' | 'CANCELADA';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  valorMaoDeObra: number;
  valorPecas: number;
  observacoes?: string;
}

const MOCK: OS[] = [
  {
    id: '1', numero: 'OS-0001', cliente: 'Empresa Alpha', contato: 'João Silva', telefone: '(11) 9999-8888',
    tipo: 'CORRETIVA', descricaoProblema: 'Computador não liga, possível problema na fonte de alimentação',
    equipamento: 'Desktop Dell OptiPlex 3080', tecnico: 'Carlos Técnico',
    dataAbertura: '2026-03-10', dataPrevista: '2026-03-14', dataFechamento: '2026-03-13',
    status: 'CONCLUIDA', prioridade: 'ALTA',
    valorMaoDeObra: 150, valorPecas: 89.90, observacoes: 'Fonte trocada. Computador operando normalmente.',
  },
  {
    id: '2', numero: 'OS-0002', cliente: 'Comércio Beta', contato: 'Maria Santos', telefone: '(21) 8888-7777',
    tipo: 'PREVENTIVA', descricaoProblema: 'Manutenção preventiva trimestral — limpeza e atualização de software',
    equipamento: '5 computadores da rede', tecnico: 'Ana Técnica',
    dataAbertura: '2026-03-12', dataPrevista: '2026-03-16',
    status: 'EM_ANDAMENTO', prioridade: 'MEDIA',
    valorMaoDeObra: 500, valorPecas: 0,
  },
  {
    id: '3', numero: 'OS-0003', cliente: 'Indústria Gama', contato: 'Pedro Costa', telefone: '(31) 7777-6666',
    tipo: 'INSTALACAO', descricaoProblema: 'Instalação de sistema ERP na nova filial',
    equipamento: 'Servidor + 10 estações de trabalho', tecnico: 'Roberto Tech',
    dataAbertura: '2026-03-14', dataPrevista: '2026-03-20',
    status: 'ABERTA', prioridade: 'ALTA',
    valorMaoDeObra: 2400, valorPecas: 0,
  },
];

const STATUS_BADGE: Record<string, string> = {
  ABERTA:             'bg-slate-100 text-slate-600',
  EM_ANDAMENTO:       'bg-blue-100 text-blue-700',
  AGUARDANDO_PECA:    'bg-yellow-100 text-yellow-700',
  AGUARDANDO_CLIENTE: 'bg-orange-100 text-orange-700',
  CONCLUIDA:          'bg-green-100 text-green-700',
  CANCELADA:          'bg-red-100 text-red-700',
};

const PRIORIDADE_BADGE: Record<string, string> = {
  BAIXA:   'bg-slate-100 text-slate-500',
  MEDIA:   'bg-blue-100 text-blue-600',
  ALTA:    'bg-orange-100 text-orange-600',
  URGENTE: 'bg-red-100 text-red-600',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OrdemServico() {
  const [ordens, setOrdens] = useState<OS[]>(MOCK);
  const [aba, setAba] = useState<'lista' | 'nova'>('lista');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODAS');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<OS | null>(null);

  const [form, setForm] = useState({
    cliente: '', contato: '', telefone: '', tipo: 'CORRETIVA' as OS['tipo'],
    prioridade: 'MEDIA' as OS['prioridade'], descricaoProblema: '', equipamento: '',
    tecnico: '', dataPrevista: '', valorMaoDeObra: '', valorPecas: '', observacoes: '',
  });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function handleSalvar() {
    if (!form.cliente.trim() || !form.descricaoProblema.trim()) {
      showToast('Preencha cliente e descrição do problema.', false); return;
    }
    const nova: OS = {
      id: String(Date.now()),
      numero: `OS-${String(ordens.length + 1).padStart(4, '0')}`,
      cliente: form.cliente, contato: form.contato, telefone: form.telefone,
      tipo: form.tipo, descricaoProblema: form.descricaoProblema, equipamento: form.equipamento,
      tecnico: form.tecnico, dataAbertura: new Date().toISOString().split('T')[0],
      dataPrevista: form.dataPrevista, status: 'ABERTA', prioridade: form.prioridade,
      valorMaoDeObra: parseFloat(form.valorMaoDeObra) || 0,
      valorPecas: parseFloat(form.valorPecas) || 0,
      observacoes: form.observacoes,
    };
    setOrdens(prev => [nova, ...prev]);
    showToast('Ordem de Serviço aberta com sucesso!', true);
    setAba('lista');
  }

  const filtradas = ordens.filter(o => {
    const matchBusca = o.numero.toLowerCase().includes(busca.toLowerCase()) || o.cliente.toLowerCase().includes(busca.toLowerCase()) || o.tecnico.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODAS' || o.status === statusFiltro;
    return matchBusca && matchStatus;
  });

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Detalhe modal */}
      {detalhe && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono font-bold text-slate-800">{detalhe.numero}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detalhe.status]}`}>{detalhe.status.replace(/_/g, ' ')}</span>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Cliente:</span> <span className="font-medium">{detalhe.cliente}</span></div>
                <div><span className="text-slate-500">Técnico:</span> <span className="font-medium">{detalhe.tecnico || '—'}</span></div>
                <div><span className="text-slate-500">Tipo:</span> <span className="font-medium">{detalhe.tipo}</span></div>
                <div><span className="text-slate-500">Prioridade:</span> <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORIDADE_BADGE[detalhe.prioridade]}`}>{detalhe.prioridade}</span></div>
                <div><span className="text-slate-500">Abertura:</span> <span>{new Date(detalhe.dataAbertura + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                <div><span className="text-slate-500">Previsão:</span> <span>{new Date(detalhe.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
              </div>
              <div className="pt-2"><span className="text-slate-500 block mb-1">Equipamento:</span> <span className="font-medium">{detalhe.equipamento || '—'}</span></div>
              <div><span className="text-slate-500 block mb-1">Problema:</span> <p className="text-slate-700 bg-slate-50 rounded-lg p-2">{detalhe.descricaoProblema}</p></div>
              {detalhe.observacoes && <div><span className="text-slate-500 block mb-1">Observações:</span> <p className="text-slate-700 bg-slate-50 rounded-lg p-2">{detalhe.observacoes}</p></div>}
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Mão de obra: <strong>{BRL(detalhe.valorMaoDeObra)}</strong></span>
                <span className="text-slate-500">Peças: <strong>{BRL(detalhe.valorPecas)}</strong></span>
                <span className="font-semibold">Total: <strong className="text-slate-900">{BRL(detalhe.valorMaoDeObra + detalhe.valorPecas)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" /> Ordem de Serviço
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie ordens de serviço técnico e assistência ao cliente</p>
        </div>
        <button onClick={() => setAba(aba === 'lista' ? 'nova' : 'lista')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          {aba === 'lista' ? <><Plus className="w-4 h-4" /> Nova OS</> : <><X className="w-4 h-4" /> Cancelar</>}
        </button>
      </div>

      {/* KPIs */}
      {aba === 'lista' && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Abertas', value: ordens.filter(o => o.status === 'ABERTA').length, color: 'slate' },
            { label: 'Em Andamento', value: ordens.filter(o => o.status === 'EM_ANDAMENTO').length, color: 'blue' },
            { label: 'Aguardando', value: ordens.filter(o => o.status === 'AGUARDANDO_PECA' || o.status === 'AGUARDANDO_CLIENTE').length, color: 'yellow' },
            { label: 'Concluídas', value: ordens.filter(o => o.status === 'CONCLUIDA').length, color: 'green' },
          ].map(k => (
            <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-200 rounded-xl p-4`}>
              <div className={`text-2xl font-bold text-${k.color}-700`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {aba === 'nova' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nova Ordem de Serviço</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contato</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as OS['tipo'] }))}>
                {['CORRETIVA', 'PREVENTIVA', 'INSTALACAO', 'CONSULTORIA'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as OS['prioridade'] }))}>
                {['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Problema *</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} value={form.descricaoProblema} onChange={e => setForm(f => ({ ...f, descricaoProblema: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Equipamento</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.equipamento} onChange={e => setForm(f => ({ ...f, equipamento: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Técnico Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Prevista</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Mão de Obra</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.valorMaoDeObra} onChange={e => setForm(f => ({ ...f, valorMaoDeObra: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => setAba('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Abrir OS</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar OS, cliente, técnico…" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['TODAS', 'ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'].map(s => (
                <button key={s} onClick={() => setStatusFiltro(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'TODAS' ? 'Todas' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['OS', 'Cliente', 'Tipo', 'Prioridade', 'Técnico', 'Abertura', 'Previsão', 'Total', 'Status'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhuma OS encontrada</td></tr>
                )}
                {filtradas.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetalhe(o)}>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-800">{o.numero}</td>
                    <td className="px-3 py-3 text-slate-700">{o.cliente}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs">{o.tipo}</td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORIDADE_BADGE[o.prioridade]}`}>{o.prioridade}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{o.tecnico || '—'}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{new Date(o.dataAbertura + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{new Date(o.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{BRL(o.valorMaoDeObra + o.valorPecas)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.status]}`}>{o.status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
