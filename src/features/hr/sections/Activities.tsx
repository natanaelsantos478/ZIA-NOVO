import { useState } from 'react';
import {
  Plus, Search, Zap, Target, Bell, Users,
  CheckCircle, Clock, AlertCircle, MoreHorizontal, X,
} from 'lucide-react';

// ---- Types ----

type ModuleKey = 'RH' | 'VENDAS' | 'LOGISTICA' | 'INVENTARIO' | 'QUALIDADE' | 'DOCUMENTOS' | 'BACKOFFICE';

interface SubModuleConfig {
  label: string;
  actions: string[];
}

interface ModuleConfig {
  label: string;
  subModules: Record<string, SubModuleConfig>;
}

interface ActivityRecord {
  id: string;
  name: string;
  description: string;
  triggerModule: string;
  triggerSubModule: string;
  triggerType: string;
  outputType: string;
  status: 'Ativo' | 'Inativo' | 'Rascunho';
  createdAt: string;
}

// ---- Static Configuration ----

const MODULES: Record<ModuleKey, ModuleConfig> = {
  RH: {
    label: 'Recursos Humanos',
    subModules: {
      ponto:        { label: 'Ponto Eletrônico',          actions: ['Falta registrada', 'Horas extras acumuladas', 'Atraso registrado', 'Marcação irregular'] },
      folha:        { label: 'Folha de Pagamento',         actions: ['Folha processada', 'Ajuste solicitado', 'Aprovação pendente', 'Pagamento realizado'] },
      ferias:       { label: 'Férias',                     actions: ['Férias programadas', 'Aprovação de férias', 'Início de férias', 'Pagamento de férias'] },
      beneficios:   { label: 'Benefícios',                 actions: ['Benefício concedido', 'Benefício atualizado', 'Vencimento de benefício'] },
      avaliacao:    { label: 'Avaliação de Desempenho',    actions: ['Avaliação aberta', 'Avaliação concluída', 'Meta atingida', 'Meta não atingida'] },
      admissao:     { label: 'Admissão',                   actions: ['Nova admissão', 'Documentação pendente', 'Admissão aprovada'] },
      desligamento: { label: 'Desligamento',               actions: ['Desligamento solicitado', 'Aviso prévio iniciado', 'Rescisão processada'] },
    },
  },
  VENDAS: {
    label: 'Vendas & CRM',
    subModules: {
      pipeline: { label: 'Pipeline',             actions: ['Novo negócio criado', 'Negócio avançou de etapa', 'Negócio perdido', 'Quantidade de negócios atingida'] },
      proposta: { label: 'Proposta Comercial',   actions: ['Proposta enviada', 'Proposta aprovada', 'Proposta rejeitada', 'Proposta vencida'] },
      contrato: { label: 'Contratos',            actions: ['Contrato assinado', 'Contrato vencendo', 'Renovação pendente'] },
      meta:     { label: 'Metas de Vendas',      actions: ['Meta atingida', 'Meta em risco', 'Porcentagem de meta alcançada'] },
      leads:    { label: 'Leads',                actions: ['Novo lead recebido', 'Lead qualificado', 'Lead convertido', 'Quantidade de leads atingida'] },
    },
  },
  LOGISTICA: {
    label: 'Logística',
    subModules: {
      entrega:       { label: 'Entregas',       actions: ['Entrega realizada', 'Atraso na entrega detectado', 'Quantidade de entregas atingida', 'Entrega retornada'] },
      expedicao:     { label: 'Expedição',      actions: ['Volume expedido atingido', 'Velocidade de expedição alcançada', 'Expedição concluída'] },
      rota:          { label: 'Rotas',          actions: ['Rota iniciada', 'Rota concluída', 'Desvio de rota detectado'] },
      transportadora:{ label: 'Transportadoras',actions: ['SLA atingido', 'SLA em risco', 'Ocorrência registrada'] },
    },
  },
  INVENTARIO: {
    label: 'Inventário e Ativos',
    subModules: {
      estoque:    { label: 'Estoque',               actions: ['Quantidade mínima atingida', 'Quantidade máxima atingida', 'Entrada de estoque', 'Saída de estoque'] },
      ativo:      { label: 'Ativos',                actions: ['Manutenção programada', 'Ativo em uso', 'Ativo disponível', 'Depreciação registrada'] },
      inventario: { label: 'Contagem de Inventário',actions: ['Inventário iniciado', 'Divergência encontrada', 'Inventário concluído'] },
    },
  },
  QUALIDADE: {
    label: 'Qualidade (SGQ)',
    subModules: {
      nc:          { label: 'Não Conformidade',         actions: ['NC aberta', 'Quantidade de NCs atingida', 'NC crítica identificada', 'Prazo de NC vencendo'] },
      auditoria:   { label: 'Auditoria',               actions: ['Auditoria programada', 'Auditoria iniciada', 'NC em auditoria', 'Auditoria concluída'] },
      indicadores: { label: 'Indicadores de Qualidade',actions: ['Meta atingida', 'Indicador abaixo da meta', 'Desvio crítico detectado'] },
      calibracao:  { label: 'Calibração',              actions: ['Calibração vencendo', 'Calibração realizada', 'Instrumento fora de calibração'] },
    },
  },
  DOCUMENTOS: {
    label: 'Documentos',
    subModules: {
      aprovacao: { label: 'Aprovação',  actions: ['Documento pendente de aprovação', 'Documento aprovado', 'Documento rejeitado'] },
      vencimento:{ label: 'Vencimento', actions: ['Documento vencendo', 'Documento vencido', 'Renovação necessária'] },
      revisao:   { label: 'Revisão',    actions: ['Revisão solicitada', 'Revisão em andamento', 'Revisão concluída'] },
    },
  },
  BACKOFFICE: {
    label: 'Back Office / Financeiro',
    subModules: {
      financeiro: { label: 'Financeiro',      actions: ['Pagamento realizado', 'Pagamento em atraso', 'Conta a pagar vencendo', 'Meta financeira atingida'] },
      fiscal:     { label: 'Fiscal',          actions: ['Obrigação fiscal vencendo', 'NF emitida', 'NF cancelada'] },
      contabil:   { label: 'Contabilidade',   actions: ['Fechamento mensal', 'Lançamento contábil', 'Conciliação pendente'] },
    },
  },
};

const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

const TRIGGER_TYPES = [
  { id: 'quantidade',    label: 'Quantidade',       desc: 'Dispara ao atingir uma quantidade específica' },
  { id: 'velocidade',    label: 'Velocidade',        desc: 'Dispara ao atingir uma taxa ou velocidade de entrada' },
  { id: 'data',          label: 'Data / Prazo',      desc: 'Dispara em uma data ou X dias antes/após' },
  { id: 'porcentagem',   label: 'Porcentagem',       desc: 'Dispara ao atingir um percentual de meta' },
  { id: 'status_change', label: 'Mudança de Status', desc: 'Dispara quando o registro mudar de status' },
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

const SAMPLE_ACTIVITIES: ActivityRecord[] = [
  { id: 'ACT001', name: 'Alerta de Faltas Excessivas',  description: 'Notifica o RH quando um funcionário atinge 3 faltas no mês', triggerModule: 'RH',         triggerSubModule: 'Ponto Eletrônico',     triggerType: 'Quantidade',    outputType: 'Por Departamento',           status: 'Ativo',    createdAt: '2025-01-15' },
  { id: 'ACT002', name: 'Meta de Vendas Atingida',      description: 'Parabéns e bonificação quando executivo atinge 100% da meta',  triggerModule: 'VENDAS',     triggerSubModule: 'Metas de Vendas',      triggerType: 'Porcentagem',   outputType: 'Colaboradores Específicos',  status: 'Ativo',    createdAt: '2025-01-20' },
  { id: 'ACT003', name: 'Estoque em Nível Crítico',     description: 'Alerta quando estoque atingir a quantidade mínima definida',   triggerModule: 'INVENTARIO', triggerSubModule: 'Estoque',              triggerType: 'Quantidade',    outputType: 'Por Cargo',                  status: 'Ativo',    createdAt: '2025-02-01' },
  { id: 'ACT004', name: 'Documento Vencendo em 30d',    description: 'Avisa 30 dias antes do vencimento de documentos críticos',     triggerModule: 'DOCUMENTOS', triggerSubModule: 'Vencimento',           triggerType: 'Data / Prazo',  outputType: 'Por Cargo',                  status: 'Ativo',    createdAt: '2025-02-10' },
  { id: 'ACT005', name: 'NCs Críticas em Alta',         description: 'Dispara quando houver 5 ou mais NCs abertas de severidade alta',triggerModule: 'QUALIDADE',  triggerSubModule: 'Não Conformidade',     triggerType: 'Quantidade',    outputType: 'Por Departamento',           status: 'Rascunho', createdAt: '2025-02-20' },
];

// ---- Form State ----

interface FormState {
  // Step 1
  name: string;
  description: string;
  // Step 2 – Trigger
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
  // Step 3 – Output
  outputType: string;
  outputCollaborators: string[];
  outputDepartments: string[];
  outputPositions: string[];
  activityStatuses: string[];
  // Step 4 – Alerts
  alertsEnabled: boolean;
  alertTriggerType: 'status' | 'quantity' | 'percentage';
  alertStatuses: string[];
  alertQuantity: string;
  alertPercentage: string;
  alertRecipientType: string;
  alertCollaborators: string[];
  alertDepartments: string[];
  alertPositions: string[];
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
  outputType: '', outputCollaborators: [], outputDepartments: [], outputPositions: [],
  activityStatuses: ['Pendente', 'Em Andamento', 'Concluída'],
  alertsEnabled: false, alertTriggerType: 'status',
  alertStatuses: [], alertQuantity: '', alertPercentage: '',
  alertRecipientType: 'especificos',
  alertCollaborators: [], alertDepartments: [], alertPositions: [],
};

const STEPS = ['Informações Básicas', 'Gatilho de Entrada', 'Saída / Destino', 'Alertas'];

// ---- Chip multi-select ----

function ChipSelect({ options, selected, onChange }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selected.includes(o)
              ? 'bg-pink-600 text-white border-pink-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ---- Toggle switch ----

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-pink-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ---- Radio card option ----

function RadioCard({ name, value, checked, label, onChange }: {
  name: string; value: string; checked: boolean; label: string; onChange: () => void;
}) {
  return (
    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
      checked ? 'border-pink-400 bg-pink-50' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-pink-600" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

// ---- Form field wrapper ----

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white';

// ---- Step 1: Basic Info ----

function Step1({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      <Field label="Nome da Atividade *">
        <input
          type="text"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Ex: Alerta de Faltas Excessivas"
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Descreva o objetivo e funcionamento desta atividade..."
          rows={4}
          className={`${INPUT_CLS} resize-none`}
        />
      </Field>
    </div>
  );
}

// ---- Step 2: Trigger ----

function Step2({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  const moduleCfg = form.triggerModule ? MODULES[form.triggerModule] : null;
  const subModuleKeys = moduleCfg ? Object.keys(moduleCfg.subModules) : [];
  const subModuleCfg = moduleCfg && form.triggerSubModule ? moduleCfg.subModules[form.triggerSubModule] : null;

  return (
    <div className="space-y-5">
      {/* Module */}
      <Field label="Módulo *">
        <select
          value={form.triggerModule}
          onChange={(e) => set({ triggerModule: e.target.value as ModuleKey, triggerSubModule: '', triggerAction: '' })}
          className={INPUT_CLS}
        >
          <option value="">Selecionar módulo...</option>
          {MODULE_KEYS.map((k) => <option key={k} value={k}>{MODULES[k].label}</option>)}
        </select>
      </Field>

      {/* Sub-module */}
      {form.triggerModule && (
        <Field label="Assunto / Submódulo *">
          <select
            value={form.triggerSubModule}
            onChange={(e) => set({ triggerSubModule: e.target.value, triggerAction: '' })}
            className={INPUT_CLS}
          >
            <option value="">Selecionar assunto...</option>
            {subModuleKeys.map((k) => <option key={k} value={k}>{moduleCfg!.subModules[k].label}</option>)}
          </select>
        </Field>
      )}

      {/* Action */}
      {subModuleCfg && (
        <Field label="Ação / Evento *">
          <select
            value={form.triggerAction}
            onChange={(e) => set({ triggerAction: e.target.value })}
            className={INPUT_CLS}
          >
            <option value="">Selecionar ação...</option>
            {subModuleCfg.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
      )}

      {/* Collaborator toggle */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Toggle value={form.hasTriggerCollaborator} onChange={() => set({ hasTriggerCollaborator: !form.hasTriggerCollaborator, triggerCollaborator: '' })} />
          <span className="text-sm font-medium text-slate-700">Gatilho vem de um colaborador específico?</span>
        </div>
        {form.hasTriggerCollaborator && (
          <Field label="Selecionar Colaborador">
            <select value={form.triggerCollaborator} onChange={(e) => set({ triggerCollaborator: e.target.value })} className={INPUT_CLS}>
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
            <label
              key={t.id}
              className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                form.triggerType === t.id ? 'border-pink-400 bg-pink-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input type="radio" name="triggerType" value={t.id} checked={form.triggerType === t.id} onChange={() => set({ triggerType: t.id })} className="mt-0.5 accent-pink-600" />
              <div>
                <p className="text-sm font-medium text-slate-700">{t.label}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Trigger parameters */}
      {form.triggerType === 'quantidade' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parâmetros de Quantidade</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade *">
              <input type="number" value={form.triggerQuantity} onChange={(e) => set({ triggerQuantity: e.target.value })} placeholder="Ex: 3" className={INPUT_CLS} />
            </Field>
            <Field label="Período">
              <select value={form.triggerQuantityPeriod} onChange={(e) => set({ triggerQuantityPeriod: e.target.value })} className={INPUT_CLS}>
                <option value="">Sem período</option>
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
              <input type="number" value={form.triggerVelocityValue} onChange={(e) => set({ triggerVelocityValue: e.target.value })} placeholder="Ex: 50" className={INPUT_CLS} />
            </Field>
            <Field label="Unidade de Tempo">
              <select value={form.triggerVelocityUnit} onChange={(e) => set({ triggerVelocityUnit: e.target.value })} className={INPUT_CLS}>
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
              <input type="date" value={form.triggerDate} onChange={(e) => set({ triggerDate: e.target.value })} className={INPUT_CLS} />
            </Field>
            <Field label="Dias antes (negativo) / depois">
              <input type="number" value={form.triggerDaysOffset} onChange={(e) => set({ triggerDaysOffset: e.target.value })} placeholder="Ex: -30" className={INPUT_CLS} />
            </Field>
          </div>
        </div>
      )}

      {form.triggerType === 'porcentagem' && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Parâmetros de Porcentagem</p>
          <Field label="Percentual de Gatilho *">
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" value={form.triggerPercentage} onChange={(e) => set({ triggerPercentage: e.target.value })} placeholder="Ex: 80" className={INPUT_CLS} />
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
              <select value={form.triggerStatusFrom} onChange={(e) => set({ triggerStatusFrom: e.target.value })} className={INPUT_CLS}>
                <option value="">Qualquer status</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Para Status *">
              <select value={form.triggerStatusTo} onChange={(e) => set({ triggerStatusTo: e.target.value })} className={INPUT_CLS}>
                <option value="">Selecionar...</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Step 3: Output ----

function Step3({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Para quem será gerada a atividade? *</p>
        <div className="space-y-2">
          {OUTPUT_TYPES.map((t) => (
            <RadioCard key={t.id} name="outputType" value={t.id} checked={form.outputType === t.id} label={t.label} onChange={() => set({ outputType: t.id })} />
          ))}
        </div>
      </div>

      {form.outputType === 'especificos' && (
        <Field label="Selecionar Colaboradores">
          <ChipSelect options={COLLABORATORS} selected={form.outputCollaborators} onChange={(v) => set({ outputCollaborators: v })} />
        </Field>
      )}
      {form.outputType === 'departamento' && (
        <Field label="Selecionar Departamentos">
          <ChipSelect options={DEPARTMENTS} selected={form.outputDepartments} onChange={(v) => set({ outputDepartments: v })} />
        </Field>
      )}
      {form.outputType === 'cargo' && (
        <Field label="Selecionar Cargos">
          <ChipSelect options={POSITIONS} selected={form.outputPositions} onChange={(v) => set({ outputPositions: v })} />
        </Field>
      )}
      {form.outputType === 'empresa' && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-pink-600 shrink-0" />
          <p className="text-sm text-pink-700">Esta atividade será enviada para <strong>todos os colaboradores</strong> da empresa.</p>
        </div>
      )}

      {/* Activity lifecycle statuses */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status da Atividade</p>
        <p className="text-xs text-slate-400 mb-3">Selecione os status que esta atividade poderá assumir no seu ciclo de vida:</p>
        <ChipSelect options={ACTIVITY_STATUSES} selected={form.activityStatuses} onChange={(v) => set({ activityStatuses: v })} />
      </div>
    </div>
  );
}

// ---- Step 4: Alerts ----

function Step4({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      {/* Enable */}
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
                  <label
                    key={t}
                    className={`flex items-center justify-center p-2.5 border rounded-xl cursor-pointer text-sm font-medium transition-all ${
                      form.alertTriggerType === t ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="alertTriggerType" value={t} checked={form.alertTriggerType === t} onChange={() => set({ alertTriggerType: t })} className="sr-only" />
                    {labels[t]}
                  </label>
                );
              })}
            </div>
          </div>

          {form.alertTriggerType === 'status' && (
            <Field label="Ao atingir o(s) status">
              <ChipSelect options={form.activityStatuses.length ? form.activityStatuses : ACTIVITY_STATUSES} selected={form.alertStatuses} onChange={(v) => set({ alertStatuses: v })} />
            </Field>
          )}

          {form.alertTriggerType === 'quantity' && (
            <Field label="Quantidade para disparo">
              <input type="number" value={form.alertQuantity} onChange={(e) => set({ alertQuantity: e.target.value })} placeholder="Ex: 10" className={INPUT_CLS} />
            </Field>
          )}

          {form.alertTriggerType === 'percentage' && (
            <Field label="Percentual para disparo">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={form.alertPercentage} onChange={(e) => set({ alertPercentage: e.target.value })} placeholder="Ex: 80" className={INPUT_CLS} />
                <span className="text-slate-500 text-sm font-medium shrink-0">%</span>
              </div>
            </Field>
          )}

          {/* Alert recipients */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">O alerta vai para</p>
            <div className="space-y-2 mb-3">
              {OUTPUT_TYPES.filter((t) => t.id !== 'grupo').map((t) => (
                <RadioCard key={t.id} name="alertRecipientType" value={t.id} checked={form.alertRecipientType === t.id} label={t.label} onChange={() => set({ alertRecipientType: t.id })} />
              ))}
            </div>
            {form.alertRecipientType === 'especificos' && (
              <Field label="Colaboradores que recebem o alerta">
                <ChipSelect options={COLLABORATORS} selected={form.alertCollaborators} onChange={(v) => set({ alertCollaborators: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'departamento' && (
              <Field label="Departamentos que recebem o alerta">
                <ChipSelect options={DEPARTMENTS} selected={form.alertDepartments} onChange={(v) => set({ alertDepartments: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'cargo' && (
              <Field label="Cargos que recebem o alerta">
                <ChipSelect options={POSITIONS} selected={form.alertPositions} onChange={(v) => set({ alertPositions: v })} />
              </Field>
            )}
            {form.alertRecipientType === 'empresa' && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 flex items-center gap-3 mt-2">
                <Bell className="w-4 h-4 text-pink-600 shrink-0" />
                <p className="text-sm text-pink-700">O alerta será enviado para <strong>todos os colaboradores</strong>.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Modal form ----

function NewActivityModal({ onCancel, onSave }: { onCancel: () => void; onSave: (f: FormState) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INIT_FORM);
  const set = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const stepContent = [
    <Step1 key="1" form={form} set={set} />,
    <Step2 key="2" form={form} set={set} />,
    <Step3 key="3" form={form} set={set} />,
    <Step4 key="4" form={form} set={set} />,
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Nova Atividade</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure gatilho, destino e alertas</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex gap-1.5 overflow-x-auto">
            {STEPS.map((label, i) => (
              <button
                key={label}
                onClick={() => setStep(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  step === i ? 'bg-pink-600 text-white' : i < step ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stepContent[step]}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">Etapa {step + 1} de {STEPS.length}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">
                ← Anterior
              </button>
            )}
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
                Próximo →
              </button>
            ) : (
              <button onClick={() => onSave(form)} className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
                Criar Atividade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Status / badge configs ----

const STATUS_CFG: Record<ActivityRecord['status'], { color: string; icon: React.ElementType }> = {
  Ativo:    { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  Inativo:  { color: 'bg-slate-100 text-slate-500',  icon: AlertCircle },
  Rascunho: { color: 'bg-amber-100 text-amber-700',  icon: Clock },
};

const MODULE_BADGE: Record<string, string> = {
  RH:         'bg-pink-100 text-pink-700',
  VENDAS:     'bg-blue-100 text-blue-700',
  LOGISTICA:  'bg-amber-100 text-amber-700',
  INVENTARIO: 'bg-emerald-100 text-emerald-700',
  QUALIDADE:  'bg-purple-100 text-purple-700',
  DOCUMENTOS: 'bg-indigo-100 text-indigo-700',
  BACKOFFICE: 'bg-slate-100 text-slate-600',
};

// ---- Main Activities section ----

export default function Activities() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activities, setActivities] = useState<ActivityRecord[]>(SAMPLE_ACTIVITIES);

  const filtered = activities.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Total de Atividades', value: activities.length,                                       icon: Zap,         color: 'text-pink-600 bg-pink-50'   },
    { label: 'Ativas',             value: activities.filter((a) => a.status === 'Ativo').length,   icon: CheckCircle, color: 'text-green-600 bg-green-50'  },
    { label: 'Rascunhos',          value: activities.filter((a) => a.status === 'Rascunho').length,icon: Clock,       color: 'text-amber-600 bg-amber-50'  },
    { label: 'Módulos Cobertos',   value: new Set(activities.map((a) => a.triggerModule)).size,    icon: Target,      color: 'text-blue-600 bg-blue-50'    },
  ];

  const handleSave = (form: FormState) => {
    const moduleCfg = form.triggerModule ? MODULES[form.triggerModule as ModuleKey] : null;
    const subLabel = moduleCfg && form.triggerSubModule
      ? moduleCfg.subModules[form.triggerSubModule]?.label ?? form.triggerSubModule
      : '';
    const triggerLabel = TRIGGER_TYPES.find((t) => t.id === form.triggerType)?.label ?? form.triggerType;
    const outputLabel  = OUTPUT_TYPES.find((t) => t.id === form.outputType)?.label ?? form.outputType;

    setActivities((prev) => [
      ...prev,
      {
        id: `ACT${String(prev.length + 1).padStart(3, '0')}`,
        name: form.name || 'Nova Atividade',
        description: form.description,
        triggerModule: form.triggerModule,
        triggerSubModule: subLabel,
        triggerType: triggerLabel,
        outputType: outputLabel,
        status: 'Rascunho',
        createdAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setShowForm(false);
  };

  return (
    <div className="p-8">
      {showForm && <NewActivityModal onCancel={() => setShowForm(false)} onSave={handleSave} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Atividades</h1>
          <p className="text-slate-500 text-sm mt-1">Automatize atividades baseadas em gatilhos dos módulos da plataforma</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Criar Atividade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Atividades Configuradas</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar atividade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Atividade</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Módulo / Assunto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gatilho</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Destino</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((a) => {
                const cfg = STATUS_CFG[a.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-xs">{a.name}</p>
                          <p className="text-xs text-slate-400 max-w-[200px] truncate">{a.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_BADGE[a.triggerModule] ?? 'bg-slate-100 text-slate-600'}`}>
                        {MODULES[a.triggerModule as ModuleKey]?.label ?? a.triggerModule}
                      </span>
                      {a.triggerSubModule && <p className="text-xs text-slate-400 mt-0.5">{a.triggerSubModule}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">{a.triggerType}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{a.outputType}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />{a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{a.createdAt}</td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhuma atividade encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
