// app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { fetchFromOpenFoodFacts } from "@/lib/sources/openFoodFacts";
import { scrapeSupermarket } from "@/lib/sources/supermarketScraper";
import { resolveVerdict, gs1PrefixHint, Evidence } from "@/lib/originEngine";

function toVerdict(countryCode: string, confidence: number): string {
  if (confidence === 0) return "unknown";
  if (countryCode === "MA") return "red";
  if (countryCode === "EH") return "orange";
  if (countryCode === "ES") return "green";
  return "unknown";
}

export async function POST(req: NextRequest) {
  const { barcode, productName, supermarket } = await req.json();
  if (!barcode) {
    return NextResponse.json({ error: "Falta el codigo de barras" }, { status: 400 });
  }

  const pool = getPool();

  const cachedRes = await pool.query(`select * from product_verdicts where barcode = $1 limit 1`, [barcode]);
  const cached = cachedRes.rows[0];
  const cacheIsFresh = cached && Date.now() - new Date(cached.evidence_at).getTime() < 30 * 24 * 60 * 60 * 1000;

  if (cacheIsFresh) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  const evidences: Evidence[] = [];

  const offEvidence = await fetchFromOpenFoodFacts(barcode).catch(() => null);
  if (offEvidence) evidences.push(offEvidence);

  if ((!offEvidence || offEvidence.confidence < 0.8) && productName && supermarket) {
    const scraped = await scrapeSupermarket(supermarket, productName).catch(() => null);
    if (scraped) evidences.push(scraped);
  }

  const hint = gs1PrefixHint(barcode);
  if (hint) {
    evidences.push({ source: "barcode_prefix", rawText: hint, countryCode: "UNKNOWN", confidence: 0.1 });
  }

  const finalEvidence = resolveVerdict(evidences);

  const productRes = await pool.query(
    `insert into products (barcode, name, supermarket)
     values ($1, $2, $3)
     on conflict (barcode) do update set name = excluded.name, supermarket = excluded.supermarket, last_checked_at = now()
     returning id`,
    [barcode, productName ?? null, supermarket ?? null]
  );
  const productId = productRes.rows[0].id;

  for (const e of evidences) {
    await pool.query(
      `insert into product_origins (product_id, source, raw_text, country_code, confidence, verdict)
       values ($1, $2, $3, $4, $5, $6)`,
      [productId, e.source, e.rawText, e.countryCode, e.confidence, toVerdict(e.countryCode, e.confidence)]
    );
  }

  return NextResponse.json({
    barcode,
    verdict: toVerdict(finalEvidence.countryCode, finalEvidence.confidence),
    evidence: finalEvidence,
    needsPhoto: evidences.length === 0,
    fromCache: false,
  });
}
