import { Global, Module } from '@nestjs/common';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    LocalDiskStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useExisting: LocalDiskStorageProvider,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
