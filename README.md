# Gestión Hídrica Integral

Plataforma GovTech de monitoreo inteligente, prevención y gestión operativa de riesgos hídricos para la provincia de Mendoza, Argentina. 

El sistema integra análisis satelital espectral, visión artificial en el borde con Groq LPU, bases de datos geoespaciales con PostGIS y un sistema de control operativo en tiempo real para cuadrillas municipales con auditoría fotográfica.

---

## 1. Visión y Capacidades del Sistema

Mendoza es un oasis artificialmente irrigado sostenido por más de 5.000 kilómetros de acequias y canales matrices. La acumulación de más de 6.000 toneladas anuales de residuos sólidos en los cauces genera colapsos aluvionales, pérdidas hídricas y sobrecostos operativos para los municipios.

**Gestión Hídrica Integral** ataca el problema en tres escalas coordinadas:

1. **Macro-Escala (Monitoreo Satelital de Canales Matrices · DGI):**  
   Vigilancia continua de los cauces históricos (Canal Cacique Guaymallén, Canal Zanjón/Frías, Canal Matriz San Martín). Procesa bandas satelitales mediante el índice espectral **MNDWI** (*Modified Normalized Difference Water Index*) para detectar filtraciones, fugas y desbordes hacia el terreno circundante antes de que el agua se pierda.

2. **Micro-Escala (Visión Artificial en Acequias Urbanas con Groq LPU):**  
   Diagnóstico instantáneo a partir de fotografías tomadas por vecinos o inspectores. Utiliza el modelo multimodal **`qwen/qwen3.8-27b`** sobre procesadores LPU de **Groq**, logrando inferencias en menos de **1,5 segundos**. Detecta y ubica con cajas delimitadoras (*bounding boxes*) residuos clasificados en **plásticos**, **ramas de poda** y **escombros**, calculando el porcentaje de la sección obstruida y asignando una prioridad técnica objetiva (Bajo, Medio o Crítico).

3. **Escala Operativa Municipal (RBAC, Clustering y Ruteo Vial Táctico):**  
   Circuito digital integral de trabajo con tres roles:
   - **Administrador:** Métricas de rendimiento comunal, tiempos promedio de resolución y gestión del personal.
   - **Encargado:** Mapa estratégico con algoritmo de **Clustering Espacial DBSCAN Adaptativo**, que agrupa las alertas cercanas calculando el círculo envolvente mínimo y la envolvente convexa (*Convex Hull*) para despachar camiones a sectores críticos consolidados.
   - **Cuadrilla en Terreno:** Mapa táctico con **motor de ruteo vial real (OSRM)** que calcula el camino más rápido por las calles de la ciudad y recalcula la ruta ante desvíos mayores a 50 metros mediante geolocalización continua (`navigator.geolocation.watchPosition`).
   - **Auditoría Fotográfica Obligatoria:** Mecanismo de cierre de orden de trabajo donde el operario debe adjuntar obligatoriamente dos fotografías de evidencia (**Antes** y **Después**) con coordenadas GPS, generando un legajo digital auditable para el Tribunal de Cuentas y los portales de Transparencia Fiscal.

---

## 2. Stack Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19 · Vite 8 · TypeScript 5 · React Router 7 | Interfaz SPA responsiva, accesible y de alta velocidad. |
| **Cartografía** | Leaflet 1.9 · React-Leaflet 5 · OSRM API | Renderizado de polilíneas de canales, marcadores y rutas viales reales. |
| **Estilos** | CSS Puro (CSS Modules + Tokens BEM) | Sin frameworks invasivos de utilidades; rendimiento nativo y diseño accesible. |
| **Backend** | NestJS 11 · TypeScript 5 · Node.js ≥ 20 (LTS) | Arquitectura modular desacoplada basada en Clean Architecture y Domain-Driven Design. |
| **Base de Datos** | PostgreSQL 16 + Extensión PostGIS (Neon.tech) | Persistencia relacional y consultas espaciales georreferenciadas (`Geometry`). |
| **ORM** | TypeORM 0.3 | Mapeo objeto-relacional con soporte de entidades espaciales y migraciones idempotentes. |
| **IA / Visión** | Groq Cloud SDK (`qwen/qwen3.8-27b`) | Inferencia de visión artificial ultra-rápida con respuesta estructurada en formato JSON estricto. |
| **Almacenamiento** | StorageService desacoplado | Subida y validación criptográfica de firmas binarias (magic bytes) de evidencias fotográficas. |
| **Seguridad** | JWT (JSON Web Tokens) · bcryptjs | Autenticación basada en roles municipales (ADMIN, ENCARGADO, CUADRILLA). |
| **Testing** | Runner nativo `node:test` (18 tests unitarios) | Pruebas automáticas de validación de archivos, clustering DBSCAN, cálculo de obstrucción y ruteo. |

---

## 3. Arquitectura del Proyecto (Screaming Architecture)

```
gestión hídrica integral/
├── backend/
│   ├── src/
│   │   ├── main.ts                         # Bootstrap NestJS, prefijo /api, CORS cloud y Swagger
│   │   ├── app.module.ts
│   │   ├── core/                           # Módulos transversales del sistema
│   │   │   ├── config/                     # Variables de entorno validadas con class-validator
│   │   │   ├── database/                   # Conexión PostgreSQL + PostGIS (TypeORM)
│   │   │   │   └── entities/               # UserEntity, UrbanAlertEntity, TaskAssignmentEntity
│   │   │   ├── geo/                        # Tipos GeoJSON (Point, LineString) y cálculos geodésicos
│   │   │   ├── health/                     # GET /api/health
│   │   │   ├── security/                   # Validador de imágenes y magic bytes
│   │   │   └── storage/                    # StorageService desacoplado (archivos de evidencias)
│   │   ├── satellite-monitoring/           # Detección satelital de fugas con índice MNDWI
│   │   │   ├── application/                # satellite-monitoring.service.ts
│   │   │   ├── domain/                     # canal.ts, mndwi-classifier.ts
│   │   │   └── providers/                  # mock-satellite.provider.ts, copernicus-satellite.provider.ts
│   │   ├── urban-channels/                 # Visión artificial en acequias y cálculo de obstrucción
│   │   │   ├── application/                # urban-analysis.service.ts, obstruction-calculator.ts
│   │   │   ├── domain/                     # detection.ts, risk-level.ts, urban-alert.ts
│   │   │   └── providers/                  # pixel-vision.analyzer.ts (Groq LPU), mock-vision.provider.ts
│   │   ├── operations/                     # Operatoria municipal, roles RBAC y logística de cuadrillas
│   │   │   ├── application/                # operations.service.ts, spatial-clustering.ts (DBSCAN)
│   │   │   ├── domain/                     # operations.types.ts
│   │   │   └── dto/                        # LoginDto, CreateStaffUserDto, AssignTaskDto, ResolveTaskDto
│   │   └── dashboard/                      # Agregador central de métricas comunales y mapa unificado
│   │       └── application/                # dashboard.service.ts
│   ├── test/                               # Suites de pruebas con node:test
│   ├── .env.example                        # Plantilla de variables documentada sin secretos
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                            # Router, layout base y navegación
│   │   ├── shared/                         # Componentes UI (Button, Card, RiskBadge, Select), BaseMap Leaflet
│   │   ├── satellite-monitoring/           # Vista satelital de canales con trazas del DGI
│   │   ├── urban-channels/                 # Vista de inspección ciudadana con visor de bounding boxes
│   │   ├── operations/                     # Vistas operativas: Admin, Encargado (DBSCAN) y Cuadrilla (OSRM)
│   │   └── dashboard/                      # Panel ejecutivo de indicadores y mapa integral
│   ├── .env.example                        # Variables de entorno para Vite (desarrollo y producción)
│   └── package.json
│
├── README.md
└── .gitignore                              # Blindaje de variables reales y documentos privados
```

---

## 4. Endpoints Principales de la API

La API cuenta con documentación interactiva **Swagger/OpenAPI** disponible en `/api/docs`.

### Salud y Diagnóstico
- `GET /api/health` — Estado de los servicios, base de datos y proveedores activos de IA y satélite.

### Monitoreo Satelital
- `GET /api/satellite/canals` — Trazas georreferenciadas GeoJSON de canales matrices de Mendoza con estado consolidado.
- `GET /api/satellite/alerts?canalId=&severity=` — Alertas de pérdida de agua o desborde por anomalías del índice MNDWI.

### Acequias Urbanas y Visión Artificial
- `POST /api/urban/analyze` — Analiza una fotografía de acequia con Groq LPU, devolviendo % de obstrucción, clasificación de riesgo y cajas delimitadoras.
- `POST /api/urban/alerts` — Registra una alerta comunal georreferenciada a partir de un análisis.
- `GET /api/urban/alerts` — Consulta el listado de alertas pendientes de resolución.

### Operaciones Municipales y Cuadrillas (RBAC)
- `GET /api/operations/demo-accounts` — Listado de cuentas de demostración preconfiguradas para pruebas.
- `POST /api/operations/auth/login` — Autenticación municipal y emisión de token Bearer JWT.
- `GET /api/operations/admin/stats` — Métricas de eficiencia de cuadrillas, tiempos promedio y volumen histórico.
- `GET /api/operations/manager/overview` — Mapa estratégico del Encargado con alertas agrupadas mediante clustering DBSCAN.
- `POST /api/operations/manager/assignments` — Asignación de una orden de trabajo a una cuadrilla.
- `GET /api/operations/crew/tasks` — Vista táctica para la cuadrilla con sus alertas asignadas pendientes.
- `GET /api/operations/crew/tasks/history` — Historial de tareas completadas en las últimas 24 horas.
- `POST /api/operations/crew/tasks/:id/resolve` — Cierre auditado de tarea que exige obligatoriamente las fotografías de "Antes" y "Después".

---

## 5. Puesta en Marcha en Desarrollo Local

### Prerrequisitos
- **Node.js ≥ 20.19** (compatible con Node 22 y 24 LTS).
- **npm** (o gestor de paquetes de preferencia).

### Paso 1: Configurar el Backend
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```
El servidor backend iniciará en `http://localhost:3000/api` y la documentación Swagger estará disponible en `http://localhost:3000/api/docs`.

### Paso 2: Configurar el Frontend
En una nueva terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
La aplicación web se ejecutará en `http://localhost:5173`.

---

## 6. Variables de Entorno y Fuentes Oficiales

Los archivos `.env.example` tanto en `backend/` como en `frontend/` están completamente sanitizados sin exponer contraseñas ni claves privadas:

- **Base de Datos PostGIS (`DATABASE_URL`):** Puede obtenerse de forma gratuita en [Neon Serverless Postgres](https://neon.tech). Al conectar, el backend ejecuta automáticamente `CREATE EXTENSION IF NOT EXISTS postgis;`. Si se deja vacía en local, el sistema conmuta automáticamente a un almacén en memoria con datos semilla de Mendoza.
- **Visión por Computadora con IA (`GROQ_API_KEY`):** Las claves se obtienen gratuitamente en [Groq Cloud Console](https://console.groq.com/keys). El modelo activo de visión configurado por defecto es `qwen/qwen3.8-27b`. En caso de ausencia de clave, el backend conmuta a un analizador determinista local de respaldo.
- **Datos Satelitales Copernicus (`COPERNICUS_API_URL`):** Proveedor oficial de la Agencia Espacial Europea [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu).
- **Cartografía y Mapas (`VITE_MAP_TILES_URL`):** Utiliza los servidores de teselas abiertas y libres de [OpenStreetMap](https://www.openstreetmap.org).

---

## 7. Ejecución de Pruebas Unitarias

El backend incluye pruebas automatizadas con el ejecutor nativo de Node.js (`node:test`):

```bash
cd backend
npm test
```
Las pruebas cubren:
- Seguridad de subida de archivos (validación binaria de cabeceras JPEG/PNG y bloqueo de extensiones maliciosas).
- Clustering espacial adaptativo DBSCAN y cálculo de polígonos convexos (*Convex Hull*).
- Clasificación de índices espectrales MNDWI para detección de fugas.
- Algoritmo de cálculo de cobertura y obstrucción hídrica.
- Análisis de textura de imágenes y tolerancia a fallos determinista del motor de visión.

---

## 8. Licencia y Consideraciones

Este proyecto ha sido desarrollado como una solución GovTech orientada a la sostenibilidad y la modernización de la gestión hídrica municipal. Código propietario registrado. Todos los derechos reservados.
