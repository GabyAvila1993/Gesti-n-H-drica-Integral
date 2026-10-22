import { classNames } from '../../shared/ui/class-names';
import styles from './MetricCard.module.css';

export type MetricTone = 'info' | 'warning' | 'critical' | 'low';

const TONE_CLASS: Record<MetricTone, string> = {
  info: styles.metricCardInfo,
  warning: styles.metricCardWarning,
  critical: styles.metricCardCritical,
  low: styles.metricCardLow,
};

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
  tone?: MetricTone;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'info',
}: MetricCardProps) {
  return (
    <article className={classNames(styles.metricCard, TONE_CLASS[tone])}>
      <div className={styles.metricCardTop}>
        <p className={styles.metricCardLabel}>{label}</p>
        <span className={styles.metricCardIcon} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className={styles.metricCardValue}>{value}</p>
      <p className={styles.metricCardSubtitle}>{subtitle}</p>
    </article>
  );
}
