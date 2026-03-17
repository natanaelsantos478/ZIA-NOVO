// ─────────────────────────────────────────────────────────────────────────────
// Permissions — Controle de Acesso Global da IA
// O que a IA pode e não pode acessar no sistema
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Eye, Edit3,
  Lock, AlertTriangle, CheckCircle2, Save, RotateCcw,
  Users, FileText, Package, DollarSign, Award, Globe,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  label: string;
  desc: string;
  read: boolean;
  write: boolean;
  sensitive: boolean;
}

interface PermissionGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  perms: Permission[];
}

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_GROUPS: PermissionGroup[] = [
  {
    id: 'crm', label: 'CRM', icon: Users, color: 'text-purple-400',
    perms: [
      { id: 'crm.clients',   label: 'Dados de Clientes',   desc: 'Razão social, CNPJ, contatos, histórico',       read: true,  write: false, sensitive: false },
      { id: 'crm.deals',     label: 'Negociações / Deals', desc: 'Pipeline, proposta, valores, etapas',            read: true,  write: true,  sensitive: false },
      { id: 'crm.contacts',  label: 'Contatos Pessoais',   desc: 'Nome, e-mail, telefone de pessoas físicas',     read: true,  write: false, sensitive: true  },
      { id: 'crm.proposals', label: 'Propostas Comerciais',desc: 'Conteúdo completo de propostas enviadas',        read: false, write: false, sensitive: true  },
    ],
  },
  {
    id: 'hr', label: 'RH', icon: Users, color: 'text-pink-400',
    perms: [
      { id: 'hr.employees',  label: 'Dados de Colaboradores', desc: 'Nome, cargo, departamento, admissão',      read: true,  write: false, sensitive: false },
      { id: 'hr.payroll',    label: 'Folha de Pagamento',   desc: 'Salários, descontos, benefícios — SENSÍVEL',    read: false, write: false, sensitive: true  },
      { id: 'hr.timesheet',  label: 'Ponto e Jornada',      desc: 'Registros de entrada/saída e banco de horas',  read: true,  write: false, sensitive: false },
      { id: 'hr.docs',       label: 'Documentos Pessoais',  desc: 'CPF, RG, certidões — ALTAMENTE SENSÍVEL',      read: false, write: false, sensitive: true  },
    ],
  },
  {
    id: 'erp', label: 'ERP / Financeiro', icon: DollarSign, color: 'text-slate-400',
    perms: [
      { id: 'erp.invoices',  label: 'Notas Fiscais',        desc: 'NF-e emitidas e recebidas',                    read: true,  write: false, sensitive: false },
      { id: 'erp.cash',      label: 'Fluxo de Caixa',       desc: 'Saldos bancários e previsões',                 read: true,  write: false, sensitive: true  },
      { id: 'erp.taxes',     label: 'Obrigações Fiscais',   desc: 'DAS, DARF, GPS, guias pendentes',              read: true,  write: false, sensitive: false },
      { id: 'erp.costs',     label: 'Custos Internos',      desc: 'Margens, CMV, estrutura de custos — SENSÍVEL', read: false, write: false, sensitive: true  },
    ],
  },
  {
    id: 'scm', label: 'SCM / Logística', icon: Package, color: 'text-emerald-400',
    perms: [
      { id: 'scm.stock',     label: 'Estoque',              desc: 'Saldos, movimentações, lotes',                 read: true,  write: false, sensitive: false },
      { id: 'scm.orders',    label: 'Pedidos de Compra',    desc: 'POs, fornecedores, valores',                   read: true,  write: true,  sensitive: false },
      { id: 'scm.suppliers', label: 'Fornecedores',         desc: 'Cadastros, condições comerciais',              read: true,  write: false, sensitive: false },
    ],
  },
  {
    id: 'quality', label: 'Qualidade', icon: Award, color: 'text-green-400',
    perms: [
      { id: 'quality.nc',    label: 'Não-Conformidades',    desc: 'Registros de NCs, causas e ações',             read: true,  write: true,  sensitive: false },
      { id: 'quality.audit', label: 'Auditorias',           desc: 'Planos, execuções e relatórios de auditoria',  read: true,  write: false, sensitive: false },
    ],
  },
  {
    id: 'docs', label: 'Documentos', icon: FileText, color: 'text-amber-400',
    perms: [
      { id: 'docs.read',     label: 'Leitura de Documentos',desc: 'Ler e listar todos os documentos',             read: true,  write: false, sensitive: false },
      { id: 'docs.write',    label: 'Criar e Editar Docs',  desc: 'Criar resumos, classificar, renomear',         read: true,  write: true,  sensitive: false },
    ],
  },
  {
    id: 'ext', label: 'APIs Externas', icon: Globe, color: 'text-blue-400',
    perms: [
      { id: 'ext.web',       label: 'Busca na Internet',    desc: 'Consultas ao Google, Bing, fontes públicas',   read: false, write: false, sensitive: false },
      { id: 'ext.email',     label: 'Envio de E-mails',     desc: 'Enviar e-mails automáticos em nome da empresa',read: false, write: false, sensitive: true  },
      { id: 'ext.whatsapp',  label: 'WhatsApp Business',    desc: 'Enviar mensagens automáticas via API',         read: false, write: false, sensitive: true  },
      { id: 'ext.webhook',   label: 'Webhooks Externos',    desc: 'Chamar endpoints de terceiros',                read: false, write: false, sensitive: false },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Permissions() {
  const [groups, setGroups] = useState<PermissionGroup[]>(INITIAL_GROUPS);
  const [saved, setSaved] = useState(false);

  const togglePerm = (groupId: string, permId: string, field: 'read' | 'write') => {
    setGroups(prev => prev.map(g =>
      g.id !== groupId ? g : {
        ...g,
        perms: g.perms.map(p =>
          p.id !== permId ? p : {
            ...p,
            [field]: !p[field],
            ...(field === 'write' && !p.write ? { read: true } : {}),
          }
        ),
      }
    ));
    setSaved(false);
  };

  const totalRead  = groups.flatMap(g => g.perms).filter(p => p.read).length;
  const totalWrite = groups.flatMap(g => g.perms).filter(p => p.write).length;
  const totalPerms = groups.flatMap(g => g.perms).length;
  const sensitivesOn = groups.flatMap(g => g.perms).filter(p => p.sensitive && (p.read || p.write)).length;

  const handleSave = () => setSaved(true);

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Permissões da IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Controle o que os agentes IA podem acessar e modificar no sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setGroups(INITIAL_GROUPS); setSaved(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar padrão
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30"
          >
            <Save className="w-4 h-4" /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">{totalRead}</p>
          <p className="text-xs font-semibold text-slate-400">Leituras liberadas</p>
          <p className="text-xs text-slate-600">de {totalPerms} áreas</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-blue-400">{totalWrite}</p>
          <p className="text-xs font-semibold text-slate-400">Escritas liberadas</p>
          <p className="text-xs text-slate-600">de {totalPerms} áreas</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className={`text-2xl font-black ${sensitivesOn > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{sensitivesOn}</p>
          <p className="text-xs font-semibold text-slate-400">Dados sensíveis</p>
          <p className="text-xs text-slate-600">com acesso ativo</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-violet-400">{totalPerms - totalRead}</p>
          <p className="text-xs font-semibold text-slate-400">Áreas bloqueadas</p>
          <p className="text-xs text-slate-600">sem nenhum acesso</p>
        </div>
      </div>

      {/* ── Alert sensíveis ─────────────────────────────────────────────── */}
      {sensitivesOn > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-400 text-sm">Atenção — dados sensíveis com acesso liberado</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              {sensitivesOn} {sensitivesOn === 1 ? 'área marcada como sensível está' : 'áreas marcadas como sensíveis estão'} com acesso ativo.
              Certifique-se de que isso é intencional. Dados como folha de pagamento, documentos pessoais e credenciais devem ser acessados apenas quando estritamente necessário.
            </p>
          </div>
        </div>
      )}

      {/* ── Permission groups ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {groups.map(group => {
          const Icon = group.icon;
          const activeCount = group.perms.filter(p => p.read || p.write).length;

          return (
            <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${group.color}`} />
                  <span className="font-bold text-slate-200">{group.label}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {activeCount}/{group.perms.length} ativas
                  </span>
                </div>
                <div className="flex gap-6 text-xs font-bold text-slate-500 pr-2">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Leitura</span>
                  <span className="flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Escrita</span>
                </div>
              </div>

              {/* Permission rows */}
              <div className="divide-y divide-slate-800/60">
                {group.perms.map(perm => (
                  <div key={perm.id} className={`flex items-center gap-4 px-5 py-3.5 ${perm.sensitive ? 'bg-amber-500/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{perm.label}</span>
                        {perm.sensitive && (
                          <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                            <Lock className="w-2.5 h-2.5" /> Sensível
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{perm.desc}</p>
                    </div>

                    {/* Read toggle */}
                    <button
                      onClick={() => togglePerm(group.id, perm.id, 'read')}
                      className={`w-10 h-6 rounded-full shrink-0 transition-all relative ${
                        perm.read ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        perm.read ? 'left-5' : 'left-1'
                      }`} />
                    </button>

                    {/* Write toggle */}
                    <button
                      onClick={() => togglePerm(group.id, perm.id, 'write')}
                      className={`w-10 h-6 rounded-full shrink-0 transition-all relative ${
                        perm.write ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        perm.write ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Save footer ─────────────────────────────────────────────────── */}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-emerald-400">Configurações de permissões salvas com sucesso. Os agentes respeitarão as novas restrições na próxima execução.</p>
        </div>
      )}
    </div>
  );
}
