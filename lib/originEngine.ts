// lib/originEngine.ts
// Motor de decision: combina las 3 fuentes y calcula un veredicto ponderado.
// El prefijo de codigo de barras NUNCA decide por si solo un "rojo".

export type Source = "openfoodfacts" | "scrape" | "ocr" | "barcode_prefix";
export type Verdict = "red" | "orange" | "green" | "unknown";

export interface Evidence {
  source: Source;
  rawText: string;
  countryCode: string;
  confidence: number;
}

const MOROCCO_REGEX = /marruecos|maroc|morocco|\bma\b/i;
const SAHARA_REGEX = /sahara occidental|western sahara|\beh\b|dakhla|laayoune|el aai[uu]n/i;
const SPAIN_REGEX = /espa[nn]a|spain|\bes\b/i;

const SOURCE_BASE_CONFIDENCE: Record<Source, number> = {
  scrape: 0.9,
  openfoodfacts: 0.85,
  ocr: 0.75,
  barcode_prefix: 0.25,
};

export function classifyText(text: string): { countryCode: string; verdict: Verdict } {
  if (!text) return { countryCode: "UNKNOWN", verdict: "unknown" };
  if (SAHARA_REGEX.test(text)) return { countryCode: "EH", verdict: "orange" };
  if (MOROCCO_REGEX.test(text)) return { countryCode: "MA", verdict: "red" };
  if (SPAIN_REGEX.test(text)) return { countryCode: "ES", verdict: "green" };
  return { countryCode: "UNKNOWN", verdict: "unknown" };
}

export function buildEvidence(source: Source, rawText: string): Evidence {
  const { countryCode, verdict } = classifyText(rawText);
  const confidence = SOURCE_BASE_CONFIDENCE[source];

  if (source === "barcode_prefix" && verdict === "red") {
    return { source, rawText, countryCode, confidence: 0.2 };
  }
  return { source, rawText, countryCode, confidence };
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
