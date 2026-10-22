/**
 * Configuración centralizada de la aplicación.
 * Cambiar `name` aquí renombra el proyecto en toda la interfaz.
 * Los valores dependientes del entorno (URLs, tokens, mapas) se leen de `.env`.
 */

const parseCenter = (raw: string | undefined): [number, number] => {
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [-32.92, -68.83];
};

export const appConfig = {
  name: 'Gestión Hídrica Integral',
  shortName: 'GHI',
  tagline: 'Monitoreo y alerta de riesgos hídricos · Mendoza',
  region: 'Provincia de Mendoza, Argentina',

  api: {
    baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
    healthPollMs: 30_000,
  },

  map: {
    tilesUrl:
      import.meta.env.VITE_MAP_TILES_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: import.meta.env.VITE_MAP_ATTRIBUTION ?? '&copy; OpenStreetMap contributors',
    defaultCenter: parseCenter(import.meta.env.VITE_MAP_DEFAULT_CENTER),
    defaultZoom: Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM ?? 12),
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
