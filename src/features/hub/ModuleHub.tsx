import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ArrowRight, Activity, ShieldCheck, FolderOpen
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function ModuleHub() {
  const navigate = useNavigate();
  const { config } = useAppContext();

  const modules = [
    { id: 'sales', name: 'Vendas (CRM)', icon: Briefcase, desc: 'Gestão comercial e inteligência de leads', color: 'from-purple-500 to-indigo-600', active: true },
    { id: 'hr', name: 'Pessoas (RH)', icon: Users, desc: 'Gestão de talentos e folha de pagamento', color: 'from-pink-500 to-rose-600', active: true },
    { id: 'assets', name: 'Ativos (EAM)', icon: Wrench, desc: 'Manutenção, inventário e IoT', color: 'from-blue-500 to-cyan-600', active: config.features.enableEAM },
    { id: 'logistics', name: 'Logística (SCM)', icon: Truck, desc: 'Frota, fretes e supply chain', color: 'from-emerald-500 to-teal-600', active: true },
    { id: 'backoffice', name: 'Backoffice (ERP)', icon: Building, desc: 'Financeiro, fiscal e contábil', color: 'from-slate-700 to-slate-900', active: config.features.enableERP },
    { id: 'quality', name: 'Qualidade (QMS)', icon: ShieldCheck, desc: 'Auditorias, não conformidades e indicadores', color: 'from-emerald-500 to-green-600', active: true },
    { id: 'docs', name: 'Documentos (DMS)', icon: FolderOpen, desc: 'Gestão centralizada de documentos e formulários', color: 'from-amber-500 to-orange-600', active: true },
  ];

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Bem-vindo ao <span className={`text-${config.primaryColor}-600`}>{config.companyName}</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Selecione um módulo para acessar o painel de controle específico.
            Acesso administrativo global habilitado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.filter(m => m.active).map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(`/module/${module.id}`)}
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 transform hover:-translate-y-1 text-left"
            >
              <div className={`h-2 w-full bg-gradient-to-r ${module.color}`}></div>
              <div className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <module.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {module.name}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {module.desc}
                </p>
                <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">
                  Acessar Módulo <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform translate-y-4 translate-x-4 group-hover:translate-y-2 group-hover:translate-x-2">
                <module.icon className="w-32 h-32" />
              </div>
            </button>
          ))}

          {/* Card de Configurações */}
          <button
            onClick={() => navigate('/module/settings')}
            className="group relative bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-300 p-8 flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 group-hover:bg-indigo-200 flex items-center justify-center mb-4 transition-colors">
              <Activity className="w-6 h-6 text-slate-500 group-hover:text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 group-hover:text-indigo-700 mb-1">
              Configurações Globais
            </h3>
            <p className="text-slate-500 text-xs">
              Personalize a aparência e integrações
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
