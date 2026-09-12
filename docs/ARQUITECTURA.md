# Arquitectura de OrigenLegit

## Vision general
```
Usuario (PWA iOS/web)
   v
Next.js (Vercel) -- app/api/scan --> Open Food Facts API (camino 1)
   |                    |----------> Scraper supermercado (camino 2)
   +-- app/api/ocr -----------------> OCR sobre foto (camino 3)
   v
Postgres (Neon) via lib/db.ts: products, product_origins, scans
```

## Componentes
- **Frontend** (`app/page.tsx`): formulario de escaneo, PWA instalable en iOS.
- **Camino 1** (`lib/sources/openFoodFacts.ts`): API publica de Open Food Facts.
- **Camino 2** (`lib/sources/supermarketScraper.ts`): scraping de la ficha del
  supermercado, extraccion por regex del texto legal de origen.
- **Camino 3** (`app/api/ocr/route.ts`): OCR sobre foto del envase.
- **Motor de decision** (`lib/originEngine.ts`): pondera cada fuente
  (scrape 0.90, openfoodfacts 0.85, ocr 0.75, barcode_prefix 0.25 max) y
  nunca decide "rojo" solo por el prefijo del codigo de barras.
- **Base de datos** (`lib/db.ts` + `db/schema.sql`): Postgres estandar via
  `DATABASE_URL`, compatible con Neon.

## Cache
30 dias por producto para minimizar peticiones a los supermercados.
