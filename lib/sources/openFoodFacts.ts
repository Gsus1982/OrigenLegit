// lib/sources/openFoodFacts.ts
import { buildEvidence, Evidence } from "../originEngine";

interface OFFProduct {
  origins?: string;
  origins_tags?: string[];
  manufacturing_places?: string;
  countries?: string;
  product_name?: string;
  brands?: string;
}

export async function fetchFromOpenFoodFacts(barcode: string): Promise<Evidence | null> {
  const url = `https://es.openfoodfacts.org/api/v2/product/${barcode}.json?fields=origins,origins_tags,manufacturing_places,countries,product_name,brands`;

  const res = await fetch(url, { headers: { "User-Agent": "OrigenLegit/1.0 - contacto@tudominio.es" } });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1) return null;

  const p: OFFProduct = data.product;
  const combinedText = [p.origins, p.manufacturing_places, (p.origins_tags || []).join(" ")]
    .filter(Boolean)
    .join(" | ");

  if (!combinedText) return null;

  return buildEvidence("openfoodfacts", combinedText);
}
