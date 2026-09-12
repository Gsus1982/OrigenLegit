# OrigenLegit

App web (PWA instalable en iOS) para comprobar el origen real de productos de
supermercado en Espana, con foco en detectar procedencia marroqui o del Sahara
Occidental, combinando 3 fuentes de datos.

> v0.2.0: el backend usa Postgres generico via `DATABASE_URL` (Neon), no
> Supabase. Ver docs/DECISIONES.md.

## Como funciona

1. **Open Food Facts** (API abierta): primera consulta por codigo de barras.
2. **Scraping dirigido**: si no hay dato, se lee el texto legal de origen en
   la ficha del supermercado (Mercadona/Carrefour/Dia).
3. **OCR sobre foto**: si tampoco hay dato online, el usuario fotografia el
   reverso del envase y se extrae el texto de origen automaticamente.

El motor de decision (`lib/originEngine.ts`) pondera cada fuente por
confianza y nunca marca "Marruecos" solo por el prefijo del codigo de barras.

## Estructura

```
app/page.tsx                        interfaz de escaneo (cliente)
app/api/scan/route.ts               orquesta caminos 1 y 2
app/api/ocr/route.ts                camino 3 (OCR)
lib/db.ts                           cliente Postgres generico (Neon)
lib/originEngine.ts                 motor de decision
lib/sources/openFoodFacts.ts        cliente de Open Food Facts
lib/sources/supermarketScraper.ts   scraper por supermercado
db/schema.sql                       esquema de base de datos
docs/                                documentacion del proyecto
```

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Documentacion
- [Arquitectura](docs/ARQUITECTURA.md)
- [Decisiones de diseno](docs/DECISIONES.md)
- [Despliegue](docs/DESPLIEGUE.md)
- [Changelog](docs/CHANGELOG.md)
