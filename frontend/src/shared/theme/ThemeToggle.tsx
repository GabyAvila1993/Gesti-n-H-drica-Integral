import { useTheme } from './useTheme';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={
        isDark
          ? 'Tema actual: Modo oscuro. Cambiar a modo claro'
          : 'Tema actual: Modo claro. Cambiar a modo oscuro'
      }
      title={
        isDark
          ? 'Tema actual: Modo oscuro (clic para cambiar a modo claro)'
          : 'Tema actual: Modo claro (clic para cambiar a modo oscuro)'
      }
    >
      <span className={styles.themeToggleIcon} aria-hidden="true">
        {isDark ? '🌙' : '☀️'}
      </span>
      <span className={styles.themeToggleLabel}>{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
    </button>
  );
}
