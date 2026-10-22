import type { ReactNode } from 'react';
import { classNames } from '../class-names';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section className={classNames(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.cardHeader}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {actions}
        </header>
      )}
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}
