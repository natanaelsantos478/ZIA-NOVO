// ─────────────────────────────────────────────────────────────────────────────
// Usuários e Permissões — Configurações
//
// Permite criar e gerenciar perfis de acesso com 4 níveis:
//   Nível 1 — Gestor de Holding
//   Nível 2 — Gestor de Matriz
//   Nível 3 — Gestor de Filial
//   Nível 4 — Funcionário (módulo específico)
//
// Código de acesso: gerado automaticamente (00001, 00002, …)
// Faturamento futuro: cobrado por quantidade de usuários ativos
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Shield, Building2, Settings,
  UserCheck, UserX, Edit2, Eye, EyeOff, X, AlertCircle,
  Loader2, Crown, Store, User, Hash, Lock,
  CheckCircle,
} from 'lucide-react';
import {
  getUsuarios, createUsuario, updateUsuario, toggleUsuarioAtivo,
  type ZiaUsuario, type NivelAcesso, type EntidadeTipo,
  NIVEL_LABELS, NIVEL_DESC, MODULO_LABELS,
} from '../../../lib/zia-users';
import { supabase } from '../../../lib/supabase';

// ── Dados de entidades ────────────────────────────────────────────────────────
interface Entidade { id: string; nome: string; tipo: EntidadeTipo }

const NIVEL_ICONS: Record<NivelAcesso, React.ReactNode> = {
  1: <Crown className="w-4 h-4 text-amber-500" />,
  2: <Building2 className="w-4 h-4 text-blue-500" />,
  3: <Store className="w-4 h-4 text-emerald-500" />,
  4: <User className="w-4 h-4 text-slate-500" />,
};

const NIVEL_BADGE: Record<NivelAcesso, string> = {
  1: 'bg-amber-100 text-amber-700 border-amber-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  4: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function UsuariosPermissoes() {
  const [usuarios, setUsuarios] = useState<ZiaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<number>(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<ZiaUsuario | null>(null);
  const [entidades, setEntidades] = useState<Entidade[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [users, { data: holdings }, { data: matrizes }] = await Promise.all([
        getUsuarios(),
        supabase.from('zia_holdings').select('id, nome'),
        supabase.from('zia_matrizes').select('id, nome'),
      ]);
      setUsuarios(users);

      const lista: Entidade[] = [];
      (holdings ?? []).forEach(h => lista.push({ id: h.id, nome: h.nome, tipo: 'holding' }));
      (matrizes ?? []).forEach(m => lista.push({ id: m.id, nome: m.nome, tipo: 'matriz' }));
      setEntidades(lista);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAtivo(user: ZiaUsuario) {
    await toggleUsuarioAtivo(user.id, !user.ativo);
    setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, ativo: !u.ativo } : u));
  }

  const filtrados = usuarios.filter(u => {
    if (filtroNivel && u.nivel !== filtroNivel) return false;
    if (busca) {
      const b = busca.toLowerCase();
      return u.nome.toLowerCase().includes(b) || u.codigo.includes(b);
    }
    return true;
  });

  const ativos = usuarios.filter(u => u.ativo).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-500" />
              Usuários e Permissões
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {ativos} usuários ativos · {usuarios.length} total
            </p>
          </div>
          <button
            onClick={() => { setUsuarioEditando(null); setModalAberto(true); }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo usuário
          </button>
        </div>

        {/* Níveis — resumo */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {([1, 2, 3, 4] as NivelAcesso[]).map(nivel => {
            const count = usuarios.filter(u => u.nivel === nivel && u.ativo).length;
            return (
              <button
                key={nivel}
                onClick={() => setFiltroNivel(filtroNivel === nivel ? 0 : nivel)}
                className={`p-3 rounded-xl border text-left transition-all ${filtroNivel === nivel ? NIVEL_BADGE[nivel] + ' border-current' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {NIVEL_ICONS[nivel]}
                  <span className="text-xs font-bold text-slate-600">N{nivel}</span>
                </div>
                <div className="text-xl font-black text-slate-800">{count}</div>
                <div className="text-xs text-slate-500 truncate">{NIVEL_LABELS[nivel]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de busca */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(user => (
              <div
                key={user.id}
                className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${user.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${NIVEL_BADGE[user.nivel as NivelAcesso]}`}>
                  {NIVEL_ICONS[user.nivel as NivelAcesso]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{user.nome}</span>
                    <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      #{user.codigo}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${NIVEL_BADGE[user.nivel as NivelAcesso]}`}>
                      {NIVEL_LABELS[user.nivel as NivelAcesso]}
                    </span>
                    {!user.ativo && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {user.entidade_nome}
                    </span>
                    {user.modulo_acesso && (
                      <span className="flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        {MODULO_LABELS[user.modulo_acesso] ?? user.modulo_acesso}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setUsuarioEditando(user); setModalAberto(true); }}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(user)}
                    className={`p-2 rounded-lg transition-colors ${user.ativo ? 'hover:bg-red-50 text-slate-400 hover:text-red-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'}`}
                    title={user.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {user.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      {modalAberto && (
        <ModalUsuario
          usuario={usuarioEditando}
          entidades={entidades}
          onSalvar={async (payload) => {
            if (usuarioEditando) {
              const updated = await updateUsuario(usuarioEditando.id, payload);
              setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u));
            } else {
              const created = await createUsuario(payload as Parameters<typeof createUsuario>[0]);
              setUsuarios(prev => [...prev, created]);
            }
            setModalAberto(false);
          }}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de criação/edição de usuário
// ─────────────────────────────────────────────────────────────────────────────
interface ModalUsuarioProps {
  usuario: ZiaUsuario | null;
  entidades: Entidade[];
  onSalvar: (payload: Record<string, unknown>) => Promise<void>;
  onFechar: () => void;
}

function ModalUsuario({ usuario, entidades, onSalvar, onFechar }: ModalUsuarioProps) {
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [senha, setSenha] = useState('');
  const [senhaVis, setSenhaVis] = useState(false);
  const [nivel, setNivel] = useState<NivelAcesso>(usuario?.nivel ?? 3);
  const [entidadeTipo, setEntidadeTipo] = useState<EntidadeTipo>(usuario?.entidade_tipo ?? 'filial');
  const [entidadeId, setEntidadeId] = useState(usuario?.entidade_id ?? '');
  const [entidadeNome, setEntidadeNome] = useState(usuario?.entidade_nome ?? '');
  const [moduloAcesso, setModuloAcesso] = useState(usuario?.modulo_acesso ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const editando = !!usuario;

  // Filtra entidades conforme o nível/tipo
  const entidadesFiltradas = entidades.filter(e => {
    if (nivel === 1) return e.tipo === 'holding';
    if (nivel === 2) return e.tipo === 'matriz';
    return true; // nível 3 e 4: filial ou outras
  });

  // Quando nível muda, ajusta entidade_tipo
  useEffect(() => {
    if (nivel === 1) setEntidadeTipo('holding');
    else if (nivel === 2) setEntidadeTipo('matriz');
    else setEntidadeTipo('filial');
  }, [nivel]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setErro('Informe o nome'); return; }
    if (!editando && !senha.trim()) { setErro('Informe uma senha'); return; }
    if (nivel === 4 && !moduloAcesso) { setErro('Selecione o módulo de acesso'); return; }

    setSalvando(true);
    setErro('');
    try {
      // Para entidade manual (filial sem ID no banco), usa ID placeholder
      const eid = entidadeId || '00000000-0000-0000-0000-000000000001';
      const enome = entidadeNome || (entidadesFiltradas.find(e => e.id === eid)?.nome ?? 'Principal');

      const payload: Record<string, unknown> = {
        nome,
        nivel,
        entidade_tipo: entidadeTipo,
        entidade_id: eid,
        entidade_nome: enome,
        modulo_acesso: nivel === 4 ? moduloAcesso : null,
      };
      if (senha) payload.senha = senha;

      await onSalvar(payload);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            {editando ? 'Editar usuário' : 'Novo usuário'}
          </h3>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="João da Silva"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              {editando ? 'Nova senha (deixe em branco para manter)' : 'Senha de acesso'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={senhaVis ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder={editando ? '••••••' : 'Defina uma senha segura'}
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button type="button" onClick={() => setSenhaVis(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {senhaVis ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nível de acesso */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Nível de acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2, 3, 4] as NivelAcesso[]).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNivel(n)}
                  className={`p-3 rounded-xl border text-left transition-all ${nivel === n ? NIVEL_BADGE[n] + ' border-current' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {NIVEL_ICONS[n]}
                    <span className="text-xs font-bold">N{n} — {NIVEL_LABELS[n]}</span>
                    {nivel === n && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-tight">{NIVEL_DESC[n]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Entidade */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              {nivel === 1 ? 'Holding' : nivel === 2 ? 'Matriz' : 'Empresa/Filial'}
            </label>
            {entidadesFiltradas.length > 0 ? (
              <select
                value={entidadeId}
                onChange={e => {
                  setEntidadeId(e.target.value);
                  const ent = entidadesFiltradas.find(x => x.id === e.target.value);
                  if (ent) setEntidadeNome(ent.nome);
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Selecione…</option>
                {entidadesFiltradas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={entidadeNome}
                onChange={e => setEntidadeNome(e.target.value)}
                placeholder="Nome da empresa/filial"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            )}
          </div>

          {/* Módulo (apenas nível 4) */}
          {nivel === 4 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Módulo de acesso
              </label>
              <select
                value={moduloAcesso}
                onChange={e => setModuloAcesso(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Selecione o módulo…</option>
                {Object.entries(MODULO_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                O funcionário acessará diretamente este módulo ao fazer login.
              </p>
            </div>
          )}

          {/* Info de cobrança */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Usuários ativos são contabilizados para cobrança futura.
              Desative usuários inativos para não gerar custo desnecessário.
            </span>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editando ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>
        </form>

        {/* Código que será gerado */}
        {!editando && (
          <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center gap-2 text-xs text-slate-500">
            <Hash className="w-3.5 h-3.5" />
            O código de acesso será gerado automaticamente (ex: 00002, 00003…)
          </div>
        )}
      </div>
    </div>
  );
}
