// ─────────────────────────────────────────────────────────────────────────────
// Parceiros — Portal de Parceiros com IA de Prospecção
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Users2, Plus, Search, CheckCircle2, Phone, Mail, Target, XCircle } from 'lucide-react';
import ProspeccaoIA, { type ProspectEmpresa } from './ProspeccaoIA';

interface Parceiro extends ProspectEmpresa {
  captadoEm: string;
}

export default function Parceiros() {
  const [showIA, setShowIA]       = useState(false);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [search, setSearch]       = useState('');

  const filtered = parceiros.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.cnpj && p.cnpj.includes(search)) ||
    (p.cidade?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  function handleAdded(empresas: ProspectEmpresa[]) {
    const novos: Parceiro[] = empresas.map(e => ({ ...e, captadoEm: new Date().toISOString() }));
    setParceiros(prev => {
      const existing = new Set(prev.map(p => p.cnpj || p.nome));
      return [...prev, ...novos.filter(n => !existing.has(n.cnpj || n.nome))];
    });
    setShowIA(false);
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Portal de Parceiros</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} cadastrado{parceiros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
          <button
            onClick={() => setShowIA(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-600/20"
          >
            <Target className="w-4 h-4" /> Captar Parceiros
          </button>
        </div>
      </div>

      {/* Search bar */}
      {parceiros.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar parceiro..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {parceiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
              <Users2 className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Nenhum parceiro ainda</h2>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              Use a IA de Prospecção para encontrar e captar parceiros automaticamente em 5 etapas inteligentes.
            </p>
            <button
              onClick={() => setShowIA(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
            >
              <Target className="w-4 h-4" /> Captar Parceiros com IA
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Empresa', 'CNPJ', 'Status', 'Capital Social', 'Serasa', 'Contatos', 'WhatsApp'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{p.nome}</p>
                      {(p.cidade || p.estado) && <p className="text-xs text-slate-400">{p.cidade}/{p.estado}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{p.cnpj || '—'}</td>
                    <td className="py-3.5 px-4">
                      {p.situacao === 'ATIVA' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Ativa
                        </span>
                      ) : p.situacao ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs">{p.situacao}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{p.capitalSocialStr || '—'}</td>
                    <td className="py-3.5 px-4">
                      {p.serasaStatus === 'ok' ? <span className="text-xs text-green-600 font-semibold">OK</span>
                      : p.serasaStatus === 'restrito' ? <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Restrito</span>
                      : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {p.contatos?.slice(0, 1).map((c, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {c.telefone && <a href={`tel:${c.telefone}`} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><Phone className="w-3.5 h-3.5" /></a>}
                            {c.email && <a href={`mailto:${c.email}`} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><Mail className="w-3.5 h-3.5" /></a>}
                          </span>
                        ))}
                        {(p.contatos?.length ?? 0) === 0 && <span className="text-slate-400 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.whatsappEnviado
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> Enviado</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showIA && <ProspeccaoIA onClose={() => setShowIA(false)} onParceirosAdded={handleAdded} />}
    </div>
  );
}
