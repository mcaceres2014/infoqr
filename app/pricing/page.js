"use client";

import Link from "next/link";
import { CONTENT_LEVELS, DURATION_TIERS, VIEWS_TIERS } from "../../lib/pricing";

export default function PricingPage() {
  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <p className="serif" style={{ fontSize: 24, textAlign: "center", marginBottom: 6 }}>
        precios
      </p>
      <p style={{ fontSize: 13, color: "#6b6a64", textAlign: "center", marginBottom: 32 }}>
        pago único por cada QR: precio base según el contenido, más el modo de acceso que elijas.
      </p>

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>1. precio base según contenido</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 28 }}>
        <tbody>
          {Object.values(CONTENT_LEVELS).map((level) => (
            <tr key={level.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "10px 8px" }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{level.label}</p>
                <p style={{ fontSize: 11, color: "#9a988f", margin: 0 }}>{level.description}</p>
              </td>
              <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>
                ${level.basePrice.toLocaleString("es-CL")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>2. elige un modo de acceso (se suma al precio base)</p>
      <p style={{ fontSize: 11, color: "#9a988f", marginBottom: 10 }}>
        por duración: visitas ilimitadas mientras dure el tiempo elegido
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
        <tbody>
          {Object.values(DURATION_TIERS).map((d) => (
            <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}>{d.label}</td>
              <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>+${d.addOnPrice.toLocaleString("es-CL")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 11, color: "#9a988f", marginBottom: 10 }}>
        por cantidad de usos: sin límite de tiempo, se agota al alcanzar las visitas contratadas
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
        <tbody>
          {Object.values(VIEWS_TIERS).map((v) => (
            <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}>{v.label}</td>
              <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>+${v.addOnPrice.toLocaleString("es-CL")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: "#9a988f", textAlign: "center", marginBottom: 24 }}>
        montos en pesos chilenos (CLP). el precio final se calcula solo, al elegir tu contenido y tu modo de
        acceso, antes de pagar. puedes recargar más usos o duración cuando quieras desde tu cuenta, y apagar
        tu QR manualmente en cualquier momento.
      </p>

      <Link href="/create">
        <button className="btn-primary">crear mi QR</button>
      </Link>
    </main>
  );
}
