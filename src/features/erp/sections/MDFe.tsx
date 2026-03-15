// ERP — MDF-e (Manifesto Eletrônico de Documentos Fiscais)
import { useState } from 'react';
import { ClipboardList, Plus, X, CheckCircle, AlertCircle, Search } from 'lucide-react';

interface MDFeDoc {
  id: string;
  numero: string;
  chave?: string;
  serie: number;
  dataEmissao: string;
  dataInicioViagem: string;
  uf_carregamento: string;
  uf_descarregamento: string;
  transportadora: string;
  placa: string;
  motorista: string;
  cpfMotorista: string;
  qtdNFe: number;
  pesoBruto: number;
  valorCarga: number;
  status: 'RASCUNHO' | 'AUTORIZADO' | 'ENCERRADO' | 'CANCELADO';
  percurso: string[];
}

const MOCK: MDFeDoc[] = [
  {
    id: '1', numero: '000001', chave: '3526030000000000000058000000000011000000011',
    serie: 1, dataEmissao: '2026-03-10', dataInicioViagem: '2026-03-11',
    uf_carregamento: 'SP', uf_descarregamento: 'RJ',
    transportadora: 'Rápido Log Transportes', placa: 'ABC-1234',
    motorista: 'José da Silva', cpfMotorista: '123.456.789-00',
    qtdNFe: 8, pesoBruto: 2450, valorCarga: 185000,
    status: 'ENCERRADO', percurso: ['SP', 'RJ'],
  },
  {
    id: '2', numero: '000002',
    serie: 1, dataEmissao: '2026-03-13', dataInicioViagem: '2026-03-14',
    uf_carregamento: 'SP', uf_descarregamento: 'MG',
    transportadora: 'SuperFrete Ltda', placa: 'XYZ-5678',
    motorista: 'Carlos Oliveira', cpfMotorista: '987.654.321-00',
    qtdNFe: 5, pesoBruto: 1200, valorCarga: 92000,
    status: 'AUTORIZADO', percurso: ['SP', 'MG'],
  },
  {
    id: '3', numero: '000003',
    serie: 1, dataEmissao: '2026-03-15', dataInicioViagem: '2026-03-16',
    uf_carregamento: 'SP', uf_descarregamento: 'CE',
    transportadora: 'Nordeste Cargas', placa: 'DEF-9012',
    motorista: 'Pedro Santos', cpfMotorista: '456.789.123-00',
    qtdNFe: 12, pesoBruto: 8500, valorCarga: 340000,
    status: 'RASCUNHO', percurso: ['SP', 'BA', 'CE'],
  },
];

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   'bg-slate-100 text-slate-600',
  AUTORIZADO: 'bg-blue-100 text-blue-700',
  ENCERRADO:  'bg-green-100 text-green-700',
  CANCELADO:  'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MDFe() {
  const [manifestos, setManifestos] = useState<MDFeDoc[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<MDFeDoc | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    uf_carregamento: 'SP', uf_descarregamento: '',
    transportadora: '', placa: '', motorista: '', cpfMotorista: '',
    dataInicioViagem: '', qtdNFe: '1', pesoBruto: '', valorCarga: '',
  });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function autorizar(id: string) {
    setManifestos(prev => prev.map(m => m.id === id ? {
      ...m, status: 'AUTORIZADO',
      chave: `35${String(Date.now()).slice(0, 10)}00000000000000580000000000${m.numero}0000000${Math.floor(Math.random() * 10)}`,
    } : m));
    showToast('MDF-e autorizado com sucesso!', true);
    setDetalhe(null);
  }

  function encerrar(id: string) {
    setManifestos(prev => prev.map(m => m.id === id ? { ...m, status: 'ENCERRADO' } : m));
    showToast('MDF-e encerrado!', true);
    setDetalhe(null);
  }

  function handleSalvar() {
    if (!form.transportadora.trim() || !form.placa.trim() || !form.motorista.trim()) {
      showToast('Preencha transportadora, placa e motorista.', false); return;
    }
    const novo: MDFeDoc = {
      id: String(Date.now()),
      numero: String(manifestos.length + 1).padStart(6, '0'),
      serie: 1,
      dataEmissao: new Date().toISOString().split('T')[0],
      dataInicioViagem: form.dataInicioViagem,
      uf_carregamento: form.uf_carregamento,
      uf_descarregamento: form.uf_descarregamento,
      transportadora: form.transportadora, placa: form.placa,
      motorista: form.motorista, cpfMotorista: form.cpfMotorista,
      qtdNFe: parseInt(form.qtdNFe) || 0,
      pesoBruto: parseFloat(form.pesoBruto) || 0,
      valorCarga: parseFloat(form.valorCarga) || 0,
      status: 'RASCUNHO', percurso: [form.uf_carregamento, form.uf_descarregamento].filter(Boolean),
    };
    setManifestos(prev => [novo, ...prev]);
    showToast('MDF-e criado em rascunho!', true);
    setShowForm(false);
  }

  const filtrados = manifestos.filter(m =>
    m.numero.includes(busca) ||
    m.transportadora.toLowerCase().includes(busca.toLowerCase()) ||
    m.placa.toLowerCase().includes(busca.toLowerCase()) ||
    m.motorista.toLowerCase().includes(busca.toLowerCase()),
  );

  const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

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
              <div>
                <span className="text-sm text-slate-500">MDF-e Série {detalhe.serie} nº </span>
                <span className="font-mono font-bold text-slate-800">{detalhe.numero}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detalhe.status]}`}>{detalhe.status}</span>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            {detalhe.chave && (
              <div className="bg-blue-50 rounded-lg p-2 mb-4 text-xs font-mono text-blue-700 break-all">
                Chave: {detalhe.chave}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-slate-500">Transportadora:</span> <span className="font-medium">{detalhe.transportadora}</span></div>
              <div><span className="text-slate-500">Placa:</span> <span className="font-mono">{detalhe.placa}</span></div>
              <div><span className="text-slate-500">Motorista:</span> <span>{detalhe.motorista}</span></div>
              <div><span className="text-slate-500">CPF:</span> <span>{detalhe.cpfMotorista}</span></div>
              <div><span className="text-slate-500">Percurso:</span> <span className="font-medium">{detalhe.percurso.join(' → ')}</span></div>
              <div><span className="text-slate-500">Início:</span> <span>{detalhe.dataInicioViagem ? new Date(detalhe.dataInicioViagem + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
              <div><span className="text-slate-500">Qtd NF-e:</span> <span className="font-medium">{detalhe.qtdNFe}</span></div>
              <div><span className="text-slate-500">Peso Bruto:</span> <span>{detalhe.pesoBruto.toLocaleString('pt-BR')} kg</span></div>
            </div>
            <div className="text-sm mb-4">
              <span className="text-slate-500">Valor da Carga:</span> <span className="font-bold text-slate-900">{BRL(detalhe.valorCarga)}</span>
            </div>

            <div className="flex gap-2">
              {detalhe.status === 'RASCUNHO' && (
                <button onClick={() => autorizar(detalhe.id)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Autorizar</button>
              )}
              {detalhe.status === 'AUTORIZADO' && (
                <button onClick={() => encerrar(detalhe.id)} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Encerrar</button>
              )}
              <button onClick={() => setDetalhe(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> MDF-e
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manifesto Eletrônico de Documentos Fiscais para transporte de carga</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Novo MDF-e</>}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Rascunhos', val: manifestos.filter(m => m.status === 'RASCUNHO').length, color: 'slate' },
          { label: 'Autorizados', val: manifestos.filter(m => m.status === 'AUTORIZADO').length, color: 'blue' },
          { label: 'Encerrados', val: manifestos.filter(m => m.status === 'ENCERRADO').length, color: 'green' },
          { label: 'NF-e Vinculadas', val: manifestos.reduce((s, m) => s + m.qtdNFe, 0), color: 'emerald' },
        ].map(k => (
          <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-200 rounded-xl p-4`}>
            <div className={`text-2xl font-bold text-${k.color}-700`}>{k.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Novo MDF-e</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">UF Carregamento</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.uf_carregamento} onChange={e => setForm(f => ({ ...f, uf_carregamento: e.target.value }))}>
                {UFS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">UF Descarregamento</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.uf_descarregamento} onChange={e => setForm(f => ({ ...f, uf_descarregamento: e.target.value }))}>
                <option value="">Selecione…</option>
                {UFS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.transportadora} onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Placa *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="AAA-9999" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Motorista *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.motorista} onChange={e => setForm(f => ({ ...f, motorista: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CPF do Motorista</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="000.000.000-00" value={form.cpfMotorista} onChange={e => setForm(f => ({ ...f, cpfMotorista: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Início da Viagem</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.dataInicioViagem} onChange={e => setForm(f => ({ ...f, dataInicioViagem: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Qtd NF-e vinculadas</label>
              <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.qtdNFe} onChange={e => setForm(f => ({ ...f, qtdNFe: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Peso Bruto Total (kg)</label>
              <input type="number" min="0" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.pesoBruto} onChange={e => setForm(f => ({ ...f, pesoBruto: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Total da Carga</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.valorCarga} onChange={e => setForm(f => ({ ...f, valorCarga: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Criar MDF-e</button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buscar por número, transportadora, placa, motorista…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Nº', 'Emissão', 'Percurso', 'Transportadora', 'Placa', 'Motorista', 'NF-e', 'Peso (kg)', 'Valor Carga', 'Status'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">Nenhum MDF-e encontrado</td></tr>
            )}
            {filtrados.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetalhe(m)}>
                <td className="px-3 py-3 font-mono font-bold text-slate-800">{m.numero}</td>
                <td className="px-3 py-3 text-slate-500 text-xs">{new Date(m.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-3 py-3 text-slate-700">{m.percurso.join(' → ')}</td>
                <td className="px-3 py-3 text-slate-600">{m.transportadora}</td>
                <td className="px-3 py-3 font-mono text-slate-600">{m.placa}</td>
                <td className="px-3 py-3 text-slate-600">{m.motorista}</td>
                <td className="px-3 py-3 text-slate-600">{m.qtdNFe}</td>
                <td className="px-3 py-3 text-slate-600">{m.pesoBruto.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-3 font-semibold text-slate-800">{BRL(m.valorCarga)}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
