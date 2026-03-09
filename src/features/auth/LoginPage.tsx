// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — Tela de acesso ao ZIA Omnisystem
// Rota: /login
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth, type ZiaUsuario } from '../../context/AuthContext';

export default function LoginPage() {
  const { autenticar, loadEntidades, session } = useAuth();
  const navigate = useNavigate();

  const [codigo, setCodigo]           = useState('');
  const [senha, setSenha]             = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState('');

  const codigoRef = useRef<HTMLInputElement>(null);

  // Já logado → redireciona
  useEffect(() => {
    if (session) navigate('/app', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    codigoRef.current?.focus();
  }, []);

  function handleCodigoChange(v: string) {
    setCodigo(v.replace(/\D/g, '').slice(0, 5));
    setErro('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo || !senha) { setErro('Preencha código e senha.'); return; }

    setLoading(true);
    setErro('');

    const result = await autenticar(codigo, senha);

    if (result.error || !result.usuario) {
      setErro(result.error ?? 'Erro ao autenticar.');
      setLoading(false);
      return;
    }

    const usuario: ZiaUsuario = result.usuario;
    await loadEntidades(usuario);

    setLoading(false);
    // Sempre passa pela tela de seleção (mesmo nível 3/4 é confirmação)
    navigate('/selecionar-empresa', { state: { usuario } });
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ZIA Omnisystem</h1>
          <p className="text-sm text-slate-400 mt-1">Gestão empresarial inteligente</p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <h2 className="text-base font-bold text-white">Entrar na sua conta</h2>

          {erro && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 text-red-300 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erro}
            </div>
          )}

          {/* Código */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Código de acesso
            </label>
            <input
              ref={codigoRef}
              type="text"
              inputMode="numeric"
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              placeholder="00000"
              maxLength={5}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-lg font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600 placeholder:tracking-widest transition"
              autoComplete="off"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600 transition"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          ZIA Omnisystem © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
