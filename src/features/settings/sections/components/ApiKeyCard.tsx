// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyCard — Card de exibição de uma API Key na lista
// ─────────────────────────────────────────────────────────────────────────────
import { Edit2, XCircle, Bot, Zap, Clock, Activity, KeyRound } from 'lucide-react';
import { type ApiKey, maskApiKey } from '../../../../lib/apiKeys';

const TIPO_LABEL: Record<string, string> = {
  flowise:  'Flowise',
  runway:   'Runway',
  n8n:      'n8n',
  make:     'Make',
  custom:   'Custom',
  whatsapp: 'WhatsApp',
  excel:    'Excel',
  webhook:  'Webhook',
};

const TIPO_COLOR: Record<string, string> = {
  flowise:  'bg-violet-100 text-violet-700',
  runway:   'bg-pink-100 text-pink-700',
  n8n:      'bg-orange-100 text-orange-700',
  make:     'bg-blue-100 text-blue-700',
  custom:   'bg-slate-100 text-slate-600',
  whatsapp: 'bg-green-100 text-green-700',
  excel:    'bg-emerald-100 text-emerald-700',
  webhook:  'bg-amber-100 text-amber-700',
};

const STATUS_STYLE: Record<string, string> = {
  ativo:    'bg-green-100 text-green-700 border-green-200',
  inativo:  'bg-amber-100 text-amber-700 border-amber-200',
  revogado: 'bg-red-100 text-red-600 border-red-200',
};

interface Props {
  apiKey: ApiKey;
  onEdit: (key: ApiKey) => void;
  onRevoke: (key: ApiKey) => void;
  onViewLogs: (key: ApiKey) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ApiKeyCard({ apiKey, onEdit, onRevoke, onViewLogs }: Props) {
  const isRevoked = apiKey.status === 'revogado';

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${
      isRevoked ? 'border-red-100 opacity-60' : 'border-slate-100 hover:border-slate-200'
    }`}>
      {/* Header do card */}
      <div className="px-5 py-4 flex items-start gap-3">
        {/* Ícone */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isRevoked ? 'bg-slate-100' : 'bg-indigo-50'
        }`}>
          <Bot className={`w-5 h-5 ${isRevoked ? 'text-slate-400' : 'text-indigo-600'}`} />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 text-sm truncate">{apiKey.nome}</h3>

            {/* Badge status */}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[apiKey.status]}`}>
              {apiKey.status}
            </span>

            {/* Badge tipo */}
            {apiKey.integracao_tipo && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[apiKey.integracao_tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                {TIPO_LABEL[apiKey.integracao_tipo] ?? apiKey.integracao_tipo}
              </span>
            )}

            {/* Badge IA vinculada */}
            {apiKey.employee_id && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Funcionário IA
              </span>
            )}
          </div>

          {apiKey.descricao && (
            <p className="text-[12px] text-slate-400 mt-0.5 truncate">{apiKey.descricao}</p>
          )}

          {/* Prefixo da chave — identificação visual.
              A chave completa não está mais disponível após a criação. */}
          <div className="flex items-center gap-1.5 mt-2">
            <KeyRound className="w-3 h-3 text-slate-300" />
            <code className="text-[11px] font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">
              {maskApiKey(apiKey.key_prefix)}
            </code>
            <span className="text-[10px] text-slate-300 italic">
              copie ao criar
            </span>
          </div>
        </div>

        {/* Ações */}
        {!isRevoked && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onViewLogs(apiKey)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Ver logs"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(apiKey)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRevoke(apiKey)}
              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Revogar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer com stats */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Último uso: {formatDate(apiKey.ultimo_uso_at)}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {apiKey.total_requests.toLocaleString('pt-BR')} requests
        </span>
        {apiKey.permissoes.modulos.length > 0 && (
          <span>
            Módulos: {apiKey.permissoes.modulos.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
