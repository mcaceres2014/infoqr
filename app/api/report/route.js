import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Umbral de reportes independientes antes de desactivar automáticamente
// una cápsula, como medida de seguridad mientras no exista un panel de
// moderación dedicado.
const AUTO_DISABLE_THRESHOLD = 3;

export async function POST(request) {
  const { capsuleId, reason } = await request.json();

  if (!capsuleId) {
    return Response.json({ error: "falta el id de la cápsula" }, { status: 400 });
  }

  try {
    await supabaseAdmin.from("reports").insert({ capsule_id: capsuleId, reason: reason || null });

    const { count } = await supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("capsule_id", capsuleId);

    if (count >= AUTO_DISABLE_THRESHOLD) {
      await supabaseAdmin
        .from("capsules")
        .update({ disabled_by_owner: true })
        .eq("id", capsuleId);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "no se pudo registrar el reporte" }, { status: 500 });
  }
}
