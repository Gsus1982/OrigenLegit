# Decisiones de diseno

## 1. Prefijo del codigo de barras
Los codigos 611 solo indican registro de la empresa en GS1 Maroc, no origen
real. Nunca produce un veredicto "rojo" en solitario.

## 2. PWA y no app nativa
Evita revision de Apple y coste de cuenta de desarrollador.

## 3. Postgres generico (Neon) en vez de Supabase
El autor ya tenia 2 proyectos Supabase activos en el limite del plan
gratuito. Se opto por Neon (conectado el 12/09/2026) con un cliente `pg`
estandar, sin usar ninguna API propietaria de Supabase.

## 4. Cache de 30 dias
El origen no cambia cada dia; evita scraping excesivo.

## 5. Rojo vs naranja
Desde octubre de 2025 hay normativa especifica para el etiquetado de
productos del Sahara Occidental bajo control aduanero marroqui: se
distinguen con colores distintos (rojo Marruecos, naranja Sahara).

## 6. Por que no PythonAnywhere
Su plan gratuito restringe peticiones salientes a una lista blanca de
dominios, lo que romperia las llamadas a Open Food Facts y a los
supermercados.

## Pendiente
- OCR real en produccion (placeholder Cloudflare Workers AI).
- Endpoint `/api/reverify` con Vercel Cron.
- Tests que avisen si el scraper deja de encontrar el origen.
