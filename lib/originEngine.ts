// lib/originEngine.ts
// Motor de decision: combina las fuentes y calcula un veredicto ponderado.
// El prefijo de codigo de barras NUNCA decide por si solo un "rojo".
//
// v0.6.2: se separa "structured" (datos JSON-LD de la propia ficha de
// producto) de "scrape" (texto libre por selectores CSS, menos fiable).
// La confianza de "scrape" se rebaja de 0.9 a 0.6 hasta que los selectores
// de cada cadena esten verificados manualmente contra el HTML real.

export type Source = "openfoodfacts" | "structured" | "scrape" | "ocr" | "barcode_prefix";
export type Verdict = "red" | "orange" | "green" | "unknown";

export interface Evidence {
  source: Source;
  rawText: string;
  countryCode: string;
  countryLabel?: string;
  confidence: number;
}

const MOROCCO_REGEX = /marruecos|maroc|morocco|\bma\b/i;
const SAHARA_REGEX = /sahara occidental|western sahara|\beh\b|dakhla|laayoune|el aai[uu]n/i;
const SPAIN_REGEX = /espa[nn]a|spain|\bes\b/i;
const GENERIC_COUNTRY_REGEX = /(?:origen|elaborado en|envasado en|pa[ii]s de origen|country of origin)[:\s]+([a-zA-ZÀ-ÿ\s]{3,40})/i;

const SOURCE_BASE_CONFIDENCE: Record<Source, number> = {
  scrape: 0.6,
  structured: 0.8,
  openfoodfacts: 0.85,
  ocr: 0.75,
  barcode_prefix: 0.25,
};

export function classifyText(text: string): { countryCode: string; countryLabel?: string; verdict: Verdict } {
  if (!text) return { countryCode: "UNKNOWN", verdict: "unknown" };
  if (SAHARA_REGEX.test(text)) return { countryCode: "EH", verdict: "orange" };
  if (MOROCCO_REGEX.test(text)) return { countryCode: "MA", verdict: "red" };
  if (SPAIN_REGEX.test(text)) return { countryCode: "ES", verdict: "green" };

  const match = text.match(GENERIC_COUNTRY_REGEX);
  const countryLabel = match ? match[1].trim() : undefined;
  return { countryCode: "OTHER", countryLabel, verdict: "green" };
}

export function buildEvidence(source: Source, rawText: string): Evidence {
  const { countryCode, countryLabel, verdict } = classifyText(rawText);
  const confidence = SOURCE_BASE_CONFIDENCE[source];

  if ((source === "barcode_prefix" || source === "scrape") && verdict === "red") {
    return { source, rawText, countryCode, confidence: source === "barcode_prefix" ? 0.2 : confidence };
  }
  return { source, rawText, countryCode, countryLabel, confidence };
}

export function resolveVerdict(evidences: Evidence[]): Evidence {
  if (evidences.length === 0) {
    return { source: "openfoodfacts", rawText: "", countryCode: "UNKNOWN", confidence: 0 };
  }
  return [...evidences].sort((a, b) => b.confidence - a.confidence)[0];
}

export function gs1PrefixHint(barcode: string): string | null {
  if (!barcode) return null;
  const p3 = barcode.slice(0, 3);
  if (p3 >= "608" && p3 <= "611") return "Empresa registrada en GS1 Maroc (no implica origen del producto)";
  if (p3 >= "840" && p3 <= "849") return "Empresa registrada en GS1 Espana (no implica origen del producto)";
  return null;
}
