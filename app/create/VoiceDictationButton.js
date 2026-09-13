"use client";

import { useState, useRef, useEffect } from "react";

// Botón de micrófono que usa el reconocimiento de voz integrado del
// navegador (funciona muy bien en Chrome/Android; en Safari/iPhone puede
// no estar disponible — en ese caso el botón se oculta solo).
export default function VoiceDictationButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, [onResult]);

  function toggle() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 10, fontSize: 12,
        border: listening ? "1px solid var(--coral)" : "1px solid var(--border)",
        background: listening ? "#faece7" : "#fff",
        color: listening ? "var(--coral)" : "#6b6a64",
      }}
    >
      {listening ? "🔴 escuchando... toca para detener" : "🎤 dictar por voz"}
    </button>
  );
}
