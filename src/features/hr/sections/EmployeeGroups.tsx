import { useState } from 'react';
import { Plus, Search, Users, Clock, Tag, MoreHorizontal, Calendar } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  type: 'Turno' | 'Departamento' | 'Projeto' | 'Benefício' | 'Personalizado';
  members: number;
  description: string;
  createdAt: string;
  tags: string[];
}

const GROUPS: Group[] = [
  {
    id: 'G001',
    name: 'Turno Manhã (06h–14h)',
    type: 'Turno',
    members: 84,
    description: 'Colaboradores alocados no turno da manhã, incluindo produção e atendimento.',
    createdAt: '2023-01-15',
    tags: ['turno', 'produção', 'ponto'],
  },
  {
    id: 'G002',
    name: 'Turno Tarde (14h–22h)',
    type: 'Turno',
    members: 72,
    description: 'Colaboradores alocados no turno vespertino.',
    createdAt: '2023-01-15',
    tags: ['turno', 'produção', 'ponto'],
  },
  {
    id: 'G003',
    name: 'Home Office Integral',
    type: 'Personalizado',
    members: 38,
    description: 'Funcionários em regime 100% remoto com acesso a benefícios de home office.',
    createdAt: '2021-03-01',
    tags: ['remoto', 'home office', 'benefício'],
  },
  {
    id: 'G004',
    name: 'Híbrido (3×2)',
    type: 'Personalizado',
    members: 61,
    description: '3 dias no escritório, 2 dias remotos por semana.',
    createdAt: '2022-06-01',
    tags: ['híbrido', 'flexível'],
  },
  {
    id: 'G005',
    name: 'Projeto ZIA 2.0',
    type: 'Projeto',
    members: 18,
    description: 'Equipe multidisciplinar designada para o projeto ZIA Omnisystem versão 2.0.',
    createdAt: '2024-02-10',
    tags: ['projeto', 'TI', 'temporário'],
  },
  {
    id: 'G006',
    name: 'Plano de Saúde Premium',
    type: 'Benefício',
    members: 112,
    description: 'Colaboradores elegíveis ao plano de saúde na categoria premium.',
    createdAt: '2023-07-01',
    tags: ['benefício', 'saúde'],
  },
  {
    id: 'G007',
    name: 'Gestores e Líderes',
    type: 'Departamento',
    members: 34,
    description: 'Todos os gestores, coordenadores e diretores da organização.',
    createdAt: '2022-01-01',
    tags: ['liderança', 'gestão', 'aprovação'],
  },
  {
    id: 'G008',
    name: 'Comercial – Comissão Variável',
    type: 'Benefício',
    members: 44,
    description: 'Executivos e gerentes comerciais com remuneração variável via comissão.',
    createdAt: '2023-03-15',
    tags: ['comissão', 'vendas', 'variável'],
  },
];

const TYPE_COLORS: Record<string, string> = {
  'Turno':         'bg-blue-100 text-blue-700',
  'Departamento':  'bg-indigo-100 text-indigo-700',
  'Projeto':       'bg-amber-100 text-amber-700',
  'Benefício':     'bg-green-100 text-green-700',
  'Personalizado': 'bg-purple-100 text-purple-700',
};

const TYPE_ICON_COLOR: Record<string, string> = {
  'Turno':         'bg-blue-50 text-blue-600',
  'Departamento':  'bg-indigo-50 text-indigo-600',
  'Projeto':       'bg-amber-50 text-amber-600',
  'Benefício':     'bg-green-50 text-green-600',
  'Personalizado': 'bg-purple-50 text-purple-600',
};

const ALL_TYPES = ['Todos', 'Turno', 'Departamento', 'Projeto', 'Benefício', 'Personalizado'];

export default function EmployeeGroups() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');

  const filtered = GROUPS.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'Todos' || g.type === filterType;
    return matchSearch && matchType;
  });

  const totalMembers = GROUPS.reduce((s, g) => s + g.members, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grupos de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Agrupe colaboradores por turno, projeto, benefício ou critério personalizado</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total de Grupos</p>
          <p className="text-2xl font-bold text-slate-800">{GROUPS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total de Membros</p>
          <p className="text-2xl font-bold text-slate-800">{totalMembers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Grupos Ativos</p>
          <p className="text-2xl font-bold text-slate-800">{GROUPS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Média por Grupo</p>
          <p className="text-2xl font-bold text-slate-800">{Math.round(totalMembers / GROUPS.length)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === t
                  ? 'bg-pink-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of group cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((group) => (
          <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TYPE_ICON_COLOR[group.type]}`}>
                  {group.type === 'Turno'        && <Clock className="w-5 h-5" />}
                  {group.type === 'Departamento' && <Users className="w-5 h-5" />}
                  {group.type === 'Projeto'      && <Calendar className="w-5 h-5" />}
                  {group.type === 'Benefício'    && <Tag className="w-5 h-5" />}
                  {group.type === 'Personalizado' && <Users className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{group.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_COLORS[group.type]}`}>
                    {group.type}
                  </span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{group.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{group.members}</span>
                <span className="text-slate-400 text-xs">membros</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
                {group.tags.length > 2 && (
                  <span className="text-[10px] text-slate-400 px-1">+{group.tags.length - 2}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Nenhum grupo encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
