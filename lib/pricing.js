// Configuración central de precios. Editar los montos acá se refleja en
// toda la app: la calculadora pública de precios, el formulario de
// creación, y el cobro real con Flow.
//
// El precio final de un código QR = precio base según el contenido
// + precio adicional según el modo de acceso elegido (duración O
// cantidad de usos, nunca ambos a la vez).

export const CONTENT_LEVELS = {
  text: {
    id: "text",
    label: "solo texto",
    basePrice: 700,
    allowImages: false,
    allowVideo: false,
    description: "reseña o descripción escrita",
  },
  images: {
    id: "images",
    label: "fotos / planos",
    basePrice: 1500,
    allowImages: true,
    allowVideo: false,
    description: "incluye fotos, planos o dibujos ilustrados",
  },
  video: {
    id: "video",
    label: "video",
    basePrice: 3000,
    allowImages: true,
    allowVideo: true,
    description: "incluye video y música de fondo",
  },
};

// Modo A: por duración — durante ese tiempo, las visitas son ilimitadas.
export const DURATION_TIERS = {
  "24h": { id: "24h", label: "1 día", hours: 24, addOnPrice: 700 },
  "7d": { id: "7d", label: "1 semana", hours: 24 * 7, addOnPrice: 1200 },
  "30d": { id: "30d", label: "1 mes", hours: 24 * 30, addOnPrice: 2500 },
  forever: { id: "forever", label: "sin límite de tiempo", hours: null, addOnPrice: 5000 },
};

// Modo B: por cantidad de usos — sin límite de tiempo, se agota por visitas.
export const VIEWS_TIERS = {
  50: { id: "50", label: "50 usos", views: 50, addOnPrice: 500 },
  100: { id: "100", label: "100 usos", views: 100, addOnPrice: 900 },
  500: { id: "500", label: "500 usos", views: 500, addOnPrice: 2500 },
  1000: { id: "1000", label: "1.000 usos", views: 1000, addOnPrice: 4000 },
};

export function getContentLevel(id) {
  return CONTENT_LEVELS[id] || CONTENT_LEVELS.text;
}

export function getDurationTier(id) {
  return DURATION_TIERS[id] || DURATION_TIERS["24h"];
}

export function getViewsTier(id) {
  return VIEWS_TIERS[id] || VIEWS_TIERS[50];
}

// accessMode: { type: 'duration', id: '24h' } o { type: 'views', id: '100' }
export function getAccessAddOnPrice(accessMode) {
  if (!accessMode) return 0;
  if (accessMode.type === "views") return getViewsTier(accessMode.id).addOnPrice;
  return getDurationTier(accessMode.id).addOnPrice;
}

export function getTotalPrice(contentLevelId, accessMode) {
  const base = getContentLevel(contentLevelId).basePrice;
  return base + getAccessAddOnPrice(accessMode);
}

// A partir de los archivos adjuntos, determina el nivel de contenido
// mínimo necesario (no se puede cobrar "solo texto" si hay un video).
export function detectRequiredLevel(files) {
  const hasVideo = files.some((f) => f.type.startsWith("video"));
  const hasImage = files.some((f) => f.type.startsWith("image"));
  if (hasVideo) return "video";
  if (hasImage) return "images";
  return "text";
}

// Calcula la fecha de expiración a partir de un momento base (solo
// aplica en modo "duración"; en modo "usos" no hay fecha de expiración).
export function computeExpiresAt(accessMode, fromDate = new Date()) {
  if (!accessMode || accessMode.type !== "duration") return null;
  const tier = getDurationTier(accessMode.id);
  if (tier.hours === null) return null; // sin límite de tiempo
  return new Date(fromDate.getTime() + tier.hours * 60 * 60 * 1000).toISOString();
}
