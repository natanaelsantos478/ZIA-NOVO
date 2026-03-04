import { useState, useEffect } from 'react';
import {
  X, User, DollarSign, Heart, Activity, Users, Clock,
  Sparkles, Save, Plus, MapPin, CreditCard, Briefcase,
} from 'lucide-react';
import type {
  Employee as HrEmployee, Schedule, SalaryHistory,
  PositionHistory, EmployeeNote, OccupationalHealth,
} from '../../../lib/hr';
import {
  updateEmployee, getSchedules,
  getSalaryHistory, addSalaryHistory,
  getPositionHistory, addPositionHistory,
  getEmployeeNotes, createEmployeeNote,
  getOccupationalHealth,
} from '../../../lib/hr';

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT_CLS  = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 bg-white';
const LABEL_CLS  = 'block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1';
const STATES     = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}
function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

function SecHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <Icon className="w-4 h-4 text-pink-500" />
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    </div>
  );
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-4">
      <button
        onClick={onClick}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-60'
        }`}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}
      </button>
    </div>
  );
}

// ── Tab: Dados Pessoais ────────────────────────────────────────────────────────

function DadosPessoaisTab({ emp, onSaved }: { emp: HrEmployee; onSaved?: () => void }) {
  const pd = (emp.personal_data ?? {}) as Record<string, string>;
  const ad = (emp.address_data  ?? {}) as Record<string, string>;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [f, setF] = useState({
    full_name:     emp.full_name     ?? '',
    cpf:           emp.cpf           ?? '',
    email:         emp.email         ?? '',
    position_title: emp.position_title ?? '',
    work_mode:     emp.work_mode     ?? 'Presencial',
    contract_type: emp.contract_type ?? 'CLT',
    admission_date: emp.admission_date ?? '',
    status:        emp.status        ?? 'Ativo',
    shift_id:      emp.shift_id      ?? '',
    rg:            pd.rg             ?? '',
    birthDate:     pd.birthDate      ?? '',
    gender:        pd.gender         ?? '',
    maritalStatus: pd.maritalStatus  ?? '',
    nationality:   pd.nationality    ?? 'Brasileira',
    pis:           pd.pis            ?? '',
    phone:         pd.phone          ?? '',
    mobile:        pd.mobile         ?? '',
    personalEmail: pd.personalEmail  ?? '',
    cep:           ad.cep            ?? '',
    street:        ad.street         ?? '',
    num:           ad.num            ?? '',
    complement:    ad.complement     ?? '',
    neighborhood:  ad.neighborhood   ?? '',
    city:          ad.city           ?? '',
    state:         ad.state          ?? '',
  });

  const set = (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => { getSchedules().then(setSchedules).catch(console.error); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployee(emp.id, {
        full_name:      f.full_name,
        cpf:            f.cpf,
        email:          f.email,
        position_title: f.position_title || null,
        work_mode:      f.work_mode      || null,
        contract_type:  f.contract_type  || null,
        admission_date: f.admission_date || null,
        status:         f.status,
        shift_id:       f.shift_id       || null,
        personal_data: {
          ...pd,
          rg: f.rg, birthDate: f.birthDate, gender: f.gender,
          maritalStatus: f.maritalStatus, nationality: f.nationality,
          pis: f.pis, phone: f.phone, mobile: f.mobile, personalEmail: f.personalEmail,
        },
        address_data: {
          cep: f.cep, street: f.street, num: f.num,
          complement: f.complement, neighborhood: f.neighborhood,
          city: f.city, state: f.state,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <div>
        <SecHeader icon={User} title="Identificação" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Nome Completo *">
              <input className={INPUT_CLS} value={f.full_name} onChange={set('full_name')} />
            </Field>
          </div>
          <Field label="CPF *"><input className={INPUT_CLS} value={f.cpf} onChange={set('cpf')} placeholder="000.000.000-00" /></Field>
          <Field label="RG"><input className={INPUT_CLS} value={f.rg} onChange={set('rg')} placeholder="00.000.000-0" /></Field>
          <Field label="Data de Nascimento"><input type="date" className={INPUT_CLS} value={f.birthDate} onChange={set('birthDate')} /></Field>
          <Field label="Sexo">
            <select className={INPUT_CLS} value={f.gender} onChange={set('gender')}>
              <option value="">Selecione...</option>
              {['Masculino','Feminino','Não Binário','Prefiro não informar'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Estado Civil">
            <select className={INPUT_CLS} value={f.maritalStatus} onChange={set('maritalStatus')}>
              <option value="">Selecione...</option>
              {['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Nacionalidade"><input className={INPUT_CLS} value={f.nationality} onChange={set('nationality')} /></Field>
          <Field label="PIS/PASEP"><input className={INPUT_CLS} value={f.pis} onChange={set('pis')} placeholder="000.00000.00-0" /></Field>
        </div>
      </div>

      {/* Contato */}
      <div>
        <SecHeader icon={MapPin} title="Contato" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="E-mail Corporativo"><input type="email" className={INPUT_CLS} value={f.email} onChange={set('email')} /></Field>
          <Field label="E-mail Pessoal"><input type="email" className={INPUT_CLS} value={f.personalEmail} onChange={set('personalEmail')} /></Field>
          <div />
          <Field label="Telefone"><input className={INPUT_CLS} value={f.phone} onChange={set('phone')} placeholder="(11) 3000-0000" /></Field>
          <Field label="Celular"><input className={INPUT_CLS} value={f.mobile} onChange={set('mobile')} placeholder="(11) 9 0000-0000" /></Field>
        </div>
      </div>

      {/* Dados Profissionais */}
      <div>
        <SecHeader icon={Briefcase} title="Dados Profissionais" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Cargo"><input className={INPUT_CLS} value={f.position_title} onChange={set('position_title')} placeholder="Ex: Analista de RH Pleno" /></Field>
          </div>
          <Field label="Status">
            <select className={INPUT_CLS} value={f.status} onChange={set('status')}>
              {['Ativo','Férias','Afastado','Experiência','Inativo'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Data de Admissão"><input type="date" className={INPUT_CLS} value={f.admission_date} onChange={set('admission_date')} /></Field>
          <Field label="Tipo de Contrato">
            <select className={INPUT_CLS} value={f.contract_type} onChange={set('contract_type')}>
              <option value="">Selecione...</option>
              {['CLT','PJ','Estágio','Aprendiz','Temporário'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Modalidade">
            <select className={INPUT_CLS} value={f.work_mode} onChange={set('work_mode')}>
              <option value="">Selecione...</option>
              {['Presencial','Híbrido','Remoto'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <div className="col-span-3">
            <Field label="Escala de Trabalho">
              <select className={INPUT_CLS} value={f.shift_id} onChange={set('shift_id')}>
                <option value="">— Sem escala definida —</option>
                {schedules.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.type} · {s.entry_time?.slice(0,5)} – {s.exit_time?.slice(0,5)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div>
        <SecHeader icon={MapPin} title="Endereço" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="CEP"><input className={INPUT_CLS} value={f.cep} onChange={set('cep')} placeholder="00000-000" /></Field>
          <div /><div />
          <div className="col-span-2">
            <Field label="Logradouro"><input className={INPUT_CLS} value={f.street} onChange={set('street')} placeholder="Rua, Avenida..." /></Field>
          </div>
          <Field label="Número"><input className={INPUT_CLS} value={f.num} onChange={set('num')} /></Field>
          <Field label="Complemento"><input className={INPUT_CLS} value={f.complement} onChange={set('complement')} /></Field>
          <Field label="Bairro"><input className={INPUT_CLS} value={f.neighborhood} onChange={set('neighborhood')} /></Field>
          <Field label="Cidade"><input className={INPUT_CLS} value={f.city} onChange={set('city')} /></Field>
          <Field label="Estado">
            <select className={INPUT_CLS} value={f.state} onChange={set('state')}>
              <option value="">Selecione...</option>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
}

// ── Tab: Financeiro ────────────────────────────────────────────────────────────

function FinanceiroTab({ emp }: { emp: HrEmployee }) {
  const bd = (emp.bank_data ?? {}) as Record<string, string>;
  const [history, setHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ salary: '', effective_on: '', reason: '', notes: '' });

  useEffect(() => {
    getSalaryHistory(emp.id).then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, [emp.id]);

  const handleAdd = async () => {
    if (!form.salary || !form.effective_on) return;
    setSaving(true);
    try {
      const added = await addSalaryHistory({
        employee_id:  emp.id,
        salary:       parseFloat(form.salary),
        effective_on: form.effective_on,
        reason:       form.reason  || null,
        notes:        form.notes   || null,
      });
      setHistory(h => [added, ...h]);
      setShow(false);
      setForm({ salary: '', effective_on: '', reason: '', notes: '' });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const bankRows: [string, string][] = [
    ['Banco',         bd.bank        ?? '—'],
    ['Tipo de Conta', bd.accountType ?? '—'],
    ['Agência',       bd.agency      ?? '—'],
    ['Conta',         bd.account     ?? '—'],
    ['Tipo PIX',      bd.pixType     ?? '—'],
    ['Chave PIX',     bd.pixKey      ?? '—'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <SecHeader icon={CreditCard} title="Dados Bancários" />
        <div className="grid grid-cols-3 gap-3">
          {bankRows.map(([l, v]) => (
            <div key={l} className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{l}</p>
              <p className="text-sm font-medium text-slate-700">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-bold text-slate-700">Histórico de Salários</h3>
          </div>
          <button onClick={() => setShow(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-600 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {show && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Salário (R$) *">
                <input type="number" className={INPUT_CLS} value={form.salary}
                  onChange={e => setForm(s => ({ ...s, salary: e.target.value }))} placeholder="0,00" />
              </Field>
              <Field label="Vigência *">
                <input type="date" className={INPUT_CLS} value={form.effective_on}
                  onChange={e => setForm(s => ({ ...s, effective_on: e.target.value }))} />
              </Field>
              <Field label="Motivo">
                <select className={INPUT_CLS} value={form.reason}
                  onChange={e => setForm(s => ({ ...s, reason: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {['Admissão','Promoção','Reajuste Anual','Acordo Coletivo','Meritocracia','Transferência','Outro'].map(o =>
                    <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Observações">
                <input className={INPUT_CLS} value={form.notes}
                  onChange={e => setForm(s => ({ ...s, notes: e.target.value }))} placeholder="Opcional" />
              </Field>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShow(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400 text-center py-6">Carregando...</p>}
        {!loading && history.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhum registro salarial. Adicione o primeiro acima.</p>}
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={h.id} className={`flex items-center gap-4 p-3 rounded-xl border ${i === 0 ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100'}`}>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{fmtMoney(h.salary)}</p>
                <p className="text-xs text-slate-500">{fmtDate(h.effective_on)} · {h.reason ?? '—'}</p>
                {h.notes && <p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}
              </div>
              {i === 0 && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">ATUAL</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Saúde ─────────────────────────────────────────────────────────────────

function SaudeTab({ emp }: { emp: HrEmployee }) {
  const pd = (emp.personal_data ?? {}) as Record<string, string>;
  const [exams,  setExams]  = useState<OccupationalHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [f, setF] = useState({
    bloodType:    pd.bloodType    ?? '',
    allergies:    pd.allergies    ?? '',
    disabilities: pd.disabilities ?? '',
  });

  useEffect(() => {
    getOccupationalHealth()
      .then(data => setExams(data.filter(e => e.employee_id === emp.id || e.employee_name === emp.full_name)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [emp.id, emp.full_name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployee(emp.id, {
        personal_data: { ...(emp.personal_data as object), ...f },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <SecHeader icon={Heart} title="Dados de Saúde" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tipo Sanguíneo">
            <select className={INPUT_CLS} value={f.bloodType}
              onChange={e => setF(x => ({ ...x, bloodType: e.target.value }))}>
              <option value="">Selecione...</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Alergias">
              <input className={INPUT_CLS} value={f.allergies}
                onChange={e => setF(x => ({ ...x, allergies: e.target.value }))}
                placeholder="Ex: Penicilina, Látex..." />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Deficiência / CID">
              <input className={INPUT_CLS} value={f.disabilities}
                onChange={e => setF(x => ({ ...x, disabilities: e.target.value }))}
                placeholder="Ex: CID F41.0 – Transtorno de pânico" />
            </Field>
          </div>
        </div>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>

      <div>
        <SecHeader icon={Activity} title="Exames Ocupacionais (ASO)" />
        {loading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
        {!loading && exams.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhum exame registrado.</p>}
        <div className="space-y-2">
          {exams.map(ex => (
            <div key={ex.id} className="flex items-center gap-4 bg-slate-50 rounded-xl border border-slate-100 p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{ex.exam_type ?? '—'}</p>
                <p className="text-xs text-slate-400">
                  {ex.exam_date ? fmtDate(ex.exam_date) : '—'} · {ex.physician ?? '—'}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                  ex.result === 'Apto' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                }`}>{ex.result}</span>
                {ex.valid_until && <p className="text-[10px] text-slate-400 mt-1">Válido até {fmtDate(ex.valid_until)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Atividades ────────────────────────────────────────────────────────────

function AtividadesTab() {
  return (
    <div>
      <SecHeader icon={Activity} title="Atividades do Colaborador" />
      <p className="text-sm text-slate-400 text-center py-10">
        As atividades vinculadas a este colaborador serão exibidas aqui em breve.
      </p>
    </div>
  );
}

// ── Tab: Grupos ────────────────────────────────────────────────────────────────

function GruposTab() {
  return (
    <div>
      <SecHeader icon={Users} title="Grupos e Equipes" />
      <p className="text-sm text-slate-400 text-center py-10">
        Os grupos do colaborador serão exibidos aqui em breve.
      </p>
    </div>
  );
}

// ── Tab: Histórico (sub-tabs) ──────────────────────────────────────────────────

type HistSub = 'anotacoes' | 'cargos' | 'salarios';

function AnotacoesSubTab({ emp }: { emp: HrEmployee }) {
  const [notes,  setNotes]  = useState<EmployeeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [text,   setText]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEmployeeNotes(emp.id).then(setNotes).catch(console.error).finally(() => setLoading(false));
  }, [emp.id]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const n = await createEmployeeNote({
        employee_id: emp.id, content: text,
        author_name: 'RH', tags: [], visibility: 'interno',
      });
      setNotes(prev => [n, ...prev]);
      setText('');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
          placeholder="Adicionar anotação..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 resize-none" />
        <button onClick={handleAdd} disabled={saving || !text.trim()}
          className="px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50 self-start">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {loading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
      {!loading && notes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhuma anotação.</p>}
      {notes.map(n => (
        <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-700">{n.content}</p>
          <p className="text-[11px] text-slate-400 mt-2">
            {n.author_name ?? 'RH'} · {new Date(n.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      ))}
    </div>
  );
}

function CargosSubTab({ emp }: { emp: HrEmployee }) {
  const [history, setHistory] = useState<PositionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ position_title: '', department: '', effective_on: '', reason: '' });

  useEffect(() => {
    getPositionHistory(emp.id).then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, [emp.id]);

  const handleAdd = async () => {
    if (!form.position_title || !form.effective_on) return;
    setSaving(true);
    try {
      const added = await addPositionHistory({
        employee_id:    emp.id,
        position_title: form.position_title,
        department:     form.department || null,
        effective_on:   form.effective_on,
        reason:         form.reason     || null,
      });
      setHistory(h => [added, ...h]);
      setShow(false);
      setForm({ position_title: '', department: '', effective_on: '', reason: '' });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-600 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100">
          <Plus className="w-3.5 h-3.5" /> Registrar Cargo
        </button>
      </div>
      {show && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Cargo *"><input className={INPUT_CLS} value={form.position_title} onChange={e => setForm(f => ({ ...f, position_title: e.target.value }))} /></Field>
            <Field label="Departamento"><input className={INPUT_CLS} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></Field>
            <Field label="Vigência *"><input type="date" className={INPUT_CLS} value={form.effective_on} onChange={e => setForm(f => ({ ...f, effective_on: e.target.value }))} /></Field>
            <Field label="Motivo">
              <select className={INPUT_CLS} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                <option value="">Selecione...</option>
                {['Admissão','Promoção','Transferência','Reorganização','Outro'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShow(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button onClick={handleAdd} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
      {loading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
      {!loading && history.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhum histórico de cargos.</p>}
      {history.map((h, i) => (
        <div key={h.id} className={`flex items-center gap-4 p-3 rounded-xl border ${i === 0 ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{h.position_title}</p>
            <p className="text-xs text-slate-500">{h.department ?? '—'} · {h.reason ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-600">{fmtDate(h.effective_on)}</p>
            {i === 0 && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">ATUAL</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SalariosSubTab({ emp }: { emp: HrEmployee }) {
  const [history, setHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalaryHistory(emp.id).then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, [emp.id]);

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
      {!loading && history.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          Nenhum histórico salarial. Adicione registros na aba Financeiro.
        </p>
      )}
      {history.map((h, i) => (
        <div key={h.id} className={`flex items-center gap-4 p-3 rounded-xl border ${i === 0 ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100'}`}>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{fmtMoney(h.salary)}</p>
            <p className="text-xs text-slate-500">{h.reason ?? '—'}{h.notes ? ` · ${h.notes}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-600">{fmtDate(h.effective_on)}</p>
            {i === 0 && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">ATUAL</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoricoTab({ emp }: { emp: HrEmployee }) {
  const [sub, setSub] = useState<HistSub>('anotacoes');
  const subLabels: Record<HistSub, string> = { anotacoes: 'Anotações', cargos: 'Cargos', salarios: 'Salários' };

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b border-slate-100">
        {(['anotacoes','cargos','salarios'] as HistSub[]).map(id => (
          <button key={id} onClick={() => setSub(id)}
            className={`pb-3 text-xs font-semibold border-b-2 -mb-px transition-all ${
              sub === id ? 'text-pink-600 border-pink-600' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}>
            {subLabels[id]}
          </button>
        ))}
      </div>
      {sub === 'anotacoes' && <AnotacoesSubTab emp={emp} />}
      {sub === 'cargos'    && <CargosSubTab    emp={emp} />}
      {sub === 'salarios'  && <SalariosSubTab  emp={emp} />}
    </div>
  );
}

// ── Tab: Fale com a ZIA ────────────────────────────────────────────────────────

function FaleZiaTab({ emp }: { emp: HrEmployee }) {
  const [msg,  setMsg]  = useState('');
  const [msgs, setMsgs] = useState<{ role: 'zia' | 'user'; text: string }[]>([
    { role: 'zia', text: `Olá! Sou a ZIA. Posso ajudar com informações sobre ${emp.full_name}. O que deseja saber?` },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg('');
    setMsgs(m => [...m, { role: 'user' as 'user' | 'zia', text }]);
    setTimeout(() => {
      setMsgs(m => [...m, {
        role: 'zia' as 'user' | 'zia',
        text: 'Funcionalidade de IA está sendo integrada. Em breve responderei com base nos dados reais do colaborador.',
      }]);
    }, 800);
  };

  return (
    <div className="flex flex-col" style={{ height: 400 }}>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
              m.role === 'user'
                ? 'bg-pink-600 text-white rounded-tr-md'
                : 'bg-slate-100 text-slate-700 rounded-tl-md'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pergunte sobre este colaborador..."
          className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
        <button onClick={send} disabled={!msg.trim()}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-pink-600 rounded-xl hover:bg-pink-700 disabled:opacity-50 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Enviar
        </button>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

type TabId = 'pessoal' | 'financeiro' | 'saude' | 'atividades' | 'grupos' | 'historico' | 'zia';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'pessoal',    label: 'Dados Pessoais', icon: User       },
  { id: 'financeiro', label: 'Financeiro',     icon: DollarSign },
  { id: 'saude',      label: 'Saúde',          icon: Heart      },
  { id: 'atividades', label: 'Atividades',     icon: Activity   },
  { id: 'grupos',     label: 'Grupos',         icon: Users      },
  { id: 'historico',  label: 'Histórico',      icon: Clock      },
  { id: 'zia',        label: 'Fale com a ZIA', icon: Sparkles   },
];

const STATUS_BADGE: Record<string, string> = {
  'Ativo':       'bg-green-100 text-green-700',
  'Férias':      'bg-blue-100 text-blue-700',
  'Afastado':    'bg-amber-100 text-amber-700',
  'Experiência': 'bg-purple-100 text-purple-700',
  'Inativo':     'bg-slate-100 text-slate-500',
};

export default function EmployeeProfileModal({
  emp,
  onClose,
  onSaved,
}: {
  emp: HrEmployee;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('pessoal');
  const initials = emp.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const dept = (emp as HrEmployee & { departments?: { name: string } | null }).departments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-xl font-bold text-pink-600 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{emp.full_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{emp.position_title ?? '—'} · {dept?.name ?? '—'}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[emp.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {emp.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-3 pb-0 border-b border-slate-100 gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 -mb-px px-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-pink-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'pessoal'    && <DadosPessoaisTab emp={emp} onSaved={onSaved} />}
          {activeTab === 'financeiro' && <FinanceiroTab    emp={emp} />}
          {activeTab === 'saude'      && <SaudeTab         emp={emp} />}
          {activeTab === 'atividades' && <AtividadesTab />}
          {activeTab === 'grupos'     && <GruposTab />}
          {activeTab === 'historico'  && <HistoricoTab     emp={emp} />}
          {activeTab === 'zia'        && <FaleZiaTab       emp={emp} />}
        </div>
      </div>
    </div>
  );
}
