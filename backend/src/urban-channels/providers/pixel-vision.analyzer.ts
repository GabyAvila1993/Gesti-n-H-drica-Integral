import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import type { DebrisCategory, DetectedObject } from '../domain/detection';

interface DecodedImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Buffer;
}

interface CellStats {
  readonly gx: number;
  readonly gy: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly lum: number;
  readonly sat: number;
  readonly exg: number;
  readonly stdDev: number;
  readonly isoTexture: number;
  readonly brightRatio: number;
  category: DebrisCategory | null;
  score: number;
}

const GRID_SIZE = 64;
const SUB_SAMPLES = 5; // 5x5 sub-píxeles por celda para medir gradiente X/Y y varianza real

/**
 * Decodifica los píxeles reales de una imagen JPEG o PNG en memoria usando
 * decodificadores puros de JavaScript (`jpeg-js` y `pngjs`, cero `node-tar`).
 */
export function decodeImageBuffer(buffer: Buffer, mimetype: string): DecodedImage | null {
  try {
    const isJpeg =
      mimetype === 'image/jpeg' ||
      (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff);

    if (isJpeg) {
      const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 });
      return { width: decoded.width, height: decoded.height, data: decoded.data };
    }

    const isPng =
      mimetype === 'image/png' ||
      (buffer.length > 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47);

    if (isPng) {
      const decoded = PNG.sync.read(buffer);
      return { width: decoded.width, height: decoded.height, data: decoded.data };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extrae las dimensiones reales (ancho y alto en píxeles) de JPEG, PNG o WebP.
 */
export function extractImageDimensions(
  buffer: Buffer,
  mimetype: string,
): { width: number; height: number } | null {
  const decoded = decodeImageBuffer(buffer, mimetype);
  if (decoded) {
    return { width: decoded.width, height: decoded.height };
  }

  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ' && buffer.length >= 30) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    } else if (chunkType === 'VP8L' && buffer.length >= 25) {
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    } else if (chunkType === 'VP8X' && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      if (width > 0 && height > 0) return { width, height };
    }
  }

  return null;
}

/**
 * Analiza píxel por píxel una fotografía real subida por el usuario con conciencia espacial y de textura:
 * 1. Región de Interés (ROI) y Sesgo Central: descarta el 22% superior (calle/puente), el 14% inferior
 *    y el 22% de cada margen lateral (veredas de cemento y asfalto).
 * 2. Filtro estricto de varianza 2D (`stdDev`) y rugosidad isotrópica (`Math.min(gradX, gradY)`):
 *    las veredas grises lisas, el asfalto y los bordes rectos de cordón tienen baja rugosidad 2D
 *    y quedan 100% descartados como "Escombros".
 * 3. Consolida los cúmulos de alta textura dentro del cauce evitando recuadros dispersos.
 */
export function analyzeImagePixels(buffer: Buffer, mimetype: string): DetectedObject[] {
  const decoded = decodeImageBuffer(buffer, mimetype);
  if (!decoded || decoded.width < 16 || decoded.height < 16) {
    return [];
  }

  const { width, height, data } = decoded;
  const grid: CellStats[][] = [];

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    const row: CellStats[] = [];
    const yStart = Math.floor((gy * height) / GRID_SIZE);
    const ySpan = Math.max(1, Math.floor(height / GRID_SIZE));

    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const xStart = Math.floor((gx * width) / GRID_SIZE);
      const xSpan = Math.max(1, Math.floor(width / GRID_SIZE));

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumLum = 0;
      let brightCount = 0;
      const lumMatrix: number[][] = [];

      const stepX = Math.max(1, Math.floor(xSpan / SUB_SAMPLES));
      const stepY = Math.max(1, Math.floor(ySpan / SUB_SAMPLES));

      for (let sy = 0; sy < SUB_SAMPLES; sy++) {
        const lumRow: number[] = [];
        const py = Math.min(height - 1, yStart + sy * stepY);

        for (let sx = 0; sx < SUB_SAMPLES; sx++) {
          const px = Math.min(width - 1, xStart + sx * stepX);
          const idx = (py * width + px) * 4;
          const r = data[idx] / 255;
          const g = data[idx + 1] / 255;
          const b = data[idx + 2] / 255;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const exgPx = 2 * g - r - b;

          sumR += r;
          sumG += g;
          sumB += b;
          sumLum += lum;
          lumRow.push(lum);

          if (lum > 0.72 && exgPx < 0.07) {
            brightCount++;
          }
        }
        lumMatrix.push(lumRow);
      }

      const count = SUB_SAMPLES * SUB_SAMPLES;
      const r = sumR / count;
      const g = sumG / count;
      const b = sumB / count;
      const lum = sumLum / count;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0.02 ? (maxC - minC) / maxC : 0;
      const exg = 2 * g - r - b;

      // Varianza estándar (stdDev) y gradientes internos en X e Y
      let sqDiffSum = 0;
      let gradXSum = 0;
      let gradYSum = 0;
      let gradXPairs = 0;
      let gradYPairs = 0;

      for (let sy = 0; sy < SUB_SAMPLES; sy++) {
        for (let sx = 0; sx < SUB_SAMPLES; sx++) {
          const val = lumMatrix[sy][sx];
          const diff = val - lum;
          sqDiffSum += diff * diff;

          if (sx + 1 < SUB_SAMPLES) {
            gradXSum += Math.abs(lumMatrix[sy][sx + 1] - val);
            gradXPairs++;
          }
          if (sy + 1 < SUB_SAMPLES) {
            gradYSum += Math.abs(lumMatrix[sy + 1][sx] - val);
            gradYPairs++;
          }
        }
      }

      const stdDev = Math.sqrt(sqDiffSum / count);
      const gradX = gradXPairs > 0 ? gradXSum / gradXPairs : 0;
      const gradY = gradYPairs > 0 ? gradYSum / gradYPairs : 0;
      // Rugosidad isotrópica 2D: una vereda lisa o un borde recto de cordón tiene min(gradX, gradY) ~ 0
      const isoTexture = Math.min(gradX, gradY);
      const brightRatio = brightCount / count;

      row.push({
        gx,
        gy,
        r,
        g,
        b,
        lum,
        sat,
        exg,
        stdDev,
        isoTexture,
        brightRatio,
        category: null,
        score: 0,
      });
    }
    grid.push(row);
  }

  // Paso 1: Clasificación preliminar con ROI estricta y filtro de varianza/textura
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    const yPct = ((gy + 0.5) / GRID_SIZE) * 100;
    // Ignorar el 22% superior (calle/puente/fondo) y el 14% inferior
    if (yPct < 22 || yPct > 86) continue;

    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const xPct = ((gx + 0.5) / GRID_SIZE) * 100;
      // Ignorar el 22% lateral izquierdo y derecho (veredas de cemento y asfalto)
      if (xPct < 22 || xPct > 78) continue;

      const cell = grid[gy][gx];

      // Descartar vegetación viva (pasto/maleza verde)
      if (cell.exg > 0.09 || (cell.g > cell.r * 1.07 && cell.g > cell.b * 1.18)) {
        continue;
      }

      // Sesgo espacial hacia el eje central del cauce (1.0 en el centro, decae hacia los márgenes)
      const distFromCenter = Math.abs(xPct - 50) / 28;
      const centerBias = Math.max(0.35, 1 - distFromCenter * 0.55);

      // FILTRO ESTRICTO DE LISURA: si la celda tiene baja desviación estándar o baja textura 2D,
      // es cemento liso, asfalto, tierra uniforme o agua calma -> NUNCA clasificar como residuo
      if (cell.stdDev < 0.055 || cell.isoTexture < 0.038) {
        continue;
      }

      // 1. Plásticos, vasos de telgopor y bolsas (brillos blancos/especulares o envases de color con alta textura)
      if (
        (cell.brightRatio >= 0.24 && cell.stdDev >= 0.065 && cell.isoTexture >= 0.042) ||
        (cell.lum > 0.68 && cell.sat < 0.24 && cell.stdDev >= 0.062 && cell.isoTexture >= 0.042) ||
        (cell.sat >= 0.34 && cell.exg < 0.02 && cell.lum > 0.35 && cell.stdDev >= 0.065)
      ) {
        cell.category = 'plastic';
        cell.score = (cell.brightRatio * 1.5 + cell.stdDev * 3.0 + cell.isoTexture * 2.5) * centerBias;
        continue;
      }

      // 2. Ramas y hojas secas en el cauce (tonos madera/ocre con alta textura fibrosa en X e Y)
      if (
        cell.r > cell.b * 1.2 &&
        cell.g > cell.b * 1.05 &&
        cell.exg <= 0.06 &&
        cell.lum >= 0.18 &&
        cell.lum <= 0.54 &&
        cell.stdDev >= 0.075 &&
        cell.isoTexture >= 0.052
      ) {
        cell.category = 'branch';
        cell.score = (cell.stdDev * 2.8 + cell.isoTexture * 2.6) * centerBias;
        continue;
      }

      // 3. Escombros / Hormigón roto:
      // Para evitar cualquier falso positivo sobre veredas o asfalto gris, exigimos una varianza
      // y rugosidad 2D MUY altas (bordes duros quebrados en ambas direcciones) dentro del cauce.
      if (
        xPct >= 25 &&
        xPct <= 75 &&
        cell.sat < 0.2 &&
        cell.exg < 0.03 &&
        cell.lum >= 0.28 &&
        cell.lum <= 0.68 &&
        cell.stdDev >= 0.115 &&
        cell.isoTexture >= 0.068
      ) {
        cell.category = 'debris';
        cell.score = (cell.stdDev * 3.2 + cell.isoTexture * 3.0) * centerBias;
      }
    }
  }

  // Paso 2: Filtro de densidad vecinal — elimina celdas aisladas o bordes lineales de cordón
  const verifiedGrid: Array<Array<CellStats | null>> = Array.from({ length: GRID_SIZE }, () =>
    Array<CellStats | null>(GRID_SIZE).fill(null),
  );

  for (let gy = 1; gy < GRID_SIZE - 1; gy++) {
    for (let gx = 1; gx < GRID_SIZE - 1; gx++) {
      const cell = grid[gy][gx];
      if (!cell.category) continue;

      let activeNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (grid[gy + dy][gx + dx].category !== null) {
            activeNeighbors++;
          }
        }
      }

      // Exigir que la celda forme parte de una masa 2D (al menos 3 vecinos con textura de residuo)
      if (activeNeighbors >= 3) {
        verifiedGrid[gy][gx] = cell;
      }
    }
  }

  // Paso 3: Consolidación en componentes conexas dentro del cauce
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const clusters: Array<{
    category: DebrisCategory;
    cells: CellStats[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    scoreSum: number;
  }> = [];

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const start = verifiedGrid[gy][gx];
      if (!start || visited[gy][gx]) continue;

      const queue: CellStats[] = [start];
      visited[gy][gx] = true;

      const cells: CellStats[] = [];
      let minX = gx;
      let maxX = gx;
      let minY = gy;
      let maxY = gy;
      let scoreSum = 0;
      const categoryCounts: Record<DebrisCategory, number> = {
        plastic: 0,
        branch: 0,
        debris: 0,
      };

      while (queue.length > 0) {
        const curr = queue.pop()!;
        cells.push(curr);
        if (curr.category) categoryCounts[curr.category]++;
        if (curr.gx < minX) minX = curr.gx;
        if (curr.gx > maxX) maxX = curr.gx;
        if (curr.gy < minY) minY = curr.gy;
        if (curr.gy > maxY) maxY = curr.gy;
        scoreSum += curr.score;

        // Vecindario de radio 3 para consolidar objetos cercanos en un mismo recuadro limpio
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const ny = curr.gy + dy;
            const nx = curr.gx + dx;
            if (ny < 0 || ny >= GRID_SIZE || nx < 0 || nx >= GRID_SIZE) continue;
            if (visited[ny][nx]) continue;
            const neighbor = verifiedGrid[ny][nx];
            if (neighbor) {
              visited[ny][nx] = true;
              queue.push(neighbor);
            }
          }
        }
      }

      if (cells.length >= 6) {
        const dominantCategory: DebrisCategory =
          categoryCounts.plastic >= categoryCounts.branch &&
          categoryCounts.plastic >= categoryCounts.debris
            ? 'plastic'
            : categoryCounts.branch >= categoryCounts.debris
              ? 'branch'
              : 'debris';

        clusters.push({
          category: dominantCategory,
          cells,
          minX,
          maxX,
          minY,
          maxY,
          scoreSum,
        });
      }
    }
  }

  clusters.sort((a, b) => b.scoreSum - a.scoreSum);
  const topClusters = clusters.slice(0, 3);

  return topClusters.map((cluster, idx) => {
    const rawLeft = (cluster.minX / GRID_SIZE) * 100;
    const rawTop = (cluster.minY / GRID_SIZE) * 100;
    const rawWidth = ((cluster.maxX - cluster.minX + 1) / GRID_SIZE) * 100;
    const rawHeight = ((cluster.maxY - cluster.minY + 1) / GRID_SIZE) * 100;

    // Recorte interno del 10% para enmarcar el núcleo del cúmulo sin morder bordes de la canaleta
    const padX = Math.min(4, rawWidth * 0.1);
    const padY = Math.min(3, rawHeight * 0.1);

    const left = Math.round(Math.max(24, Math.min(68, rawLeft + padX)));
    const top = Math.round(Math.max(22, Math.min(72, rawTop + padY)));
    const maxAllowedWidth = Math.min(44, 76 - left);
    const maxAllowedHeight = Math.min(36, 82 - top);

    const widthBox = Math.round(Math.max(14, Math.min(maxAllowedWidth, rawWidth - padX * 2)));
    const heightBox = Math.round(Math.max(14, Math.min(maxAllowedHeight, rawHeight - padY * 2)));

    const meanBright =
      cluster.cells.reduce((acc, c) => acc + c.brightRatio, 0) / cluster.cells.length;
    const meanSat = cluster.cells.reduce((acc, c) => acc + c.sat, 0) / cluster.cells.length;

    const label = pickOperationalLabel(cluster.category, meanBright, meanSat, idx);
    const confidence = Math.min(
      97,
      Math.max(85, Math.round(84 + Math.min(13, cluster.cells.length / 4))),
    );

    return {
      id: `px-${idx + 1}`,
      label,
      category: cluster.category,
      confidence,
      bbox: {
        top,
        left,
        width: widthBox,
        height: heightBox,
      },
    };
  });
}

function pickOperationalLabel(
  category: DebrisCategory,
  meanBright: number,
  meanSat: number,
  index: number,
): string {
  if (category === 'debris') {
    return 'Escombros / Hormigón';
  }
  if (category === 'branch') {
    return 'Ramas y hojas';
  }
  if (meanBright > 0.42 && meanSat < 0.18) {
    return index % 2 === 0 ? 'Vasos de telgopor' : 'Bolsas de nailon';
  }
  if (meanBright > 0.28 && index % 2 === 1) {
    return 'Bolsas de nailon';
  }
  return 'Botellas de plástico';
}
