import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { toLatLng, type LeakAlert } from '../types';

/** Centra el mapa suavemente sobre la alerta seleccionada. */
export function MapFocus({ alert }: { alert: LeakAlert | null }) {
  const map = useMap();

  useEffect(() => {
    if (!alert) return;
    map.flyTo(toLatLng(alert.location.coordinates), Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });
  }, [alert, map]);

  return null;
}
