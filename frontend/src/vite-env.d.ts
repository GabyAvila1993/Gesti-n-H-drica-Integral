/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAP_TILES_URL: string;
  readonly VITE_MAP_ATTRIBUTION: string;
  readonly VITE_MAP_DEFAULT_CENTER: string;
  readonly VITE_MAP_DEFAULT_ZOOM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
