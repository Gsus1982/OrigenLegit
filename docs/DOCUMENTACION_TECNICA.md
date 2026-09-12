# OrigenLegit — Documentacion tecnica completa

Guia para que cualquier desarrollador entienda, mantenga o replique el proyecto
desde cero: arquitectura, decisiones, problemas reales encontrados durante la
construccion y como levantarlo de nuevo.

## 1. Que hace la app

App web (PWA) que, dado un codigo de barras (escaneado con la camara o
escrito a mano), intenta determinar el **origen real** del producto,
priorizando la deteccion de procedencia marroqui o del Sahara Occidental,
sin fiarse nunca del prefijo del codigo de barras como prueba unica.

Combina 3 fuentes de datos (en cascada, de mas a menos fiable):

1. **Open Food Facts** — API publica y abierta.
2. **Scraping en paralelo de 8 cadenas de supermercado** (Mercadona,
   Carrefour, Dia, Consum, Alcampo, Eroski, Lidl, La Despensa).
3. **OCR sobre foto del envase**, cuando no hay dato en las dos anteriores.

Ademas detecta, de forma puramente informativa, en que cadena se vende el
producto (por marca blanca conocida o por el resultado del scraping), sin
que esto influya en el veredicto de origen.

## 2. Stack tecnologico y por que

| Pieza | Eleccion | Motivo |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React, PWA | El autor ya trabaja con Next.js; PWA evita pasar por revision de Apple/App Store para una app de uso personal/rapido |
| Backend | API Routes de Next.js (mismo proyecto) | Sin servidor separado que mantener |
| Base de datos | Postgres via Neon (serverless) | Ver problema #1 mas abajo: Supabase no era viable |
| Cliente DB | `pg` (node-postgres) puro | Sin dependencia de un SDK propietario; funciona igual con Neon, Vercel Postgres o cualquier Postgres |
| Hosting | Vercel | Despliegue serverless, gratis en plan Hobby |
| Control de versiones | GitHub | Historial completo en `Gsus1982/OrigenLegit` |
| Escaneo de codigo de barras | `@zxing/browser` | Libreria JS pura, funciona en Safari/iOS via `getUserMedia`, sin depender de la API `BarcodeDetector` (no soportada en Safari) |
| Scraping | `cheerio` (parseo de HTML) + `fetch` nativo | Ligero, sin necesidad de un navegador headless |

## 3. Arquitectura

```
Usuario (Safari iOS / navegador)
   |
   v
Next.js en Vercel
   |-- app/page.tsx ................... UI: camara, formulario, resultado
   |
   |-- app/api/scan/route.ts .......... orquesta:
   |     1) Open Food Facts (lib/sources/openFoodFacts.ts)
   |     2) deteccion de cadena por marca (lib/brandMap.ts)
   |     3) scraping en paralelo de 8 cadenas (lib/sources/supermarketScraper.ts)
   |     4) senal debil de prefijo GS1 (lib/originEngine.ts)
   |     -> motor de decision (lib/originEngine.ts) pondera todo
   |
   |-- app/api/ocr/route.ts ........... OCR sobre foto (Cloudflare Workers AI,
   |                                     opcional/placeholder)
   |
   v
Postgres (Neon) via lib/db.ts
   - products         (1 fila por codigo de barras)
   - product_origins  (historial de evidencias por fuente)
   - scans            (resultados de OCR)
   - product_verdicts (vista: veredicto vigente, mayor confianza)
```

## 4. Motor de decision (lo mas importante del proyecto)

Archivo: `lib/originEngine.ts`.

Cada fuente aporta una "evidencia" con un pais detectado y una confianza fija:

| Fuente | Confianza base | Justificacion |
|---|---|---|
| `scrape` | 0.90 | Texto legal leido directamente en la ficha de un supermercado |
| `openfoodfacts` | 0.85 | Dato verificado por la comunidad de OFF |
| `ocr` | 0.75 | Texto extraido de una foto, mas margen de error humano/tecnico |
| `barcode_prefix` | 0.25 (0.20 si sugiere Marruecos) | Señal debil: el prefijo GS1 solo dice donde esta registrada la empresa, no el origen del producto |

Regla de oro: **el prefijo de codigo de barras nunca puede producir un
veredicto "rojo" en solitario**. Esto es intencional: el mito de que "611 =
Marruecos" es falso (ver seccion de problemas).

## 5. Deteccion de cadena (separada del origen)

Archivo: `lib/brandMap.ts` + `lib/sources/supermarketScraper.ts`.

Es un dato **puramente informativo**: en que cadena se vende el producto.
Nunca entra en el calculo del veredicto de origen porque una cosa no implica
la otra (una lata de anchoas puede venderse en Mercadona y ser de origen
marroqui a la vez).

Se detecta de dos formas:
1. Por marca blanca conocida (Hacendado -> Mercadona, Consum -> Consum, etc.)
2. Por en que cadena el scraping encontro el producto.

## 6. Problemas reales encontrados durante la construccion

Esta seccion es la mas util para quien replique el proyecto: son bloqueos
reales, no hipoteticos.

### 6.1. Limite de proyectos gratuitos en Supabase
El plan original usaba Supabase, pero la cuenta del autor ya tenia 2
proyectos gratuitos activos (limite del plan free). En vez de pausar/borrar
proyectos existentes o pagar, se migro a **Neon** con un cliente `pg`
generico. Leccion: no asumas que Supabase esta disponible sin comprobar
cuota antes de diseñar el esquema.

### 6.2. Permisos de token en el conector de Vercel
El conector de Vercel usado por el asistente pudo *desplegar* archivos
(`deploy_to_vercel`) pero recibia `403 Forbidden` al intentar *leer o
gestionar* el proyecto (`get_project`, `get_deployment`, `create_git_project`
para vincular GitHub). El propio mensaje de error revelo el `teamId` real de
la cuenta personal (`team_bLU6ANXw3DsMZKT0sGeUhigR`), pero el token seguia
sin scope sobre el. Reconectar el conector no lo soluciono. Resultado
practico: **el repositorio de GitHub NO esta vinculado a Vercel para
auto-deploy en cada push**; cada cambio requiere un deploy manual de
archivos. Si esto se hereda, revisar los scopes del token de Vercel o
desplegar manualmente con `vercel --prod` desde la CLI del propio
desarrollador como alternativa mas fiable.

### 6.3. Vercel Authentication (proteccion por defecto)
El primer despliegue quedo bloqueado tras un login de Vercel (403 al acceder
sin sesion). Se resolvio en **Project Settings > Deployment Protection >
Vercel Authentication > Disabled para Production**. Sin este paso, la app
publica no es accesible para usuarios anonimos.

### 6.4. Variables de entorno no retroactivas
Anadir `DATABASE_URL` despues de un primer deploy no lo actualiza: Vercel
solo aplica variables nuevas a builds posteriores. Hay que forzar un
**Redeploy** (idealmente sin cache) tras anadir o cambiar variables.

### 6.5. El mito del prefijo de codigo de barras
Prefijo `611` = empresa registrada en GS1 Maroc, prefijo `84x` = GS1 España.
Esto **NO** indica el pais de fabricacion real: el caso documentado de las
anchoas Hacendado (fabricadas en Marruecos, codigo `848...` porque el
distribuidor esta registrado en España) lo demuestra. Por eso el motor de
decision nunca deja que esta señal decida en solitario.

### 6.6. Family Cash no tiene tienda online
Se pidio anadir Family Cash al escaneo automatico. Comprobado directamente
en `familycash.es`: la cadena **no tiene catalogo de productos consultable
online**, solo pedidos por telefono con recogida en tienda. No hay ficha de
producto que scrapear, asi que no se incluyo. Si algun dia abren tienda
online, se añade con el mismo patron que las demas cadenas.

### 6.7. Bug de clasificacion: paises "no previstos" (ej. Argentina)
**Detectado en produccion, pendiente de decision del usuario**: cuando el
scraping encuentra un origen real y claro que no es España, Marruecos ni
Sahara Occidental (por ejemplo "Origen: Argentina"), el motor lo clasifica
como `unknown` ("no verificable") en vez de reconocerlo como un origen valido
y distinto de Marruecos. Esto es confuso porque la confianza mostrada es alta
(90%) pero la etiqueta dice "sin datos". Ver propuesta de arreglo en el chat
asociado a este commit.

## 7. Variables de entorno

```
DATABASE_URL=       # cadena de conexion Postgres (Neon)
CF_ACCOUNT_ID=      # opcional, para OCR via Cloudflare Workers AI
CF_API_TOKEN=       # opcional, idem
```

Si `CF_ACCOUNT_ID`/`CF_API_TOKEN` no se configuran, el endpoint de OCR
simplemente no extrae texto (no rompe la app).

## 8. Como replicarlo desde cero

```bash
# 1. Clonar
git clone https://github.com/Gsus1982/OrigenLegit.git
cd OrigenLegit
npm install

# 2. Base de datos (Neon)
# Crear proyecto en neon.tech, copiar la connection string, y ejecutar
# el esquema (tablas products, product_origins, scans, vista
# product_verdicts) descrito en la seccion 3.

# 3. Variables locales
cp .env.example .env.local
# rellenar DATABASE_URL

# 4. Desarrollo local
npm run dev

# 5. Despliegue en Vercel
# Importar el repo desde el dashboard de Vercel (recomendado, evita el
# problema 6.2), configurar las mismas variables de entorno, y
# desactivar Vercel Authentication en Production (ver 6.3).
```

## 9. Limitaciones conocidas (leelo antes de confiar ciegamente en un veredicto)

- El scraping usa selectores CSS genericos que **no estan verificados contra
  el HTML real** de cada cadena (no hay acceso a red desde el entorno de
  desarrollo original). Hay que revisarlos y ajustarlos contra cada sitio
  real antes de confiar en resultados masivos.
- Sin acceso a internet durante el desarrollo, los endpoints de busqueda de
  Consum, Alcampo, Eroski, Lidl y La Despensa son el patron mas probable
  segun su estructura de URL publica, pero no estan probados en produccion
  uno a uno.
- El OCR es un placeholder (Cloudflare Workers AI); en produccion real
  conviene evaluar un modelo de OCR dedicado.
