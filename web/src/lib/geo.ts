const RAIO_TERRA_METROS = 6371000;

/** Distância entre duas coordenadas em metros (fórmula de haversine). */
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (graus: number) => (graus * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RAIO_TERRA_METROS * c;
}
