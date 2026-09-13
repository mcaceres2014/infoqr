import { createClient } from "@supabase/supabase-js";
import { createFlowPayment } from "../../../../lib/flow";
import { getContentLevel, getAccessAddOnPrice } from "../../../../lib/pricing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { capsuleId, accessMode, email } = await request.json();

  try {
    const { data: capsule, error: capsuleError } = await supabaseAdmin
      .from("capsules")
      .select("*")
      .eq("id", capsuleId)
      .single();

    if (capsuleError || !capsule) {
      return Response.json({ error: "código QR no encontrado" }, { status: 404 });
    }

    // Una recarga se cobra al precio completo del NUEVO modo de acceso
    // elegido (no se prorratea ni se descuenta lo no usado del anterior).
    const amount = getAccessAddOnPrice(accessMode);
    if (!amount) {
      return Response.json({ error: "modo de acceso no válido" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
    const levelLabel = getContentLevel(capsule.content_level).label;
    const accessLabel = accessMode.type === "views" ? `${accessMode.id} usos` : accessMode.id;
    const commerceOrder = `iq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const data = await createFlowPayment({
      commerceOrder,
      subject: `InfoQR — recarga: ${levelLabel}, ${accessLabel}`,
      amount,
      email,
      urlReturn: `${origin}/api/flow/return`,
      urlConfirmation: `${origin}/api/flow/webhook`,
    });

    await supabaseAdmin.from("purchases").insert({
      capsule_id: capsuleId,
      user_id: capsule.user_id,
      kind: "recharge",
      content_level: capsule.content_level,
      access_type: accessMode.type,
      access_tier: accessMode.id,
      flow_token: data.token,
      flow_order: commerceOrder,
      status: "pending",
      amount,
    });

    return Response.json({ paymentUrl: `${data.url}?token=${data.token}` });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "no se pudo crear el pago de recarga" }, { status: 500 });
  }
}
