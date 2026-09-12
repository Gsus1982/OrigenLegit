// app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { fetchFromOpenFoodFacts } from "@/lib/sources/openFoodFacts";
import { scrapeAllSupermarkets } from "@/lib/sources/supermarketScraper";
import { resolveVerdict, gs1PrefixHint, Evidence } from "@/lib/originEngine";
import { detectChainFromBrand } from "@/lib/brandMap";

function toVerdict(countryCode: string, confidence: number): string {
  if (confidence === 0) return "unknown";
  if (countryCode === "MA") return "red";
  if (countryCode === "EH") return "orange";
  if (countryCode === "ES") return "green";
  return "unknown";
}

export async function POST(req: NextRequest) {
  const { barcode, productName } = await req.json();
  if (!barcode) {
    return NextResponse.json({ error: "Falta el codigo de barras" }, { status: 400 });
  }

  const pool = getPool();

  const cachedRes = await pool.query(`select * from product_verdicts where barcode = $1 limit 1`, [barcode]);
  const cached = cachedRes.rows[0];
  const cacheIsFresh = cached && Date.now() - new Date(cached.evidence_at).getTime() < 30 * 24 * 60 * 60 * 1000;

  const evidences: Evidence[] = [];
  let detectedChain: string | null = null;
  let searchName = productName as string | undefined;

  const offEvidence = await fetchFromOpenFoodFacts(barcode).catch(() => null);
  if (offEvidence) evidences.push(offEvidence);

  const offRes = await fetch(
    `https://es.openfoodfacts.org/api/v2/product/${barcode}.json?fields=brands,product_name`
  ).catch(() => null);
  if (offRes && offRes.ok) {
    const offData = await offRes.json().catch(() => null);
    if (offData?.status === 1) {
      detectedChain = detectChainFromBrand(offData.product?.brands);
      if (!searchName) searchName = offData.product?.product_name;
    }
  }

  let foundInChains: string[] = [];
  if (cacheIsFresh && cached.confidence >= 0.5) {
    return NextResponse.json({ ...cached, fromCache: true, needsPhoto: false, detectedChain, foundInChains });
  }

  if ((!offEvidence || offEvidence.confidence < 0.8) && searchName) {
    const { best, foundIn } = await scrapeAllSupermarkets(searchName).catch(() => ({ best: null, foundIn: [] }));
    foundInChains = foundIn.map((c) => c.label);
    if (best) {
      evidences.push(best.evidence);
      if (!detectedChain) detectedChain = best.chain.label;
    }
  }

  const hint = gs1PrefixHint(barcode);
  if (hint) {
    evidences.push({ source: "barcode_prefix", rawText: hint, countryCode: "UNKNOWN", confidence: 0.1 });
  }

  const finalEvidence = resolveVerdict(evidences);

  const productRes = await pool.query(
    `insert into products (barcode, name, supermarket) values ($1, $2, $3) on conflict (barcode) do update set name = excluded.name, supermarket = excluded.supermarket, last_checked_at = now() returning id`,
    [barcode, searchName ?? null, detectedChain ?? null]
  );
  const productId = productRes.rows[0].id;

  for (const e of evidences) {
    await pool.query(
      `insert into product_origins (product_id, source, raw_text, country_code, confidence, verdict) values ($1, $2, $3, $4, $5, $6)`,
      [productId, e.source, e.rawText, e.countryCode, e.confidence, toVerdict(e.countryCode, e.confidence)]
    );
  }

  return NextResponse.json({
    barcode,
    verdict: toVerdict(finalEvidence.countryCode, finalEvidence.confidence),
    evidence: finalEvidence,
    needsPhoto: finalEvidence.confidence < 0.5,
    fromCache: false,
    detectedChain,
    foundInChains,
  });
}
