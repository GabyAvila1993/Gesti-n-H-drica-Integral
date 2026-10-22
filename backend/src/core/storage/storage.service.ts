import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
  type StorageUploadInput,
  type StoredFileResult,
} from './storage-provider.interface';

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  get providerName(): string {
    return this.provider.name;
  }

  async saveImage(input: StorageUploadInput): Promise<StoredFileResult> {
    return this.provider.saveFile(input);
  }

  async deleteImage(key: string): Promise<void> {
    if (this.provider.deleteFile) {
      await this.provider.deleteFile(key);
    }
  }
}
