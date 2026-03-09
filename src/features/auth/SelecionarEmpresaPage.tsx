// ─────────────────────────────────────────────────────────────────────────────
// SelecionarEmpresaPage — Escolha de entidade após login
// Rota: /selecionar-empresa
//
// Hierarquia:
//   Nível 1: escolhe Holding → Matriz → Filial (3 passos)
//   Nível 2: escolhe Matriz → Filial (2 passos, ou direto se só uma)
//   Nível 3: confirma Filial (1 passo)
//   Nível 4: confirma e vai direto pro módulo
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Crown, Building2, Store, ChevronRight, ChevronLeft,
  LayoutGrid, LogOut, CheckCircle, Loader2,
} from 'lucide-react';
import { useAuth, type ZiaUsuario, type EmpresaAtiva, type HoldingItem, type MatrizItem, type FilialItem } from '../../context/AuthContext';

type Passo = 'holding' | 'matriz' | 'filial';

export default function SelecionarEmpresaPage() {
  const { iniciarSessao, logout, holdingsDisponiveis, matrizesDisponiveis, filiaisDisponiveis } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const usuario: ZiaUsuario | undefined = (location.state as { usuario?: ZiaUsuario })?.usuario;

  const [passo, setPasso]               = useState<Passo>('holding');
  const [holdingSel, setHoldingSel]     = useState<HoldingItem | null>(null);
  const [matrizSel, setMatrizSel]       = useState<MatrizItem | null>(null);
  const [salvando, setSalvando]         = useState(false);

  // Sem usuário no state → volta para login
  useEffect(() => {
    if (!usuario) navigate('/login', { replace: true });
  }, [usuario, navigate]);

  // Determina passo inicial baseado no nível
  useEffect(() => {
    if (!usuario) return;
    if (usuario.nivel === 1) setPasso('holding');
    else if (usuario.nivel === 2) setPasso('matriz');
    else setPasso('filial'); // 3 e 4 vão direto
  }, [usuario]);

  // Nível 3 e 4: auto-seleciona a filial/entidade e entra
  useEffect(() => {
    if (!usuario) return;
    if (usuario.nivel >= 3 && filiaisDisponiveis.length > 0) {
      const filial = filiaisDisponiveis[0];
      confirmarFilial(filial);
    } else if (usuario.nivel >= 3 && usuario.nivel === 3) {
      // Fallback: usa a entidade do próprio usuário
      const empresa: EmpresaAtiva = {
        tipo: 'filial',
        id: usuario.entidade_id,
        nome: usuario.entidade_nome,
      };
      finalizarLogin(empresa);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filiaisDisponiveis]);

  // Matrizes filtradas pela holding selecionada (nível 1)
  const matrizesFiltered = holdingSel
    ? matrizesDisponiveis.filter(m => m.holding_id === holdingSel.id)
    : matrizesDisponiveis;

  // Filiais filtradas pela matriz selecionada
  const filiaisFiltered = matrizSel
    ? filiaisDisponiveis.filter(f => f.matriz_id === matrizSel.id)
    : filiaisDisponiveis;

  function selecionarHolding(h: HoldingItem) {
    setHoldingSel(h);
    // Se nível 1, avança para matriz
    setPasso('matriz');
  }

  function selecionarMatriz(m: MatrizItem) {
    setMatrizSel(m);
    const filiais = filiaisDisponiveis.filter(f => f.matriz_id === m.id);
    if (filiais.length === 0) {
      // Entra na própria matriz como empresa ativa
      const empresa: EmpresaAtiva = {
        tipo: 'matriz',
        id: m.id,
        nome: m.nome,
        cnpj: m.cnpj,
        holding_id: m.holding_id,
      };
      finalizarLogin(empresa);
    } else if (filiais.length === 1) {
      // Só uma filial → entra direto
      confirmarFilial(filiais[0]);
    } else {
      setPasso('filial');
    }
  }

  function confirmarFilial(f: FilialItem) {
    const empresa: EmpresaAtiva = {
      tipo: 'filial',
      id: f.id,
      nome: f.nome_fantasia,
      cnpj: f.cnpj,
      matriz_id: f.matriz_id,
      holding_id: matrizSel?.holding_id ?? holdingSel?.id,
    };
    finalizarLogin(empresa);
  }

  function finalizarLogin(empresa: EmpresaAtiva) {
    if (!usuario) return;
    setSalvando(true);
    iniciarSessao(usuario, empresa);
    navigate('/app', { replace: true });
  }

  function voltar() {
    if (passo === 'filial') setPasso(usuario?.nivel === 2 ? 'matriz' : 'matriz');
    else if (passo === 'matriz') setPasso('holding');
    else { logout(); navigate('/login'); }
  }

  if (!usuario) return null;
  if (salvando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-slate-400 text-sm">Carregando seu ambiente...</p>
        </div>
      </div>
    );
  }

  const NIVEL_LABELS: Record<number, string> = { 1: 'Gestor Holding', 2: 'Gestor Matriz', 3: 'Gestor Filial', 4: 'Funcionário' };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{usuario.nome}</p>
              <p className="text-slate-400 text-xs">{NIVEL_LABELS[usuario.nivel]} · #{usuario.codigo}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Título do passo */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {passo !== 'holding' && (
                <button onClick={voltar} className="text-slate-500 hover:text-white transition-colors mr-1">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {passo === 'holding' && <Crown className="w-5 h-5 text-amber-400" />}
              {passo === 'matriz'  && <Building2 className="w-5 h-5 text-blue-400" />}
              {passo === 'filial'  && <Store className="w-5 h-5 text-emerald-400" />}
              <div>
                <h2 className="text-sm font-bold text-white">
                  {passo === 'holding' && 'Selecione o Grupo / Holding'}
                  {passo === 'matriz'  && 'Selecione a Matriz'}
                  {passo === 'filial'  && 'Selecione a Filial'}
                </h2>
                {holdingSel && passo !== 'holding' && (
                  <p className="text-xs text-slate-500">{holdingSel.nome}</p>
                )}
              </div>
            </div>

            {/* Breadcrumb */}
            {usuario.nivel === 1 && (
              <div className="flex items-center gap-1 mt-3 text-xs">
                <span className={passo === 'holding' ? 'text-amber-400 font-semibold' : 'text-slate-500'}>Holding</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className={passo === 'matriz' ? 'text-blue-400 font-semibold' : 'text-slate-500'}>Matriz</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className={passo === 'filial' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>Filial</span>
              </div>
            )}
          </div>

          {/* Lista */}
          <div className="p-3 max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            {passo === 'holding' && holdingsDisponiveis.map(h => (
              <button
                key={h.id}
                onClick={() => selecionarHolding(h)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{h.nome}</p>
                    <p className="text-xs text-slate-500">{h.cnpj || 'CNPJ não cadastrado'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}

            {passo === 'matriz' && matrizesFiltered.map(m => (
              <button
                key={m.id}
                onClick={() => selecionarMatriz(m)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.nome}</p>
                    <p className="text-xs text-slate-500">{m.cnpj || 'CNPJ não cadastrado'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}

            {passo === 'filial' && filiaisFiltered.map(f => (
              <button
                key={f.id}
                onClick={() => confirmarFilial(f)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Store className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.nome_fantasia}</p>
                    <p className="text-xs text-slate-500">{f.cnpj || 'CNPJ não cadastrado'}</p>
                  </div>
                </div>
                <CheckCircle className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}

            {/* Vazio */}
            {passo === 'holding' && holdingsDisponiveis.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-6">Nenhuma holding disponível.</p>
            )}
            {passo === 'matriz' && matrizesFiltered.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-6">Nenhuma matriz disponível.</p>
            )}
            {passo === 'filial' && filiaisFiltered.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-6">Nenhuma filial disponível.</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          ZIA Omnisystem © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
