import { createClient } from "@supabase/supabase-js";
import { createFlowPayment } from "../../../../lib/flow";
import { getTotalPrice, getContentLevel } from "../../../../lib/pricing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { capsuleId, contentLevel, accessMode, email } = await request.json();

  const amount = getTotalPrice(contentLevel, accessMode);
  if (!amount) {
    return Response.json({ error: "combinación de precio no válida" }, { status: 400 });
  }

  try {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
    const levelLabel = getContentLevel(contentLevel).label;
    const accessLabel =
      accessMode.type === "views" ? `${accessMode.id} usos` : accessMode.id;

    const commerceOrder = `iq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const data = await createFlowPayment({
      commerceOrder,
      subject: `InfoQR — ${levelLabel}, ${accessLabel}`,
      amount,
      email,
      urlReturn: `${origin}/api/flow/return`,
      urlConfirmation: `${origin}/api/flow/webhook`,
    });

    await supabaseAdmin.from("purchases").insert({
      capsule_id: capsuleId,
      kind: "creation",
      content_level: contentLevel,
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
    return Response.json({ error: "no se pudo crear el pago" }, { status: 500 });
  }
}
