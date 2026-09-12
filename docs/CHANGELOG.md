# Changelog

## [0.6.1] - 2026-09-13
### Corregido (CRITICO)
- El scraper hacia fallback de busqueda de origen sobre el texto completo
  de la pagina cuando no encontraba el selector especifico de producto.
  Esto causo un caso real en produccion: un producto de Marruecos
  (Hacendado, Pinchos de Anchoa) fue marcado como "Origen: Espana" porque
  el texto se extrajo de contenido generico (no del producto) en la pagina
  de La Despensa. Eliminado el fallback: si no hay selector especifico, no
  se genera evidencia.
- La respuesta de cache en `/api/scan` devolvia las columnas planas de la
  base de datos en vez de un objeto `evidence` anidado, causando un crash
  total de la app ("Application error") en escaneos repetidos del mismo
  producto dentro de los 30 dias de cache.
- Se anadio manejo defensivo en el frontend: cualquier respuesta
  inesperada del backend ahora muestra un mensaje de error en vez de
  romper la aplicacion.
- Se elimino manualmente de la base de datos el dato incorrecto ya
  guardado para el codigo 8480000603203.

## [0.6.0] - 2026-09-12
Modo carro, feedback, CSV, mapa OSM, mejoras UX. Ver commits anteriores.
