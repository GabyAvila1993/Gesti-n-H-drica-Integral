import { useId, type SelectHTMLAttributes } from 'react';
import { classNames } from '../class-names';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: readonly SelectOption[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={classNames(styles.selectField, className)}>
      {label && (
        <label htmlFor={selectId} className={styles.selectFieldLabel}>
          {label}
        </label>
      )}
      <select id={selectId} className={styles.selectFieldControl} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
