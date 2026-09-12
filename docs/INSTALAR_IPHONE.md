# Instalar OrigenLegit como app en iPhone (PWA)

OrigenLegit no esta en la App Store: se instala directamente desde Safari
como una "Progressive Web App" (PWA). Ocupa un icono en tu pantalla de
inicio igual que cualquier app y se abre a pantalla completa, sin la barra
de Safari.

## Pasos

1. Abre **Safari** en el iPhone (tiene que ser Safari, no Chrome ni otro
   navegador; en iOS solo Safari puede instalar PWAs).
2. Ve a `https://origenlegit.vercel.app`.
3. Toca el icono de **Compartir** (el cuadrado con la flecha hacia arriba,
   en la barra inferior de Safari).
4. Desplazate hacia abajo en el menu y toca **"Anadir a pantalla de inicio"**
   ("Add to Home Screen").
5. Puedes editar el nombre que aparecera bajo el icono (por defecto
   "OrigenLegit") y luego tocar **"Anadir"** arriba a la derecha.
6. Ya tienes el icono en tu pantalla de inicio. Al abrirlo, la app funciona
   a pantalla completa, sin la interfaz de Safari.

## Permiso de camara la primera vez

La primera vez que toques "Escanear con la camara" dentro de la app, iOS te
pedira permiso para usar la camara. Debes tocar **"Permitir"**. Si lo
rechazas por error, puedes reactivarlo en:

`Ajustes (iOS) > Safari > Camara y Microfono > Permitir`

o, si ya la instalaste como app en pantalla de inicio:

`Ajustes (iOS) > OrigenLegit > Camara`

## Notas

- El escaneo de codigos de barras usa la camara trasera del telefono
  (`facingMode: environment`) y funciona igual dentro de Safari o ya
  instalada como icono en pantalla de inicio.
- Si el icono de pantalla de inicio aparece generico (una captura de la
  pagina en vez de un logo), es porque aun no se han subido los ficheros
  `icon-192.png` e `icon-512.png` a `public/`. La app funciona igual, es
  solo estetico.
