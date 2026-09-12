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
  detectedChain: string | null;
  foundInChains: string[];
}

const VERDICT_LABEL: Record<Verdict, string> = {
  red: "Origen: Marruecos",
  orange: "Origen dudoso o Sahara Occidental",
  green: "Origen Espana u otro claro",
  unknown: "Origen no verificable",
};

export default function HomePage() {
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
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
        body: JSON.stringify({ barcode: codeToUse, productName }),
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
          ? {
              ...prev,
              verdict:
                data.evidence.countryCode === "MA"
                  ? "red"
                  : data.evidence.countryCode === "EH"
                  ? "orange"
                  : data.evidence.countryCode === "ES"
                  ? "green"
                  : "unknown",
              needsPhoto: false,
            }
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

  function startCamera() {
    setCameraError(null);
    setCameraOpen(true);
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (res) => {
        if (cancelled) return;
        if (res) {
          const text = res.getText();
          setBarcode(text);
          stopCamera();
          handleScan(text);
        }
      })
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
      <h1 className="title">OrigenLegit</h1>
      <p className="subtitle">Comprueba el origen real de un producto antes de comprarlo.</p>

      {!cameraOpen && (
        <button className="btn-primary" onClick={startCamera}>
          Escanear con la camara
        </button>
      )}

      {cameraOpen && (
        <div>
          <video ref={videoRef} muted playsInline />
          {cameraError && <p className="error-text">{cameraError}</p>}
          <button className="btn-secondary" onClick={stopCamera}>
            Cancelar
          </button>
        </div>
      )}

      <div className="divider">o manualmente</div>

      <div className="field">
        <label>Codigo de barras</label>
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8412345678901" />
      </div>

      <div className="field">
        <label>Nombre del producto (opcional, mejora la busqueda)</label>
        <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ej. queso semicurado" />
      </div>

      <button className="btn-primary" onClick={() => handleScan()} disabled={loading || !barcode}>
        {loading ? "Comprobando..." : "Comprobar origen"}
      </button>

      {result && (
        <div className="result">
          <span className={`pill pill-${result.verdict}`}>{result.verdict === "unknown" ? "Sin datos" : result.verdict}</span>
          <p className="result-verdict">{VERDICT_LABEL[result.verdict]}</p>
          <p className="meta">
            Fuente: {result.evidence.source} · Confianza {Math.round(result.evidence.confidence * 100)}%
          </p>
          {result.evidence.rawText && <p className="quote">{result.evidence.rawText}</p>}

          {result.detectedChain && <p className="chain-tag">Detectado en {result.detectedChain}</p>}
          {result.foundInChains && result.foundInChains.length > 1 && (
            <p className="chain-tag">También disponible en: {result.foundInChains.join(", ")}</p>
          )}

          {result.needsPhoto && (
            <div style={{ marginTop: 14 }}>
              <p className="meta">No hay suficiente informacion online. Haz una foto al reverso del envase:</p>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <button className="btn-secondary" onClick={handlePhotoUpload} disabled={!photo || loading}>
                Analizar foto
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
