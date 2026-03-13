// ─────────────────────────────────────────────────────────────────────────────
// CRM Atividades — CRUD completo de atividades do pipeline de vendas
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, X, Phone, Users, Mail, MessageCircle, FileText,
  RotateCcw, Activity, List, LayoutGrid, Search, Loader2,
  AlertCircle, RefreshCw, Bot, User, ChevronDown, Edit2, Check,
  Calendar,
} from 'lucide-react';
import {
  getCrmAtividades, createCrmAtividade, updateCrmAtividade, deleteCrmAtividade,
  type CrmAtividade,
} from '../data/crmData';
import { supabase } from '../../../lib/supabase';

// ── Config ──────────────────────────────────────────────────────────────────

type AtivTipo = CrmAtividade['tipo'];
type AtivStatus = CrmAtividade['status'];

interface TipoCfg {
  label: string;
  Icon: typeof Phone;
  color: string;
  bg: string;
  border: string;
}

const TIPO_CFG: Record<AtivTipo, TipoCfg> = {
  ligacao:   { label: 'Ligação',   Icon: Phone,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  reuniao:   { label: 'Reunião',   Icon: Users,          color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  email:     { label: 'E-mail',    Icon: Mail,           color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200'  },
  whatsapp:  { label: 'WhatsApp',  Icon: MessageCircle,  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200'  },
  proposta:  { label: 'Proposta',  Icon: FileText,       color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  followup:  { label: 'Follow-up', Icon: RotateCcw,      color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  outro:     { label: 'Outro',     Icon: Activity,       color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200'  },
};

interface StatusCfg {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const STATUS_CFG: Record<AtivStatus, StatusCfg> = {
  pendente:    { label: 'Pendente',    bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  em_andamento:{ label: 'Em Andamento',bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  concluida:   { label: 'Concluída',   bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  cancelada:   { label: 'Cancelada',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

const STATUS_TABS: { id: AtivStatus | 'todas'; label: string }[] = [
  { id: 'todas',       label: 'Todas'        },
  { id: 'pendente',    label: 'Pendente'     },
  { id: 'em_andamento',label: 'Em Andamento' },
  { id: 'concluida',   label: 'Concluída'    },
  { id: 'cancelada',   label: 'Cancelada'    },
];

const TIPO_OPTIONS: { id: AtivTipo | 'todas'; label: string }[] = [
  { id: 'todas',    label: 'Todas'      },
  { id: 'ligacao',  label: 'Ligação'    },
  { id: 'reuniao',  label: 'Reunião'    },
  { id: 'email',    label: 'E-mail'     },
  { id: 'whatsapp', label: 'WhatsApp'   },
  { id: 'proposta', label: 'Proposta'   },
  { id: 'followup', label: 'Follow-up'  },
  { id: 'outro',    label: 'Outro'      },
];

const STATUS_LIST: AtivStatus[] = ['pendente', 'em_andamento', 'concluida', 'cancelada'];

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '—';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface ClienteOption { id: string; nome: string; }
interface NegociacaoOption { id: string; titulo: string; cliente_nome: string; }

interface FormState {
  tipo: AtivTipo;
  titulo: string;
  descricao: string;
  data_prazo: string;
  responsavel_id: string;
  status: AtivStatus;
  cliente_id: string;
  negociacao_id: string;
  criado_por: 'manual' | 'ia';
}

const EMPTY_FORM: FormState = {
  tipo: 'ligacao',
  titulo: '',
  descricao: '',
  data_prazo: '',
  responsavel_id: '',
  status: 'pendente',
  cliente_id: '',
  negociacao_id: '',
  criado_por: 'manual',
};

// ── Status dropdown inline ───────────────────────────────────────────────────

function StatusDropdown({ current, onChange }: {
  current: AtivStatus;
  onChange: (s: AtivStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const cfg = STATUS_CFG[current];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-opacity hover:opacity-80 ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {STATUS_LIST.map(s => {
            const c = STATUS_CFG[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${s === current ? 'font-semibold' : ''}`}
              >
                {s === current && <Check className="w-3 h-3 text-purple-600 shrink-0" />}
                {s !== current && <span className="w-3" />}
                <span className={`px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Activity Modal ───────────────────────────────────────────────────────────

interface ActivityModalProps {
  initial?: CrmAtividade | null;
  onClose: () => void;
  onSaved: () => void;
}

function ActivityModal({ initial, onClose, onSaved }: ActivityModalProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          tipo: initial.tipo,
          titulo: initial.titulo,
          descricao: initial.descricao ?? '',
          data_prazo: initial.data_prazo ?? '',
          responsavel_id: initial.responsavel_id ?? '',
          status: initial.status,
          cliente_id: initial.cliente_id ?? '',
          negociacao_id: initial.negociacao_id ?? '',
          criado_por: initial.criado_por,
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cliente search
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOptions, setClienteOptions] = useState<ClienteOption[]>([]);
  const [clienteLoading, setClienteLoading] = useState(false);
  const [clienteSelected, setClienteSelected] = useState<ClienteOption | null>(null);

  // Negociacao search
  const [negSearch, setNegSearch] = useState('');
  const [negOptions, setNegOptions] = useState<NegociacaoOption[]>([]);
  const [negLoading, setNegLoading] = useState(false);
  const [negSelected, setNegSelected] = useState<NegociacaoOption | null>(null);

  const f = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  // Search clientes
  useEffect(() => {
    if (!clienteSearch.trim()) { setClienteOptions([]); return; }
    const timer = setTimeout(async () => {
      setClienteLoading(true);
      const { data } = await supabase
        .from('erp_clientes')
        .select('id, nome')
        .ilike('nome', `%${clienteSearch}%`)
        .limit(6);
      setClienteOptions((data ?? []) as ClienteOption[]);
      setClienteLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  // Search negociações
  useEffect(() => {
    if (!negSearch.trim()) { setNegOptions([]); return; }
    const timer = setTimeout(async () => {
      setNegLoading(true);
      const { data } = await supabase
        .from('crm_negociacoes')
        .select('id, descricao, cliente_nome')
        .ilike('cliente_nome', `%${negSearch}%`)
        .eq('status', 'aberta')
        .limit(6);
      setNegOptions((data ?? []).map((r: { id: string; descricao: string | null; cliente_nome: string }) => ({
        id: r.id,
        titulo: r.descricao ?? r.cliente_nome,
        cliente_nome: r.cliente_nome,
      })));
      setNegLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [negSearch]);

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        data_prazo: form.data_prazo || null,
        responsavel_id: form.responsavel_id.trim() || null,
        status: form.status,
        cliente_id: form.cliente_id || null,
        negociacao_id: form.negociacao_id || null,
        criado_por: form.criado_por,
      };
      if (initial) {
        await updateCrmAtividade(initial.id, payload);
      } else {
        await createCrmAtividade(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  const TipoIcon = TIPO_CFG[form.tipo].Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <TipoIcon className="w-4 h-4 text-purple-700" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">
              {initial ? 'Editar Atividade' : 'Nova Atividade'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar px-6 py-5 space-y-4">

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
            <select
              value={form.tipo}
              onChange={f('tipo')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              {TIPO_OPTIONS.filter(o => o.id !== 'todas').map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Título <span className="text-red-400">*</span></label>
            <input
              value={form.titulo}
              onChange={f('titulo')}
              placeholder="Ex: Ligação de follow-up"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={f('descricao')}
              rows={2}
              placeholder="Detalhes da atividade..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
            />
          </div>

          {/* Prazo + Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data Prazo</label>
              <input
                type="date"
                value={form.data_prazo}
                onChange={f('data_prazo')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={f('status')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                {STATUS_LIST.map(s => (
                  <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Responsável</label>
            <input
              value={form.responsavel_id}
              onChange={f('responsavel_id')}
              placeholder="Nome ou ID do responsável"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Cliente (optional search) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Cliente <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            {clienteSelected || form.cliente_id ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <span className="text-sm text-purple-800 font-medium">
                  {clienteSelected?.nome ?? form.cliente_id}
                </span>
                <button
                  onClick={() => { setClienteSelected(null); setForm(p => ({ ...p, cliente_id: '' })); setClienteSearch(''); }}
                  className="text-purple-400 hover:text-purple-600 transition-colors ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={clienteSearch}
                  onChange={e => setClienteSearch(e.target.value)}
                  placeholder="Buscar cliente por nome..."
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {clienteLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
                )}
                {clienteOptions.length > 0 && (
                  <div className="absolute z-40 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {clienteOptions.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteSelected(c);
                          setForm(p => ({ ...p, cliente_id: c.id }));
                          setClienteSearch('');
                          setClienteOptions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 transition-colors"
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Negociação (optional search) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Negociação <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            {negSelected || form.negociacao_id ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <span className="text-sm text-purple-800 font-medium">
                  {negSelected ? `${negSelected.titulo} — ${negSelected.cliente_nome}` : form.negociacao_id}
                </span>
                <button
                  onClick={() => { setNegSelected(null); setForm(p => ({ ...p, negociacao_id: '' })); setNegSearch(''); }}
                  className="text-purple-400 hover:text-purple-600 transition-colors ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={negSearch}
                  onChange={e => setNegSearch(e.target.value)}
                  placeholder="Buscar negociação por cliente..."
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {negLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
                )}
                {negOptions.length > 0 && (
                  <div className="absolute z-40 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {negOptions.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNegSelected(n);
                          setForm(p => ({ ...p, negociacao_id: n.id }));
                          setNegSearch('');
                          setNegOptions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 transition-colors"
                      >
                        <span className="font-medium">{n.titulo}</span>
                        <span className="text-slate-400 ml-1.5">— {n.cliente_nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {initial ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ────────────────────────────────────────────────

function DeleteModal({ onConfirm, onCancel, loading }: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-2">Excluir atividade?</h3>
        <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Card (List view row) ────────────────────────────────────────────

interface CardProps {
  a: CrmAtividade;
  onEdit: (a: CrmAtividade) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: AtivStatus) => void;
}

function ActivityCard({ a, onEdit, onDelete, onStatusChange }: CardProps) {
  const tipo = TIPO_CFG[a.tipo];
  const TIcon = tipo.Icon;

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border bg-white hover:shadow-sm transition-shadow ${tipo.border}`}>
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tipo.bg} ${tipo.border} border`}>
        <TIcon className={`w-4 h-4 ${tipo.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{a.titulo}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className={`font-medium ${tipo.color}`}>{tipo.label}</span>
              {a.cliente_id && <span className="mx-1 text-slate-300">·</span>}
              {a.cliente_id && <span className="text-slate-500">Cliente vinculado</span>}
              {a.negociacao_id && <span className="mx-1 text-slate-300">·</span>}
              {a.negociacao_id && <span className="text-slate-500">Negociação vinculada</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <StatusDropdown current={a.status} onChange={s => onStatusChange(a.id, s)} />
          </div>
        </div>

        {a.descricao && (
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{a.descricao}</p>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {a.data_prazo && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>{fmtDate(a.data_prazo)}</span>
            </div>
          )}
          {a.responsavel_id && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{a.responsavel_id}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            {a.criado_por === 'ia' ? (
              <>
                <Bot className="w-3 h-3 text-purple-400" />
                <span className="text-purple-500">IA</span>
              </>
            ) : (
              <>
                <User className="w-3 h-3 text-slate-400" />
                <span>Manual</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(a)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
          title="Editar"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(a.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ status, items, onEdit, onDelete, onStatusChange }: {
  status: AtivStatus;
  items: CrmAtividade[];
  onEdit: (a: CrmAtividade) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: AtivStatus) => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <div className="flex flex-col min-w-[260px] w-full">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border-x border-t ${cfg.bg} ${cfg.border}`}>
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {items.length}
        </span>
      </div>
      <div className={`flex-1 border-x border-b rounded-b-xl p-2 space-y-2 min-h-[120px] ${cfg.border} bg-white`}>
        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Sem atividades</p>
        )}
        {items.map(a => (
          <ActivityCard key={a.id} a={a} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AtividadesCrm() {
  const [atividades, setAtividades] = useState<CrmAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<AtivStatus | 'todas'>('todas');
  const [tipoFilter, setTipoFilter] = useState<AtivTipo | 'todas'>('todas');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CrmAtividade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCrmAtividades();
      setAtividades(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar atividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, s: AtivStatus) => {
    setAtividades(prev => prev.map(a => a.id === id ? { ...a, status: s } : a));
    try {
      await updateCrmAtividade(id, { status: s });
    } catch {
      load(); // revert on error
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCrmAtividade(deleteId);
      setAtividades(prev => prev.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (a: CrmAtividade) => { setEditTarget(a); setModalOpen(true); };

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = atividades.filter(a => {
    if (statusFilter !== 'todas' && a.status !== statusFilter) return false;
    if (tipoFilter !== 'todas' && a.tipo !== tipoFilter) return false;
    return true;
  });

  // Kanban groups by status (uses all statuses regardless of filter)
  const kanbanItems = (s: AtivStatus) =>
    atividades.filter(a => a.status === s && (tipoFilter === 'todas' || a.tipo === tipoFilter));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Atividades</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie ligações, reuniões, e-mails e follow-ups do pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-slate-400">
                ({tab.id === 'todas'
                  ? atividades.length
                  : atividades.filter(a => a.status === tab.id).length
                })
              </span>
            </button>
          ))}
        </div>

        {/* Tipo filter */}
        <div className="relative">
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value as AtivTipo | 'todas')}
            className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
          >
            {TIPO_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
            title="Lista"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
            title="Kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando atividades...</span>
        </div>
      ) : viewMode === 'list' ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Activity className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">Nenhuma atividade encontrada para os filtros selecionados.</p>
            <button onClick={openCreate} className="text-xs text-purple-600 hover:underline">
              Criar nova atividade
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <ActivityCard
                key={a.id}
                a={a}
                onEdit={openEdit}
                onDelete={setDeleteId}
                onStatusChange={handleStatusChange}
              />
            ))}
            <p className="text-xs text-slate-400 pt-1">
              Exibindo <span className="font-medium text-slate-600">{filtered.length}</span> de{' '}
              <span className="font-medium text-slate-600">{atividades.length}</span> atividades
            </p>
          </div>
        )
      ) : (
        /* Kanban */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto custom-scrollbar pb-2">
          {STATUS_LIST.map(s => (
            <KanbanColumn
              key={s}
              status={s}
              items={kanbanItems(s)}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <ActivityModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={load}
        />
      )}
      {deleteId && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
