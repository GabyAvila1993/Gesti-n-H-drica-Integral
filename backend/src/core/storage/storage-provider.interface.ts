export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageUploadInput {
  readonly buffer: Buffer;
  readonly originalname: string;
  readonly mimetype: string;
  readonly folder?: string;
}

export interface StoredFileResult {
  readonly key: string;
  readonly url: string;
  readonly provider: string;
  readonly size: number;
  readonly mimeType: string;
}

/**
 * Contrato agnóstico de almacenamiento de archivos.
 * Permite intercambiar el adaptador local (`/uploads`) por AWS S3 o Cloudinary
 * mediante inyección de dependencias sin modificar controladores ni servicios de aplicación.
 */
export interface StorageProvider {
  readonly name: string;
  saveFile(input: StorageUploadInput): Promise<StoredFileResult>;
  deleteFile?(key: string): Promise<void>;
}
