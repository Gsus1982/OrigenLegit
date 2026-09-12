// lib/sources/supermarketScraper.ts
import * as cheerio from "cheerio";
import { buildEvidence, Evidence } from "../originEngine";

type Supermarket = "mercadona" | "carrefour" | "dia";

const SEARCH_ENDPOINTS: Record<Supermarket, (q: string) => string> = {
  mercadona: (q) => `https://tienda.mercadona.es/api/search/?query=${encodeURIComponent(q)}`,
  carrefour: (q) => `https://www.carrefour.es/search?q=${encodeURIComponent(q)}`,
  dia: (q) => `https://www.dia.es/search?q=${encodeURIComponent(q)}`,
};

const ORIGIN_LINE_REGEX = /(origen|elaborado en|envasado en|pa[ii]s de origen)[:\s]+([^.\n|]+)/i;

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OrigenLegit/1.0 (+https://tudominio.es/bot-info)", "Accept-Language": "es-ES" },
  });
  if (!res.ok) throw new Error(`Fetch fallido: ${res.status}`);
  return res.text();
}

export async function scrapeSupermarket(supermarket: Supermarket, productName: string): Promise<Evidence | null> {
  const url = SEARCH_ENDPOINTS[supermarket](productName);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const candidateText = $("[data-testid='product-description'], .product-description, .ficha-producto, .pdp-description").text().trim();
  const fullText = candidateText || $("body").text();
  const match = fullText.match(ORIGIN_LINE_REGEX);
  if (!match) return null;

  const originPhrase = `${match[1]}: ${match[2]}`.trim();
  return buildEvidence("scrape", originPhrase);
}
