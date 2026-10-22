# Gestión Hídrica Integral

Plataforma web de monitoreo, prevención y alerta de riesgos hídricos para la provincia de Mendoza, Argentina.

- **Macro-escala:** detección satelital de fugas en canales de riego (`satellite-monitoring`).
- **Micro-escala:** detección de basura en acequias urbanas mediante visión por computadora (`urban-channels`).
- **Panel central:** métricas, registros y mapa unificado (`dashboard`).

## Stack (versiones fijadas)

| Capa | Tecnologías |
|---|---|
| Frontend | React 19.3.1 · Vite 8.3.5 · TypeScript 5.9.3 · react-router-dom 7.18.4 · Leaflet 1.9.4 · react-leaflet 5.0.0 |
| Backend | NestJS 11.2.7 · @nestjs/config 4.0.4 · class-validator 0.15.1 · TypeScript 5.9.3 |
| Estilos | CSS puro (CSS Modules + BEM). Sin frameworks de utilidades. |
| Tests backend | Runner nativo `node:test` (sin dependencias extra) |

Requisito: **Node.js ≥ 20.19** (probado con Node 24 LTS). Ambas instalaciones (`npm install`) terminan con **0 vulnerabilidades** y sin conflictos de peer dependencies.

## Puesta en marcha

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run start:dev        # http://localhost:3000/api

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Arquitectura (Screaming Architecture)

```
backend/src/
├── core/                 config (.env validado), filtros HTTP, tipos geo, health
├── satellite-monitoring/ dominio, proveedores (mock | copernicus), servicio, controlador
├── urban-channels/       (Fase 2)
└── dashboard/            (Fase 3)

frontend/src/
├── app.config.ts         nombre del proyecto y configuración central
├── app/                  layout, router
├── shared/               estilos (tokens), UI genérica, cliente HTTP, mapa base
├── satellite-monitoring/ página, componentes, hooks, servicios
├── urban-channels/       (Fase 2)
└── dashboard/            (Fase 3)
```

## API disponible

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado y proveedores activos |
| GET | `/api/satellite/canals` | Canales (GeoJSON) con estado agregado |
| GET | `/api/satellite/alerts?canalId=&severity=` | Fugas potenciales por MNDWI |

## Configuración

- Nombre de la app: `frontend/src/app.config.ts` (`name`) y `APP_NAME` en `backend/.env`.
- Proveedores: `SATELLITE_PROVIDER=mock|copernicus`, `AI_VISION_PROVIDER=mock|huggingface|roboflow`.
- Umbrales MNDWI: `MNDWI_LEAK_THRESHOLD`, `MNDWI_MEDIUM_THRESHOLD`, `MNDWI_CRITICAL_THRESHOLD`.

> Las trazas de canales (Cacique Guaymallén, Zanjón Frías, Matriz San Martín) son aproximaciones de recorridos reales para el prototipo, no cartografía oficial.
