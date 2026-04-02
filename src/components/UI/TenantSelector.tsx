// ─────────────────────────────────────────────────────────────────────────────
// TenantSelector — seletor de empresa para formulários em modo Holding/Matriz
// Só renderiza quando o perfil ativo vê mais de uma empresa.
// ─────────────────────────────────────────────────────────────────────────────
import { Building2 } from 'lucide-react';
import { useScope } from '../../context/ProfileContext';
import { useCompanies } from '../../context/CompaniesContext';

interface Props {
  value: string;
  onChange: (tenantId: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function TenantSelector({ value, onChange, label = 'Empresa', required, className = '' }: Props) {
  const scope   = useScope();
  const { companies } = useCompanies();

  // Só mostra quando o perfil vê mais de 1 empresa
  if (scope.scopedEntityIds.length <= 1) return null;

  const options = companies.filter(c =>
    scope.scopedEntityIds.includes(c.id) && c.status === 'ativa'
  ).sort((a, b) => {
    // Ordem: holding → matrizes → filiais
    const order = { holding: 0, matrix: 1, branch: 2 };
    return (order[a.type] - order[b.type]) || a.nomeFantasia.localeCompare(b.nomeFantasia);
  });

  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        >
          {options.map(c => (
            <option key={c.id} value={c.id}>
              {c.type === 'holding' ? '🏛 ' : c.type === 'matrix' ? '🏢 ' : '🏬 '}
              {c.nomeFantasia}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Hook auxiliar: retorna nome fantasia de um tenant ─────────────────────────
export function useTenantName(tenantId: string): string {
  const { companies } = useCompanies();
  const c = companies.find(x => x.id === tenantId);
  return c?.nomeFantasia ?? tenantId;
}
