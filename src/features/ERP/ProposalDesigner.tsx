import { useState, useMemo } from 'react';
import {
  type FieldDefinition, type ProposalData, DEFAULT_BASE_FIELDS, DEFAULT_CALCULATED_FIELDS,
  resolveAllFields, resolveAllFieldsNumeric
} from '../../lib/proposalFieldEngine';
import ProposalFieldEditor from './ProposalFieldEditor';
import TemplateCanvas from './TemplateCanvas';
import { ProposalPDFDocument, DownloadPDFButton } from './ProposalPDF';
import { CheckCircle2, AlertCircle, FileSearch, Download, Layout, Database } from 'lucide-react';

// Sample data for preview
const SAMPLE_DATA: ProposalData = {
  id: 'sample',
  client: {
    name: 'Cliente Exemplo Ltda',
    company: 'Exemplo Corp',
    email: 'contato@exemplo.com',
    phone: '(11) 99999-9999',
    address: 'Av. Paulista, 1000, São Paulo - SP'
  },
  company: {
    name: 'Zia Omnisystem',
    cnpj: '00.000.000/0001-00',
    address: 'Rua da Inovação, 123 - Tecnopolo',
    phone: '(11) 3333-3333',
    email: 'contato@zia.com'
  },
  items: [
    { id: '1', description: 'Licença Enterprise (Anual)', qty: 1, price: 12000, discount: 0 },
    { id: '2', description: 'Implantação e Onboarding', qty: 1, price: 2500, discount: 0 },
    { id: '3', description: 'Treinamento Equipe (Hora)', qty: 10, price: 150, discount: 0 }
  ],
  discount: 5,
  validUntil: new Date(Date.now() + 86400000 * 15).toISOString(),
  paymentConditions: '50% na assinatura, 50% na entrega (30 dias)',
  createdAt: new Date().toISOString()
};

export default function ProposalDesigner() {
  const [activeTab, setActiveTab] = useState<'fields' | 'layout' | 'preview' | 'export'>('layout');

  // State
  const [fields, setFields] = useState<FieldDefinition[]>([...DEFAULT_BASE_FIELDS, ...DEFAULT_CALCULATED_FIELDS]);
  const [template, setTemplate] = useState<any>(undefined); // Loaded by TemplateCanvas internal logic or passed down
  const [proposalData] = useState<ProposalData>(SAMPLE_DATA);

  // Derived
  const resolvedFields = useMemo(() => resolveAllFields(fields, proposalData), [fields, proposalData]);
  const resolvedNumeric = useMemo(() => resolveAllFieldsNumeric(fields, proposalData), [fields, proposalData]);

  // Validation for Export
  const validation = useMemo(() => {
    if (!template) return { valid: false, checks: [] };
    const hasTable = template.sections.some((s: any) => s.blocks.some((b: any) => b.type === 'table'));
    const hasTotal = template.sections.some((s: any) => s.blocks.some((b: any) => b.binding === 'total_final'));

    return {
      valid: hasTable && hasTotal,
      checks: [
        { label: 'Template possui tabela de itens', passed: hasTable },
        { label: 'Template exibe Total Final', passed: hasTotal },
        { label: 'Dados de proposta carregados', passed: true },
        { label: 'Pelo menos 1 item na proposta', passed: proposalData.items.length > 0 }
      ]
    };
  }, [template, proposalData]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Designer de Orçamento</h1>
          <p className="text-sm text-slate-500">Configure o modelo PDF padrão para propostas comerciais</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {[
            { id: 'fields', label: 'Campos', icon: Database },
            { id: 'layout', label: 'Layout', icon: Layout },
            { id: 'preview', label: 'Preview', icon: FileSearch },
            { id: 'export', label: 'Exportar PDF', icon: Download }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-bold rounded-md flex items-center transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">

        {/* TAB: FIELDS */}
        {activeTab === 'fields' && (
          <div className="absolute inset-0 p-8">
            <ProposalFieldEditor fields={fields} onChange={setFields} />
          </div>
        )}

        {/* TAB: LAYOUT */}
        {activeTab === 'layout' && (
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-slate-200 relative">
              <TemplateCanvas
                fields={fields}
                initialTemplate={template}
                onSave={(tmpl) => {
                  setTemplate(tmpl);
                  // Optional: Show toast
                }}
              />
            </div>
            <div className="w-96 bg-slate-100 p-8 border-l border-slate-200 flex flex-col items-center justify-center shrink-0 hidden xl:flex">
                <div className="mb-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Miniatura Preview</div>
                <div className="bg-white shadow-2xl border border-slate-200 w-[210mm] h-[297mm] transform scale-[0.35] origin-top pointer-events-none overflow-hidden">
                   {/* Simplified Preview Render */}
                   <div className="p-10 space-y-4">
                      <div className="h-8 bg-indigo-600 w-12 rounded mb-4 opacity-50"></div>
                      <div className="h-4 bg-slate-200 w-3/4 rounded"></div>
                      <div className="h-4 bg-slate-200 w-1/2 rounded"></div>
                      <div className="h-32 bg-slate-100 rounded border border-slate-200 mt-8"></div>
                      <div className="space-y-2 mt-8 flex flex-col items-end">
                         <div className="h-4 bg-slate-200 w-32 rounded"></div>
                         <div className="h-4 bg-slate-200 w-32 rounded"></div>
                         <div className="h-6 bg-slate-300 w-40 rounded"></div>
                      </div>
                   </div>
                </div>
            </div>
          </div>
        )}

        {/* TAB: PREVIEW */}
        {activeTab === 'preview' && (
          <div className="absolute inset-0 p-8 overflow-y-auto bg-slate-100/50">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Controls */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Dados de Teste</h3>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4"
                    disabled
                  >
                    <option>Dados de Exemplo (Padrão)</option>
                  </select>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Campos Resolvidos</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-600">ID</th>
                            <th className="px-3 py-2 text-right font-bold text-slate-600">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {Object.entries(resolvedFields).map(([key, val]) => (
                            <tr key={key}>
                              <td className="px-3 py-1.5 text-slate-500 font-mono">{key}</td>
                              <td className="px-3 py-1.5 text-right font-bold text-slate-800">{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* A4 Preview Container */}
              <div className="lg:col-span-2 flex justify-center">
                 <div className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[15mm] relative text-sm">
                    {/* Render visual HTML representation of template */}
                    {template?.sections.map((section: any) => (
                      <div key={section.id} className="mb-8">
                        {section.blocks.map((block: any) => (
                          <div key={block.id} className="mb-2">
                             {block.type === 'logo' && (
                               <div className={`flex ${block.config.align === 'center' ? 'justify-center' : block.config.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                  <div className="bg-indigo-600 text-white p-2 rounded w-10 h-10 flex items-center justify-center font-bold">Z</div>
                               </div>
                             )}
                             {block.type === 'two-columns' && (
                               <div className="flex justify-between">
                                  <div className="w-1/2 pr-4">
                                    <p className="font-bold text-xs text-slate-400 mb-1">EMPRESA</p>
                                    <p>{resolvedFields[block.config.columnABinding] || 'Empresa'}</p>
                                  </div>
                                  <div className="w-1/2 pl-4 text-right">
                                    <p className="font-bold text-xs text-slate-400 mb-1">CLIENTE</p>
                                    <p>{resolvedFields[block.config.columnBBinding] || 'Cliente'}</p>
                                  </div>
                               </div>
                             )}
                             {block.type === 'table' && (
                               <div className="border border-slate-200 rounded mt-4">
                                  <div className="bg-slate-800 text-white flex p-2 text-xs font-bold">
                                     <div className="flex-1">Descrição</div>
                                     <div className="w-20 text-right">Qtd</div>
                                     <div className="w-24 text-right">Preço</div>
                                     <div className="w-24 text-right">Total</div>
                                  </div>
                                  {proposalData.items.map((item, idx) => (
                                    <div key={idx} className={`flex p-2 text-xs ${idx % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                                       <div className="flex-1">{item.description}</div>
                                       <div className="w-20 text-right">{item.qty}</div>
                                       <div className="w-24 text-right">R$ {item.price}</div>
                                       <div className="w-24 text-right">R$ {item.qty * item.price}</div>
                                    </div>
                                  ))}
                               </div>
                             )}
                             {block.type === 'field' && (
                               <div className={`flex ${block.config.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                  <span className="font-bold mr-2 text-slate-500">{block.label}:</span>
                                  <span className={`font-bold ${block.config.fontSize > 14 ? 'text-lg' : ''}`}>
                                    {block.config.prefix} {resolvedFields[block.binding]}
                                  </span>
                               </div>
                             )}
                             {block.type === 'divider' && <hr className="my-4 border-slate-200" />}
                          </div>
                        ))}
                      </div>
                    ))}
                 </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: EXPORT */}
        {activeTab === 'export' && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Exportar Orçamento</h2>
              <p className="text-slate-500 mb-8">Verifique os requisitos antes de gerar o documento final.</p>

              <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left space-y-3">
                {validation.checks.map((check, idx) => (
                  <div key={idx} className="flex items-center">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <span className={`text-sm font-medium ${check.passed ? 'text-slate-700' : 'text-red-600'}`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              {template && (
                <DownloadPDFButton
                  document={
                    <ProposalPDFDocument
                      template={template}
                      proposalData={proposalData}
                      resolvedFields={resolvedFields}
                      resolvedNumeric={resolvedNumeric}
                    />
                  }
                  fileName={`Orcamento_${proposalData.client.name.replace(/\s+/g, '_')}.pdf`}
                  disabled={!validation.valid}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
