// lib/brandMap.ts
// Deteccion de cadena a partir de marcas blancas conocidas (dato informativo,
// no se usa para decidir el origen del producto).

export const BRAND_TO_CHAIN: Record<string, string> = {
  "hacendado": "Mercadona",
  "deliplus": "Mercadona",
  "bosque verde": "Mercadona",
  "carrefour": "Carrefour",
  "carrefour bio": "Carrefour",
  "carrefour seleccion": "Carrefour",
  "dia": "Dia",
  "baresa": "Dia",
  "delicious": "Dia",
  "consum": "Consum",
  "vitality": "Consum",
  "consum kids": "Consum",
  "kyrey": "Consum",
  "auchan": "Alcampo",
  "alcampo": "Alcampo",
  "producto blanco": "Alcampo",
  "eroski": "Eroski",
  "eroski basic": "Eroski",
  "sannia": "Eroski",
  "milbona": "Lidl",
  "pilos": "Lidl",
  "cien": "Lidl",
  "freeway": "Lidl",
  "alesto": "Lidl",
  "vitasia": "Lidl",
  "ecofamilia": "La Despensa",
};

export function detectChainFromBrand(brandsRaw: string | undefined | null): string | null {
  if (!brandsRaw) return null;
  const brands = brandsRaw
    .toLowerCase()
    .split(",")
    .map((b) => b.trim());

  for (const brand of brands) {
    if (BRAND_TO_CHAIN[brand]) return BRAND_TO_CHAIN[brand];
    for (const key of Object.keys(BRAND_TO_CHAIN)) {
      if (brand.includes(key)) return BRAND_TO_CHAIN[key];
    }
  }
  return null;
}
