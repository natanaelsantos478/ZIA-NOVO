// ERP — Integração Loja Virtual (e-commerce)
import { useState } from 'react';
import { Store, RefreshCw, CheckCircle, AlertCircle, ShoppingCart, Zap, Link, X } from 'lucide-react';

interface Plataforma {
  id: string;
  nome: string;
  logo: string;
  conectada: boolean;
  url?: string;
  ultimaSync?: string;
  pedidosPendentes?: number;
  status: 'conectada' | 'desconectada' | 'erro' | 'sincronizando';
}

interface PedidoLoja {
  id: string;
  numero: string;
  plataforma: string;
  cliente: string;
  valor: number;
  data: string;
  status: 'NOVO' | 'PROCESSANDO' | 'SINCRONIZADO' | 'ERRO';
  itens: number;
}

const PLATAFORMAS: Plataforma[] = [
  { id: '1', nome: 'Shopify', logo: '🛍️', conectada: true, url: 'minha-loja.myshopify.com', ultimaSync: '2026-03-15 14:32', pedidosPendentes: 5, status: 'conectada' },
  { id: '2', nome: 'WooCommerce', logo: '🛒', conectada: true, url: 'www.minhaloja.com.br', ultimaSync: '2026-03-15 14:15', pedidosPendentes: 12, status: 'conectada' },
  { id: '3', nome: 'Magento', logo: '🔷', conectada: false, status: 'desconectada' },
  { id: '4', nome: 'VTEX', logo: '📦', conectada: false, status: 'desconectada' },
  { id: '5', nome: 'Tray', logo: '🏪', conectada: false, status: 'desconectada' },
];

const PEDIDOS_LOJA: PedidoLoja[] = [
  { id: '1', numero: '#10234', plataforma: 'Shopify', cliente: 'João Silva', valor: 289.90, data: '2026-03-15 13:45', status: 'NOVO', itens: 2 },
  { id: '2', numero: '#10233', plataforma: 'WooCommerce', cliente: 'Maria Oliveira', valor: 152.00, data: '2026-03-15 12:20', status: 'SINCRONIZADO', itens: 1 },
  { id: '3', numero: '#10232', plataforma: 'Shopify', cliente: 'Carlos Mendes', valor: 899.00, data: '2026-03-15 11:10', status: 'SINCRONIZADO', itens: 3 },
  { id: '4', numero: '#20891', plataforma: 'WooCommerce', cliente: 'Ana Santos', valor: 456.50, data: '2026-03-15 10:55', status: 'PROCESSANDO', itens: 4 },
  { id: '5', numero: '#10231', plataforma: 'Shopify', cliente: 'Pedro Costa', valor: 78.00, data: '2026-03-15 09:30', status: 'ERRO', itens: 1 },
];

const STATUS_BADGE: Record<string, string> = {
  NOVO:         'bg-blue-100 text-blue-700',
  PROCESSANDO:  'bg-yellow-100 text-yellow-700',
  SINCRONIZADO: 'bg-green-100 text-green-700',
  ERRO:         'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function IntegracaoLoja() {
  const [plataformas, setPlataformas] = useState<Plataforma[]>(PLATAFORMAS);
  const [pedidos] = useState<PedidoLoja[]>(PEDIDOS_LOJA);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showConectar, setShowConectar] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [syncando, setSyncando] = useState<string | null>(null);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  function conectar(id: string) {
    if (!apiKey.trim()) { showToast('Informe a chave de API.', false); return; }
    setPlataformas(prev => prev.map(p => p.id === id ? { ...p, conectada: true, status: 'conectada', ultimaSync: new Date().toLocaleString('pt-BR'), pedidosPendentes: 0 } : p));
    showToast('Plataforma conectada com sucesso!', true);
    setShowConectar(null);
    setApiKey('');
  }

  function sincronizar(id: string) {
    setSyncando(id);
    setTimeout(() => {
      setPlataformas(prev => prev.map(p => p.id === id ? { ...p, ultimaSync: new Date().toLocaleString('pt-BR'), pedidosPendentes: 0, status: 'conectada' } : p));
      setSyncando(null);
      showToast('Sincronização concluída!', true);
    }, 2000);
  }

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {showConectar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Conectar {plataformas.find(p => p.id === showConectar)?.nome}</h3>
              <button onClick={() => { setShowConectar(null); setApiKey(''); }} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Chave de API *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="sk_live_xxxxxxxxxxxxxxxx" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Encontre a chave de API nas configurações da sua plataforma.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => conectar(showConectar)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Conectar</button>
              <button onClick={() => setShowConectar(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" /> Integração Loja Virtual
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Sincronize pedidos e estoque com suas plataformas de e-commerce</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700">{plataformas.filter(p => p.conectada).length}</div>
          <div className="text-xs text-slate-500">Plataformas Conectadas</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-700">{pedidos.filter(p => p.status === 'NOVO').length}</div>
          <div className="text-xs text-slate-500">Pedidos Novos</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700">{pedidos.filter(p => p.status === 'SINCRONIZADO').length}</div>
          <div className="text-xs text-slate-500">Sincronizados Hoje</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-lg font-bold text-emerald-700">{BRL(pedidos.reduce((s, p) => s + p.valor, 0))}</div>
          <div className="text-xs text-slate-500">Valor em Pedidos</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Plataformas */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Link className="w-4 h-4" /> Plataformas</h2>
          <div className="space-y-2">
            {plataformas.map(plat => (
              <div key={plat.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{plat.logo}</span>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{plat.nome}</div>
                      {plat.url && <div className="text-xs text-slate-500">{plat.url}</div>}
                      {plat.ultimaSync && <div className="text-xs text-slate-400">Sync: {plat.ultimaSync}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plat.conectada ? (
                      <>
                        {plat.pedidosPendentes ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{plat.pedidosPendentes} pendentes</span>
                        ) : null}
                        <button onClick={() => sincronizar(plat.id)} disabled={syncando === plat.id} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                          <RefreshCw className={`w-3 h-3 ${syncando === plat.id ? 'animate-spin' : ''}`} />
                          {syncando === plat.id ? 'Sync…' : 'Sincronizar'}
                        </button>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                      </>
                    ) : (
                      <button onClick={() => setShowConectar(plat.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                        <Zap className="w-3 h-3" /> Conectar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pedidos recentes */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Pedidos Recentes</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Número', 'Plataforma', 'Cliente', 'Valor', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-slate-700">{p.numero}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.plataforma}</td>
                    <td className="px-3 py-2.5 text-slate-700">{p.cliente}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{BRL(p.valor)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
