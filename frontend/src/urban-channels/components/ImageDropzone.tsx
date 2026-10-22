import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { classNames } from '../../shared/ui/class-names';
import {
  createSamplePhotoFile,
  SAMPLE_PHOTO_PRESETS,
  type SamplePhotoPreset,
} from '../services/sample-photos';
import styles from './ImageDropzone.module.css';

interface ImageDropzoneProps {
  disabled?: boolean;
  onSelectFile: (file: File, preset?: SamplePhotoPreset) => void;
}

export function ImageDropzone({ disabled = false, onSelectFile }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onSelectFile(file);
      event.target.value = '';
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className={styles.dropzoneWrapper}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Zona para arrastrar o seleccionar una foto de acequia desde el dispositivo. Presioná Enter o Espacio para abrir el explorador de archivos."
        aria-describedby="dropzone-formats-hint"
        className={classNames(styles.dropzone, dragging && styles.dropzoneActive)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className={styles.dropzoneInput}
          onChange={handleFileChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className={styles.dropzoneIcon} aria-hidden="true">
          📸
        </span>
        <p className={styles.dropzoneTitle}>
          Arrastrá una foto de la acequia aquí o presioná Enter / clic para explorar
        </p>
        <p id="dropzone-formats-hint" className={styles.dropzoneHint}>
          Formatos admitidos: JPG, PNG, WebP o SVG · Tomá la foto desde el borde del cauce
        </p>
        <span className={styles.dropzoneCta} aria-hidden="true">
          Seleccionar imagen del dispositivo
        </span>
      </div>

      <div className={styles.samples} role="region" aria-label="Escenas simuladas de prueba">
        <p id="samples-group-label" className={styles.samplesLabel}>
          ¿Querés probar el detector ahora? Elegí una escena simulada de acequia mendocina:
        </p>
        <div className={styles.samplesGrid} role="group" aria-labelledby="samples-group-label">
          {SAMPLE_PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={styles.sampleBtn}
              disabled={disabled}
              aria-label={`Probar escena ${preset.title}: ${preset.subtitle}`}
              onClick={() => onSelectFile(createSamplePhotoFile(preset), preset)}
            >
              <span className={styles.sampleBtnTitle}>{preset.title}</span>
              <span className={styles.sampleBtnSubtitle}>{preset.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
