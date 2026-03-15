// ─────────────────────────────────────────────────────────────────────────────
// CanvasPagePanel.tsx — Painel inferior de páginas com @dnd-kit sortable
// ─────────────────────────────────────────────────────────────────────────────
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { X, Plus } from 'lucide-react';
import type { PaginaCanvas, OrcConfig } from '../types';
import { PAGE_W, PAGE_H } from '../types';

const uid = () => Math.random().toString(36).slice(2, 9);

const TIPO_LABELS: Record<PaginaCanvas['tipo'], string> = {
  CAPA: 'Capa', CONTRACAPA: 'Contracapa', PRODUTOS: 'Produtos', LIVRE: 'Livre', PRODUTO_TEMPLATE: '1 Prod/Pág',
};

const TIPO_COLORS: Record<PaginaCanvas['tipo'], string> = {
  CAPA: 'text-purple-600', CONTRACAPA: 'text-blue-600', PRODUTOS: 'text-emerald-600', LIVRE: 'text-slate-600', PRODUTO_TEMPLATE: 'text-violet-700',
};

// ── Sortable thumb ─────────────────────────────────────────────────────────────
function PageThumb({
  pagina, isActive, onClick, onDelete,
}: { pagina: PaginaCanvas; isActive: boolean; onClick: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pagina.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`relative flex-shrink-0 cursor-pointer rounded-lg border-2 overflow-hidden select-none transition-all ${isActive ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200 hover:border-slate-300'}`}
      onClick={onClick}>
      {/* Mini page preview */}
      <div style={{ background: pagina.fundo_cor, width: 70, height: 99, position: 'relative', overflow: 'hidden' }}>
        {pagina.elementos.filter(e => e.visivel && e.tipo === 'FORMA').slice(0,3).map(el => {
          const d = el.dados as { cor_preenchimento?: string; tipo?: string };
          return (
            <div key={el.id} style={{
              position: 'absolute',
              left: `${(el.x / PAGE_W) * 100}%`, top: `${(el.y / PAGE_H) * 100}%`,
              width: `${(el.largura / PAGE_W) * 100}%`, height: `${(el.altura / PAGE_H) * 100}%`,
              background: d.cor_preenchimento ?? 'transparent',
            }}/>
          );
        })}
        <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 bg-black/30">
          <p className={`text-xs font-semibold truncate ${TIPO_COLORS[pagina.tipo]}`} style={{ fontSize: 8 }}>
            {pagina.nome || TIPO_LABELS[pagina.tipo]}
          </p>
        </div>
      </div>
      {/* Delete button */}
      <button
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/90 rounded flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ opacity: isActive ? 1 : undefined }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <X size={9}/>
      </button>
    </div>
  );
}

// ── Add Page Dropdown ──────────────────────────────────────────────────────────
function addNewPage(tipo: PaginaCanvas['tipo'], config: OrcConfig): PaginaCanvas {
  const id = uid();
  const names: Record<PaginaCanvas['tipo'], string> = { CAPA: 'Capa', CONTRACAPA: 'Contracapa', PRODUTOS: 'Produtos', LIVRE: 'Página', PRODUTO_TEMPLATE: 'Produto' };
  const bgs: Record<PaginaCanvas['tipo'], string> = { CAPA: config.cor_primaria, CONTRACAPA: '#f8fafc', PRODUTOS: '#ffffff', LIVRE: '#ffffff', PRODUTO_TEMPLATE: '#ffffff' };
  return {
    id, tipo, nome: names[tipo], fundo_cor: bgs[tipo], elementos: [],
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface CanvasPagePanelProps {
  paginas: PaginaCanvas[];
  paginaIdx: number;
  setPaginaIdx: (i: number) => void;
  onChange: (paginas: PaginaCanvas[]) => void;
  config: OrcConfig;
}

export default function CanvasPagePanel({ paginas, paginaIdx, setPaginaIdx, onChange, config }: CanvasPagePanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = paginas.findIndex(p => p.id === active.id);
    const newIdx = paginas.findIndex(p => p.id === over.id);
    const reordered = arrayMove(paginas, oldIdx, newIdx);
    onChange(reordered);
    setPaginaIdx(newIdx);
  };

  const deletePage = (idx: number) => {
    if (paginas.length <= 1) return;
    if (paginas[idx]?.tipo === 'PRODUTO_TEMPLATE') {
      alert('Páginas de produto não podem ser removidas — são a base do template. Edite o layout diretamente no canvas.');
      return;
    }
    if (!window.confirm('Remover esta página?')) return;
    const next = paginas.filter((_, i) => i !== idx);
    onChange(next);
    setPaginaIdx(Math.min(paginaIdx, next.length - 1));
  };

  const addPage = (tipo: PaginaCanvas['tipo']) => {
    const nova = addNewPage(tipo, config);
    onChange([...paginas, nova]);
    setPaginaIdx(paginas.length);
  };

  return (
    <div className="h-28 bg-white border-t border-slate-200 flex items-center gap-2 px-3 shrink-0">
      {/* Add buttons */}
      <div className="flex flex-col gap-1 shrink-0">
        {(['CAPA','PRODUTO_TEMPLATE','LIVRE','CONTRACAPA'] as const).map(tipo => (
          <button key={tipo} onClick={() => addPage(tipo)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border hover:bg-slate-50 transition-all ${TIPO_COLORS[tipo]} border-slate-200`}>
            <Plus size={10}/>{TIPO_LABELS[tipo]}
          </button>
        ))}
      </div>

      <div className="w-px h-20 bg-slate-200 shrink-0"/>

      {/* Thumbnails */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={paginas.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 flex-1 overflow-x-auto custom-scrollbar py-1 group">
            {paginas.map((pagina, idx) => (
              <PageThumb
                key={pagina.id}
                pagina={pagina}
                isActive={idx === paginaIdx}
                onClick={() => setPaginaIdx(idx)}
                onDelete={() => deletePage(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
