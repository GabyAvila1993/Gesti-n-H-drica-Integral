export const URBAN_RISK_LEVELS = ['BAJO', 'MEDIO', 'CRITICO'] as const;
export type UrbanRiskLevel = (typeof URBAN_RISK_LEVELS)[number];

export const MUNICIPALITIES = [
  'Capital',
  'Godoy Cruz',
  'Guaymallén',
  'Las Heras',
  'Luján de Cuyo',
  'Maipú',
] as const;

export type UrbanMunicipality = (typeof MUNICIPALITIES)[number];
