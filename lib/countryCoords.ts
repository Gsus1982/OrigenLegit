// lib/countryCoords.ts
// Coordenadas aproximadas para mostrar un mapa de contexto (OpenStreetMap).
// Solo se usa como referencia visual, nunca para decidir el origen.

export const COUNTRY_COORDS: Record<string, [number, number]> = {
  MA: [31.7, -7.09],
  EH: [24.5, -13.0],
  ES: [40.4, -3.7],
  argentina: [-38.4, -63.6],
  francia: [46.6, 2.2],
  italia: [41.9, 12.5],
  portugal: [39.4, -8.2],
  peru: [-9.2, -75.0],
  chile: [-35.7, -71.5],
  mexico: [23.6, -102.5],
  turquia: [38.9, 35.2],
  china: [35.9, 104.2],
  india: [20.6, 79.0],
  brasil: [-14.2, -51.9],
  "costa de marfil": [7.5, -5.5],
  ecuador: [-1.8, -78.2],
  colombia: [4.6, -74.1],
  "estados unidos": [37.1, -95.7],
  holanda: [52.1, 5.3],
  paises: [52.1, 5.3],
  belgica: [50.5, 4.5],
  alemania: [51.2, 10.5],
  grecia: [39.1, 21.8],
  egipto: [26.8, 30.8],
  tunez: [33.9, 9.5],
};

export function coordsFor(countryCode: string, countryLabel?: string): [number, number] | null {
  if (countryCode === "MA" || countryCode === "EH" || countryCode === "ES") {
    return COUNTRY_COORDS[countryCode];
  }
  if (countryLabel) {
    const key = countryLabel.toLowerCase().trim();
    for (const k of Object.keys(COUNTRY_COORDS)) {
      if (key.includes(k)) return COUNTRY_COORDS[k];
    }
  }
  return null;
}
