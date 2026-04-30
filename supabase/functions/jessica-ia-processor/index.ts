import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ZAPI_URL =
  "https://api.z-api.io/instances/3F1969DB5C2181E61967D6E8332D8490/token/13138C57B4A6EBC80FF93E61/send-text";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const JESSICA_PROMPT = `Você é Jéssica, atendente da equipe ZIA. Você é uma pessoa real da equipe, não uma IA.

Seu papel é responder dúvidas sobre a plataforma ZIA via WhatsApp de forma humana, acolhedora e profissional.

REGRAS:
- Fale como membro da equipe, nunca como robô
- Nunca use "Certamente!", "Claro!", "Com prazer!" — esses são bordões de IA
- Se não souber algo, diga que vai verificar e retorna em breve
- Nunca invente preços ou funcionalidades que não conhece
- Seja direta e prestativa
- Respostas curtas e objetivas — é WhatsApp, não email

SOBRE A PLATAFORMA ZIA:
- ERP + CRM + RH + Financeiro + IA modular para pequenas e médias empresas brasileiras
- Inclui: gestão de clientes (CRM), financeiro, recursos humanos, compras, manutenção de ativos, documentos
- IA integrada: agentes de prospecção, chat de suporte, análise de dados
- WhatsApp Business integrado
- Multi-empresa: cada empresa tem seus dados isolados
- Desenvolvido no Brasil, para empresas brasileiras

FORMATO DE RESPOSTA OBRIGATÓRIO:
Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown.
Formato: {"action":"reply","messages":["sua resposta aqui"],"delay_ms":0}
Ações: reply (1 mensagem), split_reply (array), forward (encaminhar), silent (não responder), internal_note (anotação sem responder).`;

interface ProcessorInput {
  numero: string;
  mensagens: string[];
}

interface IaAction {
  action: "reply" | "split_reply" | "forward" | "silent" | "internal_note";
  messages: string[];
  forward_to?: string;
  note?: string;
  delay_ms?: number;
}

function parseIaResponse(raw: string): IaAction {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.action) throw new Error("sem action");
    return {
      action: parsed.action,
      messages: parsed.messages ?? [],
      forward_to: parsed.forward_to,
      note: parsed.note,
      delay_ms: parsed.delay_ms ?? 0,
    };
  } catch {
    return { action: "reply", messages: [raw.trim()], delay_ms: 0 };
  }
}

async function sendZapi(phone: string, message: string, clientToken: string): Promise<void> {
  const r = await fetch(ZAPI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify({ phone, message }),
  });
  if (!r.ok) console.error(`Z-API erro ${r.status} para ${phone}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization" },
    });
  }

  try {
    const { numero, mensagens }: ProcessorInput = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: historico } = await supabase
      .from("jessica_conversations")
      .select("message_received, message_sent")
      .eq("phone", numero)
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: knowledge } = await supabase
      .from("jessica_knowledge")
      .select("topic, content")
      .eq("active", true)
      .order("topic");

    const historicoCrono = (historico ?? []).reverse();
    const blocoHistorico = historicoCrono
      .map(h => `[CLIENTE] ${h.message_received}\n[IA] ${h.message_sent}`)
      .join("\n");
    const blocoNovo = mensagens.map(m => `[CLIENTE] ${m}`).join("\n");
    const contexto = [blocoHistorico, blocoNovo].filter(Boolean).join("\n");

    const knowledgeText = knowledge?.length
      ? "\n\nBASE DE CONHECIMENTO:\n" + knowledge.map(k => `[${k.topic}]: ${k.content}`).join("\n")
      : "";

    const fullPrompt = JESSICA_PROMPT + knowledgeText + "\n\nCONVERSA:\n" + contexto;

    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const geminiResponse = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      throw new Error(`Gemini erro ${geminiResponse.status}: ${err}`);
    }

    const geminiData = await geminiResponse.json();
    const rawReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const action = parseIaResponse(rawReply);

    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
    let messageSent = "[SILENT]";

    if (action.action === "reply" && action.messages[0]) {
      await sendZapi(numero, action.messages[0], clientToken);
      messageSent = action.messages[0];
    } else if (action.action === "split_reply") {
      for (const msg of action.messages) {
        await sendZapi(numero, msg, clientToken);
        if (action.delay_ms) await new Promise(r => setTimeout(r, action.delay_ms));
      }
      messageSent = action.messages.join(" | ");
    } else if (action.action === "forward" && action.forward_to) {
      await sendZapi(action.forward_to, action.messages[0], clientToken);
      messageSent = `[FORWARD→${action.forward_to}] ${action.messages[0]}`;
    } else if (action.action === "internal_note") {
      messageSent = `[NOTA] ${action.note ?? ""}`;
    }

    await supabase.from("jessica_conversations").insert({
      phone: numero,
      message_received: mensagens.join("\n"),
      message_sent: messageSent,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, action: action.action }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("jessica-ia-processor error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
