// Revisa un texto (mensaje o descripción, sea del modo multimedia o del
// modo IA) antes de guardarlo, para rechazar contenido claramente
// abusivo, de odio, o ilegal. Es un filtro básico automatizado, no un
// reemplazo de moderación humana — por eso también existe el botón de
// "reportar" en el visor, como segunda capa de seguridad.

export async function POST(request) {
  const { text } = await request.json();

  if (!text || text.trim().length < 3) {
    return Response.json({ allowed: true });
  }

  const prompt = `Evalúa si el siguiente texto, que un usuario quiere publicar en un servicio público de códigos QR (para vender un producto, describir un lugar, o dejar una dedicatoria), contiene contenido claramente abusivo: discurso de odio, acoso, contenido sexual explícito, promoción de actividades ilegales, o incitación a la violencia.

Texto a evaluar:
"""
${text}
"""

Responde SOLO con un JSON, sin texto adicional: {"allowed": true} si el contenido es aceptable (incluso si es informal, negativo en tono, o describe temas delicados de forma no abusiva), o {"allowed": false, "reason": "motivo breve"} si claramente viola las categorías mencionadas.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      // Si el chequeo de moderación falla técnicamente, dejamos pasar el
      // contenido (no bloqueamos ventas por un error de infraestructura),
      // pero queda registrado en el log del servidor para revisar.
      console.error("error en moderación, se permite por defecto");
      return Response.json({ allowed: true });
    }

    const data = await response.json();
    const rawText = data.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
    const result = JSON.parse(cleaned);

    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ allowed: true });
  }
}
