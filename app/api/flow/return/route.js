import { createClient } from "@supabase/supabase-js";

// Flow no hace una simple redirección de navegador hacia la urlReturn:
// envía los datos mediante un formulario POST. Esta ruta existe solo para
// recibir ese POST correctamente y, desde ahí, mandar al navegador (con
// una redirección normal tipo GET) a la pantalla que corresponda.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const formData = await request.formData();
    const token = formData.get("token");

    if (!token) {
      return Response.redirect(`${origin}/create`, 303);
    }

    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("capsule_id, kind")
      .eq("flow_token", token)
      .single();

    if (!purchase) {
      return Response.redirect(`${origin}/create`, 303);
    }

    const destination =
      purchase.kind === "recharge" ? "/account" : `/create/success/${purchase.capsule_id}`;

    return Response.redirect(`${origin}${destination}`, 303);
  } catch (err) {
    console.error("error en retorno de Flow:", err);
    return Response.redirect(`${origin}/create`, 303);
  }
}
