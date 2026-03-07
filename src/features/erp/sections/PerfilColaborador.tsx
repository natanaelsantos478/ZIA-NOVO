import { useEffect, useState } from 'react';
import { UserCircle, Mail, Building2, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ColaboradorData {
  id: string;
  full_name: string;
  email: string;
  position_title: string | null;
  department_id: string | null;
  status: string;
  work_mode: string | null;
  admission_date: string | null;
  personal_data: Record<string, unknown>;
  departments?: { name: string } | null;
}

export default function PerfilColaborador() {
  const [colaborador, setColaborador] = useState<ColaboradorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Tentar buscar por user_id
        const { data, error } = await supabase
          .from('employees')
          .select('*, departments(name)')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        setColaborador(data);
      } catch {
        // Sem colaborador vinculado — exibe perfil básico
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Perfil do Colaborador</h1>

      {!colaborador ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <UserCircle className="w-16 h-16 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum colaborador vinculado a esta conta</p>
          <p className="text-slate-400 text-sm mt-1">Acesse o módulo RH para vincular seu perfil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header do perfil */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-violet-700">
                  {colaborador.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{colaborador.full_name}</h2>
                <p className="text-slate-500">{colaborador.position_title ?? 'Cargo não informado'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colaborador.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {colaborador.status}
                  </span>
                  {colaborador.work_mode && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {colaborador.work_mode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dados */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Informações</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">E-mail</p>
                  <p className="text-sm text-slate-800">{colaborador.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Departamento</p>
                  <p className="text-sm text-slate-800">{colaborador.departments?.name ?? '—'}</p>
                </div>
              </div>
              {colaborador.admission_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Data de Admissão</p>
                    <p className="text-sm text-slate-800">
                      {new Date(colaborador.admission_date + 'T00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Para editar suas informações pessoais, acesse o módulo <strong>RH → Portal do Colaborador</strong>.
          </div>
        </div>
      )}
    </div>
  );
}
