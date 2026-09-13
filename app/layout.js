import "./globals.css";

export const metadata = {
  title: "InfoQR — códigos QR al instante",
  description: "Describe un producto, persona o lugar y genera un código QR con esa información al instante.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
