import { useState } from 'react';
import {
  Receipt, CheckCircle, Clock, AlertTriangle, X,
  Search, Filter, Download, Plus, Eye,
  FileText, Building2, Calendar, Tag, Send,
  ChevronDown, XCircle,
} from 'lucide-react';

type NFeStatus = 'RASCUNHO' | 'ENVIADA' | 'AUTORIZADA' | 'DENEGADA' | 'CANCELADA';
type NfeTipo = 'EMITIDA' | 'RECEBIDA';

interface NFeItem {
  id: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  aliquota_icms: number;
  aliquota_pis: number;
  aliquota_cofins: number;
}

interface NFe {
  id: string;
  numero_nfe: string;
  serie: string;
  tipo: NfeTipo;
  status: NFeStatus;
  destinatario: string;
  cnpj_dest: string;
  natureza_operacao: string;
  data_emissao: string;
  data_autorizacao?: string;
  chave_acesso?: string;
  valor_total_nf: number;
  itens?: NFeItem[];
}

const MOCK_NFE: NFe[] = [
  {
    id: 'NF-001', numero_nfe: '001842', serie: '001', tipo: 'EMITIDA', status: 'AUTORIZADA',
    destinatario: 'Metalúrgica ABC Ltda', cnpj_dest: '12.345.678/0001-99',
    natureza_operacao: 'Venda de mercadoria', data_emissao: '03/03/26', data_autorizacao: '03/03/26',
    chave_acesso: '35260312345678000199550010001842001234567890',
    valor_total_nf: 48200,
  },
  {
    id: 'NF-002', numero_nfe: '001841', serie: '001', tipo: 'EMITIDA', status: 'AUTORIZADA',
    destinatario: 'Transportes Rápidos ME', cnpj_dest: '98.765.432/0001-11',
    natureza_operacao: 'Venda de mercadoria', data_emissao: '01/03/26', data_autorizacao: '01/03/26',
    chave_acesso: '35260398765432000111550010001841001234567891',
    valor_total_nf: 22700,
  },
  {
    id: 'NF-003', numero_nfe: '001843', serie: '001', tipo: 'EMITIDA', status: 'RASCUNHO',
    destinatario: 'Construtora Delta S.A.', cnpj_dest: '55.123.456/0001-44',
    natureza_operacao: 'Venda de mercadoria', data_emissao: '06/03/26',
    valor_total_nf: 78500,
    itens: [
      { id: 'IT-001', descricao: 'Peça Industrial Tipo A', ncm: '84818099', cfop: '5102', quantidade: 50, valor_unitario: 850, valor_total: 42500, aliquota_icms: 12, aliquota_pis: 0.65, aliquota_cofins: 3 },
      { id: 'IT-002', descricao: 'Componente Mecânico B12', ncm: '73181100', cfop: '5102', quantidade: 120, valor_unitario: 300, valor_total: 36000, aliquota_icms: 12, aliquota_pis: 0.65, aliquota_cofins: 3 },
    ],
  },
  {
    id: 'NF-004', numero_nfe: '001798', serie: '001', tipo: 'EMITIDA', status: 'AUTORIZADA',
    destinatario: 'Agro Pecuária Leste S.A.', cnpj_dest: '22.987.654/0001-77',
    natureza_operacao: 'Venda de mercadoria', data_emissao: '08/02/26', data_autorizacao: '08/02/26',
    chave_acesso: '35260322987654000177550010001798001234567892',
    valor_total_nf: 128900,
  },
  {
    id: 'NF-005', numero_nfe: '002301', serie: '001', tipo: 'RECEBIDA', status: 'AUTORIZADA',
    destinatario: 'Plásticos Norte Ltda (Fornecedor)', cnpj_dest: '33.456.789/0001-55',
    natureza_operacao: 'Compra de insumos', data_emissao: '04/03/26', data_autorizacao: '04/03/26',
    chave_acesso: '35260333456789000155550010002301001234567893',
    valor_total_nf: 18300,
  },
  {
    id: 'NF-006', numero_nfe: '001844', serie: '001', tipo: 'EMITIDA', status: 'CANCELADA',
    destinatario: 'TechSoft Sistemas ME', cnpj_dest: '44.567.890/0001-33',
    natureza_operacao: 'Venda de mercadoria', data_emissao: '05/03/26',
    valor_total_nf: 4800,
  },
];

const STATUS_CONFIG: Record<NFeStatus, { label: string; color: string; icon: React.ElementType }> = {
  RASCUNHO:   { label: 'Rascunho',   color: 'bg-slate-100 text-slate-600',   icon: FileText },
  ENVIADA:    { label: 'Enviada',    color: 'bg-blue-100 text-blue-700',     icon: Send },
  AUTORIZADA: { label: 'Autorizada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  DENEGADA:   { label: 'Denegada',  color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  CANCELADA:  { label: 'Cancelada', color: 'bg-red-100 text-red-600',       icon: XCircle },
};

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

interface DetalheModalProps {
  nfe: NFe;
  onClose: () => void;
}

function DetalheModal({ nfe, onClose }: DetalheModalProps) {
  const cfg = STATUS_CONFIG[nfe.status];
  const StatusIcon = cfg.icon;

  const itens = nfe.itens ?? [];
  const totalProd = itens.reduce((s, i) => s + i.valor_total, 0);
  const totalIcms = itens.reduce((s, i) => s + i.valor_total * (i.aliquota_icms / 100), 0);
  const totalPis  = itens.reduce((s, i) => s + i.valor_total * (i.aliquota_pis / 100), 0);
  const totalCof  = itens.reduce((s, i) => s + i.valor_total * (i.aliquota_cofins / 100), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">NF-e {nfe.numero_nfe}/{nfe.serie}</h3>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" /> {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Destinatário</p>
              <p className="font-medium text-slate-700">{nfe.destinatario}</p>
              <p className="text-slate-500">{nfe.cnpj_dest}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Natureza da Operação</p>
              <p className="font-medium text-slate-700">{nfe.natureza_operacao}</p>
              <p className="text-slate-500">CFOP padrão: 5102</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Emissão</p>
              <p className="font-medium text-slate-700">{nfe.data_emissao}</p>
            </div>
            {nfe.data_autorizacao && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Autorização SEFAZ</p>
                <p className="font-medium text-slate-700">{nfe.data_autorizacao}</p>
              </div>
            )}
            {nfe.chave_acesso && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Chave de Acesso</p>
                <p className="font-mono text-xs text-slate-600 bg-slate-50 p-2 rounded break-all">{nfe.chave_acesso}</p>
              </div>
            )}
          </div>

          {/* Itens */}
          {itens.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Itens da Nota</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border border-slate-200 rounded">
                      <th className="text-left px-3 py-2 text-slate-500">Descrição</th>
                      <th className="text-left px-3 py-2 text-slate-500">NCM</th>
                      <th className="text-left px-3 py-2 text-slate-500">CFOP</th>
                      <th className="text-right px-3 py-2 text-slate-500">Qtd</th>
                      <th className="text-right px-3 py-2 text-slate-500">Unit.</th>
                      <th className="text-right px-3 py-2 text-slate-500">Total</th>
                      <th className="text-right px-3 py-2 text-slate-500">ICMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map(it => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{it.descricao}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{it.ncm}</td>
                        <td className="px-3 py-2 text-slate-500">{it.cfop}</td>
                        <td className="px-3 py-2 text-right">{it.quantidade}</td>
                        <td className="px-3 py-2 text-right">{fmt(it.valor_unitario)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmt(it.valor_total)}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{pct(it.aliquota_icms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totais fiscais */}
              <div className="mt-3 bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Total Produtos:</span><span className="font-semibold">{fmt(totalProd)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ICMS (base de cálculo):</span><span>{fmt(totalIcms)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PIS ({pct(itens[0]?.aliquota_pis ?? 0)}):</span><span>{fmt(totalPis)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">COFINS ({pct(itens[0]?.aliquota_cofins ?? 0)}):</span><span>{fmt(totalCof)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="font-semibold text-slate-700">Total NF-e:</span>
                  <span className="font-bold text-slate-800">{fmt(nfe.valor_total_nf)}</span>
                </div>
              </div>
            </div>
          )}

          {!itens.length && (
            <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Itens não disponíveis em modo visualização.</p>
              <p className="text-xs mt-1">Abra o XML completo para ver todos os itens.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          {nfe.status === 'RASCUNHO' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              <Send className="w-4 h-4" /> Emitir NF-e
            </button>
          )}
          {nfe.status === 'AUTORIZADA' && (
            <>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Download className="w-4 h-4" /> DANFE PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                <Download className="w-4 h-4" /> Baixar XML
              </button>
            </>
          )}
          <button onClick={onClose}
            className="ml-auto px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Invoicing() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<NFeStatus | 'TODOS'>('TODOS');
  const [filterTipo, setFilterTipo] = useState<NfeTipo | 'TODOS'>('TODOS');
  const [detalheNfe, setDetalheNfe] = useState<NFe | null>(null);
  const [items] = useState<NFe[]>(MOCK_NFE);

  const filtered = items.filter(nfe => {
    const matchSearch = nfe.numero_nfe.includes(search)
      || nfe.destinatario.toLowerCase().includes(search.toLowerCase())
      || (nfe.chave_acesso ?? '').includes(search);
    const matchStatus = filterStatus === 'TODOS' || nfe.status === filterStatus;
    const matchTipo = filterTipo === 'TODOS' || nfe.tipo === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const totalEmitidas  = items.filter(i => i.tipo === 'EMITIDA' && i.status === 'AUTORIZADA').reduce((s, i) => s + i.valor_total_nf, 0);
  const totalRecebidas = items.filter(i => i.tipo === 'RECEBIDA' && i.status === 'AUTORIZADA').reduce((s, i) => s + i.valor_total_nf, 0);
  const rascunhos      = items.filter(i => i.status === 'RASCUNHO').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faturamento — NF-e</h1>
          <p className="text-slate-500 text-sm mt-0.5">Emissão e gestão de notas fiscais eletrônicas</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Nova NF-e
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'NF-e Emitidas (AUTORIZADA)', value: fmt(totalEmitidas),  icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${items.filter(i => i.tipo === 'EMITIDA' && i.status === 'AUTORIZADA').length} notas` },
          { label: 'NF-e Recebidas',              value: fmt(totalRecebidas), icon: Receipt,     color: 'text-blue-600',    bg: 'bg-blue-50',    sub: `${items.filter(i => i.tipo === 'RECEBIDA').length} notas` },
          { label: 'Rascunhos / Pendentes',        value: `${rascunhos}`,     icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   sub: 'aguardando emissão' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Ambiente alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Ambiente de Homologação</p>
          <p className="text-xs text-amber-700 mt-0.5">
            A integração com a Focus NFe está em modo de homologação (testes). As NF-e emitidas não têm validade fiscal.
            Configure o certificado digital A1 e altere o ambiente para 'producao' antes de emitir notas reais.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, destinatário, chave..."
            className="bg-transparent text-sm w-full focus:outline-none text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as NfeTipo | 'TODOS')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 bg-white">
          <option value="TODOS">Emitidas + Recebidas</option>
          <option value="EMITIDA">Emitidas</option>
          <option value="RECEBIDA">Recebidas</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as NFeStatus | 'TODOS')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 bg-white">
          <option value="TODOS">Todos os status</option>
          {(Object.keys(STATUS_CONFIG) as NFeStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Número / Série</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Destinatário / CNPJ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Nat. Operação</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Emissão</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs uppercase">Valor Total</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase">Status</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(nfe => {
                const cfg = STATUS_CONFIG[nfe.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={nfe.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-slate-800">{nfe.numero_nfe}</p>
                      <p className="text-xs text-slate-400">Série {nfe.serie}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nfe.tipo === 'EMITIDA' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {nfe.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 truncate max-w-48">{nfe.destinatario}</p>
                      <p className="text-xs text-slate-400 font-mono">{nfe.cnpj_dest}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600 text-xs max-w-36 truncate">{nfe.natureza_operacao}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {nfe.data_emissao}
                      </p>
                      {nfe.data_autorizacao && (
                        <p className="text-xs text-emerald-600 mt-0.5">Auth: {nfe.data_autorizacao}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-slate-800">{fmt(nfe.valor_total_nf)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setDetalheNfe(nfe)}
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Ver
                        </button>
                        {nfe.status === 'RASCUNHO' && (
                          <button className="text-xs px-2.5 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Emitir
                          </button>
                        )}
                        {nfe.status === 'AUTORIZADA' && (
                          <button className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                            <Download className="w-3 h-3" /> DANFE
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma NF-e encontrada</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filtered.length} de {items.length} notas fiscais
        </div>
      </div>

      {detalheNfe && (
        <DetalheModal nfe={detalheNfe} onClose={() => setDetalheNfe(null)} />
      )}
    </div>
  );
}
