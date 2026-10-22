import { CATEGORY_LABEL, type DebrisCategory } from '../types';
import styles from './DetectionViewer.module.css';

interface DetectionTooltipProps {
  id: string;
  label: string;
  category: DebrisCategory;
  confidence: number;
}

export function DetectionTooltip({ id, label, category, confidence }: DetectionTooltipProps) {
  return (
    <div id={id} className={styles.detectionTooltip} role="tooltip">
      <span>
        {CATEGORY_LABEL[category]} · {label}
      </span>
      <span className={styles.detectionTooltipConfidence}>{confidence}%</span>
    </div>
  );
}
