import { useId, type InputHTMLAttributes } from 'react';
import { classNames } from '../class-names';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={classNames(styles.inputField, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.inputFieldLabel}>
          {label}
        </label>
      )}
      <input id={inputId} className={styles.inputFieldControl} {...props} />
    </div>
  );
}
