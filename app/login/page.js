"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent

  async function handleLogin() {
    if (!email.includes("@")) {
      alert("escribe un email válido");
      return;
    }
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) {
      alert("no se pudo enviar el link, intenta de nuevo");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          revisa tu correo
        </p>
        <p style={{ fontSize: 14, color: "#6b6a64" }}>
          te enviamos un link a <b>{email}</b> para entrar sin contraseña.
        </p>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 80 }}>
      <p className="serif" style={{ fontSize: 22, textAlign: "center", marginBottom: 8 }}>
        inicia sesión
      </p>
      <p style={{ fontSize: 13, color: "#6b6a64", textAlign: "center", marginBottom: 24 }}>
        te enviamos un link a tu correo, sin necesidad de contraseña.
      </p>
      <input
        type="text"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <button className="btn-primary" onClick={handleLogin} disabled={status === "sending"}>
        {status === "sending" ? "enviando..." : "enviar link de acceso"}
      </button>
    </main>
  );
}
