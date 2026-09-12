# Changelog

## [0.5.0] - 2026-09-12
### Corregido
- Bug critico: origenes reales detectados con alta confianza que no eran
  Espana, Marruecos ni Sahara Occidental (ej. "Origen: Argentina") se
  clasificaban como "no verificable". Ahora se reconocen como origen
  confirmado (verde) y se muestra el pais real detectado.

### Anadido
- Historial local de escaneos (ultimos 20, guardado en el propio navegador,
  sin backend adicional). Permite volver a consultar sin re-escanear.
- Boton "Compartir" en el resultado (Web Share API con fallback a copiar
  al portapapeles).
- Mensaje de progreso real durante la comprobacion ("Consultando 8
  supermercados en paralelo...") en vez de un generico "Comprobando...".
- Modo oscuro automatico via `prefers-color-scheme`, con la misma paleta
  plana (sin gradientes).
- Icono de la PWA (`public/icon.svg`) para sustituir la captura generica en
  la pantalla de inicio.

## [0.4.0] - 2026-09-12
### Anadido
- Deteccion automatica de cadena: se prueban Mercadona, Carrefour, Dia, Consum,
  Alcampo, Eroski, Lidl y La Despensa en paralelo, sin que el usuario elija
  cadena manualmente.
- Deteccion de cadena por marca blanca conocida (`lib/brandMap.ts`), ej.
  Hacendado -> Mercadona, Consum -> Consum, Milbona -> Lidl, etc.
- Chip "Detectado en X" y "Tambien disponible en: ..." en el resultado.

### Cambiado
- Rediseno completo de la interfaz: tipografia de sistema, colores planos,
  sin degradados ni tarjetas oscuras. Eliminado el selector manual de
  supermercado.
- `app/api/scan` ya no requiere el parametro `supermarket`; lo detecta solo.

### Eliminado
- Family Cash no se incluye en el escaneo automatico: no tiene tienda online
  ni fichas de producto consultables (solo pedidos por telefono, verificado
  en familycash.es), por lo que no hay nada que scrapear.

## [0.3.1] - 2026-09-12
### Corregido
- `needsPhoto` se activa tambien cuando la unica evidencia es debil, no solo
  cuando no hay ninguna.

## [0.3.0] - 2026-09-12
### Anadido
- Escaneo de codigos de barras con la camara del movil.

## [0.2.0] - 2026-09-12
### Cambiado
- Backend migrado de Supabase a Postgres generico (Neon).

## [0.1.0] - 2026-09-12
### Anadido
- Estructura inicial del proyecto.
