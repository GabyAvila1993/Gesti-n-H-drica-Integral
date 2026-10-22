import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * POLÍTICA DE SEGURIDAD CRÍTICA (21/10/2026):
 * 1. Prohibido usar Web Crypto API (globalThis.crypto.subtle) por CVE-2026-48933.
 *    Todo hash o identificador usa exclusivamente el módulo clásico `node:crypto`.
 * 2. Prohibido procesar o extraer archivos TAR (`node-tar`) o comprimidos.
 * 3. Validación estricta de tamaño, extensión, MIME y firma binaria (magic bytes)
 *    para impedir agotamiento de memoria o subida de payloads camuflados.
 */

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const FORBIDDEN_EXTENSIONS = /\.(tar|gz|tgz|zip|rar|7z|php|phtml|phar|sh|bat|cmd|exe|dll|js|mjs)$/i;

export interface UploadFileCandidate {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface ValidatedImageMetadata {
  sha256: string;
  detectedFormat: 'jpeg' | 'png' | 'webp' | 'svg';
}

/** Verifica si los primeros bytes del buffer coinciden con la firma real del formato. */
export function detectImageSignature(buffer: Buffer): 'jpeg' | 'png' | 'webp' | 'svg' | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  // SVG: texto XML con etiqueta <svg y sin etiquetas <script
  const headText = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart();
  if ((headText.startsWith('<svg') || headText.startsWith('<?xml')) && headText.includes('<svg')) {
    const fullText = buffer.toString('utf8');
    if (/<\s*script/i.test(fullText) || /onload\s*=/i.test(fullText)) {
      return null;
    }
    return 'svg';
  }

  return null;
}

/**
 * Valida integralmente un archivo de imagen subido y calcula su huella SHA-256
 * utilizando exclusivamente el módulo clásico `node:crypto`.
 */
export function validateUploadedImage(
  file: UploadFileCandidate | undefined,
  maxSizeMb: number,
): ValidatedImageMetadata {
  if (!file || !file.buffer || file.size <= 0) {
    throw new BadRequestException('No se recibió una imagen válida en el formulario multipart.');
  }

  if (FORBIDDEN_EXTENSIONS.test(file.originalname)) {
    throw new BadRequestException(
      'Nombre o extensión de archivo bloqueado por política de seguridad.',
    );
  }

  if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    throw new BadRequestException(
      `Tipo MIME no permitido (${file.mimetype}). Solo se aceptan imágenes JPG, PNG, WebP o SVG.`,
    );
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new PayloadTooLargeException(
      `El archivo excede el límite estricto de seguridad (${maxSizeMb} MB).`,
    );
  }

  const detectedFormat = detectImageSignature(file.buffer);
  if (!detectedFormat) {
    throw new BadRequestException(
      'La firma binaria del archivo no corresponde a una imagen válida o contiene contenido activo bloqueado.',
    );
  }

  // Hash clásico de Node.js (evita CVE-2026-48933 de Web Crypto)
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');

  return { sha256, detectedFormat };
}
