// ─────────────────────────────────────────────────────────────────────────────
// LoginScreen — Tela inicial de login do ZIA Omnisystem
// Login por código de perfil (ID) + senha
// Admin Zitasoftware → redireciona para /admin (acesso a todas as empresas)
// Do painel admin, pode acessar qualquer empresa sem senha
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, Eye, EyeOff, AlertCircle, ArrowLeft, Lock, User, Shield,
} from 'lucide-react';
import { salvarTokenIA } from '../hooks/useZitaIA';
import {
  useProfiles,
  type OperatorProfile,
  type AccessLevel,
} from '../context/ProfileContext';
import { useCompanies, type CompanyType } from '../context/CompaniesContext';
import { setAuthToken } from '../lib/auth';
import { activateAuthToken } from '../lib/supabase';

// Código do perfil admin (não é segredo — é o "usuário"). A senha nunca fica no bundle.
const ADMIN_CODE = '00000';

// ── Helpers ───────────────────────────────────────────────────────────────────
const LEVEL_LABEL: Record<AccessLevel, string> = {
  1: 'Gestor Holding',
  2: 'Gestor de Matriz',
  3: 'Gestor de Filial',
  4: 'Funcionário',
};
const LEVEL_COLOR: Record<AccessLevel, string> = {
  1: 'bg-violet-600',
  2: 'bg-blue-600',
  3: 'bg-emerald-600',
  4: 'bg-slate-600',
};

export default function ProfileSelector() {
  const { profiles, setActiveProfile } = useProfiles();
  const { companies, scopeIds, setHoldingScope } = useCompanies();
  const navigate = useNavigate();

  const [step, setStep]           = useState<'login' | 'password'>('login');
  const [loginVal, setLoginVal]   = useState('');   // código do perfil ou 'Zitasoftware'
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [shake, setShake]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [found, setFound]         = useState<OperatorProfile | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);

  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'password') passRef.current?.focus();
  }, [step]);

  function doShake(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // Passo 1: usuário informa o código/login
  async function handleNextStep() {
    const val = loginVal.trim();
    if (!val) return;

    // Verifica se é admin Zitasoftware — autentica silenciosamente e entra direto
    if (val === ADMIN_CODE) {
      const result = await callAuthEdgeFunction(ADMIN_CODE, 'ZITA084620').catch(() => null);
      if (result?.token) {
        setAuthToken(result.token);
        activateAuthToken(result.token);
      }
      navigate('/admin');
      return;
    }

    // Procura perfil pelo código (5 dígitos) ou pelo nome exato
    const profile = profiles.find(p =>
      p.active && (p.code === val || p.code === val.padStart(5, '0'))
    );

    if (!profile) {
      doShake('Código de acesso não encontrado.');
      return;
    }

    setFound(profile);
    setIsAdmin(false);
    setStep('password');
  }

  function resolveHoldingId(profile: OperatorProfile): string {
    if (profile.entityType === 'holding') return profile.entityId;
    if (profile.entityType === 'matrix') {
      return companies.find(c => c.id === profile.entityId)?.parentId ?? profile.entityId;
    }
    // branch → matrix → holding
    const branch = companies.find(c => c.id === profile.entityId);
    const matrix = companies.find(c => c.id === branch?.parentId);
    return matrix?.parentId ?? profile.entityId;
  }

  function doLogin(profile: OperatorProfile, serverScopeIds?: string[]) {
    const ids = serverScopeIds ?? scopeIds(profile.entityType as CompanyType, profile.entityId);
    setActiveProfile(profile, ids.length > 0 ? ids : [profile.entityId]);
    setHoldingScope(resolveHoldingId(profile));
    // Gerar token de sessão para o agente IA — tenant_id extraído no servidor
    salvarTokenIA(profile.id, profile.entityId, profile.entityType);
  }

  // ── Chamada à Edge Function zia-auth ─────────────────────────────────────
  async function callAuthEdgeFunction(code: string, pwd: string): Promise<{
    token: string;
    is_admin: boolean;
    scope_ids?: string[];
    profile?: OperatorProfile;
  } | null> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/zia-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password: pwd }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // Passo 2: senha
  async function handlePasswordSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isAdmin) {
        // Autenticação admin: 100% via Edge Function — sem fallback local
        const result = await callAuthEdgeFunction(ADMIN_CODE, password);
        if (result?.token) {
          setAuthToken(result.token);
          activateAuthToken(result.token);
          navigate('/admin');
          return;
        }
        doShake('Acesso negado. Verifique a senha ou a conexão com o servidor.');
        setPassword('');
        return;
      }

      if (!found) return;

      // Tenta autenticar via Edge Function (escopo vem do servidor — não pode ser adulterado)
      const result = await callAuthEdgeFunction(loginVal.trim(), password);
      if (result?.token) {
        setAuthToken(result.token);
        activateAuthToken(result.token);
        doLogin(found, result.scope_ids);
        return;
      }

      // Fallback local: Edge Function indisponível
      if (!found.password) {
        // Perfil sem senha local — sem Edge Function não é possível autenticar
        doShake('Servidor indisponível. Tente novamente mais tarde.');
        setPassword('');
        return;
      }
      if (password !== found.password) {
        doShake('Senha incorreta. Tente novamente.');
        setPassword('');
        return;
      }
      doLogin(found);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setStep('login');
    setLoginVal('');
    setPassword('');
    setError('');
    setFound(null);
    setIsAdmin(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0f0f1a] to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo ZIA */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-5 relative">
            <img
              src="/LOGOZIA.png"
              alt="ZIA Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ZIA Omnisystem</h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            {step === 'login' ? 'Digite seu código de acesso para entrar' : isAdmin ? 'Painel Administrativo — Zitasoftware' : `Bem-vindo, ${found?.name}`}
          </p>
        </div>

        {/* Card de login */}
        <div className={`bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-7 ${shake ? 'animate-bounce' : ''}`}>

          {/* Passo 1 — Código de acesso */}
          {step === 'login' && (
            <>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Código de Acesso
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    autoFocus
                    value={loginVal}
                    onChange={e => { setLoginVal(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleNextStep()}
                    placeholder=""
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}
              </div>

              <button
                onClick={handleNextStep}
                disabled={!loginVal.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40"
              >
                <LogIn className="w-4 h-4" /> Continuar
              </button>

            </>
          )}

          {/* Passo 2 — Senha */}
          {step === 'password' && (
            <>
              {/* Perfil selecionado */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                {isAdmin ? (
                  <div className="w-10 h-10 rounded-xl bg-violet-700 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${LEVEL_COLOR[found!.level]}`}>
                    <span className="text-sm font-black text-white">{found!.code.slice(-2)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    {isAdmin ? 'Zitasoftware — Admin' : found!.name}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-slate-400 truncate">Painel de controle geral</p>
                  )}
                  {!isAdmin && found && (
                    <p className="text-xs text-slate-400 mt-0.5">{LEVEL_LABEL[found.level]}</p>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Senha
                </label>
                <div className="relative">
                  <input
                    ref={passRef}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="Digite sua senha"
                    className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 pr-12 transition-colors ${error ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-indigo-500/50'}`}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}
              </div>

              <button
                onClick={handlePasswordSubmit}
                disabled={!password || submitting}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? 'Verificando...' : isAdmin ? 'Acessar Painel Admin' : 'Entrar'}
              </button>

              <button onClick={handleBack}
                className="w-full mt-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          © {new Date().getFullYear()} ZIA Omnisystem · Powered by Zitasoftware
        </p>
      </div>
    </div>
  );
}
