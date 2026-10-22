import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, posix } from 'node:path';
import { storageConfig, type StorageConfig } from '../config/app.config';
import type {
  StorageProvider,
  StorageUploadInput,
  StoredFileResult,
} from './storage-provider.interface';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/**
 * Adaptador local que almacena imágenes en la carpeta `/uploads` servida estáticamente por NestJS.
 * Cumple la política de seguridad usando `node:crypto` clásico (`randomUUID`) y nombres sanitizados.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  readonly name = 'local-disk';

  constructor(@Inject(storageConfig.KEY) private readonly config: StorageConfig) {}

  async saveFile(input: StorageUploadInput): Promise<StoredFileResult> {
    const ext =
      MIME_EXTENSIONS[input.mimetype] ||
      extname(input.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') ||
      '.jpg';

    const cleanFolder = (input.folder ?? 'urban-alerts').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const relativeKey = posix.join(cleanFolder, fileName);

    const baseUploadDir = join(process.cwd(), this.config.localDir);
    const targetDir = join(baseUploadDir, cleanFolder);
    const absoluteFilePath = join(targetDir, fileName);

    await mkdir(targetDir, { recursive: true });
    await writeFile(absoluteFilePath, input.buffer);

    const publicPrefix = this.config.publicPath.startsWith('/')
      ? this.config.publicPath
      : `/${this.config.publicPath}`;

    return {
      key: relativeKey,
      url: posix.join(publicPrefix, relativeKey),
      provider: this.name,
      size: input.buffer.length,
      mimeType: input.mimetype,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const safeKey = key.replace(/\.\./g, '');
    const absoluteFilePath = join(process.cwd(), this.config.localDir, safeKey);
    await unlink(absoluteFilePath).catch(() => undefined);
  }
}
