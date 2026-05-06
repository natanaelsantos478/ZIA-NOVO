// ─────────────────────────────────────────────────────────────────────────────
// IAConfiguracoes — Configurações globais da IA (Supabase-integrado)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Config {
  ia_ativa: boolean;
  modelo_padrao: string;
  modelo_versao_padrao: string;
  limite_tokens_dia: number;
  alerta_tokens_pct: number;
  wa_cooldown_segundos: number;
  wa_max_consecutivas: number;
  wa_max_por_minuto: number;
  wa_max_por_dia: number;
  wa_bot_velocidade_ms: number;
}

const MODELOS = [
  { versao: 'gemini-3.1-flash-lite-preview', nome: 'Gemini 3.1 Flash Lite', desc: 'Mais rápido e econômico' },
  { versao: 'gemini-3.1-flash-preview',      nome: 'Gemini 3.1 Flash',      desc: 'Equilibrio velocidade/qualidade' },
  { versao: 'gemini-3.1-pro-preview',        nome: 'Gemini 3.1 Pro',        desc: 'Máxima qualidade' },
];

export default function IAConfiguracoes() {
  const [config, setConfig] = useState<Config>({
    ia_ativa: true, modelo_padrao: 'gemini', modelo_versao_padrao: 'gemini-3.1-flash-lite-preview',
    limite_tokens_dia: 100000, alerta_tokens_pct: 80,
    wa_cooldown_segundos: 8, wa_max_consecutivas: 10,
    wa_max_por_minuto: 5, wa_max_por_dia: 500, wa_bot_velocidade_ms: 3000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('ia_config_tenant').select('*').single().then(({ data }) => {
      if (data) {
        setConfig({
          ia_ativa: data.ia_ativa ?? true,
          modelo_padrao: data.modelo_padrao ?? 'gemini',
          modelo_versao_padrao: data.modelo_versao_padrao ?? 'gemini-3.1-flash-lite-preview',
          limite_tokens_dia: data.limite_tokens_dia ?? 100000,
          alerta_tokens_pct: data.alerta_tokens_pct ?? 80,
          wa_cooldown_segundos: data.wa_cooldown_segundos ?? 8,
          wa_max_consecutivas: data.wa_max_consecutivas ?? 10,
          wa_max_por_minuto: data.wa_max_por_minuto ?? 5,
          wa_max_por_dia: data.wa_max_por_dia ?? 500,
          wa_bot_velocidade_ms: data.wa_bot_velocidade_ms ?? 3000,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase.from('ia_config_tenant').upsert({
      ia_ativa: config.ia_ativa,
      modelo_padrao: config.modelo_padrao,
      modelo_versao_padrao: config.modelo_versao_padrao,
      limite_tokens_dia: config.limite_tokens_dia,
      alerta_tokens_pct: config.alerta_tokens_pct,
      wa_cooldown_segundos: config.wa_cooldown_segundos,
      wa_max_consecutivas: config.wa_max_consecutivas,
      wa_max_por_minuto: config.wa_max_por_minuto,
      wa_max_por_dia: config.wa_max_por_dia,
      wa_bot_velocidade_ms: config.wa_bot_velocidade_ms,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-md">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Configurações da IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configurações globais aplicadas a todos os agentes</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* IA Ativa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-200">Sistema IA</p>
            <p className="text-xs text-slate-500 mt-0.5">Ativar ou pausar todos os agentes de uma vez</p>
          </div>
          <button onClick={() => setConfig(c => ({ ...c, ia_ativa: !c.ia_ativa }))}
            className={`w-12 h-7 rounded-full relative transition-colors ${config.ia_ativa ? 'bg-emerald-600' : 'bg-slate-600'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${config.ia_ativa ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {!config.ia_ativa && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Todos os agentes estão pausados. Nenhuma execução automática ocorrerá.
          </div>
        )}
      </div>

      {/* Modelo padrão */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="font-bold text-slate-200 mb-3">Modelo de IA Padrão</p>
        <p className="text-xs text-slate-500 mb-4">Usado por agentes que não definiram um modelo específico.</p>
        <div className="space-y-2">
          {MODELOS.map(m => (
            <button key={m.versao} onClick={() => setConfig(c => ({ ...c, modelo_padrao: 'gemini', modelo_versao_padrao: m.versao }))}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                config.modelo_versao_padrao === m.versao ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{m.nome}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                  <p className="text-xs font-mono text-slate-600 mt-1">{m.versao}</p>
                </div>
                {config.modelo_versao_padrao === m.versao && <CheckCircle2 className="w-5 h-5 text-violet-400" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Limites */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <p className="font-bold text-slate-200">Limites de Uso</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-form">Máximo de tokens por dia</label>
            <input type="number" value={config.limite_tokens_dia}
              onChange={e => setConfig(c => ({ ...c, limite_tokens_dia: parseInt(e.target.value) || 0 }))}
              className="input-dark mt-1" />
          </div>
          <div>
            <label className="label-form">Alertar ao atingir (%)</label>
            <input type="number" min={10} max={100} value={config.alerta_tokens_pct}
              onChange={e => setConfig(c => ({ ...c, alerta_tokens_pct: Math.min(100, parseInt(e.target.value) || 80) }))}
              className="input-dark mt-1" />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Uso estimado hoje</span>
            <span className="text-slate-300 font-semibold">— tokens</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* WhatsApp — Proteção contra bots e rate limiting */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-bold text-slate-200">Proteção WhatsApp IA</p>
          <p className="text-xs text-slate-500 mt-0.5">Evita loops infinitos com bots e controla o volume de respostas automáticas.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-form">Cooldown entre respostas (seg)</label>
            <input type="number" min={1} max={120} value={config.wa_cooldown_segundos}
              onChange={e => setConfig(c => ({ ...c, wa_cooldown_segundos: Math.max(1, parseInt(e.target.value) || 8) }))}
              className="input-dark mt-1" />
            <p className="text-xs text-slate-600 mt-1">Tempo mínimo entre 2 respostas da IA para o mesmo número</p>
          </div>
          <div>
            <label className="label-form">Respostas consecutivas máximas</label>
            <input type="number" min={1} max={50} value={config.wa_max_consecutivas}
              onChange={e => setConfig(c => ({ ...c, wa_max_consecutivas: Math.max(1, parseInt(e.target.value) || 10) }))}
              className="input-dark mt-1" />
            <p className="text-xs text-slate-600 mt-1">A IA para de responder após N respostas seguidas sem humano</p>
          </div>
          <div>
            <label className="label-form">Máx. respostas por minuto (empresa)</label>
            <input type="number" min={1} max={60} value={config.wa_max_por_minuto}
              onChange={e => setConfig(c => ({ ...c, wa_max_por_minuto: Math.max(1, parseInt(e.target.value) || 5) }))}
              className="input-dark mt-1" />
            <p className="text-xs text-slate-600 mt-1">Limite global de respostas IA por minuto para todo o tenant</p>
          </div>
          <div>
            <label className="label-form">Máx. respostas por dia (empresa)</label>
            <input type="number" min={10} value={config.wa_max_por_dia}
              onChange={e => setConfig(c => ({ ...c, wa_max_por_dia: Math.max(10, parseInt(e.target.value) || 500) }))}
              className="input-dark mt-1" />
            <p className="text-xs text-slate-600 mt-1">Limite total de respostas IA por dia para todo o tenant</p>
          </div>
        </div>

        <div>
          <label className="label-form">Velocidade de bot (ms) — detecção de loop</label>
          <input type="number" min={500} max={30000} step={500} value={config.wa_bot_velocidade_ms}
            onChange={e => setConfig(c => ({ ...c, wa_bot_velocidade_ms: Math.max(500, parseInt(e.target.value) || 3000) }))}
            className="input-dark mt-1" />
          <p className="text-xs text-slate-600 mt-1">
            Se uma mensagem chegar em menos de X ms após a última resposta da IA, é tratada como bot e descartada.
            Padrão: 3000 ms (3 seg). Humanos normalmente levam mais de 5 seg para digitar.
          </p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400">Configurações salvas com sucesso.</p>
        </div>
      )}
    </div>
  );
}
