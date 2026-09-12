"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

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

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  async function handleScan(codeOverride?: string) {
    const codeToUse = codeOverride ?? barcode;
    if (!codeToUse) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: codeToUse, productName, supermarket }),
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

  function stopCamera() {
    readerRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  async function startCamera() {
    setCameraError(null);
    setCameraOpen(true);
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, err) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText();
            setBarcode(text);
            stopCamera();
            handleScan(text);
          }
        }
      )
      .catch((err) => {
        if (!cancelled) setCameraError("No se pudo acceder a la camara: " + err.message);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  return (
    <main className="container">
      <h1>OrigenLegit</h1>
      <p className="badge">Comprueba el origen real de un producto antes de comprarlo.</p>

      <div className="card">
        <button onClick={startCamera} disabled={cameraOpen}>
          Escanear con la camara
        </button>

        {cameraOpen && (
          <div style={{ marginTop: 12 }}>
            <video ref={videoRef} style={{ width: "100%", borderRadius: 12 }} muted playsInline />
            {cameraError && <p className="badge" style={{ color: "#ef4444" }}>{cameraError}</p>}
            <button onClick={stopCamera} style={{ background: "#334155", color: "#f1f5f9" }}>
              Cancelar
            </button>
          </div>
        )}

        <label>O escribe el codigo de barras</label>
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8412345678901" />

        <label>Nombre del producto (opcional, mejora el scraping)</label>
        <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ej. Filetes de anchoa Hacendado" />

        <label>Supermercado</label>
        <select value={supermarket} onChange={(e) => setSupermarket(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 8 }}>
          <option value="mercadona">Mercadona</option>
          <option value="carrefour">Carrefour</option>
          <option value="dia">Dia</option>
        </select>

        <button onClick={() => handleScan()} disabled={loading || !barcode}>
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
