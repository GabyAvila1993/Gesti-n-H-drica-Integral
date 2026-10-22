/**
 * Configuración centralizada de la aplicación (Frontend · Vite).
 * Lee dinámicamente `import.meta.env.VITE_API_URL` con fallback a `http://localhost:3000`
 * para funcionar tanto en desarrollo local como en Render Static Site (`https://gesti-n-h-drica-integral.onrender.com`).
 */

const parseCenter = (raw: string | undefined): [number, number] => {
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [-32.92, -68.83];
};

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');

const backendOrigin = rawApiUrl.endsWith('/api')
  ? rawApiUrl.slice(0, -4)
  : rawApiUrl;

const apiBaseUrl = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl}/api`;

export const appConfig = {
  name: 'Gestión Hídrica Integral',
  shortName: 'GHI',
  tagline: 'Monitoreo y alerta de riesgos hídricos · Mendoza',
  region: 'Provincia de Mendoza, Argentina',

  api: {
    origin: backendOrigin,
    baseUrl: apiBaseUrl,
    healthPollMs: 30_000,
  },

  map: {
    tilesUrl:
      import.meta.env.VITE_MAP_TILES_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
    defaultCenter: parseCenter(import.meta.env.VITE_MAP_DEFAULT_CENTER),
    defaultZoom: Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM || 12),
  },

  municipalities: [
    'Capital',
    'Godoy Cruz',
    'Guaymallén',
    'Las Heras',
    'Luján de Cuyo',
    'Maipú',
  ],
} as const;

export type Municipality = (typeof appConfig.municipalities)[number];
