import { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay, useSensor, useSensors,
  PointerSensor, type DragEndEvent, type DragStartEvent, type DragOverEvent,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, X, GripVertical, FileText, Image, Grid, List,
  Minus, Type, Edit2, LayoutTemplate, Save
} from 'lucide-react';
import { type FieldDefinition } from '../../lib/proposalFieldEngine';

// ---- TYPES ----

type BlockType =
  'logo' | 'text' | 'field' | 'table' |
  'divider' | 'two-columns' | 'signature';

type BlockConfig = {
  fontSize?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  prefix?: string;
  suffix?: string;
  tableColumns?: string[];
  columnABinding?: string;
  columnBBinding?: string;
  staticText?: string;
};

type Block = {
  id: string;
  type: BlockType;
  label: string;
  binding?: string;
  config: BlockConfig;
};

type Section = {
  id: string;
  label: string;
  blocks: Block[];
};

type Template = {
  id: string;
  name: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
};

interface TemplateCanvasProps {
  fields: FieldDefinition[];
  initialTemplate?: Template;
  onSave: (template: Template) => void;
}

// ---- CONSTANTS ----

const DRAGGABLE_ITEMS = [
  { type: 'logo', label: 'Logo', icon: Image },
  { type: 'text', label: 'Texto Livre', icon: Type },
  { type: 'field', label: 'Campo', icon: FileText },
  { type: 'table', label: 'Tabela Itens', icon: List },
  { type: 'divider', label: 'Divisor', icon: Minus },
  { type: 'two-columns', label: 'Duas Colunas', icon: Grid },
  { type: 'signature', label: 'Assinatura', icon: Edit2 },
];

const DEFAULT_TEMPLATE: Template = {
  id: 'default',
  name: 'Orçamento Padrão',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'header',
      label: 'Cabeçalho',
      blocks: [
        { id: 'b1', type: 'logo', label: 'Logo da Empresa', config: { align: 'center' } },
        { id: 'b2', type: 'two-columns', label: 'Dados', config: { columnABinding: 'company_name', columnBBinding: 'client_name' } }
      ]
    },
    {
      id: 'items',
      label: 'Itens',
      blocks: [
        { id: 'b3', type: 'table', label: 'Lista de Produtos', config: { tableColumns: ['description', 'qty', 'price', 'total'] } }
      ]
    },
    {
      id: 'totals',
      label: 'Totais',
      blocks: [
        { id: 'b4', type: 'field', label: 'Subtotal', binding: 'items_subtotal', config: { align: 'right', prefix: 'Subtotal: ' } },
        { id: 'b5', type: 'divider', label: 'Divisor', config: {} },
        { id: 'b6', type: 'field', label: 'Total Final', binding: 'total_final', config: { align: 'right', bold: true, fontSize: 16, prefix: 'Total: ' } }
      ]
    },
    {
      id: 'footer',
      label: 'Rodapé',
      blocks: [
        { id: 'b7', type: 'signature', label: 'Assinatura', config: {} }
      ]
    }
  ]
};

// ---- COMPONENTS ----

function SortableBlock({ block, isSelected, onClick, onDelete }: { block: Block, isSelected: boolean, onClick: () => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = DRAGGABLE_ITEMS.find(i => i.type === block.type)?.icon || FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`relative group flex items-center p-3 mb-2 bg-white rounded-lg border-2 cursor-pointer transition-all ${
        isSelected ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div {...attributes} {...listeners} className="mr-3 text-slate-400 cursor-grab hover:text-slate-600">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={`p-2 rounded bg-slate-100 mr-3 text-slate-600`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-700">{block.label}</p>
        <p className="text-xs text-slate-400 font-mono">{block.binding || block.type}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface SortableSectionProps {
  section: Section;
  blocks: Block[];
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onDeleteSection: (id: string) => void;
  onRenameSection: (id: string, label: string) => void;
  activeBlockId: string | null;
}

function SortableSection({ section, blocks, onSelectBlock, onDeleteBlock, onDeleteSection, onRenameSection, activeBlockId }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6 bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4 group">
        <div className="flex items-center">
          <div {...attributes} {...listeners} className="mr-2 text-slate-400 cursor-grab hover:text-slate-600">
            <GripVertical className="w-5 h-5" />
          </div>
          <input
            value={section.label}
            onChange={(e) => onRenameSection(section.id, e.target.value)}
            className="bg-transparent font-bold text-slate-700 focus:outline-none focus:border-b-2 focus:border-indigo-500"
          />
        </div>
        <button onClick={() => onDeleteSection(section.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>

      <SortableContext items={blocks.map((b: Block) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[50px] p-2 bg-slate-100/50 rounded-lg border-2 border-dashed border-slate-200">
          {blocks.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Arraste blocos para cá</p>}
          {blocks.map((block: Block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={activeBlockId === block.id}
              onClick={() => onSelectBlock(block.id)}
              onDelete={() => onDeleteBlock(section.id, block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TemplateCanvas({ fields, initialTemplate, onSave }: TemplateCanvasProps) {
  const [template, setTemplate] = useState<Template>(initialTemplate || DEFAULT_TEMPLATE);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zia_proposal_template');
    if (saved && !initialTemplate) {
      try {
        setTemplate(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load template", e);
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ---- ACTIONS ----

  const handleSave = () => {
    const updated = { ...template, updatedAt: new Date().toISOString() };
    setTemplate(updated);
    localStorage.setItem('zia_proposal_template', JSON.stringify(updated));
    onSave(updated);
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      label: 'Nova Seção',
      blocks: []
    };
    setTemplate(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const deleteSection = (id: string) => {
    setTemplate(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) }
          : s
      )
    }));
    if (activeBlockId === blockId) setActiveBlockId(null);
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => ({
        ...s,
        blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
      }))
    }));
  };

  const updateBlockConfig = (blockId: string, configUpdates: Partial<BlockConfig>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(s => ({
        ...s,
        blocks: s.blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, ...configUpdates } } : b)
      }))
    }));
  };

  // ---- DND HANDLERS ----

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragItem(active);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Logic to handle dragging sidebar items into sections could go here
    // But basic sorting is handled by DragEnd for now to keep it simple
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    // 1. Reordering Sections
    if (active.data.current?.type === 'Section' && over.data.current?.type === 'Section') {
      const oldIndex = template.sections.findIndex(s => s.id === active.id);
      const newIndex = template.sections.findIndex(s => s.id === over.id);
      if (oldIndex !== newIndex) {
        setTemplate(prev => ({
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex)
        }));
      }
      return;
    }

    // 2. Sidebar Item dropped into Section
    if (active.data.current?.sortable?.containerId === 'sidebar' || active.id.toString().startsWith('sidebar_')) {
       // Find target section
       const sectionId = over.data.current?.sortable?.containerId || over.id;
       // If dropped on a block, get its section
       const targetSection = template.sections.find(s => s.id === sectionId || s.blocks.some(b => b.id === sectionId));

       if (targetSection) {
         const type = active.id.toString().replace('sidebar_', '') as BlockType;
         const newBlock: Block = {
           id: `block_${Date.now()}`,
           type,
           label: DRAGGABLE_ITEMS.find(i => i.type === type)?.label || 'Bloco',
           config: { align: 'left', fontSize: 12, color: '#000000' }
         };

         // Special handling for Fields dragged from sidebar
         if (active.data.current?.fieldId) {
            newBlock.type = 'field';
            newBlock.binding = active.data.current.fieldId;
            newBlock.label = active.data.current.label;
         }

         setTemplate(prev => ({
           ...prev,
           sections: prev.sections.map(s =>
             s.id === targetSection.id
               ? { ...s, blocks: [...s.blocks, newBlock] }
               : s
           )
         }));
       }
       return;
    }

    // 3. Reordering Blocks
    // Find source and dest sections
    const sourceSection = template.sections.find(s => s.blocks.some(b => b.id === active.id));
    const destSection = template.sections.find(s => s.id === over.id || s.blocks.some(b => b.id === over.id));

    if (sourceSection && destSection) {
      // Same section reorder
      if (sourceSection.id === destSection.id) {
        const oldIndex = sourceSection.blocks.findIndex(b => b.id === active.id);
        const newIndex = destSection.blocks.findIndex(b => b.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
           setTemplate(prev => ({
             ...prev,
             sections: prev.sections.map(s =>
               s.id === sourceSection.id
                 ? { ...s, blocks: arrayMove(s.blocks, oldIndex, newIndex) }
                 : s
             )
           }));
        }
      } else {
        // Move between sections (not implemented for simplicity, but structure allows it)
      }
    }
  };

  const selectedBlock = template.sections.flatMap(s => s.blocks).find(b => b.id === activeBlockId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full bg-slate-100 overflow-hidden">

        {/* --- LEFT SIDEBAR: BLOCKS --- */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Blocos</h3>
          </div>
          <div className="p-4 space-y-2">
            {DRAGGABLE_ITEMS.map(item => (
              <DraggableSidebarItem key={item.type} id={`sidebar_${item.type}`} label={item.label} icon={item.icon} />
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 mt-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Seus Campos</h3>
            <div className="flex flex-wrap gap-2">
              {fields.map(f => (
                <DraggableFieldChip key={f.id} field={f} />
              ))}
            </div>
          </div>
        </aside>

        {/* --- CENTER: CANVAS --- */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <input
                value={template.name}
                onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 -ml-2"
              />
            </div>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Template
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              <button
                onClick={addSection}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center font-bold text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Seção
              </button>

              <SortableContext items={template.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {template.sections.map(section => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    blocks={section.blocks}
                    activeBlockId={activeBlockId}
                    onSelectBlock={setActiveBlockId}
                    onDeleteBlock={deleteBlock}
                    onDeleteSection={deleteSection}
                    onRenameSection={(id: string, label: string) =>
                      setTemplate(prev => ({...prev, sections: prev.sections.map(s => s.id === id ? {...s, label} : s)}))
                    }
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR: PROPERTIES --- */}
        {selectedBlock && (
          <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-200 shadow-xl z-10">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Propriedades</h3>
              <button onClick={() => setActiveBlockId(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Label</label>
                <input
                  value={selectedBlock.label}
                  onChange={(e) => updateBlock(selectedBlock.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {/* Binding Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vinculação de Dados</label>
                <select
                  value={selectedBlock.binding || ''}
                  onChange={(e) => updateBlock(selectedBlock.id, { binding: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Sem vínculo</option>
                  <optgroup label="Dados do Cliente">
                    {fields.filter(f => f.sourceKey?.startsWith('client.')).map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Campos Calculados">
                    {fields.filter(f => f.type === 'calculated').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Conditional Configs based on Type */}
              {(selectedBlock.type === 'field' || selectedBlock.type === 'two-columns' || selectedBlock.type === 'text') && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tamanho</label>
                      <select
                        value={selectedBlock.config.fontSize || 12}
                        onChange={(e) => updateBlockConfig(selectedBlock.id, { fontSize: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        {[8, 10, 12, 14, 16, 18, 24].map(s => <option key={s} value={s}>{s}px</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cor</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.config.color || '#000000'}
                          onChange={(e) => updateBlockConfig(selectedBlock.id, { color: e.target.value })}
                          className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                        />
                        <span className="text-xs text-slate-500">{selectedBlock.config.color}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alinhamento</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => updateBlockConfig(selectedBlock.id, { align: align as any })}
                          className={`flex-1 py-1 text-xs font-bold uppercase rounded ${selectedBlock.config.align === align ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                        >
                          {align === 'left' ? 'Esq' : align === 'center' ? 'Cen' : 'Dir'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bold"
                      checked={selectedBlock.config.bold || false}
                      onChange={(e) => updateBlockConfig(selectedBlock.id, { bold: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="bold" className="text-sm font-medium text-slate-700">Negrito</label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Prefixo / Sufixo</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            placeholder="Prefix"
                            value={selectedBlock.config.prefix || ''}
                            onChange={(e) => updateBlockConfig(selectedBlock.id, { prefix: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                            placeholder="Suffix"
                            value={selectedBlock.config.suffix || ''}
                            onChange={(e) => updateBlockConfig(selectedBlock.id, { suffix: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                  </div>
                </div>
              )}

              {selectedBlock.type === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Texto Estático</label>
                    <textarea
                        value={selectedBlock.config.staticText || ''}
                        onChange={(e) => updateBlockConfig(selectedBlock.id, { staticText: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-32"
                    />
                  </div>
              )}

              {selectedBlock.type === 'table' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Colunas Visíveis</label>
                    <div className="space-y-2">
                        {[
                            { id: 'description', label: 'Descrição' },
                            { id: 'qty', label: 'Qtd' },
                            { id: 'price', label: 'Preço Unit.' },
                            { id: 'total', label: 'Subtotal' },
                            { id: 'discount', label: 'Desconto Item' }
                        ].map(col => {
                            const cols = selectedBlock.config.tableColumns || [];
                            const isChecked = cols.includes(col.id);
                            return (
                                <div key={col.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`col-${col.id}`}
                                        checked={isChecked}
                                        onChange={(e) => {
                                            const newCols = e.target.checked
                                                ? [...cols, col.id]
                                                : cols.filter(c => c !== col.id);
                                            updateBlockConfig(selectedBlock.id, { tableColumns: newCols });
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`col-${col.id}`} className="ml-2 text-sm text-slate-700 font-medium">
                                        {col.label}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                  </div>
              )}
            </div>
          </aside>
        )}

        <DragOverlay>
            {activeDragItem ? (
                <div className="px-4 py-2 bg-white shadow-xl rounded-lg border border-indigo-500 text-indigo-600 font-bold opacity-90 cursor-grabbing">
                    Arrastando Item...
                </div>
            ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

// ---- HELPER COMPONENTS ----

interface DraggableSidebarItemProps {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

function DraggableSidebarItem({ id, label, icon: Icon }: DraggableSidebarItemProps) {
    const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform) };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="flex items-center p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
        >
            <Icon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-500" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-700">{label}</span>
        </div>
    );
}

function DraggableFieldChip({ field }: { field: FieldDefinition }) {
    const { attributes, listeners, setNodeRef, transform } = useSortable({
        id: `sidebar_field_${field.id}`,
        data: { fieldId: field.id, label: field.label }
    });
    const style = { transform: CSS.Transform.toString(transform) };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-xs font-medium text-indigo-700 cursor-grab hover:bg-indigo-100 transition-colors"
        >
            {field.label}
        </div>
    );
}
