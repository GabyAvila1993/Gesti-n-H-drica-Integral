import 'leaflet/dist/leaflet.css';
import type { ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { appConfig } from '../../app.config';
import { classNames } from '../ui/class-names';
import styles from './BaseMap.module.css';

interface BaseMapProps {
  children?: ReactNode;
  className?: string;
}

/** Mapa base reutilizable por todos los dominios. Teselas y centro configurables vía .env. */
export function BaseMap({ children, className }: BaseMapProps) {
  return (
    <MapContainer
      center={appConfig.map.defaultCenter}
      zoom={appConfig.map.defaultZoom}
      zoomControl={false}
      scrollWheelZoom
      className={classNames(styles.baseMap, className)}
    >
      <TileLayer url={appConfig.map.tilesUrl} attribution={appConfig.map.attribution} />
      <ZoomControl position="bottomright" />
      {children}
    </MapContainer>
  );
}
