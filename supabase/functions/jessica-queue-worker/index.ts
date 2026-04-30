import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: entries } = await supabase
    .from("whatsapp_message_queue")
    .select("numero, mensagens")
    .lte("process_after", new Date().toISOString())
    .eq("processed", false);

  if (!entries?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const processorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/jessica-ia-processor`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let count = 0;
  for (const entry of entries) {
    await supabase
      .from("whatsapp_message_queue")
      .update({ processed: true, updated_at: new Date().toISOString() })
      .eq("numero", entry.numero)
      .eq("processed", false);

    fetch(processorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ numero: entry.numero, mensagens: entry.mensagens }),
    }).catch(e => console.error("processor error", entry.numero, e));

    count++;
  }

  return new Response(JSON.stringify({ processed: count }), {
    headers: { "Content-Type": "application/json" },
  });
});
