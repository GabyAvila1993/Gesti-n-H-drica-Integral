export const DEBRIS_CATEGORIES = ['plastic', 'branch', 'debris'] as const;
export type DebrisCategory = (typeof DEBRIS_CATEGORIES)[number];

/**
 * Geometría espacial expresada en porcentaje (0 a 100) respecto a las dimensiones
 * de la imagen analizada, lista para inyectarse en los contenedores posicionados.
 */
export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Objeto residual detectado dentro o en los bordes del cauce de la acequia. */
export interface DetectedObject {
  id: string;
  label: string;
  category: DebrisCategory;
  /** Nivel de confianza del modelo expresado en porcentaje (0 a 100). */
  confidence: number;
  bbox: BoundingBox;
}
