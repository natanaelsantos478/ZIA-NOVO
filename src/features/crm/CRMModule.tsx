// ─────────────────────────────────────────────────────────────────────────────
// CRMModule — Roteador de seções do módulo CRM
// ─────────────────────────────────────────────────────────────────────────────
import { Sparkles } from 'lucide-react';
import CRMDashboard       from './sections/Dashboard';
import CRMClientes        from './sections/Clientes';
import CRMPipeline        from './sections/Pipeline';
import CRMNegociacoes     from './sections/Negociacoes';
import CRMCustomerSuccess from './sections/CustomerSuccess';

const SECTION_LABELS: Record<string, string> = {
  okr:          'Metas e OKRs',
  live:         'CRM Live (Real-Time)',
  inbox:        'Omnichannel Inbox',
  social:       'Social Listening',
  partners:     'Portal de Parceiros',
  leads:        'Inteligência de Leads',
  reports:      'Relatórios Avançados',
  analytics:    'People Analytics',
  tasks:        'Automação de Tarefas',
  flow:         'Flow Builder',
  fields:       'Campos Personalizados',
  teams:        'Equipes e Territórios',
  integrations: 'Integrações Externas',
};

function SectionPlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-purple-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-700 mb-2">
        {SECTION_LABELS[section] ?? section}
      </h2>
      <p className="text-sm text-slate-400 max-w-xs">
        Esta seção está em desenvolvimento e será disponibilizada em breve.
      </p>
    </div>
  );
}

export default function CRMModule({ activeSection = 'dashboard' }: { activeSection?: string }) {
  switch (activeSection) {
    case 'dashboard': return <CRMDashboard />;
    case 'clientes':  return <CRMClientes />;
    case 'pipeline':  return <CRMPipeline />;
    case 'deals':     return <CRMNegociacoes />;
    case 'cs':        return <CRMCustomerSuccess />;
    default:          return <SectionPlaceholder section={activeSection} />;
  }
}
