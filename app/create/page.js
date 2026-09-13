"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabaseClient";
import {
  CONTENT_LEVELS,
  DURATION_TIERS,
  VIEWS_TIERS,
  getTotalPrice,
  detectRequiredLevel,
} from "../../lib/pricing";
import VoiceDictationButton from "./VoiceDictationButton";

const COLORS = ["#D85A30", "#ED93B1", "#3C3489", "#2C2C2A"];
const ICONS = [
  { id: "heart", label: "corazón" },
  { id: "camera", label: "cámara" },
  { id: "gift", label: "regalo" },
];
const CONTENT_TYPES = [
  { id: "producto", label: "producto" },
  { id: "persona", label: "persona" },
  { id: "equipo", label: "equipo / vestuario" },
  { id: "lugar", label: "lugar turístico" },
];

// Plantillas por caso de uso: cada una preconfigura las opciones más
// razonables para ese escenario, para que quien no entiende de
// tecnología no tenga que decidir todo desde cero. Siempre se puede
// ajustar cualquier cosa después, en el formulario.
const TEMPLATES = [
  {
    id: "propiedad",
    label: "Vender una propiedad",
    blurb: "para pegar en un letrero o compartir con interesados",
    mode: "ai",
    contentType: "producto",
    placeholder: "ej: casa de 3 dormitorios, patio grande, cerca del centro, recién pintada...",
    accessType: "views",
    viewsTierId: "100",
    slideshowSuggested: true,
    frameText: "en venta",
    icon: "camera",
    color: COLORS[0],
  },
  {
    id: "homenaje",
    label: "Homenaje o recuerdo",
    blurb: "para una placa, tarjeta, o recuerdo de alguien querido",
    mode: "ai",
    contentType: "persona",
    placeholder: "ej: era una persona alegre, cariñosa, le encantaba cocinar y reunir a la familia...",
    accessType: "duration",
    durationTierId: "forever",
    slideshowSuggested: true,
    frameText: "un recuerdo especial",
    icon: "heart",
    color: COLORS[1],
  },
  {
    id: "producto_usado",
    label: "Vender un producto usado",
    blurb: "para un mueble, un auto, ropa, o cualquier objeto",
    mode: "ai",
    contentType: "producto",
    placeholder: "ej: bicicleta aro 26, poco uso, cambios Shimano, se vende por cambio de casa...",
    accessType: "duration",
    durationTierId: "7d",
    slideshowSuggested: false,
    frameText: "en venta",
    icon: "camera",
    color: COLORS[0],
  },
  {
    id: "negocio",
    label: "Negocio local",
    blurb: "para un producto, servicio, o promoción de tu negocio",
    mode: "ai",
    contentType: "producto",
    placeholder: "ej: pastelería artesanal, tortas por encargo, entrega a domicilio...",
    accessType: "duration",
    durationTierId: "30d",
    slideshowSuggested: false,
    frameText: "escaneame",
    icon: "gift",
    color: COLORS[3],
  },
];

export default function CreatePage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [step, setStep] = useState("template"); // template | form | preview | working | redirecting
  const [mode, setMode] = useState("media"); // 'media' | 'ai'
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionPlaceholder, setDescriptionPlaceholder] = useState(
    "ej: es una chaqueta de cuero negra, talla M, tiene forro térmico..."
  );
  const [contentType, setContentType] = useState("producto");
  const [aiPhotos, setAiPhotos] = useState([]);
  const [senderName, setSenderName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState("heart");
  const [frameText, setFrameText] = useState("escaneame");
  const [slideshow, setSlideshow] = useState(false);
  const [musicMode, setMusicMode] = useState("none");
  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState("");

  const [accessType, setAccessType] = useState("duration");
  const [durationTierId, setDurationTierId] = useState("24h");
  const [viewsTierId, setViewsTierId] = useState("50");
  const [showAdvancedAccess, setShowAdvancedAccess] = useState(false);

  const [previewPresentation, setPreviewPresentation] = useState(null);
  const [previewMediaUrls, setPreviewMediaUrls] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setAuthChecked(true);
    });
  }, []);

  function applyTemplate(tpl) {
    setMode(tpl.mode);
    setContentType(tpl.contentType);
    setDescriptionPlaceholder(tpl.placeholder);
    setFrameText(tpl.frameText);
    setIcon(tpl.icon);
    setColor(tpl.color);
    setSlideshow(tpl.slideshowSuggested);
    if (tpl.accessType === "views") {
      setAccessType("views");
      setViewsTierId(tpl.viewsTierId);
      setShowAdvancedAccess(true);
    } else {
      setAccessType("duration");
      setDurationTierId(tpl.durationTierId);
    }
    setStep("form");
  }

  function startBlank() {
    setStep("form");
  }

  const requiredLevel = useMemo(() => {
    if (mode === "ai") return detectRequiredLevel(aiPhotos);
    return detectRequiredLevel(files);
  }, [files, aiPhotos, mode]);

  const accessMode = useMemo(
    () =>
      accessType === "views"
        ? { type: "views", id: viewsTierId }
        : { type: "duration", id: durationTierId },
    [accessType, durationTierId, viewsTierId]
  );

  const price = getTotalPrice(requiredLevel, accessMode);

  const activePhotoCount = mode === "ai" ? aiPhotos.length : files.filter((f) => f.type.startsWith("image")).length;

  async function resolveMusicUrl(id) {
    if (musicMode === "url" && musicUrl.trim()) return musicUrl.trim();
    if (musicMode === "upload" && musicFile) {
      const path = `${id}/music-${musicFile.name}`;
      const { error } = await supabase.storage.from("media").upload(path, musicFile);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      return data.publicUrl;
    }
    return null;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function checkModeration(text) {
    if (!text || text.trim().length < 3) return { allowed: true };
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return await res.json();
    } catch {
      return { allowed: true };
    }
  }

  async function handlePreview() {
    if (mode === "media" && files.length === 0 && !message.trim()) {
      alert("añade al menos una foto/video o escribe un mensaje");
      return;
    }
    if (mode === "ai" && description.trim().length < 5 && aiPhotos.length === 0) {
      alert("escribe una descripción o adjunta al menos una foto");
      return;
    }

    setPreviewLoading(true);
    try {
      const textToModerate = mode === "media" ? message : description;
      const moderation = await checkModeration(textToModerate);
      if (!moderation.allowed) {
        alert(
          `este contenido no se puede publicar: ${moderation.reason || "no cumple con nuestras normas de uso"}`
        );
        setPreviewLoading(false);
        return;
      }

      if (mode === "media") {
        const urls = files.map((f) => ({
          url: URL.createObjectURL(f),
          type: f.type.startsWith("video") ? "video" : "image",
        }));
        setPreviewMediaUrls(urls);
      } else {
        let imageBase64 = null;
        let imageMediaType = null;
        if (aiPhotos.length > 0) {
          imageBase64 = await readFileAsBase64(aiPhotos[0]);
          imageMediaType = aiPhotos[0].type;
        }

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, contentType, imageBase64, imageMediaType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "error generando la presentación");
        setPreviewPresentation(data.presentation);

        const urls = aiPhotos.map((f) => ({ url: URL.createObjectURL(f), type: "image" }));
        setPreviewMediaUrls(urls);
      }
      setStep("preview");
    } catch (err) {
      console.error(err);
      alert("no se pudo generar la vista previa. revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmAndPay() {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setStep("working");

    try {
      const id = uuidv4();
      const resolvedMusicUrl = await resolveMusicUrl(id);

      let insertPayload = {
        id,
        mode,
        color,
        icon,
        frame_text: frameText,
        sender_name: senderName,
        music_url: resolvedMusicUrl,
        slideshow: slideshow && activePhotoCount >= 2,
        user_id: user.id,
        content_level: requiredLevel,
        access_type: accessMode.type,
        price,
        payment_status: "pending_payment",
      };

      const filesToUpload = mode === "media" ? files : aiPhotos;
      const uploadedMedia = [];
      for (const file of filesToUpload) {
        const path = `${id}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(path);
        uploadedMedia.push({
          url: publicUrlData.publicUrl,
          type: file.type.startsWith("video") ? "video" : "image",
        });
      }
      insertPayload.media = uploadedMedia;

      if (mode === "media") {
        insertPayload.message = message;
      } else {
        insertPayload.description = description;
        insertPayload.content_type = contentType;
        insertPayload.presentation = previewPresentation;
      }

      const { error: insertError } = await supabase.from("capsules").insert(insertPayload);
      if (insertError) throw insertError;

      setStep("redirecting");

      const payRes = await fetch("/api/flow/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capsuleId: id,
          contentLevel: requiredLevel,
          accessMode,
          email: user.email,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "error creando el pago");

      window.location.href = payData.paymentUrl;
    } catch (err) {
      console.error(err);
      alert("hubo un problema al crear el QR o iniciar el pago. revisa tu conexión e inténtalo de nuevo.");
      setStep("form");
    }
  }

  if (!authChecked) {
    return (
      <main className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p style={{ color: "#9a988f" }}>cargando...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
          inicia sesión para crear tu QR
        </p>
        <Link href="/login">
          <button className="btn-primary" style={{ maxWidth: 220, margin: "0 auto" }}>
            iniciar sesión
          </button>
        </Link>
      </main>
    );
  }

  // ---------- PANTALLA DE PLANTILLAS ----------
  if (step === "template") {
    return (
      <main className="container" style={{ paddingTop: 40 }}>
        <p className="serif" style={{ fontSize: 22, textAlign: "center", marginBottom: 4 }}>
          ¿qué quieres crear?
        </p>
        <p style={{ fontSize: 12, color: "#9a988f", textAlign: "center", marginBottom: 24 }}>
          elige la opción más parecida a lo tuyo — ya viene con lo más recomendado configurado,
          y puedes ajustar cualquier detalle después.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              style={{
                textAlign: "left", padding: 16, borderRadius: 14,
                border: "1px solid var(--border)", background: "#fff", cursor: "pointer",
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{tpl.label}</p>
              <p style={{ fontSize: 12, color: "#9a988f", margin: 0 }}>{tpl.blurb}</p>
            </button>
          ))}
        </div>
        <button
          onClick={startBlank}
          style={{
            width: "100%", textAlign: "center", padding: 14, borderRadius: 14,
            border: "1px dashed var(--border)", background: "none", color: "#6b6a64", fontSize: 13,
          }}
        >
          empezar desde cero (personalizado)
        </button>
      </main>
    );
  }

  // ---------- PANTALLA DE VISTA PREVIA ----------
  if (step === "preview" || step === "working" || step === "redirecting") {
    return (
      <main className="container" style={{ paddingTop: 40 }}>
        <p className="serif" style={{ fontSize: 20, textAlign: "center", marginBottom: 4 }}>
          vista previa
        </p>
        <p style={{ fontSize: 12, color: "#9a988f", textAlign: "center", marginBottom: 24 }}>
          así se va a ver tu contenido para quien escanee el QR
        </p>

        <div
          style={{
            background: "#fff",
            border: `1px solid ${color}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          {mode === "ai" && previewPresentation && (
            <>
              <p className="serif" style={{ fontSize: 20, textAlign: "center", margin: "0 0 6px" }}>
                {previewPresentation.title}
              </p>
              {previewPresentation.subtitle && (
                <p style={{ fontSize: 13, color: "#6b6a64", textAlign: "center", marginBottom: 16 }}>
                  {previewPresentation.subtitle}
                </p>
              )}
              {previewPresentation.highlights?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
                  {previewPresentation.highlights.map((h, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "#faece7", color: "var(--coral)" }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
              {previewPresentation.sections?.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.heading}</p>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3a3934" }}>{s.content}</p>
                </div>
              ))}
            </>
          )}
          {mode === "media" && message && (
            <p className="serif" style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16, textAlign: "center" }}>
              {message}
            </p>
          )}

          {previewMediaUrls.length > 0 && (
            <>
              {slideshow && previewMediaUrls.filter((m) => m.type === "image").length >= 2 ? (
                <p style={{ fontSize: 11, color: "#9a988f", textAlign: "center", marginBottom: 8 }}>
                  🎞️ modo diapositiva activado — las fotos pasarán solas, con música de fondo
                </p>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {previewMediaUrls.map((item, i) =>
                  item.type === "video" ? (
                    <video key={i} src={item.url} controls style={{ width: "100%", borderRadius: 12 }} />
                  ) : (
                    <img key={i} src={item.url} alt="" style={{ width: "100%", borderRadius: 12 }} />
                  )
                )}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            background: "#fff", border: "1px solid var(--border)", borderRadius: 14,
            padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b6a64" }}>total a pagar</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--coral)" }}>
            ${price.toLocaleString("es-CL")} CLP
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            style={{ background: "#fff", color: "var(--coral)", border: "1px solid var(--coral)" }}
            onClick={() => setStep("form")}
            disabled={step !== "preview"}
          >
            volver a editar
          </button>
          <button className="btn-primary" onClick={handleConfirmAndPay} disabled={step !== "preview"}>
            {step === "working"
              ? "preparando tu QR..."
              : step === "redirecting"
              ? "redirigiendo a Flow..."
              : "confirmar y pagar"}
          </button>
        </div>
      </main>
    );
  }

  // ---------- FORMULARIO ----------
  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "24px 0 4px" }}>
        <p className="serif" style={{ fontSize: 22, margin: 0 }}>
          nueva cápsula
        </p>
        <Link href="/pricing" style={{ fontSize: 12, color: "#6b6a64" }}>
          ver precios
        </Link>
      </div>
      <button
        onClick={() => setStep("template")}
        style={{ fontSize: 12, color: "#6b6a64", background: "none", border: "none", padding: 0, marginBottom: 20, cursor: "pointer" }}
      >
        ← elegir otra plantilla
      </button>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setMode("media")}
          style={{
            flex: 1, padding: "10px 8px", borderRadius: 10,
            border: mode === "media" ? "1px solid var(--coral)" : "1px solid var(--border)",
            background: mode === "media" ? "#faece7" : "#fff", fontSize: 13,
          }}
        >
          cápsula multimedia
        </button>
        <button
          onClick={() => setMode("ai")}
          style={{
            flex: 1, padding: "10px 8px", borderRadius: 10,
            border: mode === "ai" ? "1px solid var(--coral)" : "1px solid var(--border)",
            background: mode === "ai" ? "#faece7" : "#fff", fontSize: 13,
          }}
        >
          presentación con IA
        </button>
      </div>

      {mode === "media" ? (
        <>
          <p className="field-label">fotos o video</p>
          <label
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", height: 100,
              border: "1px dashed #c9c2b6", borderRadius: 14, marginBottom: 20,
              color: "#9a988f", fontSize: 13,
            }}
          >
            {files.length > 0 ? `${files.length} archivo(s) seleccionados` : "toca para añadir fotos o video"}
            <input
              type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="field-label" style={{ margin: 0 }}>dedicatoria</p>
            <VoiceDictationButton onResult={(text) => setMessage((prev) => (prev ? prev + " " + text : text))} />
          </div>
          <textarea
            className="serif" placeholder="para la persona más especial..."
            value={message} onChange={(e) => setMessage(e.target.value)}
            style={{ marginBottom: 20 }}
          />
        </>
      ) : (
        <>
          <p className="field-label">¿qué estás describiendo?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.id} onClick={() => setContentType(t.id)}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  border: contentType === t.id ? "1px solid var(--coral)" : "1px solid var(--border)",
                  background: contentType === t.id ? "#faece7" : "#fff", fontSize: 13,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="field-label" style={{ margin: 0 }}>descríbelo con tus palabras</p>
            <VoiceDictationButton onResult={(text) => setDescription((prev) => (prev ? prev + " " + text : text))} />
          </div>
          <textarea
            placeholder={descriptionPlaceholder}
            value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: 8, minHeight: 140 }}
          />
          <p style={{ fontSize: 12, color: "#9a988f", marginBottom: 20 }}>
            la IA usa este texto (y las fotos, si agregas) para armar el título, las secciones y los
            puntos destacados. puedes escribir o dictar por voz.
          </p>

          <p className="field-label">fotos (opcional, se muestran en el resultado final)</p>
          <label
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", height: 90,
              border: "1px dashed #c9c2b6", borderRadius: 14, marginBottom: 8,
              color: "#9a988f", fontSize: 13,
            }}
          >
            {aiPhotos.length > 0 ? `${aiPhotos.length} foto(s) seleccionadas` : "toca para adjuntar una o más fotos"}
            <input
              type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={(e) => setAiPhotos(Array.from(e.target.files))}
            />
          </label>
          <p style={{ fontSize: 12, color: "#9a988f", marginBottom: 20 }}>
            la primera foto ayuda a la IA a redactar la descripción; todas las fotos que subas se
            muestran igual en el QR final.
            {contentType === "persona" && (
              <> la IA describe solo lo que se ve (ropa, expresión, entorno), nunca intenta adivinar quién es la persona.</>
            )}
          </p>
        </>
      )}

      {activePhotoCount >= 2 && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
            <input type="checkbox" checked={slideshow} onChange={(e) => setSlideshow(e.target.checked)} />
            modo diapositiva animada (las fotos pasan solas, con música de fondo)
          </label>
          <p style={{ fontSize: 11, color: "#9a988f", marginBottom: 20 }}>
            ideal para homenajes, recuerdos, o mostrar varias fotos de un mismo lugar de forma más
            emotiva que una lista estática.
          </p>
        </>
      )}

      <p className="field-label">tu nombre (opcional)</p>
      <input
        type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
        placeholder="quién lo comparte" style={{ marginBottom: 20 }}
      />

      <p className="field-label">música de fondo (opcional)</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { id: "none", label: "sin música" },
          { id: "upload", label: "subir archivo" },
          { id: "url", label: "pegar link" },
        ].map((opt) => (
          <button
            key={opt.id} onClick={() => setMusicMode(opt.id)}
            style={{
              padding: "8px 12px", borderRadius: 10,
              border: musicMode === opt.id ? "1px solid var(--coral)" : "1px solid var(--border)",
              background: musicMode === opt.id ? "#faece7" : "#fff", fontSize: 12,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {musicMode === "upload" && (
        <label
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", height: 60,
            border: "1px dashed #c9c2b6", borderRadius: 12, marginBottom: 20,
            color: "#9a988f", fontSize: 13,
          }}
        >
          {musicFile ? musicFile.name : "toca para elegir un archivo de audio"}
          <input
            type="file" accept="audio/*" style={{ display: "none" }}
            onChange={(e) => setMusicFile(e.target.files[0])}
          />
        </label>
      )}
      {musicMode === "url" && (
        <input
          type="text" placeholder="https://..." value={musicUrl}
          onChange={(e) => setMusicUrl(e.target.value)} style={{ marginBottom: 20 }}
        />
      )}

      <p className="field-label">color del QR</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {COLORS.map((c) => (
          <button
            key={c} onClick={() => setColor(c)}
            style={{
              width: 30, height: 30, borderRadius: "50%", background: c,
              border: color === c ? "2px solid #2c2c2a" : "2px solid transparent",
            }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>

      <p className="field-label">icono central</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {ICONS.map((i) => (
          <button
            key={i.id} onClick={() => setIcon(i.id)}
            style={{
              padding: "8px 14px", borderRadius: 10,
              border: icon === i.id ? "1px solid var(--coral)" : "1px solid var(--border)",
              background: icon === i.id ? "#faece7" : "#fff", fontSize: 13,
            }}
          >
            {i.label}
          </button>
        ))}
      </div>

      <p className="field-label">texto del marco</p>
      <input
        type="text" value={frameText} onChange={(e) => setFrameText(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      <p className="field-label">duración</p>
      {!showAdvancedAccess ? (
        <>
          <p style={{ fontSize: 11, color: "#9a988f", marginBottom: 10 }}>
            visitas ilimitadas mientras dure el tiempo elegido
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {Object.values(DURATION_TIERS).map((d) => (
              <button
                key={d.id}
                onClick={() => { setAccessType("duration"); setDurationTierId(d.id); }}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  border: accessType === "duration" && durationTierId === d.id ? "1px solid var(--coral)" : "1px solid var(--border)",
                  background: accessType === "duration" && durationTierId === d.id ? "#faece7" : "#fff", fontSize: 13,
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowAdvancedAccess(true); setAccessType("views"); }}
            style={{ fontSize: 12, color: "var(--coral)", background: "none", border: "none", padding: 0, marginBottom: 24, cursor: "pointer" }}
          >
            opción avanzada: controlar por cantidad de visitas en vez de tiempo →
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 11, color: "#9a988f", marginBottom: 10 }}>
            sin límite de tiempo, se agota al alcanzar la cantidad de usos
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {Object.values(VIEWS_TIERS).map((v) => (
              <button
                key={v.id}
                onClick={() => { setAccessType("views"); setViewsTierId(v.id); }}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  border: accessType === "views" && viewsTierId === v.id ? "1px solid var(--coral)" : "1px solid var(--border)",
                  background: accessType === "views" && viewsTierId === v.id ? "#faece7" : "#fff", fontSize: 13,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowAdvancedAccess(false); setAccessType("duration"); }}
            style={{ fontSize: 12, color: "#6b6a64", background: "none", border: "none", padding: 0, marginBottom: 24, cursor: "pointer" }}
          >
            ← volver a controlar por duración
          </button>
        </>
      )}

      <p style={{ fontSize: 12, color: "#9a988f", marginBottom: 20 }}>
        contenido detectado: <b>{CONTENT_LEVELS[requiredLevel].label}</b> — se ajusta solo según lo que adjuntes.
      </p>

      <div
        style={{
          background: "#fff", border: "1px solid var(--border)", borderRadius: 14,
          padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#6b6a64" }}>total a pagar</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--coral)" }}>
          ${price.toLocaleString("es-CL")} CLP
        </span>
      </div>

      <button className="btn-primary" onClick={handlePreview} disabled={previewLoading}>
        {previewLoading ? "generando vista previa..." : "ver vista previa"}
      </button>
    </main>
  );
}
