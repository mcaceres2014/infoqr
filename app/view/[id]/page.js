import { createClient } from "@supabase/supabase-js";
import ViewerClient from "./ViewerClient";

// Usamos la Service Role Key acá porque necesitamos INCREMENTAR el
// contador de usos de forma confiable en el servidor, sin depender de
// que el navegador de quien escanea tenga permisos de escritura amplios.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCapsule(id) {
  const { data, error } = await supabaseAdmin.from("capsules").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export default async function ViewPage({ params }) {
  const capsule = await getCapsule(params.id);

  if (!capsule) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p>esta cápsula ya no está disponible.</p>
      </main>
    );
  }

  if (capsule.payment_status === "pending_payment") {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          esperando confirmación de pago
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>
          si ya pagaste, espera unos segundos y recarga esta página.
        </p>
      </main>
    );
  }

  // El dueño puede apagar manualmente su QR en cualquier momento.
  if (capsule.disabled_by_owner) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          este contenido ya no está disponible
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>
          quien creó este QR lo desactivó.
        </p>
      </main>
    );
  }

  // Modo "duración": se bloquea al pasar la fecha de expiración.
  if (capsule.access_type === "duration" && capsule.expires_at && new Date(capsule.expires_at) < new Date()) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          este QR ya expiró
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>
          la duración pagada para este contenido ya terminó.
        </p>
      </main>
    );
  }

  // Modo "usos": se bloquea al alcanzar la cantidad de usos pagados.
  if (capsule.access_type === "views" && capsule.views_tier && capsule.views_used >= capsule.views_tier) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          este QR alcanzó su límite de usos
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>
          quien lo creó puede recargarlo con más usos desde su cuenta.
        </p>
      </main>
    );
  }

  // Si es modo "usos", sumamos una vista más antes de mostrar el contenido.
  if (capsule.access_type === "views") {
    await supabaseAdmin
      .from("capsules")
      .update({ views_used: (capsule.views_used || 0) + 1 })
      .eq("id", capsule.id);
  }

  return <ViewerClient capsule={capsule} />;
}
