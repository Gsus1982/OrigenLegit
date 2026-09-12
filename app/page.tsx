"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Verdict = "red" | "orange" | "green" | "unknown";

interface Evidence {
  source: string;
  rawText: string;
  countryCode: string;
  countryLabel?: string;
  confidence: number;
}

interface ScanResult {
  barcode: string;
  verdict: Verdict;
  evidence: Evidence;
  needsPhoto: boolean;
  fromCache: boolean;
  detectedChain: string | null;
  foundInChains: string[];
}

interface HistoryItem {
  barcode: string;
  productName: string;
  verdict: Verdict;
  chain: string | null;
  timestamp: number;
}

const HISTORY_KEY = "origenlegit_history";
const MAX_HISTORY = 20;

function verdictTitle(result: ScanResult): string {
  if (result.verdict === "red") return "Origen: Marruecos";
  if (result.verdict === "orange") return "Origen dudoso o Sahara Occidental";
  if (result.verdict === "green") {
    if (result.evidence.countryCode === "OTHER" && result.evidence.countryLabel) {
      return `Origen: ${result.evidence.countryLabel} (no es Marruecos)`;
    }
    return "Origen: Espana u otro confirmado";
  }
  return "Origen no verificable";
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
}

export default function HomePage() {
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Comprobando...");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function pushHistory(r: ScanResult) {
    const item: HistoryItem = {
      barcode: r.barcode,
      productName: productName || r.barcode,
      verdict: r.verdict,
      chain: r.detectedChain,
      timestamp: Date.now(),
    };
    const next = [item, ...history.filter((h) => h.barcode !== r.barcode)].slice(0, MAX_HISTORY);
    setHistory(next);
    saveHistory(next);
  }

  async function handleScan(codeOverride?: string) {
    const codeToUse = codeOverride ?? barcode;
    if (!codeToUse) return;
    setLoading(true);
    setLoadingLabel("Consultando Open Food Facts...");
    setResult(null);
    const t = setTimeout(() => setLoadingLabel("Consultando 8 supermercados en paralelo..."), 900);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: codeToUse, productName }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
      pushHistory(data);
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  }

  async function handlePhotoUpload() {
    if (!photo) return;
    setLoading(true);
    setLoadingLabel("Analizando foto...");
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
              evidence: data.evidence,
              verdict:
                data.evidence.countryCode === "MA"
                  ? "red"
                  : data.evidence.countryCode === "EH"
                  ? "orange"
                  : data.evidence.countryCode === "ES" || data.evidence.countryCode === "OTHER"
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

  async function handleShare() {
    if (!result) return;
    const text = `OrigenLegit — ${verdictTitle(result)}\nCodigo: ${result.barcode}\nFuente: ${result.evidence.source} (confianza ${Math.round(result.evidence.confidence * 100)}%)`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* usuario cancelo */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function loadFromHistory(item: HistoryItem) {
    setBarcode(item.barcode);
    setProductName(item.productName === item.barcode ? "" : item.productName);
    handleScan(item.barcode);
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
        {loading ? loadingLabel : "Comprobar origen"}
      </button>

      {result && (
        <div className="result">
          <span className={`pill pill-${result.verdict}`}>
            {result.verdict === "unknown" ? "Sin datos" : result.verdict === "green" ? "Confirmado" : result.verdict}
          </span>
          <p className="result-verdict">{verdictTitle(result)}</p>
          <p className="meta">
            Fuente: {result.evidence.source} · Confianza {Math.round(result.evidence.confidence * 100)}%
          </p>
          {result.evidence.rawText && <p className="quote">{result.evidence.rawText}</p>}

          {result.detectedChain && <p className="chain-tag">Detectado en {result.detectedChain}</p>}
          {result.foundInChains && result.foundInChains.length > 1 && (
            <p className="chain-tag">Tambien disponible en: {result.foundInChains.join(", ")}</p>
          )}

          <div className="result-actions">
            <button className="btn-secondary" onClick={handleShare}>
              {copied ? "Copiado" : "Compartir"}
            </button>
          </div>

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

      {history.length > 0 && (
        <div className="history">
          <p className="history-title">Historial reciente</p>
          {history.map((h) => (
            <button key={h.barcode + h.timestamp} className="history-item" onClick={() => loadFromHistory(h)}>
              <span>
                <span className="h-name">{h.productName}</span>
                <br />
                <span className="h-code">{h.barcode}{h.chain ? ` · ${h.chain}` : ""}</span>
              </span>
              <span className={`history-dot dot-${h.verdict}`} />
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
