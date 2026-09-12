"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import OriginMap from "@/components/OriginMap";
import { coordsFor } from "@/lib/countryCoords";

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

interface CartItem {
  barcode: string;
  productName: string;
  verdict: Verdict;
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

function vibrate(ms: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

function exportHistoryCsv(history: HistoryItem[]) {
  const header = "codigo,producto,veredicto,cadena,fecha\n";
  const rows = history
    .map((h) => `${h.barcode},"${h.productName.replace(/"/g, "")}",${h.verdict},${h.chain ?? ""},${new Date(h.timestamp).toISOString()}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "origenlegit_historial.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [isFresh, setIsFresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Comprobando...");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [cartMode, setCartMode] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

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
    if (cartMode) {
      setCart((prev) => [...prev, { barcode: r.barcode, productName: item.productName, verdict: r.verdict }]);
    }
  }

  async function handleScan(codeOverride?: string) {
    const codeToUse = codeOverride ?? barcode;
    if (!codeToUse) return;
    setLoading(true);
    setFeedbackSent(false);
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

  async function sendFeedback(correct: boolean) {
    if (!result) return;
    setFeedbackSent(true);
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: result.barcode, correct }),
    }).catch(() => {});
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
          vibrate(60);
          const text = res.getText();
          setBarcode(text);
          stopCamera();
          handleScan(text).then(() => {
            if (cartMode) {
              setTimeout(() => setCameraOpen(true), 600);
            }
          });
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

  const cartCounts = {
    red: cart.filter((c) => c.verdict === "red").length,
    orange: cart.filter((c) => c.verdict === "orange").length,
    green: cart.filter((c) => c.verdict === "green").length,
    unknown: cart.filter((c) => c.verdict === "unknown").length,
  };

  const mapCoords = result ? coordsFor(result.evidence.countryCode, result.evidence.countryLabel) : null;

  return (
    <main className="container">
      <h1 className="title">OrigenLegit</h1>
      <p className="subtitle">Comprueba el origen real de un producto antes de comprarlo.</p>

      <div className="mode-row">
        <label className="switch-label">
          <input type="checkbox" checked={cartMode} onChange={(e) => setCartMode(e.target.checked)} />
          Modo carro (escaneo continuo)
        </label>
      </div>

      {cartMode && cart.length > 0 && (
        <div className="cart-summary">
          <span className="cart-count dot-red">{cartCounts.red}</span>
          <span className="cart-count dot-orange">{cartCounts.orange}</span>
          <span className="cart-count dot-green">{cartCounts.green}</span>
          <span className="cart-count dot-unknown">{cartCounts.unknown}</span>
          <span className="meta">{cart.length} productos en esta sesion</span>
        </div>
      )}

      {!cameraOpen && (
        <button className="btn-primary" onClick={startCamera}>
          Escanear con la camara
        </button>
      )}

      {cameraOpen && (
        <div>
          <video ref={videoRef} muted playsInline />
          {cameraError && (
            <p className="error-text">
              {cameraError} — revisa el permiso de camara en Ajustes de Safari o de la app si la instalaste en pantalla de inicio.
            </p>
          )}
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

      <label className="switch-label small">
        <input type="checkbox" checked={isFresh} onChange={(e) => setIsFresh(e.target.checked)} />
        Es fruta o verdura fresca
      </label>
      {isFresh && (
        <p className="meta fresh-note">
          El etiquetado de origen es obligatorio por ley en frescos: si la app no encuentra el dato, mira la etiqueta del lineal.
        </p>
      )}

      <button className="btn-primary" onClick={() => handleScan()} disabled={loading || !barcode}>
        {loading ? loadingLabel : "Comprobar origen"}
      </button>

      {result && (
        <div className="result">
          <span className={`pill pill-${result.verdict}`}>
            {result.verdict === "unknown" ? "Sin datos" : result.verdict === "green" ? "Confirmado" : result.verdict}
          </span>
          <p className="result-verdict">{verdictTitle(result)}</p>

          <div className="confidence-bar">
            <div
              className={`confidence-fill fill-${result.verdict}`}
              style={{ width: `${Math.round(result.evidence.confidence * 100)}%` }}
            />
          </div>
          <p className="meta">Confianza {Math.round(result.evidence.confidence * 100)}%</p>

          {mapCoords && (
            <OriginMap
              lat={mapCoords[0]}
              lng={mapCoords[1]}
              label={result.evidence.countryLabel || result.evidence.countryCode}
            />
          )}

          {result.detectedChain && (
            <div className="chain-block">
              <span className="chain-icon">🏬</span>
              <span>Se vende en {result.detectedChain}</span>
            </div>
          )}
          {result.foundInChains && result.foundInChains.length > 1 && (
            <p className="chain-tag">Tambien disponible en: {result.foundInChains.join(", ")}</p>
          )}

          <details className="details-block">
            <summary>Ver detalles</summary>
            <p className="meta">Fuente: {result.evidence.source}</p>
            {result.evidence.rawText && <p className="quote">{result.evidence.rawText}</p>}
          </details>

          <div className="result-actions">
            <button className="btn-secondary" onClick={handleShare}>
              {copied ? "Copiado" : "Compartir"}
            </button>
          </div>

          {!feedbackSent ? (
            <div className="feedback-row">
              <span className="meta">¿Es correcto este resultado?</span>
              <button className="btn-ghost" onClick={() => sendFeedback(true)}>Si</button>
              <button className="btn-ghost" onClick={() => sendFeedback(false)}>No</button>
            </div>
          ) : (
            <p className="meta">Gracias por tu confirmacion.</p>
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

      <div className="history">
        <div className="history-header">
          <p className="history-title">Historial reciente</p>
          {history.length > 0 && (
            <button className="btn-ghost" onClick={() => exportHistoryCsv(history)}>
              Exportar CSV
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="empty-state">Aun no has escaneado nada.</p>
        ) : (
          history.map((h) => (
            <button key={h.barcode + h.timestamp} className="history-item" onClick={() => loadFromHistory(h)}>
              <span>
                <span className="h-name">{h.productName}</span>
                <br />
                <span className="h-code">{h.barcode}{h.chain ? ` · ${h.chain}` : ""}</span>
              </span>
              <span className={`history-dot dot-${h.verdict}`} />
            </button>
          ))
        )}
      </div>

      <p className="disclaimer">Datos no oficiales, sin garantia. Verifica siempre la etiqueta del envase.</p>
    </main>
  );
}
