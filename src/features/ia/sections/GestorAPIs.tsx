// ─────────────────────────────────────────────────────────────────────────────
// GestorAPIs — Gestão de Códigos de API (protegido por senha gestor)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Lock, Plus, Trash2, Eye, EyeOff, Save, ExternalLink, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Codigo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

const SESSION_KEY = 'ia_gestor_token';
const EXPIRES_KEY = 'ia_gestor_expires';

function isSessionValid(): boolean {
  const token   = localStorage.getItem(SESSION_KEY);
  const expires = localStorage.getItem(EXPIRES_KEY);
  if (!token || !expires) return false;
  return new Date(expires) > new Date();
}

// ── Tela de login ─────────────────────────────────────────────────────────────

interface LoginProps { onLogin: () => void }

function LoginGestor({ onLogin }: LoginProps) {
  const [senha, setSenha]     = useState('');
  const [show, setShow]       = useState(false);
  const [erro, setErro]       = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!senha) return;
    setLoading(true);
    setErro('');
    try {
      const { data, error } = await supabase.functions.invoke('gestor-auth', {
        body: { password: senha },
      });
      if (error || !data?.ok) {
        setErro(data?.error ?? 'Erro de conexão');
        setLoading(false);
        return;
      }
      localStorage.setItem(SESSION_KEY, data.token);
      localStorage.setItem(EXPIRES_KEY, data.expires_at);
      onLogin();
    } catch {
      setErro('Falha ao conectar ao servidor');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="bg-slate-800 rounded-2xl p-8 w-[360px] shadow-2xl border border-slate-700 space-y-5">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-full bg-violet-700/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-violet-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Área do Gestor</h2>
          <p className="text-xs text-slate-400 text-center">
            Digite a senha gestor para gerenciar os códigos de API da plataforma.
          </p>
        </div>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && entrar()}
            placeholder="Senha gestor"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 text-sm pr-10"
          />
          <button onClick={() => setShow(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {erro && <p className="text-red-400 text-xs text-center">{erro}</p>}
        <button onClick={entrar} disabled={loading || !senha}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white text-sm font-semibold">
          {loading ? 'Validando...' : 'Entrar'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          A senha é definida no Supabase Dashboard → Secrets → <code className="text-slate-400">GESTOR_PASSWORD</code>
        </p>
      </div>
    </div>
  );
}

// ── Painel de gestão (autenticado) ────────────────────────────────────────────

function PainelGestor({ onSair }: { onSair: () => void }) {
  const [codigos, setCodigos]     = useState<Codigo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);

  // Novo código
  const [novoCodigo, setNovoCodigo]   = useState('');
  const [novoNome, setNovoNome]       = useState('');
  const [novoDesc, setNovoDesc]       = useState('');
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from('ia_codigos_disponiveis').select('*').order('codigo');
    setCodigos(data ?? []);
    setLoading(false);
  }

  async function adicionar() {
    if (!novoCodigo.trim() || !novoNome.trim()) return;
    setAdicionando(true);
    await supabase.from('ia_codigos_disponiveis').insert({
      codigo: novoCodigo.trim().toUpperCase(),
      nome: novoNome.trim(),
      descricao: novoDesc.trim() || null,
      ativo: true,
    });
    setNovoCodigo('');
    setNovoNome('');
    setNovoDesc('');
    await carregar();
    setAdicionando(false);
  }

  async function toggleAtivo(c: Codigo) {
    setSaving(c.id);
    await supabase.from('ia_codigos_disponiveis').update({ ativo: !c.ativo }).eq('id', c.id);
    setSaving(null);
    await carregar();
  }

  async function remover(id: string) {
    setSaving(id);
    await supabase.from('ia_codigos_disponiveis').delete().eq('id', id);
    setSaving(null);
    await carregar();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Códigos de API</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada código mapeia para um Supabase Secret. Os valores reais nunca são expostos aqui.
          </p>
        </div>
        <button onClick={onSair}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <Lock className="w-3.5 h-3.5" /> Sair
        </button>
      </div>

      {/* Aviso sobre secrets */}
      <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 flex gap-3">
        <ExternalLink className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200/80">
          <p className="font-medium mb-1">Como adicionar um código de API</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-amber-200/60">
            <li>No <strong>Supabase Dashboard</strong>, vá em <em>Settings → Edge Functions → Secrets</em></li>
            <li>Adicione: <code className="bg-amber-900/40 px-1 rounded">AI_KEY_API0001</code> = sua chave real</li>
            <li>Volte aqui e registre o código <code className="bg-amber-900/40 px-1 rounded">API0001</code> com o nome do provedor</li>
            <li>Agentes que usarem este código saberão qual chave puxar em tempo de execução</li>
          </ol>
        </div>
      </div>

      {/* Adicionar novo */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Registrar novo código</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Código *</label>
            <input value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)}
              placeholder="API0001"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono uppercase" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome do provedor *</label>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
              placeholder="Gemini Pro"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">Descrição (opcional)</label>
          <input value={novoDesc} onChange={e => setNovoDesc(e.target.value)}
            placeholder="Ex: Google Gemini 2.5 Pro — usado por agentes de análise"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
        </div>
        <button onClick={adicionar} disabled={adicionando || !novoCodigo.trim() || !novoNome.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold">
          <Plus className="w-4 h-4" />
          {adicionando ? 'Salvando...' : 'Registrar código'}
        </button>
      </div>

      {/* Lista */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Códigos registrados</h3>
        {loading ? (
          <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
        ) : codigos.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">Nenhum código registrado ainda.</div>
        ) : (
          <div className="space-y-2">
            {codigos.map(c => (
              <div key={c.id} className="flex items-center gap-4 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <code className="text-violet-300 font-mono text-sm font-bold w-24 flex-shrink-0">{c.codigo}</code>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium">{c.nome}</div>
                  {c.descricao && <div className="text-xs text-slate-400 truncate">{c.descricao}</div>}
                </div>
                <button onClick={() => toggleAtivo(c)} disabled={saving === c.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    c.ativo
                      ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                      : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                  }`}>
                  {c.ativo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => remover(c.id)} disabled={saving === c.id}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GestorAPIs() {
  const [autenticado, setAutenticado] = useState(isSessionValid());

  function onLogin() { setAutenticado(true); }
  function onSair() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    setAutenticado(false);
  }

  if (!autenticado) return <LoginGestor onLogin={onLogin} />;
  return <PainelGestor onSair={onSair} />;
}
