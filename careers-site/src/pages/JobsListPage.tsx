import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, Clock, Users, Globe,
  Filter, ChevronRight, Building2, Sparkles, Loader2,
} from 'lucide-react';
import type { Vacancy } from '../types/vacancy';
import { getVacancies } from '../services/vacanciesService';

const MODALITY_COLOR: Record<string, string> = {
  'Remoto':     'bg-green-100 text-green-700',
  'Híbrido':    'bg-blue-100 text-blue-700',
  'Presencial': 'bg-slate-100 text-slate-600',
};

const TYPE_COLOR: Record<string, string> = {
  'CLT':        'bg-indigo-100 text-indigo-700',
  'PJ':         'bg-purple-100 text-purple-700',
  'Estágio':    'bg-amber-100 text-amber-700',
  'Temporário': 'bg-slate-100 text-slate-600',
};

export default function JobsListPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModality, setFilterModality] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    getVacancies()
      .then(setVacancies)
      .finally(() => setLoading(false));
  }, []);

  const depts = useMemo(() => {
    return Array.from(new Set(vacancies.map((v) => v.dept))).sort();
  }, [vacancies]);

  const filtered = vacancies.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      v.title.toLowerCase().includes(q) ||
      v.dept.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q);
    return (
      matchSearch &&
      (!filterModality || v.modality === filterModality) &&
      (!filterType     || v.type     === filterType) &&
      (!filterDept     || v.dept     === filterDept)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-slate-800 text-lg tracking-tight">ZIA</span>
              <span className="text-xs text-slate-500 ml-2 font-medium">Vagas & Oportunidades</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>{filtered.length} vaga{filtered.length !== 1 ? 's' : ''} disponíve{filtered.length !== 1 ? 'is' : 'l'}</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-pink-600 to-rose-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl font-black mb-3 tracking-tight">
            Faça parte do time ZIA
          </h1>
          <p className="text-pink-100 text-base max-w-xl mx-auto mb-8">
            Trabalhamos para transformar a gestão empresarial no Brasil. Se você quer construir produtos que impactam milhares de empresas, venha com a gente.
          </p>
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cargo, área ou localização..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Filter className="w-4 h-4" /> Filtrar por:
          </div>
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          >
            <option value="">Modalidade</option>
            <option>Remoto</option>
            <option>Híbrido</option>
            <option>Presencial</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          >
            <option value="">Tipo de contrato</option>
            <option>CLT</option>
            <option>PJ</option>
            <option>Estágio</option>
            <option>Temporário</option>
          </select>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          >
            <option value="">Departamento</option>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
          {(filterModality || filterType || filterDept) && (
            <button
              onClick={() => { setFilterModality(''); setFilterType(''); setFilterDept(''); }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando vagas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma vaga encontrada</p>
            <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v) => (
              <Link
                key={v.id}
                to={`/vagas/${v.slug}`}
                className="group block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-pink-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-800 text-base group-hover:text-pink-600 transition-colors mb-1.5">
                      {v.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Briefcase className="w-3.5 h-3.5" /> {v.dept}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5" /> {v.location}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {v.publishedAt}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${MODALITY_COLOR[v.modality]}`}>
                        {v.modality}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[v.type]}`}>
                        {v.type}
                      </span>
                      {v.salaryVisible && v.salary ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          {v.salary}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          A combinar
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{v.candidateCount} candidatos</span>
                    </div>
                    <span className="flex items-center gap-1 text-pink-600 text-sm font-semibold group-hover:gap-2 transition-all">
                      Ver vaga <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            © 2025 ZIA Omnisystem · Plataforma de gestão empresarial para PMEs brasileiras
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Candidaturas processadas com segurança pela plataforma ZIA
          </p>
        </div>
      </div>
    </div>
  );
}
