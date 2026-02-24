import { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, X, Check, Calculator,
  Database, AlertCircle
} from 'lucide-react';
import {
  type FieldDefinition, type FieldOutputType,
  resolveFieldRaw, formatFieldValue, type ProposalData
} from '../../lib/proposalFieldEngine';

interface ProposalFieldEditorProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

// Sample data for preview calculations
const SAMPLE_DATA: ProposalData = {
  id: 'preview',
  client: {
    name: 'Cliente Exemplo Ltda',
    company: 'Exemplo Corp',
    email: 'contato@exemplo.com',
    phone: '(11) 99999-9999',
    address: 'Av. Paulista, 1000'
  },
  company: {
    name: 'Zia Omnisystem',
    cnpj: '00.000.000/0001-00',
    address: 'Rua da Inovação, 123',
    phone: '(11) 3333-3333',
    email: 'contato@zia.com'
  },
  items: [
    { id: '1', description: 'Licença Enterprise', qty: 2, price: 500, discount: 0 },
    { id: '2', description: 'Implantação', qty: 1, price: 1500, discount: 0 }
  ],
  discount: 10,
  validUntil: new Date().toISOString().split('T')[0],
  paymentConditions: '30/60 dias',
  createdAt: new Date().toISOString()
};

export default function ProposalFieldEditor({ fields, onChange }: ProposalFieldEditorProps) {
  const [activeTab, setActiveTab] = useState<'base' | 'calculated'>('base');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);

  // Filter fields by type
  const baseFields = fields.filter(f => f.type === 'base');
  const calculatedFields = fields.filter(f => f.type === 'calculated');

  // --- MODAL STATE (Base Fields) ---
  const [baseForm, setBaseForm] = useState<{
    label: string;
    sourceKey: string;
    outputType: FieldOutputType;
  }>({ label: '', sourceKey: '', outputType: 'text' });

  // --- DRAWER STATE (Calculated Fields) ---
  const [calcForm, setCalcForm] = useState<{
    label: string;
    id: string;
    formula: string;
    outputType: FieldOutputType;
  }>({ label: '', id: '', formula: '', outputType: 'currency' });

  // Real-time preview calculation
  const previewValue = useMemo(() => {
    if (!calcForm.formula) return null;

    // Extract dependencies from formula: find all tokens {token}
    const dependencies = (calcForm.formula.match(/{([^}]+)}/g) || [])
      .map(token => token.replace(/[{}]/g, ''));

    // Create a temporary field definition for calculation
    const tempField: FieldDefinition = {
      id: calcForm.id || 'temp_preview',
      label: calcForm.label,
      type: 'calculated',
      formula: calcForm.formula,
      outputType: calcForm.outputType,
      dependsOn: dependencies,
    };

    try {
      const raw = resolveFieldRaw(tempField, fields, SAMPLE_DATA);
      return {
        value: formatFieldValue(raw, calcForm.outputType),
        error: null
      };
    } catch {
      return { value: null, error: 'Erro na fórmula' };
    }
  }, [calcForm, fields]);

  // Handlers
  const handleAddBaseField = () => {
    const newField: FieldDefinition = {
      id: baseForm.label.toLowerCase().replace(/\s+/g, '_'),
      label: baseForm.label,
      type: 'base',
      sourceKey: baseForm.sourceKey,
      outputType: baseForm.outputType
    };
    onChange([...fields, newField]);
    setIsModalOpen(false);
    setBaseForm({ label: '', sourceKey: '', outputType: 'text' });
  };

  const handleSaveCalculatedField = () => {
    // Extract dependencies from formula
    const dependencies = (calcForm.formula.match(/{([^}]+)}/g) || [])
      .map(token => token.replace(/[{}]/g, ''));

    const newField: FieldDefinition = {
      id: calcForm.id || calcForm.label.toLowerCase().replace(/\s+/g, '_'),
      label: calcForm.label,
      type: 'calculated',
      formula: calcForm.formula,
      outputType: calcForm.outputType,
      dependsOn: dependencies
    };

    if (editingField) {
      onChange(fields.map(f => f.id === editingField.id ? newField : f));
    } else {
      onChange([...fields, newField]);
    }

    setIsDrawerOpen(false);
    setEditingField(null);
    setCalcForm({ label: '', id: '', formula: '', outputType: 'currency' });
  };

  const handleDeleteField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const openEditDrawer = (field: FieldDefinition) => {
    setEditingField(field);
    setCalcForm({
      label: field.label,
      id: field.id,
      formula: field.formula || '',
      outputType: field.outputType
    });
    setIsDrawerOpen(true);
  };

  const insertToken = (token: string) => {
    setCalcForm(prev => ({
      ...prev,
      formula: prev.formula + `{${token}}`
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('base')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'base'
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
              : 'bg-slate-50 text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Database className="w-4 h-4" /> Campos Base
          </div>
        </button>
        <button
          onClick={() => setActiveTab('calculated')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'calculated'
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
              : 'bg-slate-50 text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4" /> Campos Calculados
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">

        {/* TAB: BASE FIELDS */}
        {activeTab === 'base' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {baseFields.map(field => (
                <div key={field.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      field.outputType === 'currency' ? 'bg-emerald-100 text-emerald-700' :
                      field.outputType === 'date' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {field.outputType}
                    </span>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-800">{field.label}</h3>
                  <code className="text-xs text-slate-500 font-mono bg-slate-50 px-1 py-0.5 rounded mt-1 block w-fit">
                    {field.sourceKey || field.id}
                  </code>
                </div>
              ))}

              {/* Add New Base Field Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-2 transition-colors">
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600">Adicionar Campo Base</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: CALCULATED FIELDS */}
        {activeTab === 'calculated' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditingField(null);
                  setCalcForm({ label: '', id: '', formula: '', outputType: 'currency' });
                  setIsDrawerOpen(true);
                }}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Campo Calculado
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {calculatedFields.map(field => {
                 // Calculate sample value for this specific field
                 let sampleValue = 'Erro';
                 try {
                   const raw = resolveFieldRaw(field, fields, SAMPLE_DATA);
                   sampleValue = formatFieldValue(raw, field.outputType);
                 } catch {}

                 return (
                  <div key={field.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-800 text-lg">{field.label}</h3>
                        <code className="text-xs text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {field.id}
                        </code>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold border border-slate-200 px-1.5 py-0.5 rounded">
                          {field.outputType}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 font-mono text-sm text-slate-600 max-w-md truncate">
                          {field.formula?.split(/({[^}]+})/).map((part, i) =>
                            part.startsWith('{') && part.endsWith('}') ? (
                              <span key={i} className="text-blue-600 font-bold">{part}</span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </div>
                        <ArrowRightIcon />
                        <div className="bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 font-bold text-sm text-emerald-700">
                           Ex: {sampleValue}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditDrawer(field)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: ADD BASE FIELD --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Adicionar Campo Base</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Label do Campo</label>
                <input
                  type="text"
                  value={baseForm.label}
                  onChange={(e) => setBaseForm({...baseForm, label: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: Telefone Secundário"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Caminho da Fonte (Source Key)</label>
                <input
                  type="text"
                  value={baseForm.sourceKey}
                  onChange={(e) => setBaseForm({...baseForm, sourceKey: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: client.secondary_phone"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Saída</label>
                <select
                  value={baseForm.outputType}
                  onChange={(e) => setBaseForm({...baseForm, outputType: e.target.value as FieldOutputType})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="currency">Moeda</option>
                  <option value="date">Data</option>
                  <option value="percent">Porcentagem</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={handleAddBaseField} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-sm transition-all transform active:scale-95">Salvar Campo</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DRAWER: CALCULATED FIELD --- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingField ? 'Editar Campo Calculado' : 'Novo Campo Calculado'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Defina a lógica e formatação do cálculo</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Label</label>
                    <input
                      type="text"
                      value={calcForm.label}
                      onChange={(e) => {
                          const val = e.target.value;
                          setCalcForm(prev => ({
                              ...prev,
                              label: val,
                              id: !editingField ? val.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '') : prev.id
                          }));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Ex: Total com Desconto"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ID (Slug)</label>
                    <input
                      type="text"
                      value={calcForm.id}
                      onChange={(e) => setCalcForm({...calcForm, id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm bg-slate-50 text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saída</label>
                    <select
                      value={calcForm.outputType}
                      onChange={(e) => setCalcForm({...calcForm, outputType: e.target.value as FieldOutputType})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="currency">Moeda (R$)</option>
                      <option value="number">Número</option>
                      <option value="percent">Porcentagem (%)</option>
                      <option value="text">Texto</option>
                    </select>
                </div>
              </div>

              {/* Formula Editor Area */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Fórmula de Cálculo</label>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">MathJS Supported</span>
                </div>

                {/* Available Fields Chips */}
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                    {fields.map(f => (
                        <button
                            key={f.id}
                            onClick={() => insertToken(f.id)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                        >
                            {`{${f.id}}`}
                        </button>
                    ))}
                </div>

                <textarea
                    value={calcForm.formula}
                    onChange={(e) => setCalcForm({...calcForm, formula: e.target.value})}
                    className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                    placeholder="Escreva sua fórmula aqui... Ex: {items_subtotal} * 0.1"
                />

                {/* Real-time Preview */}
                <div className={`p-4 rounded-lg border ${previewValue?.error ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} transition-colors`}>
                    <div className="flex items-center gap-2 mb-1">
                        {previewValue?.error ? <AlertCircle className="w-4 h-4 text-red-500"/> : <Check className="w-4 h-4 text-emerald-500"/>}
                        <span className={`text-xs font-bold uppercase tracking-wider ${previewValue?.error ? 'text-red-600' : 'text-emerald-700'}`}>
                            {previewValue?.error ? 'Erro na Fórmula' : 'Preview (Dados de Exemplo)'}
                        </span>
                    </div>
                    <p className={`text-lg font-bold ${previewValue?.error ? 'text-red-700' : 'text-emerald-800'}`}>
                        {previewValue?.error || previewValue?.value || '...'}
                    </p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsDrawerOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={handleSaveCalculatedField} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center">
                 <Check className="w-4 h-4 mr-2" /> Salvar Campo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple arrow icon for the calculated field card
function ArrowRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
