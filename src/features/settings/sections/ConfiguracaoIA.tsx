// ─────────────────────────────────────────────────────────────────────────────
// Configuração Global da IA — disponível em Configurações
// Define a identidade, contexto da empresa, links de referência e busca de imagens.
// Todas as IAs do app (Chat, CRM, Escuta, Prospecção) herdam esse contexto.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Brain, Building2, Link as LinkIcon, Settings, Image,
  Plus, Trash2, Save, Eye, EyeOff, Check, AlertTriangle, Info, ChevronDown,
} from 'lucide-react';
import {
  useAIConfig, buildSystemContext, AI_CONFIG_DEFAULT,
  type AIConfig, type AILink,
} from '../../../context/AIConfigContext';

type Tab = 'identidade' | 'empresa' | 'links' | 'comportamento' | 'imagens' | 'preview';

const TABS: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: 'identidade',   label: 'Identidade',   icon: Brain      },
  { id: 'empresa',      label: 'Empresa',       icon: Building2  },
  { id: 'links',        label: 'Links e Fontes', icon: LinkIcon   },
  { id: 'comportamento', label: 'Comportamento', icon: Settings   },
  { id: 'imagens',      label: 'Imagens Web',   icon: Image      },
  { id: 'preview',      label: 'Preview',       icon: Eye        },
];

function InputField({
  label, value, onChange, placeholder, multiline, rows, help,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; rows?: number; help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows ?? 4}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      )}
      {help && <p className="text-[11px] text-slate-400">{help}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: typeof Brain; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

export default function ConfiguracaoIA() {
  const { config, saveConfig } = useAIConfig();
  const [draft, setDraft]   = useState<AIConfig>({ ...config });
  const [tab, setTab]       = useState<Tab>('identidade');
  const [saved, setSaved]   = useState(false);
  const [showCseKey, setShowCseKey] = useState(false);
  const [newLink, setNewLink] = useState<Omit<AILink, 'id'>>({ label: '', url: '', description: '' });
  const [addingLink, setAddingLink] = useState(false);

  function set<K extends keyof AIConfig>(key: K, val: AIConfig[K]) {
    setDraft(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    saveConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    setDraft({ ...AI_CONFIG_DEFAULT });
  }

  function addLink() {
    if (!newLink.url.trim()) return;
    const link: AILink = { id: crypto.randomUUID(), ...newLink };
    set('links', [...draft.links, link]);
    setNewLink({ label: '', url: '', description: '' });
    setAddingLink(false);
  }

  function removeLink(id: string) {
    set('links', draft.links.filter(l => l.id !== id));
  }

  const previewContext = buildSystemContext(draft);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800">Configuração da IA</h1>
          </div>
          <p className="text-sm text-slate-500">
            Define a identidade, contexto e fontes usados por <strong>todas</strong> as IAs do sistema.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
        <p>
          Este contexto é injetado automaticamente em <strong>todas as IAs</strong>: Chat principal, IA do CRM,
          Escuta Inteligente e Prospecção. A IA sempre saberá onde trabalha e terá acesso às fontes configuradas.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-white shadow text-indigo-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Identidade ───────────────────────────────────────────────────────── */}
      {tab === 'identidade' && (
        <SectionCard title="Identidade da IA" subtitle="Quem é a IA e como ela se apresenta" icon={Brain}>
          <InputField
            label="Nome da IA"
            value={draft.aiName}
            onChange={v => set('aiName', v)}
            placeholder="ZIA"
            help="Nome pelo qual a IA se apresenta aos usuários."
          />
          <InputField
            label="Persona (system prompt personalizado)"
            value={draft.aiPersona}
            onChange={v => set('aiPersona', v)}
            placeholder={`Você é a ZIA, assistente inteligente da Empresa Exemplo Ltda., uma distribuidora de materiais elétricos com 15 anos de mercado. Você auxilia a equipe de vendas, suporte e gestão com foco em produtividade e atendimento excepcional ao cliente. Responda sempre em português, de forma direta e profissional.`}
            multiline
            rows={5}
            help="Se preenchido, substitui a descrição padrão. Deixe em branco para usar nome + empresa automaticamente."
          />
        </SectionCard>
      )}

      {/* ── Empresa ──────────────────────────────────────────────────────────── */}
      {tab === 'empresa' && (
        <SectionCard title="Contexto da Empresa" subtitle="Informações sobre onde a IA trabalha" icon={Building2}>
          <InputField
            label="Nome da empresa"
            value={draft.companyName}
            onChange={v => set('companyName', v)}
            placeholder="Empresa Exemplo Ltda."
          />
          <InputField
            label="Setor / Ramo de atividade"
            value={draft.sector}
            onChange={v => set('sector', v)}
            placeholder="ex: Distribuidora de materiais elétricos, Indústria têxtil, SaaS B2B..."
          />
          <InputField
            label="Descrição da empresa"
            value={draft.companyDescription}
            onChange={v => set('companyDescription', v)}
            placeholder="Descreva a empresa: produtos/serviços, público-alvo, diferenciais, histórico relevante..."
            multiline
            rows={5}
            help="A IA usará essas informações para contextualizar respostas sobre produtos, clientes e processos."
          />
        </SectionCard>
      )}

      {/* ── Links ────────────────────────────────────────────────────────────── */}
      {tab === 'links' && (
        <SectionCard
          title="Links e Fontes de Referência"
          subtitle="URLs que a IA deve consultar e incluir no contexto"
          icon={LinkIcon}
        >
          <p className="text-[12px] text-slate-400 -mt-2">
            Adicione links para tabelas de preço, catálogos, documentações, sites da empresa, etc.
            A IA terá acesso a esses endereços no contexto de cada conversa.
          </p>

          {/* Lista de links */}
          {draft.links.length > 0 && (
            <div className="space-y-2">
              {draft.links.map(link => (
                <div key={link.id} className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{link.label || link.url}</p>
                    <p className="text-[11px] text-slate-400 truncate">{link.url}</p>
                    {link.description && <p className="text-[11px] text-slate-500 mt-0.5">{link.description}</p>}
                  </div>
                  <button
                    onClick={() => removeLink(link.id)}
                    className="p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário de novo link */}
          {addingLink ? (
            <div className="border border-indigo-100 rounded-xl p-4 space-y-3 bg-indigo-50/30">
              <input
                type="text"
                placeholder="Rótulo (ex: Tabela de preços 2025)"
                value={newLink.label}
                onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="url"
                placeholder="URL (ex: https://empresa.com/tabela.pdf)"
                value={newLink.url}
                onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="Descrição curta (opcional)"
                value={newLink.description}
                onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex gap-2">
                <button onClick={addLink} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Adicionar
                </button>
                <button onClick={() => setAddingLink(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingLink(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar link
            </button>
          )}
        </SectionCard>
      )}

      {/* ── Comportamento ────────────────────────────────────────────────────── */}
      {tab === 'comportamento' && (
        <SectionCard title="Comportamento e Instruções" subtitle="Como a IA deve agir e responder" icon={Settings}>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Idioma das respostas</label>
            <div className="relative">
              <select
                value={draft.responseLanguage}
                onChange={e => set('responseLanguage', e.target.value as AIConfig['responseLanguage'])}
                className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <InputField
            label="Instruções adicionais"
            value={draft.extraInstructions}
            onChange={v => set('extraInstructions', v)}
            placeholder={`ex: Sempre que o cliente mencionar concorrente, enfatize nossos diferenciais. Nunca forneça preços sem antes confirmar o CNPJ do cliente. Seja formal, mas amigável.`}
            multiline
            rows={6}
            help="Regras específicas de comportamento. Injetado no final do system prompt de todas as IAs."
          />

          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={handleReset}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Restaurar configurações padrão
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Busca de Imagens ─────────────────────────────────────────────────── */}
      {tab === 'imagens' && (
        <div className="space-y-4">
          <SectionCard title="Busca de Imagens na Web" subtitle="A IA busca fotos de produtos automaticamente quando não há imagem cadastrada" icon={Image}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Ativar busca de imagens</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Quando a Escuta Inteligente sugere um produto sem foto, busca automaticamente na web.
                </p>
              </div>
              <button
                onClick={() => set('searchImages', !draft.searchImages)}
                className={`w-12 h-6 rounded-full transition-colors ${draft.searchImages ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${draft.searchImages ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {draft.searchImages && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700">
                    Requer <strong>Google Custom Search API</strong>. Configure um Custom Search Engine
                    em <strong>programmablesearchengine.google.com</strong> com busca de imagens ativada,
                    depois insira o ID e a chave abaixo.
                  </p>
                </div>

                <InputField
                  label="Google Custom Search Engine ID (CX)"
                  value={draft.googleCseId}
                  onChange={v => set('googleCseId', v)}
                  placeholder="ex: 017576662512468239146:omuauf_lfve"
                  help="Encontrado no painel do Programmable Search Engine."
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Google Custom Search API Key</label>
                  <div className="relative">
                    <input
                      type={showCseKey ? 'text' : 'password'}
                      value={draft.googleCseKey}
                      onChange={e => set('googleCseKey', e.target.value)}
                      placeholder="AIza..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => setShowCseKey(!showCseKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Chave de API do Google Cloud com a API "Custom Search JSON API" ativada.
                    Limite gratuito: 100 buscas/dia.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Preview ──────────────────────────────────────────────────────────── */}
      {tab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Contexto gerado (system prompt prefix)</h3>
            </div>
            <div className="p-6">
              {previewContext ? (
                <pre className="text-[12px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  {previewContext}
                </pre>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Preencha ao menos um campo nas abas anteriores para ver o contexto gerado.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
            <p>
              Este texto é injetado <strong>antes</strong> de qualquer instrução específica de cada módulo.
              {!previewContext && ' Configure ao menos um campo para ativar o contexto.'}
            </p>
          </div>
        </div>
      )}

      {/* Botão salvar fixo no fundo */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          Configuração salva localmente · Será aplicada imediatamente em todas as IAs
        </p>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Configuração salva!' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  );
}
