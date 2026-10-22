import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateUploadedImage } from './image-upload.validator';

describe('validateUploadedImage (seguridad de archivos)', () => {
  it('acepta un PNG con firma binaria válida y devuelve su hash SHA-256 con node:crypto', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    const meta = validateUploadedImage(
      {
        buffer: pngBuffer,
        originalname: 'acequia.png',
        mimetype: 'image/png',
        size: pngBuffer.length,
      },
      10,
    );
    assert.equal(meta.detectedFormat, 'png');
    assert.equal(meta.sha256.length, 64);
  });

  it('bloquea extensiones de archivos comprimidos (.tar, .gz) aunque declaren image/jpeg', () => {
    const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.throws(() =>
      validateUploadedImage(
        {
          buffer: jpgBuffer,
          originalname: 'archivo.tar',
          mimetype: 'image/jpeg',
          size: jpgBuffer.length,
        },
        10,
      ),
    );
  });

  it('bloquea archivos cuya firma binaria (magic bytes) no coincida con una imagen real', () => {
    const fakeBuffer = Buffer.from('ARCHIVO_TEXTO_CAMUFLADO_COMO_JPG', 'utf8');
    assert.throws(() =>
      validateUploadedImage(
        {
          buffer: fakeBuffer,
          originalname: 'foto.jpg',
          mimetype: 'image/jpeg',
          size: fakeBuffer.length,
        },
        10,
      ),
    );
  });
});
