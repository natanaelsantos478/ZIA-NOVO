import { useState, useEffect } from 'react';
import { Plus, ArrowRight, Tag, Clock, CheckCircle2, MoreHorizontal, Zap, X, Users, Bell } from 'lucide-react';
import { getHrActivities, createHrActivity, updateHrActivity, getTriggerCount, getEmployees } from '../../../lib/hr';
import type { Employee as HrEmployee } from '../../../lib/hr';

/* ── Types ──────────────────────────────────────────────────────────────── */

type TriggerType = 'Manual' | 'Gatilho CRM' | 'Gatilho ERP' | 'Gatilho RH' | 'Agendado';
type TaskStatus  = 'Ativa' | 'Pausada' | 'Concluída' | 'Rascunho';
type ModuleKey   = 'RH' | 'VENDAS' | 'LOGISTICA' | 'INVENTARIO' | 'QUALIDADE' | 'DOCUMENTOS' | 'BACKOFFICE';

interface Activity {
  id:              string;
  name:            string;
  trigger:         TriggerType;
  triggerDetail:   string;
  assignee:        string;
  department:      string;
  status:          TaskStatus;
  chainNext?:      string;
  tags:            string[];
  avgDuration:     number;
  totalExecutions: number;
}

interface ActivityGroup {
  tag:           string;
  color:         string;
  activityCount: number;
  avgCycleTime:  string;
  lastExecution: string;
  reportReady:   boolean;
}

interface ActivityCost {
  id:            string;
  name:          string;
  laborHours:    number;
  hourlyCost:    number;
  materialCost:  number;
  logisticsCost: number;
  taxRate:       number;
  revenue:       number;
}

/* ── Module / sub-module configuration ─────────────────────────────────── */

interface TriggerAction {
  id: string;
  label: string;
  unit: 'item' | 'hora' | 'dia' | 'min' | 'R$';
  // Supabase metadata — presente apenas nos módulos com dados reais
  table?: string;
  measureType?: 'count' | 'sum_field';
  field?: string;
  filterField?: string;
  filterValue?: string;
}

interface SubModuleConfig { label: string; actions: TriggerAction[] }
interface ModuleConfig    { label: string; triggerType: TriggerType; subModules: Record<string, SubModuleConfig> }

const MODULES: Record<ModuleKey, ModuleConfig> = {
  RH: {
    label: 'Recursos Humanos', triggerType: 'Gatilho RH',
    subModules: {
      ponto: { label: 'Ponto Eletrônico', actions: [
        { id: 'faltas',       label: 'Faltas registradas',           table: 'absences',          measureType: 'count',     unit: 'item' },
        { id: 'dias_falta',   label: 'Total de dias de ausência',    table: 'absences',          measureType: 'sum_field', field: 'days',            unit: 'dia'  },
        { id: 'horas_extra',  label: 'Horas extras aprovadas',       table: 'overtime_requests', measureType: 'sum_field', field: 'hours', filterField: 'status', filterValue: 'Aprovada', unit: 'hora' },
        { id: 'correcoes',    label: 'Correções de ponto',           table: 'punch_corrections', measureType: 'count',     unit: 'item' },
      ]},
      folha: { label: 'Folha de Pagamento', actions: [
        { id: 'folhas',       label: 'Folhas processadas',           table: 'payroll_runs',      measureType: 'count',     unit: 'item' },
        { id: 'liq_total',    label: 'Total líquido pago',           table: 'payroll_items',     measureType: 'sum_field', field: 'net_salary',      unit: 'R$'   },
        { id: 'bruto_total',  label: 'Total bruto',                  table: 'payroll_items',     measureType: 'sum_field', field: 'total_gross',     unit: 'R$'   },
      ]},
      ferias: { label: 'Férias', actions: [
        { id: 'solicitacoes', label: 'Solicitações de férias',        table: 'vacations',         measureType: 'count',     unit: 'item' },
        { id: 'dias_agend',   label: 'Dias agendados',               table: 'vacations',         measureType: 'sum_field', field: 'days_scheduled',  unit: 'dia'  },
        { id: 'dias_disp',    label: 'Dias disponíveis (total)',      table: 'vacations',         measureType: 'sum_field', field: 'days_available',  unit: 'dia'  },
      ]},
      banco_horas: { label: 'Banco de Horas', actions: [
        { id: 'saldo_min',    label: 'Saldo acumulado (minutos)',    table: 'hour_bank',         measureType: 'sum_field', field: 'balance_minutes', unit: 'min'  },
        { id: 'limite',       label: 'Limite configurado (horas)',   table: 'hour_bank',         measureType: 'sum_field', field: 'limit_hours',     unit: 'hora' },
      ]},
      admissao: { label: 'Admissão', actions: [
        { id: 'admissoes',    label: 'Admissões registradas',        table: 'admissions',        measureType: 'count',     unit: 'item' },
      ]},
      desligamento: { label: 'Desligamento', actions: [
        { id: 'deslig',       label: 'Desligamentos registrados',    table: 'offboarding',       measureType: 'count',     unit: 'item' },
      ]},
      avaliacao: { label: 'Avaliação de Desempenho', actions: [
        { id: 'avaliacoes',   label: 'Avaliações realizadas',        table: 'performance_reviews', measureType: 'count',   unit: 'item' },
      ]},
      beneficios: { label: 'Benefícios', actions: [
        { id: 'concess',      label: 'Benefícios concedidos',        table: 'employee_benefits', measureType: 'count',     unit: 'item' },
      ]},
    },
  },
  VENDAS: {
    label: 'Vendas & CRM', triggerType: 'Gatilho CRM',
    subModules: {
      pipeline: { label: 'Pipeline',           actions: [
        { id: 'neg_criado',  label: 'Novo negócio criado',              unit: 'item' },
        { id: 'neg_etapa',   label: 'Negócio avançou de etapa',         unit: 'item' },
        { id: 'neg_perdido', label: 'Negócio perdido',                  unit: 'item' },
        { id: 'qtd_neg',     label: 'Quantidade de negócios',           unit: 'item' },
      ]},
      proposta: { label: 'Proposta Comercial', actions: [
        { id: 'enviada',     label: 'Proposta enviada',                 unit: 'item' },
        { id: 'aprovada',    label: 'Proposta aprovada',                unit: 'item' },
        { id: 'rejeitada',   label: 'Proposta rejeitada',               unit: 'item' },
      ]},
      contrato: { label: 'Contratos', actions: [
        { id: 'assinado',    label: 'Contrato assinado',                unit: 'item' },
        { id: 'vencendo',    label: 'Contrato vencendo',                unit: 'item' },
      ]},
      meta: { label: 'Metas de Vendas', actions: [
        { id: 'meta_ating',  label: 'Meta atingida',                    unit: 'item' },
        { id: 'meta_risco',  label: 'Meta em risco',                    unit: 'item' },
      ]},
      leads: { label: 'Leads', actions: [
        { id: 'novo_lead',   label: 'Novo lead recebido',               unit: 'item' },
        { id: 'qualif',      label: 'Lead qualificado',                 unit: 'item' },
        { id: 'convertido',  label: 'Lead convertido',                  unit: 'item' },
      ]},
    },
  },
  LOGISTICA: {
    label: 'Logística', triggerType: 'Gatilho ERP',
    subModules: {
      entrega:        { label: 'Entregas',        actions: [
        { id: 'realizada',   label: 'Entrega realizada',               unit: 'item' },
        { id: 'atraso',      label: 'Atraso na entrega',               unit: 'item' },
        { id: 'retornada',   label: 'Entrega retornada',               unit: 'item' },
      ]},
      expedicao:      { label: 'Expedição',       actions: [
        { id: 'volume',      label: 'Volume expedido',                  unit: 'item' },
        { id: 'concluida',   label: 'Expedição concluída',              unit: 'item' },
      ]},
      rota:           { label: 'Rotas',           actions: [
        { id: 'iniciada',    label: 'Rota iniciada',                    unit: 'item' },
        { id: 'concluida',   label: 'Rota concluída',                   unit: 'item' },
        { id: 'desvio',      label: 'Desvio de rota detectado',         unit: 'item' },
      ]},
      transportadora: { label: 'Transportadoras', actions: [
        { id: 'sla',         label: 'SLA atingido',                     unit: 'item' },
        { id: 'ocorrencia',  label: 'Ocorrência registrada',            unit: 'item' },
      ]},
    },
  },
  INVENTARIO: {
    label: 'Inventário e Ativos', triggerType: 'Gatilho ERP',
    subModules: {
      estoque:    { label: 'Estoque', actions: [
        { id: 'qtd_min',     label: 'Quantidade mínima atingida',       unit: 'item' },
        { id: 'qtd_max',     label: 'Quantidade máxima atingida',       unit: 'item' },
        { id: 'entrada',     label: 'Entrada de estoque',               unit: 'item' },
        { id: 'saida',       label: 'Saída de estoque',                 unit: 'item' },
      ]},
      ativo:      { label: 'Ativos', actions: [
        { id: 'manutencao',  label: 'Manutenção programada',            unit: 'item' },
        { id: 'depreciacao', label: 'Depreciação registrada',           unit: 'item' },
      ]},
      inventario: { label: 'Contagem de Inventário', actions: [
        { id: 'divergencia', label: 'Divergência encontrada',           unit: 'item' },
        { id: 'concluido',   label: 'Inventário concluído',             unit: 'item' },
      ]},
    },
  },
  QUALIDADE: {
    label: 'Qualidade (SGQ)', triggerType: 'Gatilho ERP',
    subModules: {
      nc:          { label: 'Não Conformidade', actions: [
        { id: 'nc_aberta',   label: 'NC aberta',                        unit: 'item' },
        { id: 'nc_critica',  label: 'NC crítica identificada',          unit: 'item' },
        { id: 'qtd_nc',      label: 'Quantidade de NCs',                unit: 'item' },
      ]},
      auditoria:   { label: 'Auditoria', actions: [
        { id: 'programada',  label: 'Auditoria programada',             unit: 'item' },
        { id: 'concluida',   label: 'Auditoria concluída',              unit: 'item' },
      ]},
      indicadores: { label: 'Indicadores de Qualidade', actions: [
        { id: 'meta',        label: 'Meta atingida',                    unit: 'item' },
        { id: 'desvio',      label: 'Desvio crítico detectado',         unit: 'item' },
      ]},
      calibracao:  { label: 'Calibração', actions: [
        { id: 'vencendo',    label: 'Calibração vencendo',              unit: 'item' },
        { id: 'fora',        label: 'Instrumento fora de calibração',   unit: 'item' },
      ]},
    },
  },
  DOCUMENTOS: {
    label: 'Documentos', triggerType: 'Gatilho ERP',
    subModules: {
      aprovacao:  { label: 'Aprovação', actions: [
        { id: 'pendente',    label: 'Documento pendente de aprovação',  unit: 'item' },
        { id: 'aprovado',    label: 'Documento aprovado',               unit: 'item' },
        { id: 'rejeitado',   label: 'Documento rejeitado',              unit: 'item' },
      ]},
      vencimento: { label: 'Vencimento', actions: [
        { id: 'vencendo',    label: 'Documento vencendo',               unit: 'item' },
        { id: 'vencido',     label: 'Documento vencido',                unit: 'item' },
      ]},
      revisao:    { label: 'Revisão', actions: [
        { id: 'solicitada',  label: 'Revisão solicitada',               unit: 'item' },
        { id: 'concluida',   label: 'Revisão concluída',                unit: 'item' },
      ]},
    },
  },
  BACKOFFICE: {
    label: 'Back Office / Financeiro', triggerType: 'Gatilho ERP',
    subModules: {
      financeiro: { label: 'Financeiro', actions: [
        { id: 'pagamento',   label: 'Pagamento realizado',              unit: 'R$'   },
        { id: 'atraso',      label: 'Pagamento em atraso',              unit: 'item' },
        { id: 'vencendo',    label: 'Conta a pagar vencendo',           unit: 'item' },
      ]},
      fiscal:     { label: 'Fiscal', actions: [
        { id: 'obrigacao',   label: 'Obrigação fiscal vencendo',        unit: 'item' },
        { id: 'nf_emitida',  label: 'NF emitida',                       unit: 'item' },
        { id: 'nf_cancel',   label: 'NF cancelada',                     unit: 'item' },
      ]},
      contabil:   { label: 'Contabilidade', actions: [
        { id: 'fechamento',  label: 'Fechamento mensal',                unit: 'item' },
        { id: 'lancamento',  label: 'Lançamento contábil',              unit: 'item' },
        { id: 'conciliacao', label: 'Conciliação pendente',             unit: 'item' },
      ]},
    },
  },
};

const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

const TRIGGER_TYPES = [
  { id: 'quantidade',    label: 'Dados × Quantidade',  desc: 'Dispara quando a quantidade de registros (faltas, horas, itens…) do módulo atingir o valor configurado' },
  { id: 'velocidade',    label: 'Velocidade',           desc: 'Dispara ao atingir uma taxa ou velocidade de entrada' },
  { id: 'data',          label: 'Data / Prazo',         desc: 'Dispara em uma data ou X dias antes/após' },
  { id: 'porcentagem',   label: 'Porcentagem',          desc: 'Dispara ao atingir um percentual de meta' },
  { id: 'status_change', label: 'Mudança de Status',    desc: 'Dispara quando o registro mudar de status' },
  { id: 'agendado',      label: 'Agendado',             desc: 'Gera a atividade em dias e horários específicos (dia da semana, dia do mês ou datas do ano)' },
];

const OUTPUT_TYPES = [
  { id: 'especificos',  label: 'Colaboradores Específicos' },
  { id: 'empresa',      label: 'Toda a Empresa' },
  { id: 'departamento', label: 'Por Departamento' },
  { id: 'cargo',        label: 'Por Cargo' },
  { id: 'grupo',        label: 'Grupo de Colaboradores' },
];

const ACTIVITY_STATUSES = ['Pendente', 'Em Andamento', 'Concluída', 'Atrasada', 'Cancelada'];
const DEPARTMENTS = ['TI – Desenvolvimento', 'Recursos Humanos', 'Qualidade (SGQ)', 'Comercial & Vendas', 'Financeiro', 'Operações', 'Marketing', 'Jurídico'];
const POSITIONS   = ['Analista de RH', 'Desenvolvedor Full Stack', 'Gerente de Qualidade', 'Executivo de Vendas', 'Diretor', 'Coordenador', 'Supervisor', 'Assistente'];
const COLLABORATORS = ['Ana Beatriz Souza', 'Carlos Eduardo Lima', 'Fernanda Rocha', 'Guilherme Martins', 'Isabela Ferreira', 'Lucas Araújo', 'Roberto Alves', 'Carla Mendes'];

/* ── Form state ─────────────────────────────────────────────────────────── */

interface FormState {
  name: string;
  description: string;
  triggerModule: ModuleKey | '';
  triggerSubModule: string;
  triggerAction: string;
  hasTriggerCollaborator: boolean;
  triggerCollaborator: string;
  triggerType: string;
  triggerQuantity: string;
  triggerQuantityPeriod: string;
  triggerVelocityValue: string;
  triggerVelocityUnit: string;
  triggerDate: string;
  triggerDaysOffset: string;
  triggerPercentage: string;
  triggerStatusFrom: string;
  triggerStatusTo: string;
  // Agendamento
  scheduleType: 'semana' | 'mes' | 'ano' | '';
  scheduleWeekDays: number[];
  scheduleMonthDay: string;
  scheduleYearDates: string[];
  scheduleTime: string;
  outputType: string;
  outputCollaborators: string[];
  outputDepartments: string[];
  outputPositions: string[];
  activityStatuses: string[];
  alertsEnabled: boolean;
  alertTriggerType: 'status' | 'quantity' | 'percentage';
  alertStatuses: string[];
  alertQuantity: string;
  alertPercentage: string;
  alertRecipientType: string;
  alertCollaborators: string[];
  alertDepartments: string[];
  alertPositions: string[];
  presetEmployee?: string;
}

const INIT_FORM: FormState = {
  name: '', description: '',
  triggerModule: '', triggerSubModule: '', triggerAction: '',
  hasTriggerCollaborator: false, triggerCollaborator: '',
  triggerType: '',
  triggerQuantity: '', triggerQuantityPeriod: '',
  triggerVelocityValue: '', triggerVelocityUnit: 'hora',
  triggerDate: '', triggerDaysOffset: '',
  triggerPercentage: '',
  triggerStatusFrom: '', triggerStatusTo: '',
  scheduleType: '', scheduleWeekDays: [], scheduleMonthDay: '', scheduleYearDates: [''], scheduleTime: '',
  outputType: '', outputCollaborators: [], outputDepartments: [], outputPositions: [],
  activityStatuses: ['Pendente', 'Em Andamento', 'Concluída'],
  alertsEnabled: false, alertTriggerType: 'status',
  alertStatuses: [], alertQuantity: '', alertPercentage: '',
  alertRecipientType: 'especificos',
  alertCollaborators: [], alertDepartments: [], alertPositions: [],
};

const FORM_STEPS = ['Informações Básicas', 'Gatilho de Entrada', 'Saída / Destino', 'Alertas'];

/* ── Form UI primitives ─────────────────────────────────────────────────── */

const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ChipSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selected.includes(o)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
          }`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function RadioCard({ name, value, checked, label, onChange }: {
  name: string; value: string; checked: boolean; label: string; onChange: () => void;
}) {
  return (
    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
      checked ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-indigo-600" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

/* ── Step 1 ─────────────────────────────────────────────────────────────── */

function Step1({ form, set }: {
  form: FormState;
  set: (p: Partial<FormState>) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Nome da Atividade *">
        <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
          placeholder="Ex: Onboarding Digital — Integração TI" className={INPUT} />
      </Field>
      <Field label="Descrição">
        <textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
          placeholder="Descreva o objetivo e funcionamento desta atividade..."
          rows={4} className={`${INPUT} resize-none`} />
      </Field>
    </div>
  );
}

/* ── Step Funcionários (edit only) ──────────────────────────────────────── */

function StepFuncionarios({ form, set, employees }: {
  form: FormState;
  set: (p: Partial<FormState>) => void;
  employees?: HrEmployee[];
}) {
  const linked = form.presetEmployee;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">Funcionário vinculado</p>
        <p className="text-xs text-slate-400 mb-4">Selecione um colaborador para vincular a esta atividade, ou remova o vínculo atual.</p>
      </div>

      {linked ? (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {linked.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-indigo-800">{linked}</span>
          </div>
          <button
            onClick={() => set({ presetEmployee: undefined })}
            className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            Remover vínculo
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">
          <Users className="w-4 h-4" />
          <span>Nenhum colaborador vinculado</span>
        </div>
      )}

      <Field label="Alterar colaborador">
        <select
          value={form.presetEmployee ?? ''}
          onChange={(e) => set({ presetEmployee: e.target.value || undefined })}
          className={INPUT}
        >
          <option value="">Nenhum colaborador</option>
          {(employees ?? []).map((e) => (
            <option key={e.id} value={e.full_name}>{e.full_name}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/* ── Step 2 ─────────────────────────────────────────────────────────────── */

function Step2({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  const modCfg    = form.triggerModule ? MODULES[form.triggerModule] : null;
  const subKeys   = modCfg ? Object.keys(modCfg.subModules) : [];
  const subCfg    = modCfg && form.triggerSubModule ? modCfg.subModules[form.triggerSubModule] : null;
  const selAction = subCfg ? subCfg.actions.find((a) => a.id === form.triggerAction) : null;

  // Valor atual no Supabase (só para módulos com dados reais + gatilho quantidade)
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!selAction?.table || form.triggerType !== 'quantidade') { setLiveCount(null); return; }
    setLiveLoading(true);
    getTriggerCount(
      selAction.table,
      selAction.measureType ?? 'count',
      selAction.field,
      selAction.filterField,
      selAction.filterValue,
    ).then((n) => { setLiveCount(n); setLiveLoading(false); })
     .catch(() => { setLiveLoading(false); });
  }, [selAction?.table, selAction?.field, selAction?.filterValue, form.triggerType]);

  return (
    <div className="space-y-5">
      {/* Module */}
      <Field label="Módulo *">
        <select value={form.triggerModule}
          onChange={(e) => set({ triggerModule: e.target.value as ModuleKey, triggerSubModule: '', triggerAction: '' })}
          className={INPUT}>
          <option value="">Selecionar módulo...</option>
          {MODULE_KEYS.map((k) => <option key={k} value={k}>{MODULES[k].label}</option>)}
        </select>
      </Field>

      {/* Sub-module */}
      {modCfg && (
        <Field label="Assunto / Submódulo *">
          <select value={form.triggerSubModule}
            onChange={(e) => set({ triggerSubModule: e.target.value, triggerAction: '' })}
            className={INPUT}>
            <option value="">Selecionar assunto...</option>
            {subKeys.map((k) => <option key={k} value={k}>{modCfg.subModules[k].label}</option>)}
          </select>
        </Field>
      )}

      {/* Action */}
      {subCfg && (
        <Field label="Ação / Evento *">
          <select value={form.triggerAction} onChange={(e) => set({ triggerAction: e.target.value })} className={INPUT}>
            <option value="">Selecionar ação...</option>
            {subCfg.actions.map((a) => (
              <option key={a.id} value={a.id}>{a.label} ({a.unit})</option>
            ))}
          </select>
        </Field>
      )}

      {/* Collaborator toggle */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Toggle value={form.hasTriggerCollaborator}
            onChange={() => set({ hasTriggerCollaborator: !form.hasTriggerCollaborator, triggerCollaborator: '' })} />
          <span className="text-sm font-medium text-slate-700">Gatilho vem de um colaborador específico?</span>
        </div>
        {form.hasTriggerCollaborator && (
          <Field label="Selecionar Colaborador">
            <select value={form.triggerCollaborator} onChange={(e) => set({ triggerCollaborator: e.target.value })} className={INPUT}>
              <option value="">Selecionar colaborador...</option>
              {COLLABORATORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        )}
      </div>

      {/* Trigger type */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Tipo de Gatilho *</p>
        <div className="space-y-2">
          {TRIGGER_TYPES.map((t) => (
            <label key={t.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
              form.triggerType === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="triggerType" value={t.id} checked={form.triggerType === t.id}
                onChange={() => set({ triggerType: t.id })} className="mt-0.5 accent-indigo-600" />
              <div>
                <p className="text-sm font-medium text-slate-700">{t.label}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Trigger params */}
      {form.triggerType === 'quantidade' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Parâmetros — Dados × Quantidade{selAction ? ` · unidade: ${selAction.unit}` : ''}
          </p>
          {/* Live count from Supabase */}
          {selAction?.table && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
              <span>Valor atual no banco:</span>
              {liveLoading
                ? <span className="text-slate-400 italic">carregando…</span>
                : liveCount !== null
                  ? <span className="font-bold text-indigo-700">{liveCount.toLocaleString('pt-BR')} {selAction.unit}</span>
                  : <span className="text-slate-400">—</span>
              }
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Disparar ao atingir (${selAction?.unit ?? 'item'}) *`}>
              <input type="number" value={form.triggerQuantity} onChange={(e) => set({ triggerQuantity: e.target.value })}
                placeholder="Ex: 5" className={INPUT} />
            </Field>
            <Field label="Período">
              <select value={form.triggerQuantityPeriod} onChange={(e) => set({ triggerQuantityPeriod: e.target.value })} className={INPUT}>
                <option value="">Sem período (acumulado)</option>
                <option value="dia">Por dia</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mês</option>
                <option value="trimestre">Por trimestre</option>
                <option value="ano">Por ano</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {form.triggerType === 'velocidade' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parâmetros de Velocidade</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor de Entrada *">
              <input type="number" value={form.triggerVelocityValue} onChange={(e) => set({ triggerVelocityValue: e.target.value })}
                placeholder="Ex: 50" className={INPUT} />
            </Field>
            <Field label="Unidade de Tempo">
              <select value={form.triggerVelocityUnit} onChange={(e) => set({ triggerVelocityUnit: e.target.value })} className={INPUT}>
                <option value="hora">por hora</option>
                <option value="dia">por dia</option>
                <option value="semana">por semana</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {form.triggerType === 'data' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parâmetros de Data</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de Referência">
              <input type="date" value={form.triggerDate} onChange={(e) => set({ triggerDate: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Dias antes (−) / depois (+)">
              <input type="number" value={form.triggerDaysOffset} onChange={(e) => set({ triggerDaysOffset: e.target.value })}
                placeholder="Ex: −30" className={INPUT} />
            </Field>
          </div>
        </div>
      )}

      {form.triggerType === 'porcentagem' && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Parâmetros de Porcentagem</p>
          <Field label="Percentual de Gatilho *">
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" value={form.triggerPercentage}
                onChange={(e) => set({ triggerPercentage: e.target.value })} placeholder="Ex: 80" className={INPUT} />
              <span className="text-slate-500 text-sm font-medium shrink-0">%</span>
            </div>
          </Field>
        </div>
      )}

      {form.triggerType === 'status_change' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parâmetros de Status</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De Status">
              <select value={form.triggerStatusFrom} onChange={(e) => set({ triggerStatusFrom: e.target.value })} className={INPUT}>
                <option value="">Qualquer status</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Para Status *">
              <select value={form.triggerStatusTo} onChange={(e) => set({ triggerStatusTo: e.target.value })} className={INPUT}>
                <option value="">Selecionar...</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      {form.triggerType === 'agendado' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configurar Agendamento</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'semana', label: 'Dia da Semana' },
              { id: 'mes',    label: 'Dia do Mês'    },
              { id: 'ano',    label: 'Datas do Ano'  },
            ].map((t) => (
              <button key={t.id} type="button"
                onClick={() => set({ scheduleType: t.id as FormState['scheduleType'], scheduleWeekDays: [], scheduleMonthDay: '', scheduleYearDates: [''] })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.scheduleType === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {form.scheduleType === 'semana' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Selecione os dias da semana</p>
              <div className="flex gap-2 flex-wrap">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => set({ scheduleWeekDays: form.scheduleWeekDays.includes(i) ? form.scheduleWeekDays.filter((x) => x !== i) : [...form.scheduleWeekDays, i] })}
                    className={`w-11 h-11 rounded-full text-xs font-semibold border transition-all ${
                      form.scheduleWeekDays.includes(i) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.scheduleType === 'mes' && (
            <Field label="Dia do mês (1–31)">
              <input type="number" min="1" max="31" value={form.scheduleMonthDay}
                onChange={(e) => set({ scheduleMonthDay: e.target.value })} placeholder="Ex: 15" className={INPUT} />
            </Field>
          )}

          {form.scheduleType === 'ano' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Datas específicas do ano (dd/mm/aaaa)</p>
              {form.scheduleYearDates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="date" value={d}
                    onChange={(e) => { const arr = [...form.scheduleYearDates]; arr[i] = e.target.value; set({ scheduleYearDates: arr }); }}
                    className={INPUT} />
                  {form.scheduleYearDates.length > 1 && (
                    <button type="button"
                      onClick={() => set({ scheduleYearDates: form.scheduleYearDates.filter((_, j) => j !== i) })}
                      className="text-slate-400 hover:text-rose-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => set({ scheduleYearDates: [...form.scheduleYearDates, ''] })}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1">
                <Plus className="w-3 h-3" /> Adicionar mais datas
              </button>
            </div>
          )}

          {form.scheduleType && (
            <Field label="Horário">
              <input type="time" value={form.scheduleTime}
                onChange={(e) => set({ scheduleTime: e.target.value })} className={INPUT} />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step 3 ─────────────────────────────────────────────────────────────── */

function Step3({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Para quem será gerada a atividade? *</p>
        <div className="space-y-2">
          {OUTPUT_TYPES.map((t) => (
            <RadioCard key={t.id} name="outputType" value={t.id} checked={form.outputType === t.id}
              label={t.label} onChange={() => set({ outputType: t.id })} />
          ))}
        </div>
      </div>

      {form.outputType === 'especificos' && (
        <Field label="Selecionar Colaboradores">
          <ChipSelect options={COLLABORATORS} selected={form.outputCollaborators}
            onChange={(v) => set({ outputCollaborators: v })} />
        </Field>
      )}
      {form.outputType === 'departamento' && (
        <Field label="Selecionar Departamentos">
          <ChipSelect options={DEPARTMENTS} selected={form.outputDepartments}
            onChange={(v) => set({ outputDepartments: v })} />
        </Field>
      )}
      {form.outputType === 'cargo' && (
        <Field label="Selecionar Cargos">
          <ChipSelect options={POSITIONS} selected={form.outputPositions}
            onChange={(v) => set({ outputPositions: v })} />
        </Field>
      )}
      {form.outputType === 'empresa' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-600 shrink-0" />
          <p className="text-sm text-indigo-700">
            Esta atividade será gerada para <strong>todos os colaboradores</strong> da empresa.
          </p>
        </div>
      )}

      {/* Activity lifecycle statuses */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status da Atividade</p>
        <p className="text-xs text-slate-400 mb-3">Status que esta atividade poderá assumir no seu ciclo de vida:</p>
        <ChipSelect options={ACTIVITY_STATUSES} selected={form.activityStatuses}
          onChange={(v) => set({ activityStatuses: v })} />
      </div>
    </div>
  );
}

/* ── Step 4 ─────────────────────────────────────────────────────────────── */

function Step4({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl">
        <Toggle value={form.alertsEnabled} onChange={() => set({ alertsEnabled: !form.alertsEnabled })} />
        <div>
          <p className="text-sm font-medium text-slate-700">Habilitar Alertas</p>
          <p className="text-xs text-slate-400">Enviar alertas quando a atividade atingir um estado ou valor específico</p>
        </div>
      </div>

      {form.alertsEnabled && (
        <>
          {/* Alert trigger type */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Alerta disparado por</p>
            <div className="grid grid-cols-3 gap-2">
              {(['status', 'quantity', 'percentage'] as const).map((t) => {
                const labels = { status: 'Status', quantity: 'Quantidade', percentage: 'Porcentagem' };
                return (
                  <label key={t} className={`flex items-center justify-center p-2.5 border rounded-xl cursor-pointer text-sm font-medium transition-all ${
                    form.alertTriggerType === t
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="alertTriggerType" value={t} checked={form.alertTriggerType === t}
                      onChange={() => set({ alertTriggerType: t })} className="sr-only" />
                    {labels[t]}
                  </label>
                );
              })}
            </div>
          </div>

          {form.alertTriggerType === 'status' && (
            <Field label="Ao atingir o(s) status">
              <ChipSelect
                options={form.activityStatuses.length ? form.activityStatuses : ACTIVITY_STATUSES}
                selected={form.alertStatuses} onChange={(v) => set({ alertStatuses: v })} />
            </Field>
          )}
          {form.alertTriggerType === 'quantity' && (
            <Field label="Quantidade para disparo">
              <input type="number" value={form.alertQuantity}
                onChange={(e) => set({ alertQuantity: e.target.value })} placeholder="Ex: 10" className={INPUT} />
            </Field>
          )}
          {form.alertTriggerType === 'percentage' && (
            <Field label="Percentual para disparo">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={form.alertPercentage}
                  onChange={(e) => set({ alertPercentage: e.target.value })} placeholder="Ex: 80" className={INPUT} />
                <span className="text-slate-500 text-sm font-medium shrink-0">%</span>
              </div>
            </Field>
          )}

          {/* Alert recipients */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">O alerta vai para</p>
            <div className="space-y-2 mb-3">
              {OUTPUT_TYPES.filter((t) => t.id !== 'grupo').map((t) => (
                <RadioCard key={t.id} name="alertRecipientType" value={t.id}
                  checked={form.alertRecipientType === t.id} label={t.label}
                  onChange={() => set({ alertRecipientType: t.id })} />
              ))}
            </div>
            {form.alertRecipientType === 'especificos' && (
              <Field label="Colaboradores que recebem o alerta">
                <ChipSelect options={COLLABORATORS} selected={form.alertCollaborators}
                  onChange={(v) => set({ alertCollaborators: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'departamento' && (
              <Field label="Departamentos que recebem o alerta">
                <ChipSelect options={DEPARTMENTS} selected={form.alertDepartments}
                  onChange={(v) => set({ alertDepartments: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'cargo' && (
              <Field label="Cargos que recebem o alerta">
                <ChipSelect options={POSITIONS} selected={form.alertPositions}
                  onChange={(v) => set({ alertPositions: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'empresa' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3 mt-2">
                <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-sm text-indigo-700">
                  O alerta será enviado para <strong>todos os colaboradores</strong>.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────────── */

function NewActivityModal({ onCancel, onSave, preset, isEditing, employees }: {
  onCancel: () => void;
  onSave: (f: FormState) => void;
  preset?: Partial<FormState>;
  isEditing?: boolean;
  employees?: HrEmployee[];
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...INIT_FORM, ...preset });
  const set = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  const stepLabels = isEditing
    ? [...FORM_STEPS, 'Funcionários']
    : FORM_STEPS;

  const steps = [
    <Step1 key="1" form={form} set={set} />,
    <Step2 key="2" form={form} set={set} />,
    <Step3 key="3" form={form} set={set} />,
    <Step4 key="4" form={form} set={set} />,
    ...(isEditing ? [<StepFuncionarios key="5" form={form} set={set} employees={employees} />] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{isEditing ? 'Editar Atividade' : 'Nova Atividade'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure gatilho, destino e alertas</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex gap-1.5 overflow-x-auto">
            {stepLabels.map((label, i) => (
              <button key={label} onClick={() => setStep(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  step === i ? 'bg-indigo-600 text-white'
                  : i < step ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {steps[step]}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">Etapa {step + 1} de {stepLabels.length}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">
                ← Anterior
              </button>
            )}
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
            {step < stepLabels.length - 1 ? (
              <button onClick={() => setStep(step + 1)}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
                Próximo →
              </button>
            ) : (
              <button onClick={() => onSave(form)}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
                {isEditing ? 'Salvar Alterações' : 'Criar Atividade'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'A001', name: 'Onboarding Digital',              trigger: 'Gatilho RH',  triggerDetail: 'Admissão registrada no sistema',            assignee: 'Ana Paula Ferreira', department: 'RH',         status: 'Ativa',   chainNext: 'A002', tags: ['Admissão', 'Onboarding'], avgDuration: 480, totalExecutions: 42  },
  { id: 'A002', name: 'Criação de Conta nos Sistemas',   trigger: 'Gatilho RH',  triggerDetail: 'Conclusão do Onboarding Digital',           assignee: 'Carlos Eduardo Lima', department: 'TI',       status: 'Ativa',   chainNext: 'A003', tags: ['Admissão', 'TI'],         avgDuration: 30,  totalExecutions: 42  },
  { id: 'A003', name: 'Treinamento Inicial',             trigger: 'Gatilho RH',  triggerDetail: 'Conta nos sistemas criada',                 assignee: 'Beatriz Souza',       department: 'RH',       status: 'Ativa',   tags: ['Admissão', 'Treinamento'],              avgDuration: 960, totalExecutions: 42  },
  { id: 'A004', name: 'Follow-up de Lead Qualificado',   trigger: 'Gatilho CRM', triggerDetail: 'Lead novo com score ≥ 70 no CRM',           assignee: 'Rafael Nunes',        department: 'Comercial',status: 'Ativa',   chainNext: 'A005', tags: ['CRM', 'Vendas'],          avgDuration: 45,  totalExecutions: 218 },
  { id: 'A005', name: 'Envio de Proposta',               trigger: 'Gatilho CRM', triggerDetail: 'Follow-up concluído sem descarte',          assignee: 'Rafael Nunes',        department: 'Comercial',status: 'Ativa',   tags: ['CRM', 'Vendas'],                        avgDuration: 60,  totalExecutions: 143 },
  { id: 'A006', name: 'Revisão de Contrato Rescisório',  trigger: 'Gatilho ERP', triggerDetail: 'Solicitação de demissão registrada no ERP', assignee: 'Fernanda Oliveira',   department: 'Jurídico', status: 'Pausada', tags: ['Demissão', 'Jurídico'],                 avgDuration: 240, totalExecutions: 7   },
];

const GROUPS: ActivityGroup[] = [
  { tag: 'Admissão',    color: 'bg-blue-100 text-blue-700',      activityCount: 5, avgCycleTime: '2 dias', lastExecution: 'há 3 dias', reportReady: true  },
  { tag: 'CRM',         color: 'bg-emerald-100 text-emerald-700', activityCount: 8, avgCycleTime: '3 h',    lastExecution: 'há 2 h',    reportReady: true  },
  { tag: 'Treinamento', color: 'bg-purple-100 text-purple-700',  activityCount: 3, avgCycleTime: '1 dia',  lastExecution: 'há 1 sem',  reportReady: false },
  { tag: 'Vendas',      color: 'bg-amber-100 text-amber-700',    activityCount: 6, avgCycleTime: '4 h',    lastExecution: 'há 1 h',    reportReady: true  },
  { tag: 'Jurídico',    color: 'bg-rose-100 text-rose-700',      activityCount: 4, avgCycleTime: '5 dias', lastExecution: 'há 2 sem',  reportReady: false },
  { tag: 'TI',          color: 'bg-sky-100 text-sky-700',        activityCount: 4, avgCycleTime: '45 min', lastExecution: 'há 3 dias', reportReady: true  },
];

const COSTS: ActivityCost[] = [
  { id: 'A001', name: 'Onboarding Digital',            laborHours: 8,    hourlyCost: 45, materialCost: 120, logisticsCost: 0,  taxRate: 0.08, revenue: 0     },
  { id: 'A004', name: 'Follow-up de Lead Qualificado', laborHours: 0.75, hourlyCost: 65, materialCost: 0,   logisticsCost: 0,  taxRate: 0.05, revenue: 1200  },
  { id: 'A005', name: 'Envio de Proposta',             laborHours: 1,    hourlyCost: 65, materialCost: 15,  logisticsCost: 0,  taxRate: 0.05, revenue: 8500  },
  { id: 'A006', name: 'Revisão Contrato Rescisório',   laborHours: 4,    hourlyCost: 90, materialCost: 30,  logisticsCost: 80, taxRate: 0.09, revenue: 0     },
  { id: 'A003', name: 'Treinamento Inicial',           laborHours: 16,   hourlyCost: 45, materialCost: 250, logisticsCost: 0,  taxRate: 0.08, revenue: 0     },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getChain(activities: Activity[], startId: string): Activity[] {
  const chain: Activity[] = [];
  let current: Activity | undefined = activities.find((a) => a.id === startId);
  while (current) {
    chain.push(current);
    current = current.chainNext ? activities.find((a) => a.id === current!.chainNext) : undefined;
  }
  return chain;
}

const TRIGGER_BADGE: Record<TriggerType, string> = {
  'Manual':       'bg-slate-100 text-slate-600',
  'Gatilho CRM':  'bg-emerald-100 text-emerald-700',
  'Gatilho ERP':  'bg-blue-100 text-blue-700',
  'Gatilho RH':   'bg-purple-100 text-purple-700',
  'Agendado':     'bg-amber-100 text-amber-700',
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  'Ativa':     'bg-green-100 text-green-700',
  'Pausada':   'bg-amber-100 text-amber-700',
  'Concluída': 'bg-slate-100 text-slate-500',
  'Rascunho':  'bg-rose-100 text-rose-600',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function AutomationTab({ activities, onNewActivity, onEdit, onToggleStatus }: {
  activities: Activity[];
  onNewActivity: () => void;
  onEdit: (act: Activity) => void;
  onToggleStatus: (act: Activity) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const chainNextIds = new Set(activities.filter((a) => a.chainNext).map((a) => a.chainNext!));
  const chainRoots   = activities.filter((a) => !chainNextIds.has(a.id) && a.chainNext);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onNewActivity}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      {/* Chain flow visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" /> Fluxos em Cadeia
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Uma atividade concluída dispara automaticamente a próxima na cadeia</p>
        </div>
        <div className="p-5 space-y-4">
          {chainRoots.map((root) => {
            const chain = getChain(activities, root.id);
            return (
              <div key={root.id} className="bg-slate-50/60 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Gatilho: {root.triggerDetail}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {chain.map((act, i) => (
                    <div key={act.id} className="flex items-center gap-2">
                      <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-indigo-800">{act.name}</p>
                        <p className="text-[10px] text-slate-400">{act.assignee} · {fmtDuration(act.avgDuration)}</p>
                      </div>
                      {i < chain.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {chainRoots.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum fluxo em cadeia configurado.</p>
          )}
        </div>
      </div>

      {/* Full activity list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Todas as Atividades</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {activities.map((act) => (
            <div key={act.id} className="hover:bg-slate-50/40 transition-colors">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(expanded === act.id ? null : act.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 text-sm">{act.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRIGGER_BADGE[act.trigger]}`}>
                      {act.trigger}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[act.status]}`}>
                      {act.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{act.triggerDetail} · {act.assignee} · {act.department}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{act.totalExecutions}</p>
                    <p className="text-[10px] text-slate-400">execuções</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{fmtDuration(act.avgDuration)}</p>
                    <p className="text-[10px] text-slate-400">tempo médio</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {act.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              {expanded === act.id && (
                <div className="px-5 pb-4 bg-slate-50/40 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-4 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Departamento</p>
                      <p className="font-medium text-slate-700">{act.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Responsável</p>
                      <p className="font-medium text-slate-700">{act.assignee}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Próxima na cadeia</p>
                      <p className="font-medium text-slate-700">
                        {act.chainNext
                          ? (activities.find((a) => a.id === act.chainNext)?.name ?? '—')
                          : '— fim da cadeia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => onEdit(act)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Editar</button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Adicionar à Cadeia</button>
                    {act.status === 'Ativa'
                      ? <button onClick={() => onToggleStatus(act)} className="px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100">Pausar</button>
                      : <button onClick={() => onToggleStatus(act)} className="px-3 py-1.5 text-xs font-semibold bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100">Reativar</button>
                    }
                  </div>
                </div>
              )}
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-12">Nenhuma atividade cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Agrupamentos automáticos por tag para geração de relatórios gerenciais</p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Nova Tag / Grupo
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {GROUPS.map((g) => (
          <div key={g.tag} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${g.color}`}>
                <Tag className="w-3 h-3" /> {g.tag}
              </span>
              {g.reportReady
                ? <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Relatório disponível</span>
                : <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Processando</span>
              }
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Atividades',        value: g.activityCount.toString() },
                { label: 'Tempo médio ciclo', value: g.avgCycleTime             },
                { label: 'Última execução',   value: g.lastExecution            },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Ver Atividades</button>
              {g.reportReady && (
                <button className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-100">Gerar Relatório</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostingTab() {
  function totalCost(c: ActivityCost): number {
    const labor = c.laborHours * c.hourlyCost;
    const sub   = labor + c.materialCost + c.logisticsCost;
    return sub * (1 + c.taxRate);
  }

  function roi(c: ActivityCost): number | null {
    if (c.revenue === 0) return null;
    const cost = totalCost(c);
    return ((c.revenue - cost) / cost) * 100;
  }

  const grandCost    = COSTS.reduce((s, c) => s + totalCost(c), 0);
  const grandRevenue = COSTS.reduce((s, c) => s + c.revenue, 0);
  const grandROI     = grandRevenue > 0 ? ((grandRevenue - grandCost) / grandCost) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 text-sm text-indigo-700">
        <span className="font-semibold">Activity-Based Costing (ABC):</span> consolida custo de mão de obra
        (horas × salário), materiais diretos, custos logísticos (frota/veículos integrados) e impostos —
        permitindo cálculo de ROI por atividade.
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Custo Total Operacional', value: fmt(grandCost)                                        },
          { label: 'Receita Associada',        value: fmt(grandRevenue)                                    },
          { label: 'ROI Ponderado',            value: grandROI !== null ? `${grandROI.toFixed(1)}%` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Atividade', 'Mão de Obra', 'Materiais', 'Logística', 'Impostos', 'Custo Total', 'ROI'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'text-left px-5' : i === 6 ? 'text-right px-5' : 'text-right px-4'} py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {COSTS.map((c) => {
                const labor  = c.laborHours * c.hourlyCost;
                const sub    = labor + c.materialCost + c.logisticsCost;
                const taxes  = sub * c.taxRate;
                const total  = sub + taxes;
                const roiVal = roi(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(labor)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(c.materialCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(c.logisticsCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(taxes)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(total)}</td>
                    <td className="px-5 py-3 text-right">
                      {roiVal === null
                        ? <span className="text-slate-400 text-xs">N/A</span>
                        : <span className={`font-bold ${roiVal >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                            {roiVal >= 0 ? '+' : ''}{roiVal.toFixed(1)}%
                          </span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-5 py-3 text-xs font-semibold text-slate-500" colSpan={5}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(grandCost)}</td>
                <td className="px-5 py-3 text-right font-bold text-green-600">
                  {grandROI !== null ? `+${grandROI.toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'automation', label: 'Cadastro e Automação' },
  { id: 'groups',     label: 'Grupos de Atividades' },
  { id: 'costing',    label: 'Custeio ABC'           },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Activities() {
  const [tab, setTab]                   = useState<TabId>('automation');
  const [showForm, setShowForm]         = useState(false);
  const [activities, setActivities]     = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [initForm, setInitForm]         = useState<Partial<FormState>>({});
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [employees, setEmployees]       = useState<HrEmployee[]>([]);

  useEffect(() => { getEmployees().then(setEmployees).catch(console.error); }, []);

  useEffect(() => {
    getHrActivities().then((data) => {
      if (!data.length) return;
      const mapped: Activity[] = data.map((a) => ({
        id:              a.id,
        name:            a.title,
        trigger:         'Manual' as TriggerType,
        triggerDetail:   a.description ?? 'Criada manualmente',
        assignee:        a.employee_name ?? '—',
        department:      a.project ?? 'Geral',
        status:          (['Ativa','Pausada','Concluída','Rascunho'].includes(a.status) ? a.status : 'Ativa') as TaskStatus,
        tags:            a.tags ?? [],
        avgDuration:     0,
        totalExecutions: 0,
      }));
      setActivities([...INITIAL_ACTIVITIES, ...mapped]);
    }).catch(console.error);
  }, []);

  const handleSave = async (form: FormState) => {
    const modCfg   = form.triggerModule ? MODULES[form.triggerModule] : null;
    const subLabel = modCfg && form.triggerSubModule
      ? modCfg.subModules[form.triggerSubModule]?.label ?? form.triggerSubModule
      : '';
    const triggerType: TriggerType = modCfg ? modCfg.triggerType : 'Manual';
    const detail = [subLabel, form.triggerAction].filter(Boolean).join(' — ');
    const assign = form.presetEmployee ?? form.outputCollaborators[0] ?? form.alertCollaborators[0] ?? '—';
    const empRecord = assign !== '—' ? employees.find((e) => e.full_name === assign) : null;

    try {
      if (editingActivity) {
        // Preserve original dept/tags when editing via the Funcionários step
        const dept = form.outputDepartments[0] || editingActivity.department || 'Geral';
        const tags = modCfg
          ? [modCfg.label, subLabel].filter(Boolean)
          : editingActivity.tags;
        const updated: Activity = {
          ...editingActivity,
          name:       form.name || editingActivity.name,
          assignee:   assign,
          department: dept,
          tags,
        };
        try {
          await updateHrActivity(editingActivity.id, {
            title:         updated.name,
            description:   form.description || null,
            tags,
            project:       dept,
            employee_name: assign !== '—' ? assign : null,
            employee_id:   empRecord?.id ?? null,
          });
        } catch (err) { console.error('Erro ao atualizar atividade:', err); }
        setActivities((prev) => prev.map((a) => a.id === editingActivity.id ? updated : a));
      } else {
        // Create new — always 'Ativa'
        const dept = form.outputDepartments[0] ?? form.outputType ?? 'Geral';
        const tags = [modCfg ? modCfg.label : '', subLabel].filter(Boolean);
        const newActivity: Activity = {
          id:              `A${String(activities.length + 1).padStart(3, '0')}`,
          name:            form.name || 'Nova Atividade',
          trigger:         triggerType,
          triggerDetail:   detail || 'Gatilho configurado',
          assignee:        assign,
          department:      dept,
          status:          'Ativa',
          tags,
          avgDuration:     0,
          totalExecutions: 0,
        };
        try {
          await createHrActivity({
            title:         newActivity.name,
            description:   form.description || null,
            priority:      'Média',
            status:        'Ativa',
            tags,
            due_date:      form.triggerDate || null,
            project:       dept,
            employee_name: assign !== '—' ? assign : null,
            employee_id:   empRecord?.id ?? null,
          });
        } catch (err) { console.error('Erro ao salvar atividade:', err); }
        setActivities((prev) => [...prev, newActivity]);
      }
    } finally {
      setShowForm(false);
      setInitForm({});
      setEditingActivity(null);
    }
  };

  return (
    <div className="p-8">
      {showForm && (
        <NewActivityModal
          onCancel={() => { setShowForm(false); setInitForm({}); setEditingActivity(null); }}
          onSave={handleSave}
          preset={initForm}
          isEditing={!!editingActivity}
          employees={employees}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Atividades</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tarefas manuais e automatizadas por gatilhos de sistema, com fluxos em cadeia e custeio integrado por atividade
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'automation' && (
        <AutomationTab
          activities={activities}
          onNewActivity={() => setShowForm(true)}
          onEdit={(act) => {
            setEditingActivity(act);
            setInitForm({ name: act.name, presetEmployee: act.assignee !== '—' ? act.assignee : undefined });
            setShowForm(true);
          }}
          onToggleStatus={(act) => {
            const newStatus: Activity['status'] = act.status === 'Ativa' ? 'Pausada' : 'Ativa';
            setActivities((prev) => prev.map((a) => a.id === act.id ? { ...a, status: newStatus } : a));
            updateHrActivity(act.id, { status: newStatus }).catch(console.error);
          }}
        />
      )}
      {tab === 'groups'     && <GroupsTab />}
      {tab === 'costing'    && <CostingTab />}
    </div>
  );
}
