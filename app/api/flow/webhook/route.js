import { createClient } from "@supabase/supabase-js";
import { getFlowPaymentStatus } from "../../../../lib/flow";
import { computeExpiresAt, getViewsTier } from "../../../../lib/pricing";

// Usa la Service Role Key (no la anon key) porque esta notificación viene
// directo desde los servidores de Flow, no desde el navegador de nadie.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  // Flow envía el token como parte de un formulario (application/x-www-form-urlencoded)
  const formData = await request.formData();
  const token = formData.get("token");

  if (!token) {
    return Response.json({ error: "falta el token" }, { status: 400 });
  }

  try {
    const payment = await getFlowPaymentStatus(token);
    const commerceOrder = payment.commerceOrder || "";
    const isApproved = payment.status === 2; // 2 = pagada, según la documentación de Flow

    // Buscamos la compra pendiente asociada a este token, para saber si
    // es una CREACIÓN nueva o una RECARGA de una cápsula existente.
    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("flow_token", token)
      .single();

    if (!purchase) {
      return Response.json({ error: "compra no encontrada" }, { status: 404 });
    }

    if (!isApproved) {
      await supabaseAdmin.from("purchases").update({ status: "rejected" }).eq("id", purchase.id);
      return Response.json({ received: true });
    }

    await supabaseAdmin.from("purchases").update({ status: "approved" }).eq("id", purchase.id);

    if (purchase.kind === "creation") {
      const accessMode = { type: purchase.access_type, id: purchase.access_tier };
      const expiresAt = computeExpiresAt(accessMode, new Date());

      await supabaseAdmin
        .from("capsules")
        .update({
          payment_status: "paid",
          access_type: purchase.access_type,
          duration_tier: purchase.access_type === "duration" ? purchase.access_tier : null,
          views_tier: purchase.access_type === "views" ? Number(purchase.access_tier) : null,
          expires_at: expiresAt,
        })
        .eq("id", purchase.capsule_id);
    }

    if (purchase.kind === "recharge") {
      // Una recarga REEMPLAZA el modo de acceso anterior por el nuevo,
      // reiniciando el contador de usos si corresponde.
      const accessMode = { type: purchase.access_type, id: purchase.access_tier };
      const expiresAt = computeExpiresAt(accessMode, new Date());

      await supabaseAdmin
        .from("capsules")
        .update({
          access_type: purchase.access_type,
          duration_tier: purchase.access_type === "duration" ? purchase.access_tier : null,
          views_tier: purchase.access_type === "views" ? Number(purchase.access_tier) : null,
          views_used: 0,
          expires_at: expiresAt,
          disabled_by_owner: false,
        })
        .eq("id", purchase.capsule_id);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("error en webhook de Flow:", err);
    return Response.json({ received: true, error: true });
  }
}
