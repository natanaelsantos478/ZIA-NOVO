// ─────────────────────────────────────────────────────────────────────────────
// CompromissoModal — Modal de criação e edição de compromissos
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Video, Link, Users, Plus, Trash2, Search,
  ExternalLink, Loader2, Calendar, Clock, Navigation2,
} from 'lucide-react';
import { useCompromissos } from './hooks/useCompromissos';
import type { CompromissoFull, CompromissoTipoFull, CompromissoStatus, ZiaProfile } from '../types/compromisso';
import { getAllNegociacoes, type Negociacao } from '../data/crmData';
import { getClientes, getProdutos, type ErpCliente, type ErpProduto } from '../../../lib/erp';

// ── Config visual ──────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<CompromissoTipoFull, string> = {
  reuniao: 'Reunião', ligacao: 'Ligação', visita: 'Visita',
  apresentacao: 'Apresentação', outro: 'Outro',
};
const STATUS_LABELS: Record<CompromissoStatus, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', em_andamento: 'Em andamento',
  concluido: 'Concluído', cancelado: 'Cancelado',
};
const DURACAO_OPTS = [15, 30, 60, 90, 120, 180];

const INPUT = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';
const LABEL = 'text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1';
const SEC = 'space-y-3 border border-slate-100 rounded-xl p-4';
const SEC_TITLE = 'text-sm font-bold text-slate-700 mb-3 flex items-center gap-2';

interface Props {
  initial?: Partial<CompromissoFull>;
  onClose: () => void;
  onSaved: () => void;
}

export default function CompromissoModal({ initial, onClose, onSaved }: Props) {
  const { saving, createCompromisso, updateCompromisso, fetchProfiles } = useCompromissos();

  // Form state
  const [titulo, setTitulo]             = useState(initial?.titulo ?? '');
  const [tipo, setTipo]                 = useState<CompromissoTipoFull>(initial?.tipo ?? 'reuniao');
  const [status, setStatus]             = useState<CompromissoStatus>(initial?.status ?? 'agendado');
  const [data, setData]                 = useState(initial?.data ?? new Date().toISOString().split('T')[0]);
  const [hora, setHora]                 = useState(initial?.hora ?? '09:00');
  const [duracao, setDuracao]           = useState(initial?.duracao ?? 60);
  const [notas, setNotas]               = useState(initial?.notas ?? '');
  const [localBusca, setLocalBusca]     = useState(initial?.local_endereco ?? initial?.local ?? '');
  const [linkReuniao, setLinkReuniao]   = useState(initial?.link_reuniao ?? '');
  const [valorDisputa, setValorDisputa] = useState<string>(String(initial?.valor_em_disputa ?? ''));

  // Vínculos
  const [clienteId, setClienteId]       = useState(initial?.cliente_id ?? '');
  const clienteNomeState                = initial?.cliente_nome ?? '';
  const [negociacaoId, setNegociacaoId] = useState(initial?.negociacao_id ?? '');
  const [orcamentoId]                   = useState(initial?.orcamento_id ?? '');
  const [produtoId, setProdutoId]       = useState(initial?.produto_id ?? '');

  // Dados para vincular
  const [clientes, setClientes]         = useState<ErpCliente[]>([]);
  const [negociacoes, setNegociacoes]   = useState<Negociacao[]>([]);
  const [produtos, setProdutos]         = useState<ErpProduto[]>([]);

  // Participantes
  const [profiles, setProfiles]         = useState<ZiaProfile[]>([]);
  const [participantes, setParticipantes] = useState<ZiaProfile[]>(
    (initial?.participantes ?? []).map(p => ({
      id: p.profissional_id, code: '', name: p.profissional_nome,
      level: 0, active: true,
    })),
  );
  const [profSearch, setProfSearch]     = useState('');

  // Mapa (geocoding via Nominatim + OSM)
  const [osmCoords, setOsmCoords]       = useState<{ lat: number; lon: number } | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const geoTimerRef                     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    getClientes('').then(setClientes);
    getAllNegociacoes().then(d => setNegociacoes(d.map(nd => nd.negociacao)));
    getProdutos().then(setProdutos);
    fetchProfiles().then(setProfiles);
  }, [fetchProfiles]);

  // Geocode endereço inicial ao editar
  useEffect(() => {
    const v = localBusca.trim();
    if (v && !v.startsWith('http')) geocodeQuery(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function geocodeQuery(query: string) {
    setGeocoding(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } },
      );
      const data = await res.json();
      if (data.length > 0) {
        setOsmCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      } else {
        setOsmCoords(null);
      }
    } catch { setOsmCoords(null); }
    finally   { setGeocoding(false); }
  }

  function handleLocalChange(v: string) {
    setLocalBusca(v);
    setOsmCoords(null);
    clearTimeout(geoTimerRef.current);
    if (!v.trim() || v.trim().startsWith('http')) return;
    if (v.trim().length > 4) {
      geoTimerRef.current = setTimeout(() => geocodeQuery(v.trim()), 900);
    }
  }

  function addParticipante(p: ZiaProfile) {
    if (!participantes.find(x => x.id === p.id)) {
      setParticipantes(prev => [...prev, p]);
    }
    setProfSearch('');
  }

  function removeParticipante(id: string) {
    setParticipantes(prev => prev.filter(p => p.id !== id));
  }

  async function handleSave() {
    if (!titulo.trim()) return;

    const selectedCliente = clientes.find(c => c.id === clienteId);
    const selectedNeg     = negociacoes.find(n => n.id === negociacaoId);

    const payload: Omit<CompromissoFull, 'id' | 'tenant_id' | 'created_at' | 'participantes' | 'arquivos'> = {
      titulo: titulo.trim(),
      tipo, status,
      data, hora,
      duracao: Number(duracao),
      notas,
      local: localBusca || undefined,
      local_endereco: localBusca || undefined,
      link_reuniao: linkReuniao || undefined,
      valor_em_disputa: valorDisputa ? Number(valorDisputa) : undefined,
      moeda: 'BRL',
      cliente_id: clienteId || undefined,
      cliente_nome: selectedCliente?.nome ?? selectedNeg?.clienteNome ?? clienteNomeState,
      negociacao_id: negociacaoId || undefined,
      orcamento_id: orcamentoId || undefined,
      produto_id: produtoId || undefined,
      criado_por: 'usuario',
      concluido: status === 'concluido',
    };

    const profs = participantes.map(p => ({
      profissional_id: p.id,
      profissional_nome: p.name,
      profissional_email: undefined,
    }));

    if (initial?.id) {
      await updateCompromisso(initial.id, payload);
    } else {
      await createCompromisso(payload, profs);
    }
    onSaved();
  }

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(profSearch.toLowerCase()) &&
    !participantes.find(x => x.id === p.id),
  );

  const MAPS_KEY    = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const isLink      = localBusca.trim().startsWith('http');
  const embedUrl    = (() => {
    const q = localBusca.trim();
    if (!q || isLink) return null;
    if (MAPS_KEY) return `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(q)}`;
    return osmCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${osmCoords.lon - 0.006},${osmCoords.lat - 0.004},${osmCoords.lon + 0.006},${osmCoords.lat + 0.004}&layer=mapnik&marker=${osmCoords.lat},${osmCoords.lon}`
      : null;
  })();
  const mapsOpenUrl = isLink
    ? localBusca.trim()
    : localBusca.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localBusca.trim())}`
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {initial?.id ? 'Editar Compromisso' : 'Novo Compromisso'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

          {/* ── Básico ── */}
          <div className={SEC}>
            <p className={SEC_TITLE}><Calendar className="w-4 h-4 text-purple-500" />Informações básicas</p>
            <div>
              <label className={LABEL}>Título *</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} className={INPUT} placeholder="Ex: Reunião de apresentação" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as CompromissoTipoFull)} className={INPUT}>
                  {(Object.keys(TIPO_LABELS) as CompromissoTipoFull[]).map(t => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as CompromissoStatus)} className={INPUT}>
                  {(Object.keys(STATUS_LABELS) as CompromissoStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Data *</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Hora *</label>
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Duração</label>
                <select value={duracao} onChange={e => setDuracao(Number(e.target.value))} className={INPUT}>
                  {DURACAO_OPTS.map(d => (
                    <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h`}</option>
                  ))}
                  <option value={duracao} disabled>{duracao} min (atual)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Notas / Descrição</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} className={INPUT} placeholder="Detalhes do compromisso..." />
            </div>
          </div>

          {/* ── Vínculos ── */}
          <div className={SEC}>
            <p className={SEC_TITLE}><Link className="w-4 h-4 text-purple-500" />Vínculos (opcionais)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Cliente</label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} className={INPUT}>
                  <option value="">— Selecionar cliente —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Negociação</label>
                <select value={negociacaoId} onChange={e => setNegociacaoId(e.target.value)} className={INPUT}>
                  <option value="">— Selecionar negociação —</option>
                  {negociacoes.map(n => (
                    <option key={n.id} value={n.id}>{n.clienteNome} — {n.descricao ?? n.etapa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Produto</label>
                <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className={INPUT}>
                  <option value="">— Selecionar produto —</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Valor em disputa (R$)</label>
                <input
                  type="number" min={0} value={valorDisputa}
                  onChange={e => setValorDisputa(e.target.value)}
                  className={INPUT} placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* ── Local ── */}
          <div className={SEC}>
            <p className={SEC_TITLE}><MapPin className="w-4 h-4 text-purple-500" />Local</p>
            <div>
              <label className={LABEL}>Buscar endereço ou colar link do Google Maps</label>
              <div className="relative">
                <Navigation2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={localBusca}
                  onChange={e => handleLocalChange(e.target.value)}
                  className={`${INPUT} pl-9`}
                  placeholder="Digite um endereço ou cole um link do Google Maps..."
                />
              </div>
              {localBusca && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {localBusca.startsWith('http') ? '🔗 Link detectado' : '📍 Pesquisando no Google Maps'}
                </p>
              )}
            </div>

            {/* Estado: geocodificando (só quando sem Maps key) */}
            {geocoding && !MAPS_KEY && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                Buscando localização...
              </div>
            )}

            {/* Mapa */}
            {!geocoding && embedUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  title="Mapa do local"
                />
                <div className="p-2 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => window.open(mapsOpenUrl, '_blank')}
                    className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />Abrir no Google Maps
                  </button>
                </div>
              </div>
            )}

            {/* Link colado — só botão */}
            {isLink && localBusca.trim() && (
              <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                <p className="text-xs text-slate-500 truncate">{localBusca}</p>
                <button
                  type="button"
                  onClick={() => window.open(mapsOpenUrl, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />Abrir
                </button>
              </div>
            )}
          </div>

          {/* ── Reunião Online ── */}
          <div className={SEC}>
            <p className={SEC_TITLE}><Video className="w-4 h-4 text-purple-500" />Reunião Online</p>
            <div>
              <label className={LABEL}>Link da reunião (Google Meet, Zoom, Teams...)</label>
              <div className="flex gap-2">
                <input
                  value={linkReuniao}
                  onChange={e => setLinkReuniao(e.target.value)}
                  className={`${INPUT} flex-1`}
                  placeholder="https://meet.google.com/..."
                />
                {linkReuniao && (
                  <button
                    type="button"
                    onClick={() => window.open(linkReuniao, '_blank')}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />Entrar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Participantes ── */}
          <div className={SEC}>
            <p className={SEC_TITLE}><Users className="w-4 h-4 text-purple-500" />Participantes</p>

            {participantes.length > 0 && (
              <div className="space-y-2 mb-3">
                {participantes.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">Nível {p.level} · {p.entity_name}</p>
                    </div>
                    <button onClick={() => removeParticipante(p.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={profSearch}
                onChange={e => setProfSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Buscar profissional para adicionar..."
              />
            </div>
            {profSearch && filteredProfiles.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {filteredProfiles.slice(0, 8).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addParticipante(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-left transition-colors border-b border-slate-50 last:border-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-sm text-slate-700">{p.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{p.entity_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            {initial?.id ? 'Salvar Alterações' : 'Criar Compromisso'}
          </button>
        </div>
      </div>
    </div>
  );
}
