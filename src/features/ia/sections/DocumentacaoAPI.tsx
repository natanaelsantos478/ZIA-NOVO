// ─────────────────────────────────────────────────────────────────────────────
// DocumentacaoAPI — Referência técnica de provedores de IA
// Visível apenas para Gestor Holding (level 1)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { ShieldOff, ChevronRight, Copy, Check } from 'lucide-react';
import { useProfiles } from '../../../context/ProfileContext';

// ── Bloco de código ───────────────────────────────────────────────────────────

function CodeBlock({ code, lang = '' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-t-lg px-3 py-1.5">
        <span className="text-xs text-slate-500 font-mono">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="bg-slate-950 border border-t-0 border-slate-700 rounded-b-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
        {code.trim()}
      </pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300 leading-relaxed">{children}</p>;
}

function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: 'violet' | 'amber' | 'emerald' | 'slate' | 'red' }) {
  const colors = {
    violet: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
    amber:  'bg-amber-900/40 text-amber-300 border-amber-700/50',
    emerald:'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    slate:  'bg-slate-800 text-slate-300 border-slate-700',
    red:    'bg-red-900/40 text-red-300 border-red-700/50',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono border ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Conteúdo DeepSeek ─────────────────────────────────────────────────────────

const DEEPSEEK_SECTIONS = [
  { id: 'inicio',      label: 'Início Rápido'         },
  { id: 'modelos',     label: 'Modelos'               },
  { id: 'tool-calls',  label: 'Tool Calls'            },
  { id: 'strict',      label: 'Tool Calls — Strict'   },
  { id: 'json-output', label: 'Saída JSON'            },
  { id: 'cache',       label: 'Cache de Contexto'     },
  { id: 'multiturn',   label: 'Conversa Multi-turno'  },
  { id: 'anthropic',   label: 'Compat. Anthropic'     },
  { id: 'erros',       label: 'Códigos de Erro'       },
];

function DeepSeekDocs({ active }: { active: string }) {
  if (active === 'inicio') return (
    <div className="space-y-4">
      <Section title="Primeira Chamada de API">
        <P>Base URL: <Badge color="violet">https://api.deepseek.com</Badge> — formato compatível com OpenAI.</P>
        <CodeBlock lang="curl" code={`curl https://api.deepseek.com/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${DEEPSEEK_API_KEY}" \\
  -d '{
        "model": "deepseek-v4-pro",
        "messages": [
          {"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": "Hello!"}
        ],
        "thinking": {"type": "enabled"},
        "reasoning_effort": "high",
        "stream": false
      }'`} />
        <P>Para streaming, defina <Badge>stream: true</Badge>. Modo de raciocínio ativado com <Badge>reasoning_effort: "high"</Badge>.</P>
      </Section>
    </div>
  );

  if (active === 'modelos') return (
    <div className="space-y-4">
      <Section title="Modelos Disponíveis">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Modelo</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Uso</th>
                <th className="text-left py-2 text-slate-400 font-semibold">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2 pr-4"><Badge color="violet">deepseek-v4-pro</Badge></td>
                <td className="py-2 pr-4 text-slate-300">Tarefas complexas, raciocínio</td>
                <td className="py-2 text-slate-400 text-xs">Recomendado para agentes</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><Badge color="emerald">deepseek-v4-flash</Badge></td>
                <td className="py-2 pr-4 text-slate-300">Respostas rápidas, baixo custo</td>
                <td className="py-2 text-slate-400 text-xs">Substitui deepseek-chat</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><Badge color="slate">deepseek-chat</Badge></td>
                <td className="py-2 pr-4 text-slate-300">Legado</td>
                <td className="py-2 text-amber-400 text-xs">Descontinuado em 24/07/2026</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><Badge color="slate">deepseek-reasoner</Badge></td>
                <td className="py-2 pr-4 text-slate-300">Legado</td>
                <td className="py-2 text-amber-400 text-xs">Descontinuado em 24/07/2026</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-200/80">
          <strong>Atenção:</strong> deepseek-chat e deepseek-reasoner serão descontinuados em 24/07/2026.
          Usar deepseek-v4-flash e deepseek-v4-pro respectivamente.
        </div>
      </Section>
    </div>
  );

  if (active === 'tool-calls') return (
    <div className="space-y-4">
      <Section title="Tool Calls (Function Calling)">
        <P>O modelo pode invocar ferramentas externas. O formato é idêntico ao da OpenAI.</P>
        <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="<sua api key>",
    base_url="https://api.deepseek.com",
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Obtém o clima de uma localização.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Cidade e estado, ex: São Paulo, SP",
                    }
                },
                "required": ["location"]
            },
        }
    },
]

messages = [{"role": "user", "content": "Como está o tempo em Campinas?"}]

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=messages,
    tools=tools
)
message = response.choices[0].message

# Modelo retorna: message.tool_calls[0] com name + arguments
tool_call = message.tool_calls[0]
messages.append(message)

# Executar a ferramenta e devolver resultado
messages.append({
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": "25°C, parcialmente nublado"
})

# Segunda chamada — modelo interpreta o resultado
final = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=messages,
    tools=tools
)
print(final.choices[0].message.content)`} />
        <P><strong>Fluxo:</strong> usuário pergunta → modelo retorna tool_call → executor chama a função → devolve resultado → modelo responde em linguagem natural.</P>
        <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
          <strong className="text-slate-200">Deno/TypeScript:</strong> usar <Badge>fetch</Badge> direto na URL
          <code className="ml-1 text-violet-300">https://api.deepseek.com/chat/completions</code> com Authorization Bearer.
        </div>
      </Section>
    </div>
  );

  if (active === 'strict') return (
    <div className="space-y-4">
      <Section title="Tool Calls — Modo Strict (Beta)">
        <P>No modo strict, o modelo segue rigorosamente o schema JSON definido. Requer <Badge color="amber">base_url com /beta</Badge>.</P>
        <CodeBlock lang="json" code={`{
    "type": "function",
    "function": {
        "name": "get_weather",
        "strict": true,
        "description": "Obtém o clima de uma localização.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "Cidade e estado, ex: São Paulo, SP"
                }
            },
            "required": ["location"],
            "additionalProperties": false
        }
    }
}`} />
        <P><strong>Ativação:</strong> usar <Badge color="amber">base_url="https://api.deepseek.com/beta"</Badge> e definir <Badge>strict: true</Badge> em todas as funções.</P>
        <P><strong>Regras obrigatórias no strict:</strong></P>
        <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 ml-2">
          <li>Todas as propriedades de cada objeto devem estar em <Badge>required</Badge></li>
          <li><Badge>additionalProperties</Badge> deve ser <Badge>false</Badge></li>
          <li>Tipos suportados: object, string, number, integer, boolean, array, enum, anyOf</li>
        </ul>
        <div className="bg-red-950/30 border border-red-700/40 rounded-lg p-3 text-xs text-red-200/80">
          <strong>Não suportado no strict:</strong> minLength, maxLength, minItems, maxItems
        </div>
      </Section>
    </div>
  );

  if (active === 'json-output') return (
    <div className="space-y-4">
      <Section title="Saída JSON Estruturada">
        <P>Garante que a resposta seja sempre um JSON válido. Útil para parsear respostas no runner.</P>
        <CodeBlock lang="python" code={`response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "system", "content": "Retorne um JSON com 'question' e 'answer'."},
        {"role": "user", "content": "Qual a capital do Brasil? Brasília."}
    ],
    response_format={"type": "json_object"}
)
# Saída: {"question": "Qual a capital do Brasil?", "answer": "Brasília"}`} />
        <P><strong>Requisitos:</strong></P>
        <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 ml-2">
          <li>Definir <Badge>response_format: {"{ type: 'json_object' }"}</Badge></li>
          <li>Incluir a palavra <Badge>json</Badge> no system prompt ou user prompt</li>
          <li>Definir <Badge>max_tokens</Badge> suficiente para não truncar o JSON</li>
        </ul>
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-200/80">
          A API pode ocasionalmente retornar conteúdo vazio. Validar o parse antes de usar.
        </div>
      </Section>
    </div>
  );

  if (active === 'cache') return (
    <div className="space-y-4">
      <Section title="Cache de Contexto">
        <P>Ativado automaticamente para todos os usuários — não requer configuração. O cache é feito por prefixo de input.</P>
        <P><strong>Como funciona:</strong></P>
        <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 ml-2">
          <li>Requisição 1: <Badge>A + B</Badge> → persiste cache de prefixo <Badge>A+B</Badge></li>
          <li>Requisição 2: <Badge>A + B + C</Badge> → reutiliza cache de <Badge>A+B</Badge> ✓</li>
          <li>Requisição 2: <Badge>A + C</Badge> → não reutiliza (prefixo diferente) ✗</li>
        </ul>
        <P><strong>Verificar hits na resposta:</strong></P>
        <CodeBlock lang="json" code={`{
  "usage": {
    "prompt_tokens": 500,
    "completion_tokens": 100,
    "prompt_cache_hit_tokens": 400,
    "prompt_cache_miss_tokens": 100
  }
}`} />
        <P>Cache persiste por horas/dias e é limpo automaticamente quando não está em uso.</P>
      </Section>
    </div>
  );

  if (active === 'multiturn') return (
    <div className="space-y-4">
      <Section title="Conversa Multi-turno">
        <P>A API é stateless — o cliente deve enviar todo o histórico a cada requisição.</P>
        <CodeBlock lang="python" code={`# Rodada 1
messages = [{"role": "user", "content": "Qual a montanha mais alta do mundo?"}]
response = client.chat.completions.create(model="deepseek-v4-pro", messages=messages)
messages.append(response.choices[0].message)

# Rodada 2 — inclui resposta anterior no contexto
messages.append({"role": "user", "content": "E a segunda mais alta?"})
response = client.chat.completions.create(model="deepseek-v4-pro", messages=messages)
messages.append(response.choices[0].message)`} />
        <P>O runner do ZIA gerencia isso automaticamente via <Badge>ia_agent_chat_messages</Badge>.</P>
      </Section>
    </div>
  );

  if (active === 'anthropic') return (
    <div className="space-y-4">
      <Section title="Compatibilidade com API Anthropic">
        <P>A DeepSeek suporta o formato da API Anthropic via base URL alternativo.</P>
        <CodeBlock lang="bash" code={`export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_API_KEY=\${SUA_DEEPSEEK_KEY}`} />
        <CodeBlock lang="python" code={`import anthropic

client = anthropic.Anthropic()  # usa as env vars acima

message = client.messages.create(
    model="deepseek-v4-pro",
    max_tokens=1000,
    system="Você é um assistente útil.",
    messages=[{"role": "user", "content": [{"type": "text", "text": "Olá!"}]}]
)
print(message.content)`} />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400">Campo</th>
                <th className="text-left py-2 text-slate-400">Suporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                ['model',         'Usar modelo DeepSeek'],
                ['max_tokens',    'Completo'],
                ['system',        'Completo'],
                ['tools (name, description, input_schema)', 'Completo'],
                ['tool_choice (none/auto/any/tool)', 'Suportado'],
                ['thinking',      'Suportado (budget_tokens ignorado)'],
                ['stream',        'Completo'],
                ['temperature',   'Completo [0.0–2.0]'],
                ['top_p',         'Completo'],
                ['metadata',      'Ignorado'],
                ['mcp_servers',   'Ignorado'],
              ].map(([f, s]) => (
                <tr key={f}>
                  <td className="py-1.5 pr-4 font-mono">{f}</td>
                  <td className="py-1.5">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );

  if (active === 'erros') return (
    <div className="space-y-4">
      <Section title="Códigos de Erro e Rate Limits">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400">Código</th>
                <th className="text-left py-2 pr-4 text-slate-400">Causa</th>
                <th className="text-left py-2 text-slate-400">Solução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                ['400', 'Formato inválido', 'Verificar body da requisição'],
                ['401', 'Falha na autenticação', 'Verificar API key'],
                ['402', 'Saldo insuficiente', 'Recarregar conta DeepSeek'],
                ['422', 'Parâmetros inválidos', 'Verificar parâmetros enviados'],
                ['429', 'Rate limit atingido', 'Reduzir frequência de requisições'],
                ['500', 'Erro do servidor', 'Tentar novamente após alguns segundos'],
                ['503', 'Servidor sobrecarregado', 'Tentar novamente após alguns segundos'],
              ].map(([code, cause, fix]) => (
                <tr key={code}>
                  <td className="py-2 pr-4"><Badge color={code === '401' || code === '402' ? 'red' : code === '429' ? 'amber' : 'slate'}>{code}</Badge></td>
                  <td className="py-2 pr-4 text-slate-300 text-xs">{cause}</td>
                  <td className="py-2 text-slate-400 text-xs">{fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Section title="Rate Limits">
          <P>A API limita concorrência dinamicamente. Ao atingir o limite, retorna HTTP <Badge color="amber">429</Badge> imediatamente.</P>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 ml-2">
            <li>Requisições não-streaming: retornam linhas vazias enquanto aguardam</li>
            <li>Requisições streaming: retornam <Badge>: keep-alive</Badge> SSE comments</li>
            <li>Timeout de conexão: 10 minutos sem início de inferência</li>
          </ul>
        </Section>
      </Section>
    </div>
  );

  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    badge: 'deepseek-v4-pro',
    color: 'bg-blue-900/30 border-blue-700/40',
    sections: DEEPSEEK_SECTIONS,
  },
];

export default function DocumentacaoAPI() {
  const { activeProfile } = useProfiles();
  const isGestor = activeProfile?.level === 1;

  const [provider, setProvider] = useState('deepseek');
  const [activeSection, setActiveSection] = useState('inicio');

  if (!isGestor) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <ShieldOff className="w-10 h-10 text-slate-600" />
        <p className="text-slate-400 font-semibold">Acesso restrito</p>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Esta seção é exclusiva para o perfil Gestor Holding.
        </p>
      </div>
    );
  }

  const currentProvider = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar de navegação ── */}
      <aside className="w-52 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Provedor</p>
          <div className="space-y-1">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => { setProvider(p.id); setActiveSection('inicio'); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  provider === p.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}>
                {p.label}
                <span className="block text-xs font-mono opacity-60 mt-0.5">{p.badge}</span>
              </button>
            ))}
            <div className="px-3 py-2 text-xs text-slate-600 italic">Gemini — em breve</div>
          </div>
        </div>
        <div className="p-4 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Seções</p>
          <div className="space-y-0.5">
            {currentProvider.sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                  activeSection === s.id
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}>
                <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${activeSection === s.id ? 'rotate-90 text-violet-400' : ''}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Documentação API</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-400">{currentProvider.label}</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-violet-400">
              {currentProvider.sections.find(s => s.id === activeSection)?.label}
            </span>
          </div>
          {provider === 'deepseek' && <DeepSeekDocs active={activeSection} />}
        </div>
      </main>
    </div>
  );
}
