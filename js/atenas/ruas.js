// Ruas principais de Atenas (casas, pedras e oficinas ficam fora delas)
// a Via Panatenaica: do Dípilon, cortando a ágora na diagonal, até a rampa da Acrópole
export const PANATHENAIC = [[-482, -392], [-440, -352], [-395, -318], [-330, -268], [-270, -214], [-222, -150], [-205, -95], [-218, -40], [-240, -8], [-252, 4]];
export const STREETS = [
  PANATHENAIC,
  [[-300, -110], [-335, 40], [-360, 156]],
  [[-200, -95], [-130, 40], [-60, 180], [-60, 257]],
  [[-100, -110], [-100, -410]],
  [[80, -80], [200, -90], [318, -95]],
  [[22, 150], [-60, 200]],
  [[-150, 70], [-250, 120], [-360, 156]],
  [[140, -80], [172, 20], [150, 200]],
];
export function distToPolyline(x, z, pts) {
  let bd = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], ab = [b[0] - a[0], b[1] - a[1]], l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (z - a[1]) * ab[1]) / l2));
    bd = Math.min(bd, Math.hypot(x - (a[0] + ab[0] * t), z - (a[1] + ab[1] * t)));
  }
  return bd;
}
export const distToStreets = (x, z) => Math.min(...STREETS.map((s) => distToPolyline(x, z, s)));
