import { ShieldCheck, Construction } from 'lucide-react';

export default function QualityModule() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
      <div className="max-w-md w-full mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6 relative">
          <ShieldCheck className="w-10 h-10 text-green-600" />
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-amber-100 border-4 border-slate-50 flex items-center justify-center">
            <Construction className="w-4 h-4 text-amber-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Módulo de Qualidade</h1>
        <p className="text-sm text-slate-500 mb-6">
          Em construção.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-5 text-left shadow-sm">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Em breve
          </p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <span>Gestão de não-conformidades (NCs) e ações corretivas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <span>Auditorias internas, externas e de fornecedores</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <span>Homologação e avaliação de fornecedores</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <span>KPIs de qualidade e indicadores ISO 9001</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Estamos trabalhando na integração deste módulo. Aguarde as próximas atualizações.
        </p>
      </div>
    </div>
  );
}
