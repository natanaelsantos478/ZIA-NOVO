#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test-agent-chat-direto.sh
#
# Teste end-to-end do runner de agentes IA via "Chat Direto" do organograma,
# SEM passar por WhatsApp real. Reproduz exatamente o que
# src/features/ia/sections/Organograma.tsx faz em iniciarChatDireto() +
# enviarMensagemDireta():
#
#   1. cria/recupera um wa_agent_chats com phone='user_direto'
#   2. loga a mensagem do usuario em wa_agent_chat_messages (message_already_logged=true)
#   3. chama POST /functions/v1/ia-agent-runner
#   4. faz polling em wa_agent_chat_messages ate aparecer a resposta (role='reply')
#
# IMPORTANTE: NAO existe empresa com code '00007' no projeto ZITA
# (tgeomsnxfcqwrxijjvek). Os codes reais usam prefixos H/M/F.
# O analogo funcional da "empresa de testes com agentes WhatsApp" e a holding
# ZITA Vendas (code H002, tenant_id 'holding-zita-vendas'), que tem agentes
# ativos com api_provider/api_code resolviveis. Ajuste AGENT_ID/TENANT_ID
# abaixo se quiser apontar para outro tenant.
#
# Uso:
#   SUPABASE_ANON_KEY=xxx SERVICE_ROLE_KEY=yyy ./scripts/test-agent-chat-direto.sh
#
# (SERVICE_ROLE_KEY so e usado para o INSERT/poll direto no PostgREST; o
#  ia-agent-runner tem verify_jwt:false e nao exige auth.)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://tgeomsnxfcqwrxijjvek.supabase.co}"

# ── Alvo do teste — empresa ZITA Vendas (H002) ───────────────────────────────
# Agente "Whatsapp" da holding ZITA Vendas: deepseek / API0001 / deepseek-v4-pro
AGENT_ID="${AGENT_ID:-89219065-c559-444b-8c1b-b14e069b2bfa}"
TENANT_ID="${TENANT_ID:-holding-zita-vendas}"
SESSION_ID="user_direto"                       # phone padrao do Chat Direto
MENSAGEM="${1:-Ola, isto e um teste automatizado do runner. Responda com uma frase curta confirmando que recebeu.}"

REST="${SUPABASE_URL}/rest/v1"
SR_KEY="${SERVICE_ROLE_KEY:?defina SERVICE_ROLE_KEY}"
AUTH_HDR=(-H "apikey: ${SR_KEY}" -H "Authorization: Bearer ${SR_KEY}" -H "Content-Type: application/json")

echo "▶ Agente:  ${AGENT_ID}"
echo "▶ Tenant:  ${TENANT_ID}"
echo "▶ Session: ${SESSION_ID}"

# ── 1. Recupera ou cria o wa_agent_chats (phone='user_direto') ───────────────
CHAT_ID=$(curl -fsS "${REST}/wa_agent_chats?select=id&agent_id=eq.${AGENT_ID}&phone=eq.${SESSION_ID}&limit=1" \
  "${AUTH_HDR[@]}" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(r[0]["id"] if r else "")')

if [ -z "${CHAT_ID}" ]; then
  CHAT_ID=$(curl -fsS -X POST "${REST}/wa_agent_chats" \
    "${AUTH_HDR[@]}" -H "Prefer: return=representation" \
    -d "{\"agent_id\":\"${AGENT_ID}\",\"tenant_id\":\"${TENANT_ID}\",\"phone\":\"${SESSION_ID}\",\"titulo\":\"Chat Direto\",\"last_message_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')
  echo "✚ Chat criado: ${CHAT_ID}"
else
  echo "✓ Chat existente: ${CHAT_ID}"
fi

# ── 2. Loga a mensagem do usuario (espelha enviarMensagemDireta) ─────────────
curl -fsS -X POST "${REST}/wa_agent_chat_messages" \
  "${AUTH_HDR[@]}" -H "Prefer: return=minimal" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"agent_id\":\"${AGENT_ID}\",\"tenant_id\":\"${TENANT_ID}\",\"role\":\"user\",\"content\":$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "${MENSAGEM}")}" >/dev/null
echo "✓ Mensagem do usuario logada"

# ── 3. Chama o runner — mesmos params do Organograma.tsx:1031-1035 ───────────
RUNNER_RESP=$(curl -fsS -X POST "${SUPABASE_URL}/functions/v1/ia-agent-runner" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"agent_id":sys.argv[1],"tenant_id":sys.argv[2],"session_id":sys.argv[3],"message":sys.argv[4],"message_already_logged":True}))' \
        "${AGENT_ID}" "${TENANT_ID}" "${SESSION_ID}" "${MENSAGEM}")")
echo "▶ Runner respondeu: ${RUNNER_RESP}"

OK=$(echo "${RUNNER_RESP}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("ok"))')
RESP=$(echo "${RUNNER_RESP}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("response") or "")')

# ── 4. Validacao ─────────────────────────────────────────────────────────────
if [ "${OK}" != "True" ]; then
  echo "✗ FALHA: runner retornou ok != true"
  exit 1
fi
if [ -z "${RESP}" ]; then
  SIL=$(echo "${RUNNER_RESP}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("silenciado"))')
  ERR=$(echo "${RUNNER_RESP}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("erro_interno"))')
  echo "✗ FALHA: runner nao gerou resposta (silenciado=${SIL} erro_interno=${ERR})"
  exit 1
fi

echo "✓ SUCESSO — resposta do agente:"
echo "  ${RESP}"
