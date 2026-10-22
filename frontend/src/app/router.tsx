import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardPage } from '../dashboard/DashboardPage';
import { OperationsPanelPage } from '../operations/OperationsPanelPage';
import { SatelliteMonitoringPage } from '../satellite-monitoring/SatelliteMonitoringPage';
import { UrbanChannelsPage } from '../urban-channels/UrbanChannelsPage';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { ROUTES } from './routes';

export const router = createBrowserRouter([
  {
    path: ROUTES.dashboard,
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage />, handle: { title: 'Panel central' } },
      {
        path: ROUTES.satellite.slice(1),
        element: <SatelliteMonitoringPage />,
        handle: { title: 'Monitoreo satelital de canales' },
      },
      {
        path: ROUTES.urban.slice(1),
        element: <UrbanChannelsPage />,
        handle: { title: 'Acequias urbanas' },
      },
      {
        path: ROUTES.admin.slice(1),
        element: <OperationsPanelPage />,
        handle: { title: 'Panel Administrador' },
      },
      { path: 'inicio', element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Página no encontrada' } },
    ],
  },
]);
