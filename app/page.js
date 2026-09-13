import Link from "next/link";

export default function Home() {
  return (
    <main className="container" style={{ paddingTop: 80, textAlign: "center" }}>
      <p className="serif" style={{ fontSize: 28, margin: "0 0 8px" }}>
        InfoQR
      </p>
      <p style={{ fontSize: 16, color: "#6b6a64", margin: "0 0 40px" }}>
        describe un producto, una persona o un lugar, y genera al instante
        un código QR con esa información.
      </p>
      <Link href="/create">
        <button className="btn-primary" style={{ maxWidth: 260, margin: "0 auto" }}>
          crear mi código QR
        </button>
      </Link>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24 }}>
        <Link href="/pricing" style={{ fontSize: 13, color: "#6b6a64" }}>
          precios
        </Link>
        <Link href="/account" style={{ fontSize: 13, color: "#6b6a64" }}>
          mis QR
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: "#6b6a64" }}>
          iniciar sesión
        </Link>
      </div>
    </main>
  );
}
