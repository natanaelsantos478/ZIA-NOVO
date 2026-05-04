// Fleet — Gestão de Frota (veículos e motoristas)
import { useEffect, useState } from 'react';
import {
  Truck, Plus, Search, X, Pencil, Trash2, AlertTriangle,
  CheckCircle2, Wrench, XCircle, RefreshCw,
} from 'lucide-react';
import {
  getVeiculos, createVeiculo, updateVeiculo, deleteVeiculo,
  type ScmVeiculo, type VeiculoPayload,
} from '../../../lib/scm';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<ScmVeiculo['status'], { label: string; color: string; icon: React.ReactNode }> = {
  disponivel:  { label: 'Disponível',  color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  em_rota:     { label: 'Em Rota',     color: 'bg-blue-100 text-blue-700',    icon: <Truck className="w-3 h-3" /> },
  manutencao:  { label: 'Manutenção',  color: 'bg-amber-100 text-amber-700',  icon: <Wrench className="w-3 h-3" /> },
  inativo:     { label: 'Inativo',     color: 'bg-slate-100 text-slate-500',  icon: <XCircle className="w-3 h-3" /> },
};

const TIPO_LABELS: Record<ScmVeiculo['tipo'], string> = {
  truck: 'Caminhão', van: 'Van', moto: 'Moto', carro: 'Carro', outro: 'Outro',
};

// ── Formulário ────────────────────────────────────────────────────────────────
interface FormState {
  placa: string; modelo: string; tipo: ScmVeiculo['tipo'];
  capacidade_kg: string; capacidade_m3: string;
  status: ScmVeiculo['status'];
  motorista_nome: string; motorista_cnh: string; ano_fabricacao: string;
}

const EMPTY_FORM: FormState = {
  placa: '', modelo: '', tipo: 'truck', capacidade_kg: '', capacidade_m3: '',
  status: 'disponivel', motorista_nome: '', motorista_cnh: '', ano_fabricacao: '',
};

interface ModalProps {
  initial?: ScmVeiculo | null;
  onSave: (v: VeiculoPayload) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function VeiculoModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          placa: initial.placa, modelo: initial.modelo, tipo: initial.tipo,
          capacidade_kg: String(initial.capacidade_kg),
          capacidade_m3: initial.capacidade_m3 != null ? String(initial.capacidade_m3) : '',
          status: initial.status,
          motorista_nome: initial.motorista_nome ?? '',
          motorista_cnh: initial.motorista_cnh ?? '',
          ano_fabricacao: initial.ano_fabricacao != null ? String(initial.ano_fabricacao) : '',
        }
      : EMPTY_FORM,
  );

  const [formError, setFormError] = useState('');

  function set(k: keyof FormState, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.placa.trim() || !form.modelo.trim() || !form.capacidade_kg) {
      setFormError('Placa, modelo e capacidade são obrigatórios.');
      return;
    }
    setFormError('');
    await onSave({
      placa: form.placa.trim().toUpperCase(),
      modelo: form.modelo.trim(),
      tipo: form.tipo,
      capacidade_kg: Number(form.capacidade_kg),
      capacidade_m3: form.capacidade_m3 ? Number(form.capacidade_m3) : null,
      status: form.status,
      motorista_nome: form.motorista_nome.trim() || null,
      motorista_cnh: form.motorista_cnh.trim() || null,
      ano_fabricacao: form.ano_fabricacao ? Number(form.ano_fabricacao) : null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Placa *" value={form.placa} onChange={(v) => set('placa', v)} placeholder="ABC-1234" />
            <Field label="Modelo *" value={form.modelo} onChange={(v) => set('modelo', v)} placeholder="Volkswagen Delivery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Tipo" value={form.tipo} onChange={(v) => set('tipo', v as ScmVeiculo['tipo'])}>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={(v) => set('status', v as ScmVeiculo['status'])}>
              {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capacidade (kg) *" value={form.capacidade_kg} onChange={(v) => set('capacidade_kg', v)} type="number" placeholder="1000" />
            <Field label="Capacidade (m³)" value={form.capacidade_m3} onChange={(v) => set('capacidade_m3', v)} type="number" placeholder="6.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Motorista" value={form.motorista_nome} onChange={(v) => set('motorista_nome', v)} placeholder="Nome do motorista" />
            <Field label="CNH" value={form.motorista_cnh} onChange={(v) => set('motorista_cnh', v)} placeholder="00000000000" />
          </div>
          <Field label="Ano de Fabricação" value={form.ano_fabricacao} onChange={(v) => set('ano_fabricacao', v)} type="number" placeholder="2022" />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
      >
        {children}
      </select>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Fleet() {
  const [items, setItems] = useState<ScmVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmVeiculo | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ScmVeiculo | null>(null);

  async function load(q = '') {
    setLoading(true);
    setError('');
    try { setItems(await getVeiculos(q)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  async function handleSave(payload: VeiculoPayload) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const updated = await updateVeiculo(selected.id, payload);
        setItems((p) => p.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await createVeiculo(payload);
        setItems((p) => [created, ...p]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function handleDelete(v: ScmVeiculo) {
    try {
      await deleteVeiculo(v.id);
      setItems((p) => p.filter((x) => x.id !== v.id));
      setConfirmDelete(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir'); }
  }

  const statusCounts = items.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Frota</h1>
          <p className="text-sm text-slate-500 mt-0.5">Veículos, motoristas e status operacional</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Novo Veículo
        </button>
      </div>

      {/* Status pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_MAP).map(([k, { label, color, icon }]) => (
            <span key={k} className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${color}`}>
              {icon} {label}: {statusCounts[k] ?? 0}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa, modelo ou motorista..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => load(search)} className="ml-auto underline">Tentar novamente</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Truck className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum veículo cadastrado</p>
          <p className="text-sm text-slate-400 mb-4">Adicione o primeiro veículo da frota</p>
          <button
            onClick={() => { setSelected(null); setModal('create'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Cadastrar Veículo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Modelo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cap. (kg)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((v) => {
                  const st = STATUS_MAP[v.status];
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.placa}</td>
                      <td className="px-4 py-3 text-slate-700">{v.modelo}{v.ano_fabricacao ? ` (${v.ano_fabricacao})` : ''}</td>
                      <td className="px-4 py-3 text-slate-500">{TIPO_LABELS[v.tipo]}</td>
                      <td className="px-4 py-3 text-slate-600">{v.capacidade_kg.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-600">{v.motorista_nome ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setSelected(v); setModal('edit'); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {items.length} veículo{items.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {modal && (
        <VeiculoModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Excluir veículo?</p>
                <p className="text-sm text-slate-500">{confirmDelete.placa} — {confirmDelete.modelo}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh hint */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-3 h-3" />
        <span>Dados em tempo real via Supabase</span>
      </div>
    </div>
  );
}
