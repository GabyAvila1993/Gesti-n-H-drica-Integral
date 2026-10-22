import { useState, type KeyboardEvent } from 'react';
import { classNames } from '../../shared/ui/class-names';
import { CATEGORY_LABEL, type DebrisCategory, type DetectedObject } from '../types';
import { DetectionTooltip } from './DetectionTooltip';
import styles from './DetectionViewer.module.css';

const CATEGORY_CLASS: Record<DebrisCategory, string> = {
  plastic: styles.detectionBoxPlastic,
  branch: styles.detectionBoxBranch,
  debris: styles.detectionBoxDebris,
};

interface DetectionBoxProps {
  detection: DetectedObject;
  highlighted: boolean;
  onHoverChange: (id: string | null) => void;
}

/**
 * Recuadro de detección superpuesto sobre la imagen con `position: absolute`.
 * ÚNICA EXCEPCIÓN AUTORIZADA DE ESTILO EN LÍNEA:
 * solo inyecta `top`, `left`, `width` y `height` en porcentaje (%).
 */
export function DetectionBox({ detection, highlighted, onHoverChange }: DetectionBoxProps) {
  const [hovered, setHovered] = useState(false);
  const showTooltip = hovered || highlighted;
  const tooltipId = `tooltip-${detection.id}`;

  const handleEnter = () => {
    setHovered(true);
    onHoverChange(detection.id);
  };

  const handleLeave = () => {
    setHovered(false);
    onHoverChange(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleLeave();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (hovered) {
        handleLeave();
      } else {
        handleEnter();
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${CATEGORY_LABEL[detection.category]}: ${detection.label} (${detection.confidence}% de confianza)`}
      aria-describedby={showTooltip ? tooltipId : undefined}
      aria-expanded={showTooltip}
      className={classNames(
        styles.detectionBox,
        CATEGORY_CLASS[detection.category],
        showTooltip && styles.detectionBoxActive,
      )}
      style={{
        top: `${detection.bbox.top}%`,
        left: `${detection.bbox.left}%`,
        width: `${detection.bbox.width}%`,
        height: `${detection.bbox.height}%`,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.detectionBoxBadge} aria-hidden="true">
        {detection.confidence}%
      </span>
      {showTooltip && (
        <DetectionTooltip
          id={tooltipId}
          label={detection.label}
          category={detection.category}
          confidence={detection.confidence}
        />
      )}
    </div>
  );
}
