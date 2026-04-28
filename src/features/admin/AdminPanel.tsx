// ─────────────────────────────────────────────────────────────────────────────
// Painel Admin — Zitasoftware
// Visão geral de todas as empresas cadastradas, contratos de software e acessos
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Shield, LogOut, Eye, EyeOff, ChevronRight, Plus,
  Building, Globe, Mail, MapPin, Users, Settings,
  CheckCircle, XCircle, Lock, RefreshCw, Pencil, X, Check,
  Database, FileText, Key, ExternalLink,
  Bell, Upload, Trash2, ToggleLeft, ToggleRight, Newspaper,
} from 'lucide-react';
import { useCompanies, type Company } from '../../context/CompaniesContext';
import { useProfiles } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

// ── Tipos de Company adicionados para contratos de software ──────────────────
interface SoftwareContract {
  id: string;
  holdingId: string;
  plano: string;
  modulos: string[];
  dataInicio: string;
  dataRenovacao: string;
  status: 'ativo' | 'suspenso' | 'cancelado';
  responsavel: string;
  email: string;
}

const MODULOS_DISPONIVEIS = ['CRM', 'RH', 'ERP', 'Qualidade', 'Docs', 'Ativos (EAM)', 'Logística (SCM)'];

// ── Tela de Login ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser]       = useState('');
  const [pass, setPass]       = useState('');
  const [show, setShow]       = useState(false);
  const [err,  setErr]        = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      if (!supabaseUrl) {
        setErr('Servidor não configurado. Contate o suporte.');
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/zia-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: user, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data?.is_admin && data?.token) {
        onLogin();
      } else {
        setErr('Credenciais inválidas. Verifique login e senha.');
        setPass('');
      }
    } catch {
      setErr('Erro de conexão. Verifique a rede e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">ZIA Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Painel de controle geral — Zitasoftware</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Login</label>
            <input
              autoFocus
              value={user}
              onChange={e => { setUser(e.target.value); setErr(''); }}
              placeholder="Código admin"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={e => { setPass(e.target.value); setErr(''); }}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 pr-12"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
              <XCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2 disabled:opacity-50">
            {loading ? 'Verificando...' : 'Acessar Painel'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-4">
          Acesso exclusivo para administradores Zitasoftware
        </p>
      </div>
    </div>
  );
}

// ── Modal de Edição de Empresa ─────────────────────────────────────────────────
function EditCompanyModal({
  company,
  onSave,
  onClose,
}: {
  company: Company;
  onSave: (id: string, changes: Partial<Company>) => void;
  onClose: () => void;
}) {
  const [nomeFantasia, setNomeFantasia] = useState(company.nomeFantasia);
  const [razaoSocial, setRazaoSocial]   = useState(company.razaoSocial);
  const [email, setEmail]               = useState(company.email ?? '');
  const [telefone, setTelefone]         = useState(company.telefone ?? '');
  const [saving, setSaving]             = useState(false);

  async function handle() {
    setSaving(true);
    try {
      onSave(company.id, { nomeFantasia, razaoSocial, email: email || undefined, telefone: telefone || undefined });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Editar Empresa</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Fantasia</label>
            <input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Razão Social</label>
            <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Telefone</label>
            <input value={telefone} onChange={e => setTelefone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={handle} disabled={!nomeFantasia.trim() || saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Nova Empresa (Holding) ───────────────────────────────────────────────
function NovaEmpresaModal({
  onSave,
  onClose,
}: {
  onSave: (data: { nomeFantasia: string; razaoSocial: string; cnpj: string; email: string; plano: string; modulos: string[] }) => void;
  onClose: () => void;
}) {
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial]   = useState('');
  const [cnpj, setCnpj]                 = useState('');
  const [email, setEmail]               = useState('');
  const [plano, setPlano]               = useState('Básico');
  const [modulos, setModulos]           = useState<string[]>(['CRM', 'ERP']);

  function toggleModulo(m: string) {
    setModulos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function handle() {
    if (!nomeFantasia.trim()) return;
    onSave({ nomeFantasia: nomeFantasia.trim(), razaoSocial: razaoSocial.trim(), cnpj: cnpj.trim(), email: email.trim(), plano, modulos });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nova Empresa (Holding)</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Fantasia *</label>
              <input autoFocus value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Razão Social</label>
              <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">CNPJ</label>
              <input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Plano de Software</label>
            <div className="grid grid-cols-3 gap-2">
              {['Básico', 'Profissional', 'Enterprise'].map(p => (
                <button key={p} onClick={() => setPlano(p)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${plano === p ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Módulos contratados</label>
            <div className="flex flex-wrap gap-2">
              {MODULOS_DISPONIVEIS.map(m => (
                <button key={m} onClick={() => toggleModulo(m)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${modulos.includes(m) ? 'border-violet-600 bg-violet-100 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {modulos.includes(m) && <span className="mr-1">✓</span>}{m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={handle} disabled={!nomeFantasia.trim()}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> Criar Empresa
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Novidades ─────────────────────────────────────────────────────────────────
interface NewsItemDB {
  id: string;
  titulo: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

function NovamentesTab() {
  const [items, setItems]       = useState<NewsItemDB[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titulo, setTitulo]     = useState('');
  const [descricao, setDescricao] = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  function showT(msg: string, ok: boolean) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('zia_news_items')
      .select('*')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit() {
    if (!titulo.trim() && !descricao.trim() && !file) return;
    setUploading(true);
    try {
      let arquivo_url: string | null = null;
      let arquivo_nome: string | null = null;
      let arquivo_tipo: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop() ?? 'bin';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('zia-news').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('zia-news').getPublicUrl(path);
        arquivo_url  = publicUrl;
        arquivo_nome = file.name;
        arquivo_tipo = file.type;
      }

      const { error } = await supabase.from('zia_news_items').insert({
        titulo:      titulo.trim()    || null,
        descricao:   descricao.trim() || null,
        arquivo_url,
        arquivo_nome,
        arquivo_tipo,
        ativo: true,
        ordem: items.length,
      });
      if (error) throw error;

      showT('Novidade publicada com sucesso!', true);
      setTitulo(''); setDescricao(''); setFile(null); setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Erro desconhecido';
      console.error('[Novidades] Erro ao publicar:', err);
      showT(`Erro: ${msg}`, false);
    } finally {
      setUploading(false);
    }
  }

  async function toggleAtivo(item: NewsItemDB) {
    await supabase.from('zia_news_items').update({ ativo: !item.ativo }).eq('id', item.id);
    load();
  }

  async function handleDelete(item: NewsItemDB) {
    await supabase.from('zia_news_items').delete().eq('id', item.id);
    if (item.arquivo_url) {
      const parts = item.arquivo_url.split('/zia-news/');
      if (parts[1]) await supabase.storage.from('zia-news').remove([parts[1]]);
    }
    load();
    showT('Novidade removida.', true);
  }

  const isImage = (tipo: string | null) => tipo?.startsWith('image/') ?? false;

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Novidades do Sistema</h2>
          <p className="text-xs text-slate-500 mt-0.5">Anexos e textos exibidos para todas as empresas após o login</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Novidade
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="bg-white border border-violet-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Adicionar Novidade</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Título (opcional)</label>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Nova funcionalidade disponível"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Descrição (opcional)</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={3}
                placeholder="Descreva a novidade..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Anexo (imagem, PDF, etc.)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl px-4 py-3 text-sm text-slate-500 hover:text-violet-600 transition-colors w-full"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : 'Selecionar arquivo...'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setTitulo(''); setDescricao(''); setFile(null); }}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || (!titulo.trim() && !descricao.trim() && !file)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {uploading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de novidades */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma novidade cadastrada.</p>
          <p className="text-xs mt-1">Adicione novidades para exibir às empresas no próximo login.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-opacity ${item.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start gap-4 p-4">
                {/* Preview */}
                <div className="shrink-0">
                  {isImage(item.arquivo_tipo) && item.arquivo_url ? (
                    <img src={item.arquivo_url} alt="" className="w-16 h-16 object-cover rounded-xl" />
                  ) : item.arquivo_url ? (
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Bell className="w-6 h-6 text-indigo-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {item.titulo && (
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.titulo}</p>
                  )}
                  {item.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.descricao}</p>
                  )}
                  {item.arquivo_nome && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {item.arquivo_nome}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.arquivo_url && (
                    <a
                      href={item.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Visualizar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => toggleAtivo(item)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title={item.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {item.ativo
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Painel Principal ──────────────────────────────────────────────────────────
function PainelPrincipal({ onLogout }: { onLogout: () => void }) {
  const { companies, holdings, matrices, branches, branchesOf, updateCompany, addCompany, setHoldingScope, scopeIds } = useCompanies();
  const { profiles, setActiveProfile } = useProfiles();
  const navigate = useNavigate();
  const [selectedHolding, setSelectedHolding] = useState<Company | null>(null);
  const [editingCompany,  setEditingCompany]  = useState<Company | null>(null);
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'empresas' | 'contratos' | 'acessos' | 'novidades'>('empresas');

  // Contratos mock — em produção viria de tabela zia_software_contracts
  const [contracts] = useState<SoftwareContract[]>([
    {
      id: 'c1',
      holdingId: holdings[0]?.id ?? '',
      plano: 'Enterprise',
      modulos: MODULOS_DISPONIVEIS,
      dataInicio: '2024-01-01',
      dataRenovacao: '2025-01-01',
      status: 'ativo',
      responsavel: 'ZIA Omnisystem',
      email: 'contato@ziaomni.com',
    },
  ]);

  function showT(msg: string, ok: boolean) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveEdit(id: string, changes: Partial<Company>) {
    try {
      await updateCompany(id, changes);
      showT('Empresa atualizada com sucesso!', true);
    } catch { showT('Erro ao atualizar empresa.', false); }
  }

  async function handleNovaEmpresa(data: { nomeFantasia: string; razaoSocial: string; cnpj: string; email: string; plano: string; modulos: string[] }) {
    try {
      await addCompany({
        type: 'holding',
        nomeFantasia: data.nomeFantasia,
        razaoSocial: data.razaoSocial || data.nomeFantasia,
        cnpj: data.cnpj,
        email: data.email || undefined,
        status: 'ativa',
      });
      showT('Nova empresa criada com sucesso!', true);
    } catch { showT('Erro ao criar empresa.', false); }
  }

  function handleAccessCompany(holding: Company) {
    let profile = profiles.find(p => p.level === 1 && p.entityId === holding.id && p.active)
      ?? profiles.find(p => p.active);
    if (!profile) { showT('Nenhum perfil ativo encontrado para esta empresa.', false); return; }
    // Se o perfil encontrado pertence a outra empresa, sobrescreve o contexto de entidade
    // para que o header exiba o nome correto da holding acessada.
    if (profile.entityId !== holding.id) {
      profile = { ...profile, entityId: holding.id, entityName: holding.nomeFantasia };
    }
    const ids = scopeIds('holding', holding.id);
    setHoldingScope(holding.id);
    setActiveProfile(profile, ids.length > 0 ? ids : [holding.id]);
    navigate('/app');
  }

  const totalEmpresas  = companies.length;
  const totalHoldings  = holdings.length;
  const totalMatrizes  = matrices.length;
  const totalFiliais   = branches.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black">ZIA Admin</h1>
            <p className="text-slate-400 text-xs">Painel de controle — Zitasoftware</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de Empresas', value: totalEmpresas, icon: Building2, color: 'violet' },
            { label: 'Holdings',          value: totalHoldings,  icon: Globe,     color: 'purple' },
            { label: 'Matrizes',          value: totalMatrizes,  icon: Building,  color: 'blue'   },
            { label: 'Filiais',           value: totalFiliais,   icon: Building,  color: 'emerald'},
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${color}-100`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <p className="text-2xl font-black text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-6 bg-slate-200 p-1 rounded-xl w-fit">
          {(['empresas', 'contratos', 'acessos', 'novidades'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'empresas' ? 'Empresas' : tab === 'contratos' ? 'Contratos' : tab === 'acessos' ? 'Acessos' : 'Novidades'}
            </button>
          ))}
        </div>

        {/* Tab Empresas */}
        {activeTab === 'empresas' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Empresas Cadastradas</h2>
              <button
                onClick={() => setShowNovaEmpresa(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Nova Empresa
              </button>
            </div>

            <div className="space-y-3">
              {holdings.map(holding => {
                const mxs = matrices.filter(m => m.parentId === holding.id);
                const allBranches = mxs.flatMap(m => branchesOf(m.id));
                const isSelected = selectedHolding?.id === holding.id;

                return (
                  <div key={holding.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Holding row */}
                    <div
                      className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-violet-50/50 transition-colors ${isSelected ? 'bg-violet-50' : ''}`}
                      onClick={() => setSelectedHolding(isSelected ? null : holding)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{holding.nomeFantasia}</span>
                          <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">Holding</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${holding.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {holding.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {holding.cnpj && `CNPJ: ${holding.cnpj} ·`} {mxs.length} matriz(es) · {allBranches.length} filial(is)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleAccessCompany(holding); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
                          title="Acessar sistema desta empresa"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Acessar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingCompany(holding); }}
                          className="p-2 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Matrizes e filiais expandidas */}
                    {isSelected && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                        {mxs.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">Nenhuma matriz cadastrada para esta holding.</p>
                        )}
                        {mxs.map(mx => {
                          const fls = branchesOf(mx.id);
                          return (
                            <div key={mx.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                              {/* Matriz */}
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                  <Building className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 text-sm">{mx.nomeFantasia}</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Matriz</span>
                                  </div>
                                  <p className="text-xs text-slate-400">{mx.code} · {fls.length} filial(is)</p>
                                </div>
                                <button
                                  onClick={() => setEditingCompany(mx)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Filiais */}
                              {fls.length > 0 && (
                                <div className="border-t border-slate-100 divide-y divide-slate-50">
                                  {fls.map(fl => (
                                    <div key={fl.id} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50/30">
                                      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                                        <Building className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-slate-700">{fl.nomeFantasia}</span>
                                        <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Filial</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        {fl.cidade && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{fl.cidade}</span>}
                                        <button
                                          onClick={() => setEditingCompany(fl)}
                                          className="p-1 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {holdings.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma empresa cadastrada.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Contratos */}
        {activeTab === 'contratos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Contratos de Software</h2>
              <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Novo Contrato
              </button>
            </div>
            <div className="space-y-3">
              {contracts.map(c => {
                const holding = holdings.find(h => h.id === c.holdingId) ?? holdings[0];
                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{holding?.nomeFantasia ?? 'Holding'}</p>
                          <p className="text-xs text-slate-500">Plano: <strong>{c.plano}</strong> · Renova em {new Date(c.dataRenovacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${c.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Módulos Contratados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.modulos.map(m => (
                          <span key={m} className="text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-medium">{m}</span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" />Base isolada</span>
                      <span className="flex items-center gap-1"><Key className="w-3 h-3" />Acesso independente</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Acessos */}
        {activeTab === 'acessos' && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Configuração de Acessos por Empresa</h2>
            <div className="space-y-3">
              {holdings.map(h => (
                <div key={h.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{h.nomeFantasia}</p>
                      <p className="text-xs text-slate-500">Configurações de acesso e módulos desta holding</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {MODULOS_DISPONIVEIS.map(m => (
                      <div key={m} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-xs font-medium text-slate-700">{m}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />Perfis: gerenciados no módulo Settings</span>
                    <span className="flex items-center gap-1"><Settings className="w-3 h-3" />Configurações avançadas no painel da empresa</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Novidades */}
        {activeTab === 'novidades' && <NovamentesTab />}
      </div>

      {/* Modais */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onSave={handleSaveEdit}
          onClose={() => setEditingCompany(null)}
        />
      )}
      {showNovaEmpresa && (
        <NovaEmpresaModal
          onSave={handleNovaEmpresa}
          onClose={() => setShowNovaEmpresa(false)}
        />
      )}
    </div>
  );
}

// ── Componente raiz ────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(true);

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return <PainelPrincipal onLogout={() => setLoggedIn(false)} />;
}
