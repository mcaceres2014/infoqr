# InfoQR — puesta en marcha

MVP funcional con dos modos:

1. **Cápsula multimedia**: fotos/video + mensaje (el flujo original).
2. **Presentación con IA**: describes con texto un producto, persona, equipo
   o lugar turístico, y la IA arma automáticamente una presentación
   (título, secciones, puntos destacados) que se entrega en el QR.

Ambos modos permiten agregar música de fondo.

### Modelo comercial (pago único por QR, con dos modos de acceso)

La app requiere iniciar sesión (link mágico por email, sin contraseñas)
y cada QR se paga individualmente, combinando dos partes:

**1. Nivel de contenido** (se detecta automáticamente por lo que adjuntas):

| Contenido | Precio base |
|---|---|
| Solo texto | $700 CLP |
| Fotos / planos / dibujos | $1.500 CLP |
| Video (incluye música) | $3.000 CLP |

**2. Modo de acceso** (el usuario elige uno de los dos, se suma al precio base):

- **Por duración** — visitas ilimitadas mientras dure el tiempo elegido:

  | Duración | Precio adicional |
  |---|---|
  | 1 día | +$700 |
  | 1 semana | +$1.200 |
  | 1 mes | +$2.500 |
  | Sin límite de tiempo | +$5.000 |

- **Por cantidad de usos** — sin límite de tiempo, se agota al alcanzar las visitas:

  | Usos | Precio adicional |
  |---|---|
  | 50 usos | +$500 |
  | 100 usos | +$900 |
  | 500 usos | +$2.500 |
  | 1.000 usos | +$4.000 |

Toda esta configuración vive en un solo archivo, `lib/pricing.js` — se
edita ahí y se refleja en toda la app automáticamente.

**Funciones adicionales sin costo extra:**
- **Recarga:** desde "mis QR", el dueño puede volver a pagar por más
  duración o más usos sobre un código ya existente (reemplaza el modo
  anterior, no se acumula).
- **Apagado manual:** el dueño puede desactivar su QR en cualquier
  momento (ej. "ya vendí la propiedad"), sin esperar a que se agote el
  tiempo o los usos.

### Pasarela de pago: Flow

Se eligió Flow.cl en vez de MercadoPago porque, para montos bajos como
los de InfoQR, MercadoPago cobra una comisión fija de ~$800 CLP por
transacción además del porcentaje — eso hace que las ventas más baratas
den pérdida. Flow no tiene ese costo fijo en pagos con tarjeta, solo
cobra un porcentaje (~3,44% con IVA incluido), lo que deja margen real
incluso en el precio de entrada.

Costo estimado en esta fase: 0 USD/mes de hosting/almacenamiento (planes
gratuitos de Supabase y Vercel — ver nota más abajo sobre sus límites
para uso comercial), más el costo variable, muy bajo, de las llamadas a
la API de Anthropic (unos $2 CLP por presentación generada), más la
comisión de Flow por cada cobro.

## 1. Crear el backend (Supabase) — 10 minutos

1. Entra a supabase.com y crea una cuenta gratuita.
2. Crea un nuevo proyecto (elige una región cercana a tus usuarios, ej.
   South America).
3. Ve a "SQL Editor" y pega el contenido de `supabase/schema.sql`. Ejecútalo.
   Esto crea la tabla `capsules` (con soporte para modo IA, música, y el
   modelo de acceso por duración o usos), la tabla `purchases`, el
   bucket de almacenamiento `media`, y los permisos necesarios. Si ya
   habías corrido una versión anterior de este archivo, no hay problema:
   el script agrega las columnas nuevas sin borrar tus datos existentes.
4. Ve a "Project settings" → "API" (o "Claves API", según la versión del
   panel). Copia:
   - `Project URL`
   - `anon public key` (o "clave publicable")
   - `service_role key` (o "llave secreta") — se usa únicamente en el
     webhook de pagos, nunca en el navegador.
5. Crea una cuenta gratuita en **console.anthropic.com** (ahora también
   accesible desde platform.claude.com) y genera una API Key. Este es el
   motor que convierte tu descripción de texto en la presentación.
   Nota: la cuenta no siempre viene con créditos de prueba — puede que
   necesites agregar un monto mínimo (unos 5 USD) en "Añadir fondos"
   antes de que la llave funcione.
6. Crea una cuenta en **flow.cl** (o el país correspondiente) y activa
   el modo desarrollador. Copia tu **API Key** y **Secret Key** de
   pruebas (sandbox) primero — nunca uses las de producción mientras
   pruebas el flujo completo.

## 2. Configurar el proyecto localmente

1. Necesitas Node.js instalado (v18 o superior).
2. Descomprime este proyecto y abre una terminal dentro de la carpeta.
3. Instala las dependencias:
   ```
   npm install
   ```
4. Copia el archivo de entorno:
   ```
   cp .env.local.example .env.local
   ```
5. Abre `.env.local` y pega tus datos: `Project URL`, `anon key` y
   `service_role key` de Supabase, tu `ANTHROPIC_API_KEY`, y tu
   `FLOW_API_KEY` + `FLOW_SECRET_KEY` de Flow (dejando `FLOW_API_BASE`
   apuntando a sandbox.flow.cl mientras pruebas).
6. Corre el proyecto en local para probarlo:
   ```
   npm run dev
   ```
   Abre http://localhost:3000 — deberías poder crear una cápsula y ver
   el QR generarse.

   **Importante sobre el login:** el link mágico solo funciona si lo
   abres desde el mismo equipo donde corre `npm run dev` (porque apunta
   a `localhost`) — ábrelo desde el correo en esa misma computadora, no
   desde el celular, mientras estés en esta fase de pruebas locales.

## 3. Publicar en tu dominio (Vercel)

1. Sube este proyecto a un repositorio de GitHub (puedes arrastrar la
   carpeta directamente en github.com si no usas git desde la terminal).
2. Entra a vercel.com, crea cuenta con tu GitHub, y selecciona "Import
   Project" sobre ese repositorio.
3. En "Environment Variables" agrega todas las variables de tu
   `.env.local` (las de Supabase, `ANTHROPIC_API_KEY`, `FLOW_API_KEY`,
   `FLOW_SECRET_KEY`, y `FLOW_API_BASE` — cuando ya quieras cobrar de
   verdad, cambia esta última a `https://www.flow.cl/api`, la de
   producción, y usa tus llaves reales de Flow, no las de sandbox).
4. Dale a "Deploy". En 1-2 minutos tendrás una URL tipo
   `infoqr.vercel.app` funcionando.

**Nota importante:** el plan gratuito "Hobby" de Vercel está pensado
solo para proyectos personales, no comerciales, según sus propios
términos de servicio. Mientras validas el proyecto con poco tráfico el
riesgo es bajo, pero antes de operar como negocio real, corresponde
pasar al plan Pro (20 USD/mes). Lo mismo aplica al plan gratuito de
Supabase, que además se auto-pausa tras una semana sin actividad — su
plan Pro (25 USD/mes) elimina ese riesgo.

## 4. Conectar tu dominio propio

1. Dentro del proyecto en Vercel, ve a "Settings" → "Domains".
2. Escribe `infoqr.com` (o la variante exacta que hayas comprado,
   ej. `infoqr.cl`, `.app`, etc.) y agrégalo. Agrega también la
   versión con `www.` si la quieres activa.
3. Vercel te va a mostrar 1-2 registros DNS (normalmente un registro
   `A` apuntando a `76.76.21.21` y/o un `CNAME` para `www`) que debes
   copiar en el panel de tu proveedor de dominio (donde compraste
   infoqr: GoDaddy, Namecheap, NIC Chile, etc.), en la sección
   "DNS" o "Administrar DNS".
4. La propagación puede tardar entre 10 minutos y unas horas. Cuando
   Vercel marque el dominio como "Valid", infoqr ya vive en tu
   propio dominio, con HTTPS automático incluido.
5. **Configura el webhook de pagos:** en tu panel de Flow, busca la
   configuración de tu app/API y agrega esta URL de confirmación:
   `https://tudominio.com/api/flow/webhook`. Esto es lo que le avisa a
   tu app cuando alguien paga un QR (o una recarga), para activarlo
   automáticamente.

## 5. Qué falta para producción real (siguientes pasos, no urgentes)

- **Cambia de sandbox a producción en Flow** solo cuando ya hayas
  probado el flujo completo de pago sin errores — cambia `FLOW_API_BASE`,
  `FLOW_API_KEY` y `FLOW_SECRET_KEY` a los valores reales.
- **La expiración por duración se controla al momento de mostrar el
  contenido** (comparando `expires_at` con la hora actual), pero los
  archivos de una cápsula vencida siguen ocupando espacio en el storage.
  Para una versión más prolija, conviene una tarea programada que borre
  cápsulas y su media una vez vencidas.
- Límite de tamaño de archivo y compresión de imágenes antes de subir.
- Analítica básica de escaneos (tabla adicional `capsule_views`).
- Versión de app nativa — recién cuando ya tengas tracción validada en
  la web.

## Estructura del proyecto

```
infoqr/
  app/
    page.js                              → landing / home
    login/page.js                        → inicio de sesión (link mágico)
    pricing/page.js                      → tabla pública de precios
    account/page.js                      → historial, recarga y apagado manual de QR
    create/page.js                       → creación + contenido + modo de acceso + inicia el pago
    create/success/[id]/page.js          → pantalla del creador tras pagar (descarga/comparte el QR)
    view/[id]/page.js                    → server component: pago, expiración, usos, apagado manual
    view/[id]/ViewerClient.js            → renderiza la presentación, media y música
    api/generate/route.js                → llama a la API de Anthropic
    api/flow/pay/                        → crea el cobro inicial de una cápsula nueva
    api/flow/recharge/                   → crea el cobro de una recarga sobre una cápsula existente
    api/flow/webhook/                    → recibe confirmaciones de pago de Flow
    layout.js
    globals.css
  lib/
    supabaseClient.js
    pricing.js                           → contenido, duración, usos y cálculo de precio total
    flow.js                              → helper de la API de Flow (firma HMAC incluida)
  supabase/
    schema.sql                            → correr esto en Supabase
```
