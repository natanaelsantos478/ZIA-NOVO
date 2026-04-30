import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization" },
    });
  }

  try {
    const body = await req.json();
    console.log("Z-API payload:", JSON.stringify(body));

    const rawPhone = body?.phone || "";
    const phone = rawPhone.replace(/@.*$/, "");
    const message = body?.text?.message || body?.message;
    const type = body?.type;

    if (body?.fromMe === true) {
      return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!phone || !message) {
      console.log("Skipped: no phone or message. type=" + type);
      return new Response(JSON.stringify({ ok: true, skipped: "no_message", type }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: blocked } = await supabase
      .from("numeros_bloqueados")
      .select("numero")
      .eq("numero", phone)
      .maybeSingle();

    if (blocked) {
      console.log("Blocked number:", phone);
      return new Response(JSON.stringify({ ok: true, skipped: "blocked" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("whatsapp_message_queue")
      .select("mensagens")
      .eq("numero", phone)
      .eq("processed", false)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("whatsapp_message_queue")
        .update({
          mensagens: [...existing.mensagens, message],
          process_after: new Date(Date.now() + 5000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("numero", phone)
        .eq("processed", false);
    } else {
      await supabase
        .from("whatsapp_message_queue")
        .insert({
          numero: phone,
          mensagens: [message],
          process_after: new Date(Date.now() + 5000).toISOString(),
        });
    }

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("jessica-webhook error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
