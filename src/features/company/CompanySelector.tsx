// ─────────────────────────────────────────────────────────────────────────────
// CompanySelector — Portal de seleção de Holding → Matriz → Filial
// Sem senha. Apenas seleção do contexto de empresa.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Building2, ChevronRight, Loader2, CheckCircle2, LayoutGrid } from 'lucide-react';
import { getHoldings, getMatrizes, getFiliais } from '../../lib/orgStructure';
import type { ZiaHolding, ZiaMatriz, ZiaFilial, OrgContexto } from '../../lib/orgStructure';
import { useAppContext } from '../../context/AppContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Card({
  title, subtitle, selected, onClick, badge,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${selected ? 'text-indigo-800' : 'text-slate-800'}`}>{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          {selected
            ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
          }
        </div>
      </div>
      {badge && (
        <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
          {badge}
        </span>
      )}
    </button>
  );
}

function Column({
  title, subtitle, loading, empty, children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          <Building2 className="w-8 h-8 mb-2" />
          <p className="text-xs">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 380 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CompanySelector() {
  const { setOrgContexto } = useAppContext();

  const [holdings, setHoldings] = useState<ZiaHolding[]>([]);
  const [matrizes, setMatrizes] = useState<ZiaMatriz[]>([]);
  const [filiais, setFiliais] = useState<ZiaFilial[]>([]);

  const [loadingH, setLoadingH] = useState(true);
  const [loadingM, setLoadingM] = useState(false);
  const [loadingF, setLoadingF] = useState(false);

  const [selHolding, setSelHolding] = useState<ZiaHolding | null>(null);
  const [selMatriz, setSelMatriz] = useState<ZiaMatriz | null>(null);
  const [selFilial, setSelFilial] = useState<ZiaFilial | null>(null);

  // Carrega holdings inicialmente
  useEffect(() => {
    getHoldings()
      .then(setHoldings)
      .catch(() => setHoldings([]))
      .finally(() => setLoadingH(false));
  }, []);

  // Carrega matrizes ao mudar a holding selecionada (ou sem seleção — carrega todas)
  useEffect(() => {
    setLoadingM(true);
    setSelMatriz(null);
    setSelFilial(null);
    setFiliais([]);
    getMatrizes(selHolding?.id ?? null)
      .then(setMatrizes)
      .catch(() => setMatrizes([]))
      .finally(() => setLoadingM(false));
  }, [selHolding]);

  // Carrega filiais ao mudar a matriz selecionada
  useEffect(() => {
    setLoadingF(true);
    setSelFilial(null);
    getFiliais(selMatriz?.id ?? null, selHolding?.id ?? null)
      .then(setFiliais)
      .catch(() => setFiliais([]))
      .finally(() => setLoadingF(false));
  }, [selMatriz, selHolding]);

  function handleEntrar() {
    if (!selFilial) return;
    const ctx: OrgContexto = {
      holding: selHolding ? { id: selHolding.id, nome: selHolding.nome } : null,
      matriz:  selMatriz  ? { id: selMatriz.id,  nome: selMatriz.nome  } : null,
      filial:  { id: selFilial.id, nome_fantasia: selFilial.nome_fantasia, cnpj: selFilial.cnpj },
    };
    setOrgContexto(ctx);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-500/20 border border-indigo-500/30 p-3 rounded-2xl backdrop-blur-sm">
          <LayoutGrid className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">ZIA mind</h1>
          <p className="text-xs text-indigo-300 uppercase tracking-widest font-semibold">Omnisystem ERP</p>
        </div>
      </div>

      {/* Card central */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header do card */}
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-xl font-bold text-white">Selecionar Empresa</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Escolha o contexto que deseja acessar. Você pode selecionar apenas a filial ou navegar pela hierarquia completa.
          </p>
        </div>

        {/* Breadcrumb do contexto */}
        {(selHolding || selMatriz || selFilial) && (
          <div className="flex items-center gap-1.5 px-8 py-3 bg-indigo-50 border-b border-indigo-100 text-sm">
            {selHolding && (
              <>
                <span className="text-indigo-600 font-medium">{selHolding.nome}</span>
                {(selMatriz || selFilial) && <ChevronRight className="w-4 h-4 text-indigo-300" />}
              </>
            )}
            {selMatriz && (
              <>
                <span className="text-indigo-600 font-medium">{selMatriz.nome}</span>
                {selFilial && <ChevronRight className="w-4 h-4 text-indigo-300" />}
              </>
            )}
            {selFilial && <span className="text-indigo-800 font-bold">{selFilial.nome_fantasia}</span>}
          </div>
        )}

        {/* Colunas de seleção */}
        <div className="p-8">
          <div className="flex gap-6">

            {/* Coluna 1: Holding */}
            <Column
              title="Holding"
              subtitle={holdings.length > 0 ? 'Grupo empresarial' : 'Nenhuma holding cadastrada'}
              loading={loadingH}
              empty={!loadingH && holdings.length === 0}
            >
              {holdings.map(h => (
                <Card
                  key={h.id}
                  title={h.nome}
                  subtitle={h.cnpj ?? undefined}
                  selected={selHolding?.id === h.id}
                  onClick={() => setSelHolding(prev => prev?.id === h.id ? null : h)}
                  badge="Holding"
                />
              ))}
            </Column>

            {/* Separador */}
            <div className="flex items-center flex-shrink-0">
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Coluna 2: Matriz */}
            <Column
              title="Empresa Mãe (Matriz)"
              subtitle="Selecione ou deixe em branco para ver todas as filiais"
              loading={loadingM}
              empty={!loadingM && matrizes.length === 0}
            >
              {matrizes.map(m => (
                <Card
                  key={m.id}
                  title={m.nome}
                  subtitle={m.cnpj ?? undefined}
                  selected={selMatriz?.id === m.id}
                  onClick={() => setSelMatriz(prev => prev?.id === m.id ? null : m)}
                  badge="Matriz"
                />
              ))}
            </Column>

            {/* Separador */}
            <div className="flex items-center flex-shrink-0">
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Coluna 3: Filial */}
            <Column
              title="Filial *"
              subtitle="Seleção obrigatória para entrar"
              loading={loadingF}
              empty={!loadingF && filiais.length === 0}
            >
              {filiais.map(f => (
                <Card
                  key={f.id}
                  title={f.nome_fantasia}
                  subtitle={f.cnpj}
                  selected={selFilial?.id === f.id}
                  onClick={() => setSelFilial(prev => prev?.id === f.id ? null : f)}
                  badge="Filial"
                />
              ))}
            </Column>
          </div>

          {/* Regras de acesso */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 mb-2">Regras de acesso e visibilidade de dados</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                <p><strong>Filial selecionada:</strong> acesso apenas aos dados daquela filial específica.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1 flex-shrink-0" />
                <p><strong>Apenas Matriz:</strong> acesso consolidado a todas as filiais vinculadas àquela matriz.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                <p><strong>Apenas Holding:</strong> visão de todas as matrizes e filiais do grupo.</p>
              </div>
            </div>
          </div>

          {/* Botão de entrada */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleEntrar}
              disabled={!selFilial}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors shadow-md"
            >
              {selFilial
                ? <>Entrar como <strong>{selFilial.nome_fantasia}</strong></>
                : 'Selecione uma filial para continuar'
              }
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        ZIA Omnisystem · Ambiente de Testes · Sem autenticação
      </p>
    </div>
  );
}
