import { CATEGORY_LABEL, type DebrisCategory } from '../types';
import styles from './DetectionViewer.module.css';

interface DetectionTooltipProps {
  label: string;
  category: DebrisCategory;
  confidence: number;
}

export function DetectionTooltip({ label, category, confidence }: DetectionTooltipProps) {
  return (
    <div className={styles.detectionTooltip} role="tooltip">
      <span>
        {CATEGORY_LABEL[category]} · {label}
      </span>
      <span className={styles.detectionTooltipConfidence}>{confidence}%</span>
    </div>
  );
}
