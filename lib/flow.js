// Funciones que llaman a la API de Flow.cl. Flow firma cada solicitud
// con una clave secreta (secretKey) usando HMAC-SHA256, a diferencia de
// MercadoPago que solo pedía un Bearer token — por eso este archivo
// incluye la función de firma.

import crypto from "crypto";

const FLOW_BASE = process.env.FLOW_API_BASE || "https://sandbox.flow.cl/api"; // sandbox mientras se prueba
// Producción real: https://www.flow.cl/api

function signParams(params) {
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  return crypto.createHmac("sha256", process.env.FLOW_SECRET_KEY).update(toSign).digest("hex");
}

function buildSignedBody(params) {
  const fullParams = { ...params, apiKey: process.env.FLOW_API_KEY };
  const s = signParams(fullParams);
  return new URLSearchParams({ ...fullParams, s });
}

// Crea una orden de pago única para una cápsula (o para una recarga de
// usos/duración sobre una cápsula ya existente).
export async function createFlowPayment({ commerceOrder, subject, amount, email, urlReturn, urlConfirmation }) {
  const body = buildSignedBody({
    commerceOrder,
    subject,
    currency: "CLP",
    amount: String(amount),
    email,
    urlConfirmation,
    urlReturn,
  });

  const res = await fetch(`${FLOW_BASE}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "error creando el pago en Flow");
  return data; // data.url + data.token → link de pago: `${data.url}?token=${data.token}`
}

// Consulta el estado real de un pago a partir de su token (se usa desde
// la confirmación / webhook, nunca hay que confiar ciegamente en lo que
// venga del navegador del pagador).
export async function getFlowPaymentStatus(token) {
  const params = { token };
  const s = signParams({ ...params, apiKey: process.env.FLOW_API_KEY });
  const query = new URLSearchParams({ ...params, apiKey: process.env.FLOW_API_KEY, s });

  const res = await fetch(`${FLOW_BASE}/payment/getStatus?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "error consultando el estado del pago");
  return data; // data.status: 1 pendiente, 2 pagada, 3 rechazada, 4 anulada
}
