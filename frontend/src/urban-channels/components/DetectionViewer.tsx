import { classNames } from '../../shared/ui/class-names';
import type { DetectedObject } from '../types';
import { DetectionBox } from './DetectionBox';
import styles from './DetectionViewer.module.css';

interface DetectionViewerProps {
  imageUrl: string;
  fileName: string;
  detections: DetectedObject[];
  activeDetectionId: string | null;
  onHoverDetection: (id: string | null) => void;
}

export function DetectionViewer({
  imageUrl,
  fileName,
  detections,
  activeDetectionId,
  onHoverDetection,
}: DetectionViewerProps) {
  return (
    <div className={styles.viewer}>
      <div className={styles.viewerStage}>
        <img
          src={imageUrl}
          alt={`Inspección de acequia: ${fileName}`}
          className={styles.viewerImage}
        />
        {detections.map((detection) => (
          <DetectionBox
            key={detection.id}
            detection={detection}
            highlighted={activeDetectionId === detection.id}
            onHoverChange={onHoverDetection}
          />
        ))}
      </div>

      <div className={styles.viewerLegend}>
        <div className={styles.viewerLegendItems}>
          <span className={styles.viewerLegendItem}>
            <span className={classNames(styles.viewerSwatch, styles.viewerSwatchPlastic)} />
            Plásticos / envases
          </span>
          <span className={styles.viewerLegendItem}>
            <span className={classNames(styles.viewerSwatch, styles.viewerSwatchBranch)} />
            Ramas / poda
          </span>
          <span className={styles.viewerLegendItem}>
            <span className={classNames(styles.viewerSwatch, styles.viewerSwatchDebris)} />
            Escombros / sedimentos
          </span>
        </div>
        <span>Pasá el cursor sobre un recuadro para ver el detalle</span>
      </div>
    </div>
  );
}
