# Changelog

## [0.3.0] - 2026-09-12
### Anadido
- Escaneo de codigos de barras con la camara del movil (libreria @zxing/browser),
  compatible con Safari/iOS tanto en el navegador como instalada como PWA.
- Guia `docs/INSTALAR_IPHONE.md` con el paso a paso para anadir la app a la
  pantalla de inicio en iPhone y activar el permiso de camara.

### Cambiado
- `app/page.tsx`: nuevo boton "Escanear con la camara" que abre un stream de
  video, detecta el codigo automaticamente y lanza la comprobacion de origen.

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
