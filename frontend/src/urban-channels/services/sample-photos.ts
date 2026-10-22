export interface SamplePhotoPreset {
  id: 'critico' | 'medio' | 'bajo';
  fileName: string;
  title: string;
  subtitle: string;
  defaultMunicipality: 'Capital' | 'Godoy Cruz' | 'Guaymallén';
  defaultAddress: string;
}

export const SAMPLE_PHOTO_PRESETS: readonly SamplePhotoPreset[] = [
  {
    id: 'critico',
    fileName: 'acequia-obstruccion-critica.svg',
    title: 'Acequia colapsada',
    subtitle: 'Botellas, vasos de telgopor y bolsas (91%)',
    defaultMunicipality: 'Capital',
    defaultAddress: 'Av. Colón y Patricias Mendocinas',
  },
  {
    id: 'medio',
    fileName: 'acequia-obstruccion-media.svg',
    title: 'Acequia de tierra con escombros',
    subtitle: 'Bloque de hormigón y ramas (47%)',
    defaultMunicipality: 'Godoy Cruz',
    defaultAddress: 'San Martín Sur y Rivadavia',
  },
  {
    id: 'bajo',
    fileName: 'acequia-obstruccion-baja.svg',
    title: 'Canaleta con botellas y tierra',
    subtitle: 'Envases acumulados y sedimento (84%)',
    defaultMunicipality: 'Guaymallén',
    defaultAddress: 'Bandera de los Andes y Libertad',
  },
];

/**
 * Construye una ilustración vectorial (SVG) de una acequia mendocina
 * con los residuos ubicados exactamente en las coordenadas del cauce,
 * sin utilizar Canvas.
 */
export function createSamplePhotoFile(preset: SamplePhotoPreset): File {
  const debrisElements =
    preset.id === 'critico'
      ? `
        <!-- Botellas de plástico (top:24%, left:26%, w:42%, h:22%) -->
        <g>
          <rect x="220" y="150" width="310" height="120" rx="18" fill="#38bdf8" opacity="0.88" stroke="#e0f2fe" stroke-width="4"/>
          <circle cx="290" cy="205" r="24" fill="#0284c7"/>
          <circle cx="420" cy="215" r="26" fill="#0ea5e9"/>
        </g>
        <!-- Vasos de telgopor (top:42%, left:28%, w:40%, h:20%) -->
        <g>
          <rect x="235" y="255" width="295" height="110" rx="16" fill="#f8fafc" opacity="0.9" stroke="#cbd5e1" stroke-width="4"/>
        </g>
        <!-- Bolsas de nailon (top:56%, left:30%, w:36%, h:18%) -->
        <path d="M250 345 Q380 325 515 355 Q520 425 385 435 Q245 425 250 345 Z" fill="#e2e8f0" opacity="0.9" stroke="#94a3b8" stroke-width="4"/>
      `
      : preset.id === 'medio'
        ? `
        <!-- Escombros / Hormigón en margen inferior izquierdo (top:58%, left:10%, w:26%, h:24%) -->
        <polygon points="88,355 275,350 282,482 95,485" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
        <!-- Ramas y hojas en el cauce (top:38%, left:30%, w:22%, h:16%) -->
        <g>
          <path d="M250 255 Q325 280 405 260" stroke="#713f12" stroke-width="14" stroke-linecap="round" fill="none"/>
          <ellipse cx="325" cy="265" rx="68" ry="34" fill="#65a30d" opacity="0.88"/>
        </g>
      `
        : `
        <!-- Botellas de plástico (top:25%, left:31%, w:34%, h:24%) -->
        <rect x="255" y="155" width="255" height="130" rx="16" fill="#38bdf8" opacity="0.88" stroke="#e0f2fe" stroke-width="4"/>
        <!-- Bolsas de nailon (top:43%, left:32%, w:32%, h:22%) -->
        <rect x="262" y="262" width="240" height="120" rx="16" fill="#e2e8f0" opacity="0.88" stroke="#94a3b8" stroke-width="4"/>
        <!-- Escombros / Hormigón (top:57%, left:33%, w:30%, h:18%) -->
        <polygon points="270,350 492,348 498,442 275,445" fill="#94a3b8" stroke="#475569" stroke-width="4"/>
      `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="water" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0c4a6e"/>
        <stop offset="50%" stop-color="#0369a1"/>
        <stop offset="100%" stop-color="#155e75"/>
      </linearGradient>
      <linearGradient id="wall" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#64748b"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    <!-- Vereda y paredes de hormigón de la acequia -->
    <rect width="800" height="600" fill="#475569"/>
    <polygon points="0,0 800,0 640,120 160,120" fill="url(#wall)"/>
    <polygon points="160,480 640,480 800,600 0,600" fill="url(#wall)"/>
    <!-- Cauce central de agua -->
    <rect x="160" y="120" width="480" height="360" rx="8" fill="url(#water)"/>
    <!-- Líneas de corriente -->
    <path d="M190 180 Q360 165 510 185 T610 175" stroke="#38bdf8" stroke-width="3" opacity="0.3" fill="none"/>
    <path d="M185 310 Q370 290 520 315 T615 300" stroke="#7dd3fc" stroke-width="3" opacity="0.25" fill="none"/>
    ${debrisElements}
  </svg>`;

  return new File([svg], preset.fileName, { type: 'image/svg+xml' });
}
