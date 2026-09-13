"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { getContentLevel, DURATION_TIERS, VIEWS_TIERS } from "../../lib/pricing";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechargingId, setRechargingId] = useState(null);
  const [rechargeAccessType, setRechargeAccessType] = useState("duration");
  const [rechargeTierId, setRechargeTierId] = useState("24h");
  const [busy, setBusy] = useState(false);

  async function loadCapsules(userId) {
    const { data } = await supabase
      .from("capsules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setCapsules(data || []);
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }
      setUser(userData.user);
      await loadCapsules(userData.user.id);
      setLoading(false);
    }
    load();
  }, []);

  function accessLabel(capsule) {
    if (capsule.access_type === "views") {
      const used = capsule.views_used || 0;
      const total = capsule.views_tier || 0;
      return `${used}/${total} usos`;
    }
    if (capsule.expires_at) {
      const expired = new Date(capsule.expires_at) < new Date();
      return expired ? "expirado" : `hasta ${new Date(capsule.expires_at).toLocaleDateString("es-CL")}`;
    }
    return "sin límite de tiempo";
  }

  async function handleDisable(capsule) {
    if (!confirm("¿Apagar este código QR? Quien lo escanee ya no podrá ver el contenido.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("capsules")
      .update({ disabled_by_owner: true })
      .eq("id", capsule.id);
    if (error) {
      alert("no se pudo apagar el QR, intenta de nuevo.");
    } else {
      await loadCapsules(user.id);
    }
    setBusy(false);
  }

  async function handleEnable(capsule) {
    setBusy(true);
    const { error } = await supabase
      .from("capsules")
      .update({ disabled_by_owner: false })
      .eq("id", capsule.id);
    if (error) {
      alert("no se pudo reactivar el QR, intenta de nuevo.");
    } else {
      await loadCapsules(user.id);
    }
    setBusy(false);
  }

  async function handleRecharge(capsule) {
    setBusy(true);
    try {
      const accessMode = { type: rechargeAccessType, id: rechargeTierId };
      const res = await fetch("/api/flow/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capsuleId: capsule.id, accessMode, email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.paymentUrl;
    } catch (err) {
      console.error(err);
      alert("no se pudo iniciar el pago de recarga, intenta de nuevo.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p style={{ color: "#9a988f" }}>cargando...</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 56 }}>
      <p className="serif" style={{ fontSize: 22, marginBottom: 20 }}>
        mis códigos QR
      </p>

      {capsules.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9a988f" }}>todavía no has creado ningún QR.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {capsules.map((c) => (
            <div
              key={c.id}
              style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "#fff" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {getContentLevel(c.content_level).label} · {accessLabel(c)}
                </p>
                <span
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: c.payment_status === "paid" ? "#e6f4ee" : "#fff3e0",
                    color: c.payment_status === "paid" ? "#0f6e56" : "#b9791f",
                  }}
                >
                  {c.payment_status === "paid" ? "pagado" : "pendiente"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#9a988f", margin: "4px 0 8px" }}>
                ${c.price?.toLocaleString("es-CL")} CLP · {new Date(c.created_at).toLocaleDateString("es-CL")}
                {c.disabled_by_owner && <span style={{ color: "#b9791f" }}> · apagado por ti</span>}
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <Link href={`/view/${c.id}`} style={{ fontSize: 12, color: "var(--coral)" }}>
                  ver contenido →
                </Link>
                {c.payment_status === "paid" && !c.disabled_by_owner && (
                  <button
                    onClick={() => handleDisable(c)}
                    disabled={busy}
                    style={{ fontSize: 12, color: "#b9791f", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    apagar QR
                  </button>
                )}
                {c.payment_status === "paid" && c.disabled_by_owner && (
                  <button
                    onClick={() => handleEnable(c)}
                    disabled={busy}
                    style={{ fontSize: 12, color: "#0f6e56", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    reactivar
                  </button>
                )}
                {c.payment_status === "paid" && (
                  <button
                    onClick={() => setRechargingId(rechargingId === c.id ? null : c.id)}
                    style={{ fontSize: 12, color: "#3C3489", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    {rechargingId === c.id ? "cerrar" : "recargar / cambiar modo"}
                  </button>
                )}
              </div>

              {rechargingId === c.id && (
                <div style={{ background: "#fbf4ee", borderRadius: 10, padding: 12, marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: "#6b6a64", marginBottom: 8 }}>
                    elige el nuevo modo de acceso — reemplaza al anterior y se cobra el precio completo del tramo elegido.
                  </p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      onClick={() => setRechargeAccessType("duration")}
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 11,
                        border: rechargeAccessType === "duration" ? "1px solid var(--coral)" : "1px solid var(--border)",
                        background: rechargeAccessType === "duration" ? "#faece7" : "#fff",
                      }}
                    >
                      por duración
                    </button>
                    <button
                      onClick={() => setRechargeAccessType("views")}
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 11,
                        border: rechargeAccessType === "views" ? "1px solid var(--coral)" : "1px solid var(--border)",
                        background: rechargeAccessType === "views" ? "#faece7" : "#fff",
                      }}
                    >
                      por usos
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {(rechargeAccessType === "duration" ? Object.values(DURATION_TIERS) : Object.values(VIEWS_TIERS)).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRechargeTierId(t.id)}
                        style={{
                          padding: "6px 10px", borderRadius: 8, fontSize: 11,
                          border: rechargeTierId === t.id ? "1px solid var(--coral)" : "1px solid var(--border)",
                          background: rechargeTierId === t.id ? "#faece7" : "#fff",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button className="btn-primary" onClick={() => handleRecharge(c)} disabled={busy} style={{ fontSize: 13 }}>
                    {busy ? "redirigiendo..." : "pagar y activar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Link href="/create">
        <button className="btn-primary" style={{ marginTop: 20 }}>
          crear un nuevo QR
        </button>
      </Link>
    </main>
  );
}
