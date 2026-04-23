#!/usr/bin/env node
/**
 * Agent Bridge — Polling a cada 30s no Supabase
 * Cada agente responde mensagens direcionadas a ele ou a "todos"
 * Nunca responde auto-replies (evita loops)
 * Responde sempre ao remetente (nao a "todos")
 */

import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });
config({ path: join(__dirname, "../.env") });

const SUPABASE_URL = "https://tgeomsnxfcqwrxijjvek.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZW9tc254ZmNxd3J4aWpqdmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDAxMjEsImV4cCI6MjA4ODExNjEyMX0.5c_DvW3KlTd1p75oMDXrRZNmggFrVUbwO9Dk0fqapD4";

const PERSONAS = {
  Juliano: `Voce e Juliano, gerente geral da ZIA Omnisystem. Foco em estrategia, metas comerciais e a meta de R$1.000.000. Direto, objetivo e cobra resultados. Respostas curtas e precisas.`,
  Cezar:   `Voce e Cezar, programador senior da ZIA. Revisa codigo, toma decisoes tecnicas e coordena Marcelo e Marcos. Exigente com qualidade. Respostas tecnicas e diretas.`,
  Marcelo: `Voce e Marcelo, programador perfeccionista da ZIA. Implementa features no ZIA-NOVO (React, TypeScript, Tailwind). Respostas focadas em codigo.`,
  Marcos:  `Voce e Marcos, especialista em agentes IA da ZIA. Trabalha no ZIA-EMPRESA com Flowise e integracoes de IA. Respostas focadas em arquitetura de agentes.`,
  Jessica: `Voce e Jessica, atendente da equipe ZIA. Responde duvidas sobre a plataforma, precos e onboarding. Humana, direta e acolhedora. Respostas curtas como numa conversa real.`,
};

const POLL_INTERVAL = 30000; // 30 segundos

function parseArgs() {
  const idx = process.argv.indexOf("--agent");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Uso: node agent-bridge.js --agent <Nome> [--auto]");
    process.exit(1);
  }
  return {
    agente: process.argv[idx + 1],
    auto:   process.argv.includes("--auto"),
  };
}

function claudeCLI(persona, mensagem, de) {
  const prompt = `${persona}\n\n[Mensagem de ${de}]: ${mensagem}\n\nResponda de forma direta e curta (maximo 3 linhas).`;
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p", "--dangerously-skip-permissions"], {
      shell: true,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("claude CLI timeout (60s)"));
    }, 60000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(`claude CLI saiu com codigo ${code}: ${stderr.slice(0, 200)}`));
      }
      resolve(stdout.trim());
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Envia o prompt via stdin — unica forma confiavel com o CLI
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function poll(supabase, meuAgente, respondedIds) {
  const umaHoraAtras = new Date(Date.now() - 3600000).toISOString();

  const { data, error } = await supabase
    .from("agent_messages")
    .select("*")
    .or(`to_agent.eq.${meuAgente},to_agent.eq.todos`)
    .neq("from_agent", meuAgente)
    .gt("created_at", umaHoraAtras)
    .order("created_at", { ascending: true });

  const hora = new Date().toLocaleTimeString("pt-BR");
  if (error) { console.error(`[${hora}] [poll] erro:`, error.message); return; }
  console.log(`[${hora}] poll: ${data?.length || 0} mensagens encontradas`);
  if (!data || data.length === 0) return;

  for (const msg of data) {
    // Nao responde a auto-replies (evita loops)
    if (msg.context?.auto_reply) continue;
    // Nao responde ao que ja respondeu
    if (respondedIds.has(msg.id)) continue;
    respondedIds.add(msg.id);

    const persona = PERSONAS[meuAgente] || `Voce e ${meuAgente}, agente da ZIA.`;
    try {
      const resposta = await claudeCLI(persona, msg.message, msg.from_agent);

      // Responde ao remetente (nunca a "todos" — evita loop)
      const destino = msg.from_agent;
      await supabase.from("agent_messages").insert({
        from_agent: meuAgente,
        to_agent:   destino,
        message:    resposta,
        context:    { auto_reply: true, in_reply_to: msg.id },
      });

      console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${meuAgente} -> ${destino}: ${resposta.substring(0, 80)}`);
    } catch (err) {
      console.error(`[erro] ${meuAgente} falhou ao responder msg ${msg.id}: ${err.message}`);
    }
  }
}

async function carregarRespondidos(supabase, meuAgente, respondedIds) {
  const umaHoraAtras = new Date(Date.now() - 3600000).toISOString();
  const { data } = await supabase
    .from("agent_messages")
    .select("context")
    .eq("from_agent", meuAgente)
    .gt("created_at", umaHoraAtras);

  (data || []).forEach(r => {
    if (r.context?.in_reply_to) respondedIds.add(r.context.in_reply_to);
  });
}

async function modoManual(supabase, meuAgente) {
  console.log(`Bridge manual — ${meuAgente}`);
  console.log(`Comandos: @Agente <msg> | @todos <msg> | s (historico) | q (sair)\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write(`${meuAgente}> `);

  rl.on("line", async (line) => {
    const cmd = line.trim();
    if (!cmd) { process.stdout.write(`${meuAgente}> `); return; }
    if (cmd === "q") { process.exit(0); }

    if (cmd === "s") {
      const umaHoraAtras = new Date(Date.now() - 3600000).toISOString();
      const { data } = await supabase
        .from("agent_messages")
        .select("*")
        .or(`to_agent.eq.${meuAgente},from_agent.eq.${meuAgente}`)
        .gt("created_at", umaHoraAtras)
        .order("created_at", { ascending: false })
        .limit(20);
      (data || []).reverse().forEach(m => {
        const hora = new Date(m.created_at).toLocaleTimeString("pt-BR");
        console.log(`[${hora}] ${m.from_agent} -> ${m.to_agent}: ${m.message}`);
      });
      process.stdout.write(`${meuAgente}> `);
      return;
    }

    const match = cmd.match(/^@(\w+)\s+(.+)$/s);
    if (match) {
      const para = match[1];
      const mensagem = match[2];
      const { error } = await supabase.from("agent_messages").insert({
        from_agent: meuAgente, to_agent: para, message: mensagem,
      });
      if (error) console.log(`Erro: ${error.message}`);
      else console.log(`Enviado para ${para}`);
    } else {
      console.log(`Formato: @Agente <mensagem>`);
    }
    process.stdout.write(`${meuAgente}> `);
  });

  rl.on("close", () => process.exit(0));
}

async function main() {
  const { agente: meuAgente, auto: modoAuto } = parseArgs();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (modoAuto) {
    const respondedIds = new Set();
    await carregarRespondidos(supabase, meuAgente, respondedIds);

    console.log(`[${meuAgente}] Bridge AUTO iniciado — polling a cada ${POLL_INTERVAL / 1000}s`);
    await poll(supabase, meuAgente, respondedIds);
    setInterval(() => poll(supabase, meuAgente, respondedIds), POLL_INTERVAL);
  } else {
    await modoManual(supabase, meuAgente);
  }
}

main().catch(console.error);
