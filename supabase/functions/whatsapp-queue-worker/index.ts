import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: entries } = await supabase
    .from("whatsapp_message_queue")
    .select("numero, tenant_id")
    .lte("process_after", new Date().toISOString())
    .eq("processed", false);

  if (!entries?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const processorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-ia-processor`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let count = 0;
  for (const entry of entries) {
    await supabase
      .from("whatsapp_message_queue")
      .update({ processed: true, updated_at: new Date().toISOString() })
      .eq("numero", entry.numero)
      .eq("tenant_id", entry.tenant_id)
      .eq("processed", false);

    try {
      const res = await fetch(processorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ phone: entry.numero, tenant_id: entry.tenant_id }),
      });
      if (!res.ok) console.error("[worker] processor retornou", res.status, "para", entry.numero, entry.tenant_id);
    } catch (e) {
      console.error("[worker] processor exception", entry.numero, entry.tenant_id, String(e));
    }

    count++;
  }

  return new Response(JSON.stringify({ processed: count }), {
    headers: { "Content-Type": "application/json" },
  });
});
