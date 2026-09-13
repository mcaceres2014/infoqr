"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "../../../../lib/supabaseClient";

export default function CreateSuccessPage({ params }) {
  const [capsule, setCapsule] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [viewUrl, setViewUrl] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;

    // El webhook de Flow puede tardar unos segundos en confirmar el
    // pago, así que reintentamos leer la cápsula unas cuantas veces antes
    // de darlo por fallido.
    async function poll() {
      attempts += 1;
      const { data } = await supabase.from("capsules").select("*").eq("id", params.id).single();

      if (cancelled) return;

      if (data?.payment_status === "paid") {
        setCapsule(data);
        const url = `${window.location.origin}/view/${data.id}`;
        setViewUrl(url);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 480,
          margin: 2,
          color: { dark: data.color || "#D85A30", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
        setChecking(false);
        return;
      }

      if (attempts < 8) {
        setTimeout(poll, 2000);
      } else {
        setChecking(false);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "infoqr-qr.png";
    link.click();
  }

  if (checking) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          confirmando tu pago...
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>esto toma solo unos segundos.</p>
      </main>
    );
  }

  if (!capsule) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          todavía no confirmamos tu pago
        </p>
        <p style={{ fontSize: 13, color: "#9a988f" }}>
          si ya pagaste, recarga esta página en un momento. si el problema
          persiste, revisa tu correo de Flow para confirmar el estado
          del pago.
        </p>
      </main>
    );
  }

  return (
    <main className="container" style={{ textAlign: "center", paddingTop: 48 }}>
      <p className="serif" style={{ fontSize: 22, margin: "0 0 8px" }}>
        pago confirmado
      </p>
      <p style={{ fontSize: 13, color: "#6b6a64", marginBottom: 24 }}>
        tu QR ya está listo.
      </p>
      <div
        style={{
          background: "#fff", border: "1px solid var(--border)", borderRadius: 20,
          padding: 24, display: "inline-block",
        }}
      >
        <p style={{ fontSize: 13, color: "#6b6a64", margin: "0 0 12px" }}>{capsule.frame_text}</p>
        <img src={qrDataUrl} alt="código QR generado" style={{ width: 220, height: 220 }} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
        <button className="btn-primary" onClick={handleDownload} style={{ maxWidth: 160 }}>
          descargar
        </button>
        <button
          className="btn-primary"
          style={{ background: "#fff", color: "var(--coral)", border: "1px solid var(--coral)", maxWidth: 160 }}
          onClick={() =>
            navigator.share ? navigator.share({ url: viewUrl }) : navigator.clipboard.writeText(viewUrl)
          }
        >
          compartir
        </button>
      </div>

      {capsule.access_type === "views" && capsule.views_tier && (
        <p style={{ fontSize: 12, color: "#9a988f", marginTop: 14 }}>
          disponible por {capsule.views_tier} usos. cuando se agoten, podrás recargarlo desde tu cuenta.
        </p>
      )}
      {capsule.access_type === "duration" && capsule.expires_at && (
        <p style={{ fontSize: 12, color: "#9a988f", marginTop: 6 }}>
          disponible hasta {new Date(capsule.expires_at).toLocaleString("es-CL")}.
        </p>
      )}
      {capsule.access_type === "duration" && !capsule.expires_at && (
        <p style={{ fontSize: 12, color: "#9a988f", marginTop: 6 }}>
          disponible sin límite de tiempo.
        </p>
      )}

      <p style={{ fontSize: 12, color: "#9a988f", marginTop: 10 }}>
        <a href={viewUrl} target="_blank" rel="noreferrer">
          ver como lo verá quien lo escanee
        </a>
      </p>
    </main>
  );
}
