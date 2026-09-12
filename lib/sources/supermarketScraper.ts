// lib/sources/supermarketScraper.ts
// Escaneo automatico de varias cadenas: se prueban todas y se usa la primera
// que encuentre una mencion de origen. No requiere que el usuario elija cadena.
//
// Family Cash queda fuera: no tiene tienda online ni fichas de producto
// consultables, solo pedido telefonico (comprobado en su web oficial).

import * as cheerio from "cheerio";
import { buildEvidence, Evidence } from "../originEngine";

export interface ChainConfig {
  id: string;
  label: string;
  searchUrl: (q: string) => string;
}

export const SUPERMARKETS: ChainConfig[] = [
  { id: "mercadona", label: "Mercadona", searchUrl: (q) => `https://tienda.mercadona.es/api/search/?query=${encodeURIComponent(q)}` },
  { id: "carrefour", label: "Carrefour", searchUrl: (q) => `https://www.carrefour.es/search?q=${encodeURIComponent(q)}` },
  { id: "dia", label: "Dia", searchUrl: (q) => `https://www.dia.es/search?q=${encodeURIComponent(q)}` },
  { id: "consum", label: "Consum", searchUrl: (q) => `https://tienda.consum.es/es/search?text=${encodeURIComponent(q)}` },
  { id: "alcampo", label: "Alcampo", searchUrl: (q) => `https://www.compraonline.alcampo.es/busqueda/search?text=${encodeURIComponent(q)}` },
  { id: "eroski", label: "Eroski", searchUrl: (q) => `https://tienda.eroski.es/search/?text=${encodeURIComponent(q)}` },
  { id: "lidl", label: "Lidl", searchUrl: (q) => `https://www.lidl.es/q/search?query=${encodeURIComponent(q)}` },
  { id: "ladespensa", label: "La Despensa", searchUrl: (q) => `https://www.despensa.es/search?q=${encodeURIComponent(q)}` },
];

const ORIGIN_LINE_REGEX = /(origen|elaborado en|envasado en|pa[ii]s de origen)[:\s]+([^.\n|]+)/i;

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OrigenLegit/1.0 (+https://tudominio.es/bot-info)", "Accept-Language": "es-ES" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Fetch fallido: ${res.status}`);
  return res.text();
}

async function scrapeOne(chain: ChainConfig, productName: string): Promise<{ chain: ChainConfig; evidence: Evidence } | null> {
  const html = await fetchHtml(chain.searchUrl(productName));
  const $ = cheerio.load(html);
  const candidateText = $(
    "[data-testid='product-description'], .product-description, .ficha-producto, .pdp-description"
  )
    .text()
    .trim();
  const fullText = candidateText || $("body").text();
  const match = fullText.match(ORIGIN_LINE_REGEX);
  if (!match) return null;
  const originPhrase = `${match[1]}: ${match[2]}`.trim();
  return { chain, evidence: buildEvidence("scrape", originPhrase) };
}

export async function scrapeAllSupermarkets(
  productName: string
): Promise<{ best: { chain: ChainConfig; evidence: Evidence } | null; foundIn: ChainConfig[] }> {
  const results = await Promise.allSettled(SUPERMARKETS.map((chain) => scrapeOne(chain, productName)));

  const hits = results
    .map((r) => (r.status === "fulfilled" && r.value ? r.value : null))
    .filter((r): r is { chain: ChainConfig; evidence: Evidence } => r !== null);

  if (hits.length === 0) return { best: null, foundIn: [] };

  const best = [...hits].sort((a, b) => b.evidence.confidence - a.evidence.confidence)[0];
  return { best, foundIn: hits.map((h) => h.chain) };
}
