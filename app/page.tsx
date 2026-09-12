"use client";

import { useState } from "react";

type Verdict = "red" | "orange" | "green" | "unknown";

interface ScanResult {
  barcode: string;
  verdict: Verdict;
  evidence: { source: string; rawText: string; countryCode: string; confidence: number };
  needsPhoto: boolean;
  fromCache: boolean;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  red: "Origen: Marruecos",
  orange: "Origen dudoso / Sahara Occidental",
  green: "Origen Espana / claro (no Marruecos)",
  unknown: "Origen no verificable con los datos disponibles",
};

export default function HomePage() {
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [supermarket, setSupermarket] = useState("mercadona");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, productName, supermarket }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload() {
    if (!photo) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", photo);
      formData.append("barcode", barcode);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      setResult((prev) =>
        prev
          ? { ...prev, verdict: data.evidence.countryCode === "MA" ? "red" : data.evidence.countryCode === "EH" ? "orange" : data.evidence.countryCode === "ES" ? "green" : "unknown", needsPhoto: false }
          : null
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>OrigenLegit</h1>
      <p className="badge">Comprueba el origen real de un producto antes de comprarlo.</p>

      <div className="card">
        <label>Codigo de barras</label>
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8412345678901" />

        <label>Nombre del producto (opcional, mejora el scraping)</label>
        <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ej. Filetes de anchoa Hacendado" />

        <label>Supermercado</label>
        <select value={supermarket} onChange={(e) => setSupermarket(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 8 }}>
          <option value="mercadona">Mercadona</option>
          <option value="carrefour">Carrefour</option>
          <option value="dia">Dia</option>
        </select>

        <button onClick={handleScan} disabled={loading || !barcode}>
          {loading ? "Comprobando..." : "Comprobar origen"}
        </button>
      </div>

      {result && (
        <div className={`card verdict-${result.verdict}`}>
          <strong>{VERDICT_LABEL[result.verdict]}</strong>
          <p className="badge">
            Fuente: {result.evidence.source} - Confianza: {Math.round(result.evidence.confidence * 100)}%
          </p>
          {result.evidence.rawText && <p>&quot;{result.evidence.rawText}&quot;</p>}

          {result.needsPhoto && (
            <div>
              <p className="badge">No encontramos el origen online. Haz una foto al reverso del envase:</p>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <button onClick={handlePhotoUpload} disabled={!photo || loading}>
                Analizar foto (OCR)
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
