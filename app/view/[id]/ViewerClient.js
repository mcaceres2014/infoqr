"use client";

import { useRef, useState, useEffect } from "react";

export default function ViewerClient({ capsule }) {
  const { id, mode, message, sender_name, media, color, music_url, presentation, slideshow } = capsule;
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  function toggleMusic() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  }

  async function handleReport() {
    if (!confirm("¿Reportar este contenido como inapropiado o indebido?")) return;
    setReporting(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capsuleId: id }),
      });
      setReported(true);
    } catch {
      alert("no se pudo enviar el reporte, intenta de nuevo.");
    } finally {
      setReporting(false);
    }
  }

  const images = (media || []).filter((m) => m.type === "image");
  const videos = (media || []).filter((m) => m.type === "video");
  const useSlideshow = Boolean(slideshow) && images.length >= 2;

  return (
    <main style={{ background: "#fbf4ee", minHeight: "100vh" }}>
      <div className="container" style={{ paddingTop: 56 }}>
        {music_url && (
          <>
            <audio ref={audioRef} src={music_url} loop />
            <button
              onClick={toggleMusic}
              style={{
                position: "fixed",
                top: 18,
                right: 18,
                zIndex: 10,
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `1px solid ${color}`,
                background: "#fff",
                fontSize: 16,
              }}
              aria-label="reproducir música de fondo"
            >
              {playing ? "❚❚" : "♪"}
            </button>
          </>
        )}

        {mode === "ai" && presentation ? (
          <AIPresentation presentation={presentation} color={color} />
        ) : (
          <MediaMessage message={message} senderName={sender_name} />
        )}

        {images.length > 0 &&
          (useSlideshow ? (
            <>
              {music_url && (
                <p style={{ fontSize: 11, color: "#9a988f", textAlign: "center", marginBottom: 10 }}>
                  toca el botón ♪ arriba para activar la música mientras miras las fotos
                </p>
              )}
              <PhotoSlideshow images={images} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: videos.length > 0 ? 16 : 0 }}>
              {images.map((item, i) => (
                <img key={i} src={item.url} alt="" style={{ width: "100%", borderRadius: 16, display: "block" }} />
              ))}
            </div>
          ))}

        {videos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {videos.map((item, i) => (
              <video key={i} src={item.url} controls style={{ width: "100%", borderRadius: 16 }} />
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 48, paddingBottom: 16 }}>
          <a
            href="/create"
            style={{
              display: "inline-block",
              fontSize: 13,
              color,
              border: `1px solid ${color}`,
              borderRadius: 10,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            crea tu propia cápsula
          </a>
        </div>

        <div style={{ textAlign: "center", paddingBottom: 40 }}>
          <p style={{ fontSize: 10, color: "#b5b3ab", marginBottom: 6 }}>
            InfoQR no verifica la veracidad del contenido publicado por sus usuarios.
          </p>
          {reported ? (
            <p style={{ fontSize: 11, color: "#9a988f" }}>gracias, este contenido fue reportado.</p>
          ) : (
            <button
              onClick={handleReport}
              disabled={reporting}
              style={{ fontSize: 11, color: "#9a988f", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
            >
              {reporting ? "enviando..." : "reportar este contenido"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// Diapositiva animada: las fotos van pasando solas con un desvanecido
// suave, como si fuera un video, pero sin necesidad de generar ni
// procesar ningún archivo de video real.
function PhotoSlideshow({ images, intervalMs = 3500 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "100%",
        borderRadius: 16,
        overflow: "hidden",
        background: "#000",
        marginBottom: 8,
      }}
    >
      {images.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === index ? 1 : 0,
            transition: "opacity 1.4s ease",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 5,
        }}
      >
        {images.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AIPresentation({ presentation, color }) {
  const { title, subtitle, sections, highlights } = presentation;
  return (
    <div style={{ textAlign: "left", marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: "#9a988f", textAlign: "center", marginBottom: 16 }}>
        alguien preparó esto para ti
      </p>
      <p className="serif" style={{ fontSize: 26, textAlign: "center", margin: "0 0 6px" }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: 14, color: "#6b6a64", textAlign: "center", marginBottom: 28 }}>
          {subtitle}
        </p>
      )}

      {highlights?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          {highlights.map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 20,
                background: "#fff",
                border: `1px solid ${color}`,
                color,
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {sections?.map((s, i) => (
        <div key={i} style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{s.heading}</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3a3934" }}>{s.content}</p>
        </div>
      ))}
    </div>
  );
}

function MediaMessage({ message, senderName }) {
  if (!message) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <p style={{ fontSize: 13, color: "#9a988f", marginBottom: 16 }}>
        alguien te dejó algo especial
      </p>
      <p className="serif" style={{ fontSize: 22, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {message}
      </p>
      {senderName && (
        <p style={{ fontSize: 14, color: "#6b6a64", marginTop: 16 }}>— {senderName}</p>
      )}
    </div>
  );
}
