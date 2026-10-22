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
    title: 'Muestra Crítica',
    subtitle: 'Ramas + plásticos + escombros (79%)',
    defaultMunicipality: 'Capital',
    defaultAddress: 'Av. Colón y Patricias Mendocinas',
  },
  {
    id: 'medio',
    fileName: 'acequia-obstruccion-media.svg',
    title: 'Muestra Media',
    subtitle: 'Poda y envases retenidos (35%)',
    defaultMunicipality: 'Godoy Cruz',
    defaultAddress: 'San Martín Sur y Rivadavia',
  },
  {
    id: 'bajo',
    fileName: 'acequia-obstruccion-baja.svg',
    title: 'Muestra Baja',
    subtitle: 'Residuos aislados con flujo libre (11%)',
    defaultMunicipality: 'Guaymallén',
    defaultAddress: 'Bandera de los Andes y Libertad',
  },
];

/**
 * Construye una ilustración fotográfica vectorial (SVG) de una acequia mendocina
 * con los objetos de basura ubicados exactamente en las coordenadas que detecta el modelo,
 * sin utilizar Canvas.
 */
export function createSamplePhotoFile(preset: SamplePhotoPreset): File {
  const debrisElements =
    preset.id === 'critico'
      ? `
        <!-- Rama caída de plátano (top:22%, left:10%, w:44%, h:28%) -->
        <g>
          <path d="M95 155 Q240 210 410 180 M180 182 L260 132 M250 190 L355 240" stroke="#78350f" stroke-width="18" stroke-linecap="round" fill="none"/>
          <circle cx="150" cy="160" r="24" fill="#65a30d" opacity="0.85"/>
          <circle cx="265" cy="145" r="28" fill="#4d7c0f" opacity="0.85"/>
          <circle cx="345" cy="185" r="22" fill="#84cc16" opacity="0.85"/>
        </g>
        <!-- Botella PET aplastada (top:34%, left:56%, w:18%, h:16%) -->
        <g>
          <rect x="460" y="215" width="120" height="72" rx="18" fill="#38bdf8" opacity="0.85" stroke="#e0f2fe" stroke-width="4"/>
          <rect x="578" y="236" width="22" height="30" rx="5" fill="#0284c7"/>
        </g>
        <!-- Bolsa de polietileno (top:54%, left:18%, w:24%, h:19%) -->
        <path d="M155 340 Q235 315 315 350 Q335 415 245 430 Q150 420 155 340 Z" fill="#e2e8f0" opacity="0.88" stroke="#94a3b8" stroke-width="4"/>
        <!-- Escombro de hormigón (top:52%, left:48%, w:32%, h:26%) -->
        <g>
          <polygon points="400,340 520,320 620,375 585,460 420,455" fill="#94a3b8" stroke="#475569" stroke-width="5"/>
          <polygon points="480,365 570,350 610,425 510,445" fill="#64748b"/>
        </g>
      `
      : preset.id === 'medio'
        ? `
        <!-- Acumulación de hojas y poda (top:28%, left:16%, w:32%, h:22%) -->
        <g>
          <path d="M140 210 Q250 245 365 215" stroke="#713f12" stroke-width="14" stroke-linecap="round" fill="none"/>
          <ellipse cx="220" cy="220" rx="55" ry="32" fill="#65a30d" opacity="0.88"/>
          <ellipse cx="305" cy="235" rx="48" ry="28" fill="#ca8a04" opacity="0.88"/>
        </g>
        <!-- Envase plástico (top:46%, left:54%, w:20%, h:15%) -->
        <rect x="450" y="288" width="130" height="68" rx="14" fill="#22d3ee" opacity="0.88" stroke="#cffafe" stroke-width="4"/>
        <!-- Sedimento y cascotes (top:60%, left:26%, w:22%, h:14%) -->
        <polygon points="220,380 315,365 370,415 245,432" fill="#94a3b8" stroke="#475569" stroke-width="4"/>
      `
        : `
        <!-- Botella PET flotante (top:38%, left:24%, w:16%, h:14%) -->
        <rect x="200" y="238" width="108" height="58" rx="14" fill="#38bdf8" opacity="0.88" stroke="#e0f2fe" stroke-width="3"/>
        <!-- Rama menor en talud (top:56%, left:60%, w:18%, h:12%) -->
        <path d="M490 355 Q555 375 615 360" stroke="#78350f" stroke-width="12" stroke-linecap="round" fill="none"/>
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
    <polygon points="0,0 800,0 740,95 60,95" fill="url(#wall)"/>
    <polygon points="60,515 740,515 800,600 0,600" fill="url(#wall)"/>
    <!-- Cauce de agua -->
    <rect x="55" y="95" width="690" height="420" rx="8" fill="url(#water)"/>
    <!-- Líneas de corriente -->
    <path d="M90 150 Q280 135 460 155 T710 145" stroke="#38bdf8" stroke-width="3" opacity="0.3" fill="none"/>
    <path d="M85 310 Q300 290 510 315 T715 300" stroke="#7dd3fc" stroke-width="3" opacity="0.25" fill="none"/>
    <path d="M95 465 Q290 450 520 470 T705 460" stroke="#38bdf8" stroke-width="3" opacity="0.3" fill="none"/>
    <!-- Rejilla del puente vehicular a la derecha -->
    <g stroke="#1e293b" stroke-width="8" opacity="0.65">
      <line x1="720" y1="95" x2="720" y2="515"/>
      <line x1="695" y1="95" x2="695" y2="515"/>
    </g>
    ${debrisElements}
  </svg>`;

  return new File([svg], preset.fileName, { type: 'image/svg+xml' });
}
