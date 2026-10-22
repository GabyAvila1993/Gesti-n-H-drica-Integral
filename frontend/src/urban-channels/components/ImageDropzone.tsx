import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Button } from '../../shared/ui/Button/Button';
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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className={styles.dropzoneWrapper}>
      <div
        role="button"
        tabIndex={0}
        className={classNames(styles.dropzone, dragging && styles.dropzoneActive)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        aria-label="Arrastrar o seleccionar una foto de acequia"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className={styles.dropzoneInput}
          onChange={handleFileChange}
          disabled={disabled}
        />
        <span className={styles.dropzoneIcon} aria-hidden="true">
          📸
        </span>
        <p className={styles.dropzoneTitle}>
          Arrastrá una foto de la acequia aquí o hacé clic para explorar
        </p>
        <p className={styles.dropzoneHint}>
          Formatos admitidos: JPG, PNG, WebP o SVG · Tomá la foto desde el borde del cauce
        </p>
        <Button variant="secondary" disabled={disabled}>
          Seleccionar imagen del dispositivo
        </Button>
      </div>

      <div className={styles.samples}>
        <p className={styles.samplesLabel}>
          ¿Querés probar el detector ahora? Elegí una escena simulada de acequia mendocina:
        </p>
        <div className={styles.samplesGrid}>
          {SAMPLE_PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={styles.sampleBtn}
              disabled={disabled}
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
