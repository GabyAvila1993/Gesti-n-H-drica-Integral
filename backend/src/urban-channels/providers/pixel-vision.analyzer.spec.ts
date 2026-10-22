import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PNG } from 'pngjs';
import { HuggingFaceVisionProvider } from './huggingface-vision.provider';
import { MockVisionProvider } from './mock-vision.provider';
import { analyzeImagePixels } from './pixel-vision.analyzer';

/**
 * Crea un PNG sintético de una acequia con:
 * - Calle de asfalto gris en el 20% superior (y < 24)
 * - Vereda de cemento gris liso en el margen izquierdo (x < 38)
 * - Orilla derecha de pasto verde vivo (x > 115)
 * - Cúmulo de botellas y vasos de telgopor con alta textura 2D en el centro del cauce (x: 56..98, y: 40..84)
 */
function buildSyntheticAcequiaPng(): Buffer {
  const width = 160;
  const height = 120;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Fondo del cauce: agua/barro oscuro
      let r = 35;
      let g = 50;
      let b = 64;

      // Calle de asfalto gris arriba (y < 24) — debe ser ignorada por ROI y baja textura
      if (y < 24) {
        r = 110;
        g = 112;
        b = 115;
      }
      // Vereda de cemento gris liso a la izquierda (x < 38) y dentro del marco (x: 38..48) — debe ser ignorada por baja varianza 2D
      else if (x < 48) {
        r = 148;
        g = 150;
        b = 152;
      }
      // Orilla derecha (x > 115): pasto verde vivo — debe ser ignorado por ExG
      else if (x > 115) {
        r = 45;
        g = 155;
        b = 40;
      }

      // Cúmulo de botellas, bolsas y ramas en el centro inferior del pozo de la acequia (x: 52..104, y: 52..102)
      // con alta textura 2D tanto en X como en Y
      if (x >= 52 && x <= 104 && y >= 52 && y <= 102) {
        const pattern = (x * 7 + y * 11) % 5;
        if (pattern === 0 || pattern === 1) {
          r = 248;
          g = 250;
          b = 254;
        } else if (pattern === 2) {
          r = 40;
          g = 165;
          b = 235;
        } else {
          r = 85;
          g = 95;
          b = 110;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}

describe('Ruteo inteligente y análisis píxel por píxel', () => {
  it('analiza píxel por píxel una imagen PNG real, detecta el cúmulo en el centro inferior del cauce e ignora vereda gris, asfalto y pasto', () => {
    const buffer = buildSyntheticAcequiaPng();
    const detections = analyzeImagePixels(buffer, 'image/png');

    assert.ok(detections.length >= 1, 'Debe detectar el cúmulo de residuos dentro del cauce');
    for (const det of detections) {
      assert.ok(
        det.category === 'plastic' || det.category === 'branch',
        'Debe clasificar como Plásticos o Ramas sin confundir cemento liso con Escombros',
      );
      assert.ok(det.bbox.top >= 40, 'La caja debe ubicarse en el centro inferior (>= 40% del alto)');
      assert.ok(
        det.bbox.top + det.bbox.height <= 90,
        'La caja nunca debe superar el 90% del alto',
      );
      assert.ok(det.bbox.left >= 20, 'La caja debe mantenerse dentro del margen >= 20% del ancho');
      assert.ok(
        det.bbox.left + det.bbox.width <= 80,
        'La caja nunca debe superar el 80% del ancho',
      );
    }
  });

  it('descarta al 100% veredas de cemento liso y asfalto gris sin generar falsos positivos de escombros', () => {
    const width = 160;
    const height = 120;
    const png = new PNG({ width, height });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Imagen compuesta de asfalto gris arriba, veredas de cemento con gradiente suave a los lados y agua limpia al centro
        const smoothGradient = Math.round((x / width) * 18);
        png.data[idx] = 135 + smoothGradient;
        png.data[idx + 1] = 137 + smoothGradient;
        png.data[idx + 2] = 140 + smoothGradient;
        png.data[idx + 3] = 255;
      }
    }

    const smoothBuffer = PNG.sync.write(png);
    const detections = analyzeImagePixels(smoothBuffer, 'image/png');
    assert.equal(detections.length, 0, 'No debe marcar cemento liso ni asfalto como Escombros');
  });

  it('usa el JSON estático para escenas de prueba (presetId) y análisis de píxeles para fotos subidas', async () => {
    const provider = new MockVisionProvider();
    const buffer = buildSyntheticAcequiaPng();

    const presetDetections = await provider.analyzeImage({
      buffer,
      originalname: 'acequia-obstruccion-critica.svg',
      mimetype: 'image/svg+xml',
      size: buffer.length,
      presetId: 'critico',
    });
    assert.equal(presetDetections[0].id, 'det-crit-1');

    const customDetections = await provider.analyzeImage({
      buffer,
      originalname: 'foto-vecino-maipu.png',
      mimetype: 'image/png',
      size: buffer.length,
    });
    assert.ok(customDetections.length >= 1);
    assert.ok(customDetections[0].id.startsWith('px-'));
  });

  it('HuggingFaceVisionProvider exige API Key para fotos personalizadas pero permite escenas de prueba', async () => {
    const hf = new HuggingFaceVisionProvider({ apiUrl: '', token: '' });
    const buffer = buildSyntheticAcequiaPng();

    const presetDetections = await hf.analyzeImage({
      buffer,
      originalname: 'acequia-obstruccion-media.svg',
      mimetype: 'image/svg+xml',
      size: buffer.length,
      presetId: 'medio',
    });
    assert.equal(presetDetections[0].id, 'det-med-1');

    await assert.rejects(
      () =>
        hf.analyzeImage({
          buffer,
          originalname: 'mi-foto-acequia.png',
          mimetype: 'image/png',
          size: buffer.length,
        }),
      (err: Error) => {
        assert.equal(err.message, 'Configura tu API Key para análisis de fotos personalizadas');
        return true;
      },
    );
  });
});
