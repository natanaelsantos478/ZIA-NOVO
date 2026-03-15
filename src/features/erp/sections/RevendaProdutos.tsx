// ERP — Revenda de Produtos
import { useState } from 'react';
import { Store, Search, Plus, X, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface ProdutoRevenda {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string;
  categoria: string;
  custoCompra: number;
  precoRevenda: number;
  margemPct: number;
  estoque: number;
  ativo: boolean;
}

const MOCK: ProdutoRevenda[] = [
  { id: '1', codigo: 'REV-001', nome: 'Antivírus Kaspersky 1 ano', fabricante: 'Kaspersky', categoria: 'Software', custoCompra: 80, precoRevenda: 149, margemPct: 46.3, estoque: 50, ativo: true },
  { id: '2', codigo: 'REV-002', nome: 'Notebook Dell Inspiron 15', fabricante: 'Dell', categoria: 'Hardware', custoCompra: 3200, precoRevenda: 4199, margemPct: 23.8, estoque: 8, ativo: true },
  { id: '3', codigo: 'REV-003', nome: 'Switch TP-Link 8 portas', fabricante: 'TP-Link', categoria: 'Rede', custoCompra: 95, precoRevenda: 159, margemPct: 40.3, estoque: 22, ativo: true },
  { id: '4', codigo: 'REV-004', nome: 'Licença Microsoft 365 Business', fabricante: 'Microsoft', categoria: 'Software', custoCompra: 420, precoRevenda: 699, margemPct: 39.9, estoque: 100, ativo: true },
  { id: '5', codigo: 'REV-005', nome: 'Impressora HP LaserJet', fabricante: 'HP', categoria: 'Hardware', custoCompra: 890, precoRevenda: 1299, margemPct: 31.5, estoque: 5, ativo: false },
];

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RevendaProdutos() {
  const [produtos, setProdutos] = useState<ProdutoRevenda[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // form
  const [form, setForm] = useState({ codigo: '', nome: '', fabricante: '', categoria: 'Software', custoCompra: '', precoRevenda: '' });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  const categorias = ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria)))];

  const filtrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo.toLowerCase().includes(busca.toLowerCase()) || p.fabricante.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoriaFiltro === 'Todos' || p.categoria === categoriaFiltro;
    return matchBusca && matchCat;
  });

  function handleSalvar() {
    if (!form.nome.trim() || !form.custoCompra || !form.precoRevenda) { showToast('Preencha todos os campos obrigatórios.', false); return; }
    const custo = parseFloat(form.custoCompra);
    const preco = parseFloat(form.precoRevenda);
    const novo: ProdutoRevenda = {
      id: String(Date.now()),
      codigo: form.codigo || `REV-${String(produtos.length + 1).padStart(3, '0')}`,
      nome: form.nome, fabricante: form.fabricante, categoria: form.categoria,
      custoCompra: custo, precoRevenda: preco,
      margemPct: Math.round(((preco - custo) / preco) * 1000) / 10,
      estoque: 0, ativo: true,
    };
    setProdutos(prev => [novo, ...prev]);
    showToast('Produto adicionado ao catálogo de revenda!', true);
    setForm({ codigo: '', nome: '', fabricante: '', categoria: 'Software', custoCompra: '', precoRevenda: '' });
    setShowForm(false);
  }

  const totalEstoqueValor = produtos.filter(p => p.ativo).reduce((s, p) => s + p.estoque * p.custoCompra, 0);
  const margemMedia = produtos.filter(p => p.ativo).reduce((s, p) => s + p.margemPct, 0) / Math.max(produtos.filter(p => p.ativo).length, 1);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" /> Revenda de Produtos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Catálogo de produtos para revenda com controle de margem</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Novo Produto</>}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700">{produtos.filter(p => p.ativo).length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Produtos Ativos</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700">{margemMedia.toFixed(1)}%</div>
          <div className="text-xs text-slate-500 mt-0.5">Margem Média</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-lg font-bold text-emerald-700">{BRL(totalEstoqueValor)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Estoque em Custo</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{produtos.filter(p => p.estoque <= 5 && p.ativo).length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Abaixo do Mínimo</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Novo Produto de Revenda</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Código</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Auto" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {['Software', 'Hardware', 'Rede', 'Periférico', 'Serviço', 'Outro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome do produto *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Descrição completa do produto" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fabricante / Fornecedor</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Dell, Microsoft…" value={form.fabricante} onChange={e => setForm(f => ({ ...f, fabricante: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Custo de Compra *</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0,00" value={form.custoCompra} onChange={e => setForm(f => ({ ...f, custoCompra: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Revenda *</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0,00" value={form.precoRevenda} onChange={e => setForm(f => ({ ...f, precoRevenda: e.target.value }))} />
              </div>
            </div>
          </div>
          {form.custoCompra && form.precoRevenda && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-slate-600">Margem: <strong className="text-green-700">{(((parseFloat(form.precoRevenda) - parseFloat(form.custoCompra)) / parseFloat(form.precoRevenda)) * 100).toFixed(1)}%</strong></span>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Adicionar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar produto, fabricante…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {categorias.map(c => (
            <button key={c} onClick={() => setCategoriaFiltro(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoriaFiltro === c ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Código', 'Produto', 'Fabricante', 'Categoria', 'Custo', 'Preço Revenda', 'Margem', 'Estoque', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum produto encontrado</td></tr>
            )}
            {filtrados.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.codigo}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                <td className="px-4 py-3 text-slate-600">{p.fabricante}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{p.categoria}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{BRL(p.custoCompra)}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{BRL(p.precoRevenda)}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${p.margemPct >= 30 ? 'text-green-600' : p.margemPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>{p.margemPct.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.estoque}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
