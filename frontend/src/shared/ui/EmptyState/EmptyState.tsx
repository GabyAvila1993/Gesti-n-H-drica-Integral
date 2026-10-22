import type { ReactNode } from 'react';
import { classNames } from '../class-names';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

export function EmptyState({ icon, title, description, action, tone = 'neutral' }: EmptyStateProps) {
  return (
    <div
      className={classNames(styles.emptyState, tone === 'error' && styles.emptyStateError)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {icon && (
        <span className={styles.emptyStateIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className={styles.emptyStateTitle}>{title}</h3>
      {description && <p className={styles.emptyStateDescription}>{description}</p>}
      {action}
    </div>
  );
}
