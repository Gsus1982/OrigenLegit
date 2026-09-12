# Changelog

## [0.6.0] - 2026-09-12
### Anadido
- Modo carro: escaneo continuo con reapertura automatica de la camara y
  resumen en vivo (recuento rojo/naranja/verde/sin datos) de la sesion.
- Feedback rapido "Es correcto?" (Si/No) por resultado, guardado en la nueva
  tabla `feedback` de la base de datos.
- Exportar historial a CSV.
- Aviso de "fruta o verdura fresca" con nota sobre el etiquetado obligatorio
  de origen en frescos.
- Vibracion corta al detectar un codigo de barras con la camara.
- Mapa de contexto (OpenStreetMap via Leaflet) mostrando el pais detectado,
  cargado de forma perezosa (dynamic import) solo cuando hay coordenadas
  conocidas, sin afectar el tiempo de carga inicial.
- Barra de confianza visual bajo el veredicto.
- Seccion "Ver detalles" plegable.
- Bloque separado visualmente para la cadena donde se vende el producto.
- Estado vacio para el historial.
- Aviso legal fijo al pie de la app.

### Cambiado
- El titulo del veredicto tiene mas peso tipografico.

## [0.5.0] - 2026-09-12
### Corregido
- Bug critico de clasificacion de paises no previstos.
### Anadido
- Historial local, boton compartir, modo oscuro, icono PWA.

## [0.4.0] - 2026-09-12
### Anadido
- Deteccion automatica de cadena (8 supermercados en paralelo).

## [0.3.1] / [0.3.0] / [0.2.0] / [0.1.0]
Ver commits anteriores para el detalle.
