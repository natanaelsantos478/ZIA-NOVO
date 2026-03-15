// ─────────────────────────────────────────────────────────────────────────────
// FunilEditorModal — Editor completo de funil de vendas
// Edita nome do funil, etapas (nome, icone, cor, probabilidade)
// Reordena etapas NORMAL via drag & drop (@dnd-kit/sortable)
// Etapas obrigatorias: ícone de cadeado, não podem ser excluídas
// Etapas GANHA/PERDIDA: sempre no final, não reordenáveis
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  X, Lock, Trash2, Plus, GripVertical, Loader2, Check, AlertCircle,
} from 'lucide-react';
import { saveCrmFunil, upsertCrmEtapa, deleteCrmEtapa, type CrmFunil, type CrmFunilEtapa } from '../data/crmData';

// ── Slugify helper ─────────────────────────────────────────────────────────────
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ── Linha de etapa sortable ───────────────────────────────────────────────────

interface EtapaRowProps {
  etapa: CrmFunilEtapa;
  onUpdate: (id: string, patch: Partial<CrmFunilEtapa>) => void;
  onDelete: (id: string) => void;
  showDelete: boolean;
  sortable: boolean;
}

function EtapaRow({ etapa, onUpdate, onDelete, showDelete, sortable }: EtapaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: etapa.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rowBg =
    etapa.tipo === 'GANHA'   ? 'bg-emerald-50 border-emerald-200' :
    etapa.tipo === 'PERDIDA' ? 'bg-red-50 border-red-200'         :
                               'bg-white border-slate-200';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-xl border ${rowBg} mb-2`}
    >
      {/* Drag handle */}
      <div
        {...(sortable ? attributes : {})}
        {...(sortable ? listeners : {})}
        className={`shrink-0 ${sortable ? 'cursor-grab text-slate-400 hover:text-slate-600' : 'text-slate-200 cursor-default'}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Cor (color picker) */}
      <div className="relative shrink-0">
        <input
          type="color"
          value={etapa.cor}
          onChange={e => onUpdate(etapa.id, { cor: e.target.value })}
          className="w-7 h-7 rounded-lg border-2 border-white shadow cursor-pointer"
          title="Cor da etapa"
        />
      </div>

      {/* Emoji / ícone */}
      <input
        type="text"
        value={etapa.icone ?? ''}
        onChange={e => onUpdate(etapa.id, { icone: e.target.value.slice(0, 4) })}
        placeholder="🔵"
        className="w-10 text-center border border-slate-200 rounded-lg py-1 text-base focus:outline-none focus:ring-2 focus:ring-purple-400"
        title="Emoji da etapa"
      />

      {/* Nome */}
      <input
        type="text"
        value={etapa.nome}
        onChange={e => onUpdate(etapa.id, { nome: e.target.value })}
        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        placeholder="Nome da etapa"
      />

      {/* Probabilidade */}
      <div className="flex items-center gap-1 w-20 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          value={etapa.probabilidade}
          onChange={e => onUpdate(etapa.id, { probabilidade: Math.min(100, Math.max(0, Number(e.target.value))) })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
          title="Probabilidade (%)"
        />
        <span className="text-xs text-slate-400 shrink-0">%</span>
      </div>

      {/* Cadeado ou delete */}
      <div className="shrink-0 w-6 flex items-center justify-center">
        {etapa.obrigatoria ? (
          <Lock className="w-4 h-4 text-slate-400" aria-label="Etapa obrigatória" />
        ) : showDelete ? (
          <button
            onClick={() => onDelete(etapa.id)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Excluir etapa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Props do modal ─────────────────────────────────────────────────────────────

export interface FunilEditorModalProps {
  funil: CrmFunil;
  onClose: () => void;
  onSaved: (updated: CrmFunil) => void;
}

// ── Modal principal ────────────────────────────────────────────────────────────

export default function FunilEditorModal({ funil, onClose, onSaved }: FunilEditorModalProps) {
  const [nome, setNome]       = useState(funil.nome);
  const [etapas, setEtapas]   = useState<CrmFunilEtapa[]>(() =>
    [...funil.etapas].sort((a, b) => a.ordem - b.ordem),
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string[]>([]); // IDs a excluir

  // Ids das etapas NORMAL (reordenáveis)
  const normalEtapas  = etapas.filter(e => e.tipo === 'NORMAL');
  const specialEtapas = etapas.filter(e => e.tipo !== 'NORMAL'); // GANHA + PERDIDA sempre no final

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEtapas(prev => {
      const normalIds = prev.filter(e => e.tipo === 'NORMAL').map(e => e.id);
      const oldIdx = normalIds.indexOf(active.id as string);
      const newIdx = normalIds.indexOf(over.id as string);
      if (oldIdx < 0 || newIdx < 0) return prev;

      const reorderedNormal = arrayMove(
        prev.filter(e => e.tipo === 'NORMAL'),
        oldIdx,
        newIdx,
      ).map((e, i) => ({ ...e, ordem: i }));

      // Recalcula ordem: NORMAL first, then GANHA/PERDIDA keep higher order values
      const special = prev.filter(e => e.tipo !== 'NORMAL')
        .map((e, i) => ({ ...e, ordem: reorderedNormal.length + i }));

      return [...reorderedNormal, ...special];
    });
  }

  const updateEtapa = useCallback((id: string, patch: Partial<CrmFunilEtapa>) => {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  function handleDelete(id: string) {
    const etapa = etapas.find(e => e.id === id);
    if (!etapa || etapa.obrigatoria) return;
    setDeleted(prev => [...prev, id]);
    setEtapas(prev => prev.filter(e => e.id !== id));
  }

  function handleAddEtapa() {
    const maxOrdem = normalEtapas.length > 0 ? Math.max(...normalEtapas.map(e => e.ordem)) : -1;
    const newEtapa: CrmFunilEtapa = {
      id:           `new_${Date.now()}`,
      funilId:      funil.id,
      tenantId:     funil.tenantId,
      nome:         'Nova Etapa',
      slug:         `nova_etapa_${Date.now()}`,
      cor:          '#6366f1',
      icone:        '',
      ordem:        maxOrdem + 1,
      probabilidade: 50,
      obrigatoria:  false,
      tipo:         'NORMAL',
    };
    // Insere antes das etapas GANHA/PERDIDA
    setEtapas(prev => {
      const normal  = prev.filter(e => e.tipo === 'NORMAL');
      const special = prev.filter(e => e.tipo !== 'NORMAL');
      return [...normal, newEtapa, ...special.map((e, i) => ({ ...e, ordem: normal.length + 1 + i }))];
    });
  }

  async function handleSave() {
    if (!nome.trim()) { setError('Nome do funil é obrigatório.'); return; }
    setError(null);
    setSaving(true);
    try {
      // 1. Salva nome do funil
      await saveCrmFunil(funil.id, { nome: nome.trim() });

      // 2. Exclui etapas removidas (segurança: apenas não-obrigatórias)
      for (const id of deleted) {
        if (!id.startsWith('new_')) {
          await deleteCrmEtapa(id);
        }
      }

      // 3. Upsert todas as etapas presentes
      const saved: CrmFunilEtapa[] = [];
      for (const etapa of etapas) {
        const slug = etapa.slug || toSlug(etapa.nome);
        const isNew = etapa.id.startsWith('new_');
        const result = await upsertCrmEtapa({
          ...(isNew ? {} : { id: etapa.id }),
          funilId:      funil.id,
          nome:         etapa.nome,
          slug,
          cor:          etapa.cor,
          icone:        etapa.icone || undefined,
          ordem:        etapa.ordem,
          probabilidade: etapa.probabilidade,
          obrigatoria:  etapa.obrigatoria,
          tipo:         etapa.tipo,
        });
        saved.push(result);
      }

      const updatedFunil: CrmFunil = {
        ...funil,
        nome: nome.trim(),
        etapas: saved.sort((a, b) => a.ordem - b.ordem),
      };
      onSaved(updatedFunil);
    } catch (err) {
      console.error('Erro ao salvar funil:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">Editar Funil de Vendas</h2>
            <p className="text-xs text-slate-500 mt-0.5">Personalize as etapas, cores e probabilidades</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Nome do funil */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Nome do Funil
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Ex: Funil de Vendas"
            />
          </div>

          {/* Etapas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Etapas ({etapas.length})
              </label>
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <span>Cor</span>
                <span>Emoji</span>
                <span className="flex-1">Nome</span>
                <span className="w-20 text-center">Prob.</span>
              </div>
            </div>

            {/* NORMAL stages (sortable) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={normalEtapas.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {normalEtapas.map(etapa => (
                  <EtapaRow
                    key={etapa.id}
                    etapa={etapa}
                    onUpdate={updateEtapa}
                    onDelete={handleDelete}
                    showDelete={!etapa.obrigatoria}
                    sortable={true}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* GANHA / PERDIDA (não reordenáveis, sempre no final) */}
            {specialEtapas.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide">Etapas finais (fixas)</p>
                {specialEtapas.map(etapa => (
                  <EtapaRow
                    key={etapa.id}
                    etapa={etapa}
                    onUpdate={updateEtapa}
                    onDelete={handleDelete}
                    showDelete={false}
                    sortable={false}
                  />
                ))}
              </div>
            )}

            {/* Botão adicionar etapa */}
            <button
              onClick={handleAddEtapa}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Etapa
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving || !nome.trim()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
            ) : (
              <><Check className="w-4 h-4" /> Salvar Funil</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
