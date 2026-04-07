// ─────────────────────────────────────────────────────────────────────────────
// ApiDocsSection — Documentação inline dos endpoints da ia-api-gateway
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Copy, Check, Terminal, BookOpen, Zap, Shield, Clock } from 'lucide-react';

const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://<seu-projeto>.supabase.co'}/functions/v1/ia-api-gateway`;

interface CodeBlockProps { code: string }

function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono leading-relaxed p-4 overflow-x-auto">
        {code}
      </pre>
      <button
        onClick={doCopy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
        title="Copiar"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-indigo-500" />
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
    </div>
  );
}

const CURL_EXAMPLE = `curl -X POST "${GATEWAY_URL}" \\
  -H "Content-Type: application/json" \\
  -H "X-ZIA-API-Key: zita_SUA_CHAVE_AQUI" \\
  -d '{
    "action": "query",
    "module": "crm",
    "resource": "crm_clientes",
    "filters": { "status": "ativo" },
    "page": 1,
    "limit": 20
  }'`;

const PYTHON_EXAMPLE = `import requests

url = "${GATEWAY_URL}"
headers = {
    "Content-Type": "application/json",
    "X-ZIA-API-Key": "zita_SUA_CHAVE_AQUI"
}

# Consultar clientes ativos do CRM
payload = {
    "action": "query",
    "module": "crm",
    "resource": "crm_clientes",
    "filters": {"status": "ativo"}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

const CREATE_EXAMPLE = `{
  "action": "create",
  "module": "crm",
  "resource": "crm_clientes",
  "data": {
    "nome": "Empresa XYZ Ltda.",
    "email": "contato@xyz.com.br",
    "telefone": "47 9 9999-9999",
    "status": "ativo"
  }
}`;

const N8N_EXAMPLE = `// No nó HTTP Request do n8n:
// URL: ${GATEWAY_URL}
// Method: POST
// Authentication: Header Auth
// Header Name: X-ZIA-API-Key
// Header Value: {{ $env.ZITA_API_KEY }}
// Body (JSON):
{
  "action": "query",
  "module": "rh",
  "resource": "hr_employees",
  "filters": { "departamento": "Vendas" }
}`;

const ACTIONS = [
  {
    action: 'query',
    desc: 'Consultar registros (equivalente a GET)',
    params: 'module, resource, filters?, page?, limit?',
    permissao: 'acoes.ler = true',
  },
  {
    action: 'create',
    desc: 'Criar novo registro',
    params: 'module, resource, data',
    permissao: 'acoes.criar = true',
  },
  {
    action: 'update',
    desc: 'Atualizar registro existente',
    params: 'module, resource, id, data',
    permissao: 'acoes.editar = true',
  },
  {
    action: 'delete',
    desc: 'Remover registro',
    params: 'module, resource, id',
    permissao: 'acoes.deletar = true',
  },
  {
    action: 'send_message',
    desc: 'Enviar mensagem WhatsApp',
    params: 'module: "ia", data: { numero, mensagem }',
    permissao: 'whatsapp.enviar_mensagens = true',
  },
  {
    action: 'trigger_webhook',
    desc: 'Disparar webhook externo',
    params: 'module, data: { url, payload? }',
    permissao: 'webhooks.enviar = true',
  },
];

const MODULES = [
  { id: 'crm',        desc: 'CRM — Clientes, contatos, oportunidades, atividades' },
  { id: 'erp',        desc: 'ERP — Pedidos, produtos, orçamentos, notas fiscais' },
  { id: 'rh',         desc: 'RH — Funcionários, folha, ponto, ausências' },
  { id: 'financeiro', desc: 'Financeiro — Contas a pagar/receber, transações, caixa' },
  { id: 'scm',        desc: 'SCM — Estoque, compras, fornecedores' },
  { id: 'eam',        desc: 'EAM — Ativos, ordens de manutenção' },
  { id: 'ia',         desc: 'IA — Conversas, mensagens WhatsApp' },
];

export default function ApiDocsSection() {
  const [tab, setTab] = useState<'curl' | 'python' | 'n8n'>('curl');

  return (
    <div className="space-y-6">

      {/* Endpoint principal */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Endpoint da API</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">POST</span>
            <code className="text-sm font-mono text-slate-700 break-all">{GATEWAY_URL}</code>
          </div>
          <p className="text-[12px] text-slate-500">
            Todas as ações são enviadas via <strong>POST</strong> para este único endpoint.
            A autenticação é feita via header <code className="bg-slate-100 px-1 rounded">X-ZIA-API-Key</code>.
          </p>
        </div>
      </div>

      {/* Exemplos de código */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Exemplos de código</h3>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['curl', 'python', 'n8n'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'curl' ? 'cURL' : t === 'python' ? 'Python' : 'n8n'}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {tab === 'curl'   && <CodeBlock code={CURL_EXAMPLE} />}
          {tab === 'python' && <CodeBlock code={PYTHON_EXAMPLE} />}
          {tab === 'n8n'    && <CodeBlock code={N8N_EXAMPLE} />}
        </div>
      </div>

      {/* Criar registro */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <SectionTitle icon={Zap} title="Exemplo: Criar registro" />
        </div>
        <div className="p-6">
          <CodeBlock code={CREATE_EXAMPLE} />
        </div>
      </div>

      {/* Tabela de ações */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Ações disponíveis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-500">action</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500">Descrição</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500">Parâmetros</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500">Permissão necessária</th>
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((a, i) => (
                <tr key={a.action} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">{a.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">{a.desc}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">{a.params}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-amber-600">{a.permissao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Módulos disponíveis */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Módulos disponíveis</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULES.map(m => (
            <div key={m.id} className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
              <code className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg shrink-0">
                {m.id}
              </code>
              <p className="text-[12px] text-slate-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rate limiting */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Rate Limiting</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-[13px] text-slate-600">
            Cada chave possui limites configuráveis de requests. O limite é verificado na <strong>última hora</strong>.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[12px] text-amber-700">
            Quando o limite é excedido, a API retorna <code className="bg-amber-100 px-1 rounded">HTTP 429</code> com
            o campo <code className="bg-amber-100 px-1 rounded">{"{ error: 'Rate limit exceeded' }"}</code>.
          </div>
        </div>
      </div>

      {/* Segurança */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Segurança</h3>
        </div>
        <div className="p-6 space-y-2 text-[13px] text-slate-600">
          <p>• A API Key é exibida <strong>uma única vez</strong> no momento da criação. Guarde-a com segurança.</p>
          <p>• Chaves revogadas não podem ser reativadas. Crie uma nova chave se necessário.</p>
          <p>• Cada chave fica isolada ao tenant (empresa) — não há acesso entre tenants.</p>
          <p>• Todas as ações são registradas nos logs com IP, duração e payload resumido.</p>
          <p>• A chave não usa JWT Supabase — autenticação é feita exclusivamente via header <code className="bg-slate-100 px-1 rounded">X-ZIA-API-Key</code>.</p>
        </div>
      </div>
    </div>
  );
}
