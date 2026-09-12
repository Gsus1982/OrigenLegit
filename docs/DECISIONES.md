# Decisiones de diseno

## 1. Prefijo del codigo de barras
Los codigos 611 solo indican registro de la empresa en GS1 Maroc, no origen
real. Nunca produce un veredicto "rojo" en solitario.

## 2. PWA y no app nativa
Evita revision de Apple y coste de cuenta de desarrollador.

## 3. Postgres generico (Neon) en vez de Supabase
El autor ya tenia 2 proyectos Supabase activos en el limite del plan
gratuito. Se opto por Neon con un cliente `pg` estandar.

## 4. Cache de 30 dias
El origen no cambia cada dia; evita scraping excesivo.

## 5. Rojo vs naranja
Distincion entre origen marroqui y Sahara Occidental por la normativa de
etiquetado especifica desde octubre de 2025.

## 6. Por que no PythonAnywhere
Su plan gratuito restringe peticiones salientes a una lista blanca de
dominios.

## 7. Por que no se puede anadir Family Cash
Se comprobo directamente en familycash.es: la cadena no tiene tienda online
ni catalogo de productos consultable, solo permite pedidos por telefono con
recogida en tienda. Sin una ficha de producto web, no hay nada que scrapear.
Si en el futuro abren tienda online, se puede anadir siguiendo el mismo
patron que el resto de cadenas en `lib/sources/supermarketScraper.ts`.

## 8. Deteccion de cadena vs deteccion de origen
Son dos cosas distintas: la cadena donde se vende un producto no dice nada
sobre si es de origen marroqui. La deteccion de cadena es solo informativa
y nunca entra en el calculo del veredicto de origen.
