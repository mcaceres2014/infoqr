// Esta ruta corre en el servidor (nunca en el navegador), por eso la clave
// de la API de Anthropic está segura acá y no se expone al usuario final.

export async function POST(request) {
  const { description, contentType, imageBase64, imageMediaType } = await request.json();

  const hasImage = Boolean(imageBase64 && imageMediaType);
  const hasText = Boolean(description && description.trim().length >= 5);

  if (!hasImage && !hasText) {
    return Response.json(
      { error: "escribe una descripción o adjunta una foto" },
      { status: 400 }
    );
  }

  const contextLabel =
    {
      producto: "un producto",
      persona: "una persona",
      equipo: "un modelo de equipo o vestuario",
      lugar: "un lugar turístico",
    }[contentType] || "el contenido descrito";

  // Reglas de seguridad importantes según el tipo de contenido y si hay foto:
  const safetyRules = [];
  if (hasImage && contentType === "persona") {
    safetyRules.push(
      "- Si la imagen muestra una persona, describe SOLO su apariencia visible (vestimenta, expresión, entorno) y usa la información que el usuario haya escrito. NUNCA intentes adivinar o afirmar quién es la persona, su nombre, ni datos biográficos que no estén en el texto del usuario."
    );
  }
  if (hasImage && contentType === "lugar") {
    safetyRules.push(
      "- Si la imagen muestra un lugar y el usuario no confirmó por escrito de qué lugar específico se trata, NO inventes su nombre, historia o datos históricos concretos (fechas, hechos). Describe solo lo que es visualmente observable, y si el usuario sí dio el nombre del lugar en su descripción, puedes apoyarte en conocimiento general conocido sobre ese lugar, siempre con cautela."
    );
  }

  const prompt = `Eres un asistente que convierte descripciones e imágenes en una presentación breve y atractiva para mostrar en una pantalla de celular.

El usuario está describiendo ${contextLabel}.
${hasText ? `Su descripción escrita es:\n"""\n${description}\n"""` : "No escribió una descripción de texto, solo adjuntó una foto."}
${hasImage ? "Además adjuntó una foto — obsérvala y usa lo que veas para enriquecer la descripción." : ""}

A partir de esto, genera SOLO un JSON válido (sin texto adicional antes o después, sin bloques de markdown) con exactamente esta forma:

{
  "title": "título corto y atractivo",
  "subtitle": "una frase breve de apoyo",
  "sections": [
    { "heading": "nombre de la sección", "content": "2-4 frases de desarrollo" }
  ],
  "highlights": ["punto destacado 1", "punto destacado 2"]
}

Reglas:
- Usa entre 2 y 4 elementos en "sections".
- Usa entre 3 y 6 elementos en "highlights", cada uno de máximo 8 palabras.
- Escribe todo en español, con un tono cálido y atractivo, pero fiel a lo descrito y a lo observado en la imagen.
- No inventes datos concretos (precios, fechas, cifras, nombres) que no estén respaldados por el texto del usuario o claramente visibles en la imagen.
${safetyRules.join("\n")}
- No agregues comentarios ni explicaciones fuera del JSON.`;

  const userContent = [];
  if (hasImage) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    });
  }
  userContent.push({ type: "text", text: prompt });

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
        max_tokens: 1000,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return Response.json(
        { error: "no se pudo generar la presentación" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
    const presentation = JSON.parse(cleaned);

    return Response.json({ presentation });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "no se pudo generar la presentación, intenta de nuevo" },
      { status: 500 }
    );
  }
}
