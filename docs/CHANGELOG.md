# Changelog

## [0.2.0] - 2026-09-12
### Cambiado
- Backend migrado de Supabase a Postgres generico (Neon) via `DATABASE_URL`,
  para no tocar los 2 proyectos Supabase ya existentes del autor.
- OCR ya no persiste la imagen en un bucket; se procesa en memoria.

### Anadido
- `docs/DECISIONES.md` con el razonamiento del cambio de base de datos.

## [0.1.0] - 2026-09-12
### Anadido
- Estructura inicial Next.js (App Router) + TypeScript.
- Motor de decision `originEngine.ts`.
- Camino 1 (Open Food Facts), camino 2 (scraping), camino 3 (OCR).
- Interfaz de escaneo PWA.
- Documentacion inicial.
