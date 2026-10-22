declare module 'pngjs' {
  export interface PNGWithMetadata {
    width: number;
    height: number;
    data: Buffer;
  }

  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: { width?: number; height?: number });
    static sync: {
      read(buffer: Buffer): PNGWithMetadata;
      write(png: PNG): Buffer;
    };
  }
}
