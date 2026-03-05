import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, X, ChevronLeft, ChevronRight, Eye, History, Bot, Users } from 'lucide-react';
import {
  getEmployees, createEmployee, createHrActivity, getHrActivities,
  getEmployeeNotes, getEmployeeGroups,
  getOccupationalHealth, getAbsences, getOvertimeRequests,
  getHourBank, getEmployeeBenefits,
} from '../../../lib/hr';
import type {
  Employee as HrEmployee, HrActivity, EmployeeNote, EmployeeGroup,
  OccupationalHealth, Absence, OvertimeRequest, HourBank, EmployeeBenefit,
} from '../../../lib/hr';


type EmployeeStatus = 'Ativo' | 'Férias' | 'Afastado' | 'Experiência' | 'Inativo';
type ContractType   = 'CLT' | 'PJ' | 'Estágio' | 'Aprendiz' | 'Temporário';
type WorkMode       = 'Presencial' | 'Híbrido' | 'Remoto';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  position: string;
  department: string;
  admissionDate: string;
  status: EmployeeStatus;
  contract: ContractType;
  workMode: WorkMode;
  // Dados Pessoais extras
  rg: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  pis: string;
  // Contato
  corpEmail: string;
  personalEmail: string;
  phone: string;
  mobile: string;
  // Profissional
  manager: string;
  // Endereço
  cep: string;
  street: string;
  num: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // Bancário
  bank: string;
  accountType: string;
  agency: string;
  account: string;
  pixType: string;
  pixKey: string;
}

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  'Ativo':       'bg-green-100 text-green-700',
  'Férias':      'bg-blue-100 text-blue-700',
  'Afastado':    'bg-amber-100 text-amber-700',
  'Experiência': 'bg-purple-100 text-purple-700',
  'Inativo':     'bg-slate-100 text-slate-500',
};

const CONTRACT_BADGE: Record<ContractType, string> = {
  'CLT':        'bg-emerald-50 text-emerald-700',
  'PJ':         'bg-sky-50 text-sky-700',
  'Estágio':    'bg-violet-50 text-violet-700',
  'Aprendiz':   'bg-pink-50 text-pink-700',
  'Temporário': 'bg-orange-50 text-orange-700',
};

const WORK_MODE_BADGE: Record<WorkMode, string> = {
  'Presencial': 'bg-slate-100 text-slate-600',
  'Híbrido':    'bg-indigo-50 text-indigo-700',
  'Remoto':     'bg-teal-50 text-teal-700',
};

const AVATAR_COLORS = [
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

function mapEmployee(e: HrEmployee): Employee {
  const pd = (e.personal_data ?? {}) as Record<string, string>;
  const ad = (e.address_data ?? {}) as Record<string, string>;
  const bd = (e.bank_data ?? {}) as Record<string, string>;
  return {
    id: e.id,
    name: e.full_name,
    cpf: e.cpf,
    email: e.email,
    position: e.position_title ?? '—',
    department: e.departments?.name ?? '—',
    admissionDate: e.admission_date
      ? new Date(e.admission_date + 'T00:00:00').toLocaleDateString('pt-BR')
      : '—',
    status: (e.status as EmployeeStatus) || 'Ativo',
    contract: (e.contract_type as ContractType) || 'CLT',
    workMode: (e.work_mode as WorkMode) || 'Presencial',
    // personal_data
    rg:            pd.rg ?? '',
    birthDate:     pd.birthDate ?? '',
    gender:        pd.gender ?? '',
    maritalStatus: pd.maritalStatus ?? '',
    nationality:   pd.nationality ?? '',
    pis:           pd.pis ?? '',
    // contato
    corpEmail:     e.email,
    personalEmail: pd.personalEmail ?? '',
    phone:         pd.phone ?? '',
    mobile:        pd.mobile ?? '',
    // profissional
    manager:       pd.manager ?? '',
    // address_data
    cep:           ad.cep ?? '',
    street:        ad.street ?? '',
    num:           ad.num ?? '',
    complement:    ad.complement ?? '',
    neighborhood:  ad.neighborhood ?? '',
    city:          ad.city ?? '',
    state:         ad.state ?? '',
    // bank_data
    bank:          bd.bank ?? '',
    accountType:   bd.accountType ?? '',
    agency:        bd.agency ?? '',
    account:       bd.account ?? '',
    pixType:       bd.pixType ?? '',
    pixKey:        bd.pixKey ?? '',
  };
}

// ─── Employee View Modal ───────────────────────────────────────────────────────

type ViewTab = 'geral' | 'pessoal' | 'financeiro' | 'login' | 'saude' | 'anotacoes' | 'grupos' | 'atividades';
type HistTab = 'salarios' | 'pessoal' | 'cargos' | 'grupos';

const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: 'geral',      label: 'Visão Geral' },
  { id: 'pessoal',    label: 'Pessoal' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'login',      label: 'Login' },
  { id: 'saude',      label: 'Saúde' },
  { id: 'anotacoes',  label: 'Anotações' },
  { id: 'grupos',     label: 'Grupos' },
  { id: 'atividades', label: 'Atividades' },
];

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmployeeViewModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const initials = emp.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const [tab, setTab] = useState<ViewTab>('geral');

  // Histórico sub-modal
  const [showHistorico, setShowHistorico] = useState(false);
  const [histTab, setHistTab] = useState<HistTab>('salarios');

  // Remote data
  const [activities,  setActivities]  = useState<HrActivity[]>([]);
  const [notes,       setNotes]       = useState<EmployeeNote[]>([]);
  const [groups,      setGroups]      = useState<EmployeeGroup[]>([]);
  const [health,      setHealth]      = useState<OccupationalHealth[]>([]);
  const [absences,    setAbsences]    = useState<Absence[]>([]);
  const [overtime,    setOvertime]    = useState<OvertimeRequest[]>([]);
  const [hourBank,    setHourBank]    = useState<HourBank[]>([]);
  const [benefits,    setBenefits]    = useState<EmployeeBenefit[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Notes sub-tab
  const [notesTab, setNotesTab] = useState<'anotacoes' | 'tarefas'>('anotacoes');

  // Financial
  const [finMode,    setFinMode]    = useState<'view' | 'request'>('view');
  const [finForm,    setFinForm]    = useState({ bank: emp.bank, accountType: emp.accountType, agency: emp.agency, account: emp.account, pixType: emp.pixType, pixKey: emp.pixKey, justification: '' });
  const [finSaving,  setFinSaving]  = useState(false);
  const [finSuccess, setFinSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setDataLoading(true);
      try {
        const [acts, nts, grps, hlth, abs, ot, hb, ben] = await Promise.all([
          getHrActivities(), getEmployeeNotes(emp.id), getEmployeeGroups(),
          getOccupationalHealth(), getAbsences(), getOvertimeRequests(),
          getHourBank(), getEmployeeBenefits(),
        ]);
        if (!mounted) return;
        const byEmp = (x: { employee_id?: string | null; employee_name?: string | null }) =>
          x.employee_id === emp.id || x.employee_name === emp.name;
        setActivities(acts.filter(byEmp));
        setNotes(nts);
        setGroups(grps);
        setHealth(hlth.filter(byEmp));
        setAbsences(abs.filter(byEmp));
        setOvertime(ot.filter(byEmp));
        setHourBank(hb.filter(byEmp));
        setBenefits(ben.filter(byEmp));
      } catch (e) { console.error(e); }
      finally { if (mounted) setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [emp.id, emp.name]);

  const handleFinRequest = async () => {
    setFinSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setFinSaving(false); setFinSuccess(true); setFinMode('view');
    setTimeout(() => setFinSuccess(false), 5000);
  };

  const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return d; } };
  const hbBalance = hourBank[0] ? Math.round(hourBank[0].balance_minutes / 60 * 10) / 10 : 0;
  const otHours   = overtime.reduce((s, o) => s + (o.hours || 0), 0);

  // Mock history (no audit trail in DB yet)
  const HIST: Record<HistTab, { date: string; label: string; sub: string }[]> = {
    salarios:  [{ date: '01/03/2024', label: 'R$ 8.500,00', sub: 'Reajuste anual' }, { date: '01/03/2023', label: 'R$ 7.800,00', sub: 'Promoção para Pleno' }, { date: emp.admissionDate || '01/01/2022', label: 'R$ 6.200,00', sub: 'Admissão' }],
    pessoal:   [{ date: '10/01/2024', label: 'Endereço atualizado', sub: 'Atualização de residência' }],
    cargos:    [{ date: '01/03/2023', label: emp.position, sub: `${emp.department} · Promoção` }, { date: emp.admissionDate || '01/01/2022', label: 'Analista Júnior', sub: `${emp.department} · Admissão` }],
    grupos:    [{ date: '05/01/2024', label: groups[0]?.name ?? 'Grupo Geral', sub: 'Adicionado' }],
  };

  const tabCls = (id: string) => `pb-3 pt-3 text-xs font-semibold border-b-2 -mb-px px-3 whitespace-nowrap transition-all ${tab === id ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`;
  const subTabCls = (active: boolean) => `pb-2.5 text-xs font-semibold border-b-2 -mb-px px-1 mr-3 transition-all ${active ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      {/* ── Histórico sub-modal ─────────────────────────────────────────────── */}
      {showHistorico && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowHistorico(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[72vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-800">Histórico — {emp.name}</p>
              <button onClick={() => setShowHistorico(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex px-5 border-b border-slate-100">
              {(['salarios','pessoal','cargos','grupos'] as HistTab[]).map((t) => (
                <button key={t} onClick={() => setHistTab(t)} className={subTabCls(histTab === t)}>
                  {t === 'salarios' ? 'Salários' : t === 'pessoal' ? 'Dados Pessoais' : t === 'cargos' ? 'Cargos' : 'Grupos'}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-2">
              {HIST[histTab].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                    <p className="text-xs text-slate-400">{r.sub}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{r.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main modal ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-xl font-bold text-pink-600 shrink-0">{initials}</div>
            <div>
              <p className="text-base font-bold text-slate-800 leading-tight">{emp.name}</p>
              <p className="text-xs text-slate-500">{emp.position} · {emp.department}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_BADGE[emp.contract]}`}>{emp.contract}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${WORK_MODE_BADGE[emp.workMode]}`}>{emp.workMode}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 border-b border-slate-100 overflow-x-auto">
          {VIEW_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tabCls(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {dataLoading && <div className="text-center text-slate-400 text-sm py-10">Carregando dados...</div>}

          {!dataLoading && (<>

            {/* ── GERAL ──────────────────────────────────────────────────────── */}
            {tab === 'geral' && (
              <div className="space-y-5">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowHistorico(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <History className="w-3.5 h-3.5" /> Histórico
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:opacity-90">
                    <Bot className="w-3.5 h-3.5" /> Fale com a ZIA
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <KpiCard label="Atividades" value={activities.length} sub={`${activities.filter((a) => a.status === 'Pendente').length} pendentes`} color="bg-pink-50 text-pink-800" />
                  <KpiCard label="Ausências" value={absences.length} sub="registradas" color="bg-amber-50 text-amber-800" />
                  <KpiCard label="Horas Extras" value={`${otHours}h`} sub={`${overtime.length} registros`} color="bg-blue-50 text-blue-800" />
                  <KpiCard label="Banco de Horas" value={`${hbBalance}h`} sub="saldo atual" color="bg-emerald-50 text-emerald-800" />
                  <KpiCard label="Benefícios" value={benefits.length} sub="ativos" color="bg-purple-50 text-purple-800" />
                  <KpiCard label="Anotações" value={notes.length} sub="registradas" color="bg-slate-100 text-slate-700" />
                </div>

                {activities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Últimas atividades</p>
                    <div className="space-y-1.5">
                      {activities.slice(0, 4).map((a) => (
                        <div key={a.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-xs">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${a.priority === 'Alta' ? 'bg-rose-500' : a.priority === 'Média' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                          <span className="flex-1 font-medium text-slate-700 truncate">{a.title}</span>
                          <span className={`px-1.5 py-0.5 rounded-full font-medium shrink-0 ${a.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activities.length === 0 && absences.length === 0 && overtime.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-6">Nenhum dado registrado ainda para este colaborador.</p>
                )}
              </div>
            )}

            {/* ── PESSOAL ────────────────────────────────────────────────────── */}
            {tab === 'pessoal' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dados Pessoais</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><InfoField label="Nome Completo" value={emp.name} /></div>
                    <InfoField label="CPF" value={emp.cpf} />
                    <InfoField label="RG" value={emp.rg} />
                    <InfoField label="Data de Nascimento" value={fmtDate(emp.birthDate)} />
                    <InfoField label="Sexo" value={emp.gender} />
                    <InfoField label="Estado Civil" value={emp.maritalStatus} />
                    <InfoField label="Nacionalidade" value={emp.nationality} />
                    <InfoField label="PIS/PASEP" value={emp.pis} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><InfoField label="E-mail Corporativo" value={emp.corpEmail} /></div>
                    <InfoField label="E-mail Pessoal" value={emp.personalEmail} />
                    <InfoField label="Telefone" value={emp.phone} />
                    <InfoField label="Celular" value={emp.mobile} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contrato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Cargo" value={emp.position} />
                    <InfoField label="Departamento" value={emp.department} />
                    <InfoField label="Gestor Direto" value={emp.manager} />
                    <InfoField label="Data de Admissão" value={emp.admissionDate} />
                    <InfoField label="Tipo de Contrato" value={emp.contract} />
                    <InfoField label="Modalidade" value={emp.workMode} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Escala / Jornada</p>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Turno" value={emp.workMode === 'Remoto' ? 'Flexível' : 'Comercial (08:00–18:00)'} />
                    <InfoField label="Carga Semanal" value="44h" />
                    <InfoField label="Tipo de Escala" value="5x2" />
                    <InfoField label="Intervalo" value="60 min" />
                  </div>
                </div>
              </div>
            )}

            {/* ── FINANCEIRO ─────────────────────────────────────────────────── */}
            {tab === 'financeiro' && (
              <div className="space-y-4">
                {finSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
                    ✓ Solicitação enviada! O financeiro receberá a notificação para aprovação.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados Bancários</p>
                  {finMode === 'view' && (
                    <button onClick={() => setFinMode('request')} className="text-xs text-pink-600 hover:underline font-medium">
                      Solicitar alteração
                    </button>
                  )}
                  {finMode !== 'view' && (
                    <button onClick={() => setFinMode('view')} className="text-xs text-slate-400 hover:underline">Cancelar</button>
                  )}
                </div>

                {finMode === 'view' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><InfoField label="Banco" value={emp.bank} /></div>
                    <InfoField label="Tipo de Conta" value={emp.accountType} />
                    <InfoField label="Agência" value={emp.agency} />
                    <InfoField label="Número da Conta" value={emp.account} />
                    <InfoField label="Tipo de Chave PIX" value={emp.pixType} />
                    <div className="col-span-2"><InfoField label="Chave PIX" value={emp.pixKey} /></div>
                  </div>
                )}

                {finMode === 'request' && (
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      Os dados bancários são gerenciados pelo ERP financeiro. Esta solicitação será enviada para aprovação — os dados atuais permanecem até a confirmação.
                    </p>
                    {(['bank','accountType','agency','account','pixType','pixKey'] as const).map((key) => {
                      const labels: Record<string, string> = { bank: 'Banco', accountType: 'Tipo de Conta', agency: 'Agência', account: 'Número da Conta', pixType: 'Tipo de Chave PIX', pixKey: 'Chave PIX' };
                      return (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{labels[key]}</label>
                          <input type="text" value={finForm[key]} onChange={(e) => setFinForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
                        </div>
                      );
                    })}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Justificativa <span className="text-rose-500">*</span></label>
                      <textarea value={finForm.justification} onChange={(e) => setFinForm((f) => ({ ...f, justification: e.target.value }))}
                        rows={2} placeholder="Motivo da alteração..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 resize-none" />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleFinRequest} disabled={finSaving || !finForm.justification.trim()}
                        className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60">
                        {finSaving ? 'Enviando...' : 'Enviar Solicitação'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── LOGIN ──────────────────────────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><InfoField label="E-mail de Acesso" value={emp.corpEmail || emp.email} /></div>
                  <InfoField label="Perfil de Acesso" value="Colaborador" />
                  <InfoField label="Último Acesso" value="—" />
                  <InfoField label="Autenticação 2FA" value="Não configurado" />
                  <InfoField label="Status" value="Ativo" />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
                  Gerenciamento avançado de permissões e grupos de acesso disponível em{' '}
                  <span className="text-pink-600 font-semibold">Configurações → Usuários</span>.
                </div>
              </div>
            )}

            {/* ── SAÚDE ──────────────────────────────────────────────────────── */}
            {tab === 'saude' && (
              <div className="space-y-3">
                {health.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Nenhum registro de saúde ocupacional para este colaborador.</p>
                ) : health.map((h) => {
                  const hh = h as unknown as Record<string, string>;
                  return (
                    <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-800">{hh.exam_type ?? 'Exame Ocupacional'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hh.status === 'Apto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{hh.status ?? '—'}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Data: {hh.exam_date ? new Date(hh.exam_date).toLocaleDateString('pt-BR') : '—'}
                        {' · '}Validade: {hh.expiry_date ? new Date(hh.expiry_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ANOTAÇÕES ──────────────────────────────────────────────────── */}
            {tab === 'anotacoes' && (
              <div className="space-y-4">
                <div className="flex border-b border-slate-100">
                  <button onClick={() => setNotesTab('anotacoes')} className={subTabCls(notesTab === 'anotacoes')}>Anotações</button>
                  <button onClick={() => setNotesTab('tarefas')}   className={subTabCls(notesTab === 'tarefas')}>Tarefas</button>
                </div>

                {notesTab === 'anotacoes' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Anotações registradas no módulo <span className="font-semibold text-slate-500">RH → Anotações</span>.</p>
                    {notes.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-6">Nenhuma anotação registrada para este colaborador.</p>
                    ) : notes.map((n) => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-700">{n.content}</p>
                        <p className="text-xs text-slate-400 mt-1.5">{n.author_name ?? 'Equipe RH'} · {new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                )}

                {notesTab === 'tarefas' && (
                  <div className="space-y-2">
                    {activities.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-4">Nenhuma tarefa vinculada.</p>
                    ) : activities.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${a.priority === 'Alta' ? 'bg-rose-500' : a.priority === 'Média' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">{a.title}</p>
                          {a.due_date && <p className="text-slate-400">Prazo: {new Date(a.due_date).toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium shrink-0 ${a.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── GRUPOS ─────────────────────────────────────────────────────── */}
            {tab === 'grupos' && (
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Nenhum grupo cadastrado.</p>
                ) : groups.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{g.name}</p>
                      {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">{g.type}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{g.member_count} membros</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ATIVIDADES ─────────────────────────────────────────────────── */}
            {tab === 'atividades' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Atividades registradas no módulo <span className="font-semibold text-slate-500">RH → Gestão de Atividades</span>.</p>
                {activities.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Nenhuma atividade vinculada a este colaborador.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{activities.length} atividade{activities.length !== 1 ? 's' : ''}</p>
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${a.priority === 'Alta' ? 'bg-rose-500' : a.priority === 'Média' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">{a.title}</p>
                          {a.description && <p className="text-slate-400 truncate">{a.description}</p>}
                          {a.due_date && <p className="text-slate-400">Prazo: {new Date(a.due_date).toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium shrink-0 ${a.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── New Employee Form ─────────────────────────────────────────────────────────

type FormStep = 'pessoal' | 'contato' | 'profissional' | 'endereco' | 'bancario';

const FORM_STEPS: { id: FormStep; label: string }[] = [
  { id: 'pessoal',      label: 'Dados Pessoais'      },
  { id: 'contato',      label: 'Contato'             },
  { id: 'profissional', label: 'Dados Profissionais' },
  { id: 'endereco',     label: 'Endereço'            },
  { id: 'bancario',     label: 'Dados Bancários'     },
];

interface NewEmployeeForm {
  name: string; cpf: string; rg: string; birthDate: string;
  gender: string; maritalStatus: string; nationality: string;
  corpEmail: string; personalEmail: string; phone: string; mobile: string;
  position: string; department: string; manager: string;
  admissionDate: string; contractType: string; workMode: string; pis: string;
  cep: string; street: string; num: string; complement: string;
  neighborhood: string; city: string; state: string;
  bank: string; accountType: string; agency: string;
  account: string; pixType: string; pixKey: string;
}

const EMPTY_FORM: NewEmployeeForm = {
  name: '', cpf: '', rg: '', birthDate: '', gender: '', maritalStatus: '', nationality: 'Brasileira',
  corpEmail: '', personalEmail: '', phone: '', mobile: '',
  position: '', department: '', manager: '', admissionDate: '', contractType: '', workMode: '', pis: '',
  cep: '', street: '', num: '', complement: '', neighborhood: '', city: '', state: '',
  bank: '', accountType: '', agency: '', account: '', pixType: '', pixKey: '',
};

const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

function FField({ label, value, onChange, type, placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} ${error ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
      />
      {error && <p className="text-xs text-rose-500 mt-1">Campo obrigatório</p>}
    </div>
  );
}

function FSelect({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} border-slate-200 bg-white`}
      >
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NewEmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (form: NewEmployeeForm) => Promise<void> }) {
  const [step, setStep] = useState<FormStep>('pessoal');
  const [form, setForm] = useState<NewEmployeeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; cpf?: boolean }>({});
  const [saving, setSaving] = useState(false);

  const currentIdx = FORM_STEPS.findIndex((s) => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === FORM_STEPS.length - 1;
  const set        = (k: keyof NewEmployeeForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const newErrors = {
      name: !form.name.trim(),
      cpf:  !form.cpf.trim(),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.cpf) {
      setStep('pessoal');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Novo Funcionário</h2>
            <p className="text-xs text-slate-400 mt-0.5">Campos com * são obrigatórios (Nome e CPF)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-4 pb-0 border-b border-slate-100 gap-1 overflow-x-auto">
          {FORM_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 -mb-px px-2 whitespace-nowrap transition-all ${
                step === s.id
                  ? 'text-pink-600 border-pink-600'
                  : i < currentIdx
                    ? 'text-green-600 border-green-400'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black ${
                step === s.id ? 'bg-pink-100 text-pink-700'
                  : i < currentIdx ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 'pessoal' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FField label="Nome Completo" value={form.name} onChange={set('name')} required
                  placeholder="Nome e sobrenome" error={errors.name} />
              </div>
              <FField label="CPF" value={form.cpf} onChange={set('cpf')} required
                placeholder="000.000.000-00" error={errors.cpf} />
              <FField label="RG" value={form.rg} onChange={set('rg')} placeholder="00.000.000-0" />
              <FField label="Data de Nascimento" value={form.birthDate} onChange={set('birthDate')} type="date" />
              <FSelect label="Sexo" value={form.gender} onChange={set('gender')}
                options={['Masculino', 'Feminino', 'Não Binário', 'Prefiro não informar']} />
              <FSelect label="Estado Civil" value={form.maritalStatus} onChange={set('maritalStatus')}
                options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              <FField label="Nacionalidade" value={form.nationality} onChange={set('nationality')} placeholder="Ex: Brasileira" />
            </div>
          )}

          {step === 'contato' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="E-mail Corporativo" value={form.corpEmail} onChange={set('corpEmail')} type="email" placeholder="colaborador@empresa.com" />
              <FField label="E-mail Pessoal" value={form.personalEmail} onChange={set('personalEmail')} type="email" placeholder="email@pessoal.com" />
              <FField label="Telefone" value={form.phone} onChange={set('phone')} placeholder="(11) 3000-0000" />
              <FField label="Celular" value={form.mobile} onChange={set('mobile')} placeholder="(11) 9 0000-0000" />
            </div>
          )}

          {step === 'profissional' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="Cargo" value={form.position} onChange={set('position')} placeholder="Ex: Analista de RH Pleno" />
              <FField label="Departamento" value={form.department} onChange={set('department')} placeholder="Ex: Recursos Humanos" />
              <FField label="Gestor Direto" value={form.manager} onChange={set('manager')} placeholder="Nome do gestor" />
              <FField label="Data de Admissão" value={form.admissionDate} onChange={set('admissionDate')} type="date" />
              <FSelect label="Tipo de Contrato" value={form.contractType} onChange={set('contractType')}
                options={['CLT', 'PJ', 'Estágio', 'Aprendiz', 'Temporário']} />
              <FSelect label="Modalidade de Trabalho" value={form.workMode} onChange={set('workMode')}
                options={['Presencial', 'Híbrido', 'Remoto']} />
              <div className="col-span-2">
                <FField label="PIS/PASEP" value={form.pis} onChange={set('pis')} placeholder="000.00000.00-0" />
              </div>
            </div>
          )}

          {step === 'endereco' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="CEP" value={form.cep} onChange={set('cep')} placeholder="00000-000" />
              <div />
              <div className="col-span-2">
                <FField label="Logradouro" value={form.street} onChange={set('street')} placeholder="Rua, Avenida, etc." />
              </div>
              <FField label="Número" value={form.num} onChange={set('num')} placeholder="000" />
              <FField label="Complemento" value={form.complement} onChange={set('complement')} placeholder="Apto, Bloco..." />
              <FField label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
              <FField label="Cidade" value={form.city} onChange={set('city')} />
              <div className="col-span-2">
                <FSelect label="Estado" value={form.state} onChange={set('state')} options={STATES} />
              </div>
            </div>
          )}

          {step === 'bancario' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FField label="Banco" value={form.bank} onChange={set('bank')} placeholder="Ex: 001 – Banco do Brasil" />
              </div>
              <FSelect label="Tipo de Conta" value={form.accountType} onChange={set('accountType')}
                options={['Conta Corrente', 'Conta Poupança', 'Conta Salário']} />
              <FField label="Agência" value={form.agency} onChange={set('agency')} placeholder="0000-0" />
              <FField label="Número da Conta" value={form.account} onChange={set('account')} placeholder="00000-0" />
              <div />
              <FSelect label="Tipo de Chave PIX" value={form.pixType} onChange={set('pixType')}
                options={['CPF', 'E-mail', 'Celular', 'Chave Aleatória']} />
              <FField label="Chave PIX" value={form.pixKey} onChange={set('pixKey')} placeholder="Informe a chave" />
            </div>
          )}
        </div>

        {/* Footer — Salvar always visible, Próximo/Anterior for navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => !isFirst && setStep(FORM_STEPS[currentIdx - 1].id)}
            disabled={isFirst}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <span className="text-xs text-slate-400">{currentIdx + 1} / {FORM_STEPS.length}</span>

          <div className="flex items-center gap-2">
            {/* Salvar always visible */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
            {/* Próximo only if not last */}
            {!isLast && (
              <button
                onClick={() => setStep(FORM_STEPS[currentIdx + 1].id)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-pink-600 border border-pink-200 bg-pink-50 rounded-lg hover:bg-pink-100 font-medium"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Employees() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'Todos'>('Todos');
  const [showModal, setShowModal]   = useState(false);
  const [viewing, setViewing]       = useState<Employee | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data.map(mapEmployee));
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q) ||
                        e.position.toLowerCase().includes(q) ||
                        e.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Todos' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:       employees.filter((e) => e.status !== 'Inativo').length,
    ativo:       employees.filter((e) => e.status === 'Ativo').length,
    ferias:      employees.filter((e) => e.status === 'Férias').length,
    afastado:    employees.filter((e) => e.status === 'Afastado').length,
    experiencia: employees.filter((e) => e.status === 'Experiência').length,
  };

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="p-8">
      {showModal && (
        <NewEmployeeModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            await createEmployee({
              full_name: form.name,
              cpf: form.cpf,
              email: form.corpEmail || form.personalEmail || '',
              position_title: form.position || null,
              work_mode: form.workMode || 'Presencial',
              contract_type: form.contractType || 'CLT',
              status: 'Ativo',
              admission_date: form.admissionDate || new Date().toISOString().split('T')[0],
              personal_data: { rg: form.rg, birthDate: form.birthDate, gender: form.gender, maritalStatus: form.maritalStatus, nationality: form.nationality, phone: form.phone, mobile: form.mobile, personalEmail: form.personalEmail, pis: form.pis },
              address_data: { cep: form.cep, street: form.street, num: form.num, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state },
              bank_data: { bank: form.bank, accountType: form.accountType, agency: form.agency, account: form.account, pixType: form.pixType, pixKey: form.pixKey },
            });
            await loadEmployees();
          }}
        />
      )}
      {viewing && <EmployeeViewModal emp={viewing} onClose={() => setViewing(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de todos os colaboradores ativos e histórico</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Ativo</p>
          <p className="text-3xl font-bold text-slate-800">{counts.total}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Ativos</p>
          <p className="text-3xl font-bold text-green-700">{counts.ativo}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Em Férias</p>
          <p className="text-3xl font-bold text-blue-700">{counts.ferias}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Afastados</p>
          <p className="text-3xl font-bold text-amber-700">{counts.afastado}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">Experiência</p>
          <p className="text-3xl font-bold text-purple-700">{counts.experiencia}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-80"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | 'Todos')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white"
            >
              <option value="Todos">Todos os status</option>
              <option value="Ativo">Ativo</option>
              <option value="Férias">Em Férias</option>
              <option value="Afastado">Afastado</option>
              <option value="Experiência">Em Experiência</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading && (
            <div className="text-center py-10 text-slate-400 text-sm">Carregando funcionários...</div>
          )}
          {!loading && <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Modalidade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissão</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  onClick={() => setViewing(emp)}
                  className="hover:bg-pink-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                        {initials(emp.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.cpf}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{emp.position}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{emp.department}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_BADGE[emp.contract]}`}>
                      {emp.contract}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${WORK_MODE_BADGE[emp.workMode]}`}>
                      {emp.workMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{emp.admissionDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status]}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewing(emp); }}
                      className="text-slate-400 hover:text-pink-600 transition-colors"
                      title="Ver ficha"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum funcionário encontrado.</div>
          )}
        </div>

        {/* Pagination stub */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Exibindo {filtered.length} de {employees.length} funcionários</p>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Anterior</button>
            <span className="px-3 py-1.5 text-xs text-white bg-pink-600 rounded-lg font-medium">1</span>
            <button className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
