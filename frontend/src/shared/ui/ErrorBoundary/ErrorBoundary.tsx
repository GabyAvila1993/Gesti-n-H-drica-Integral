import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Se produjo un error inesperado al procesar los datos.',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error capturado de forma controlada para evitar pantalla en blanco
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className={styles.errorBoundary} role="alert" aria-live="assertive">
          <div className={styles.errorBoundaryCard}>
            <span className={styles.errorBoundaryIcon} aria-hidden="true">
              ⚠️
            </span>
            <h1 className={styles.errorBoundaryTitle}>
              Ocurrió un inconveniente al mostrar la vista
            </h1>
            <p className={styles.errorBoundaryDescription}>{this.state.message}</p>
            <Button variant="primary" onClick={this.handleReload}>
              Recargar aplicación
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
