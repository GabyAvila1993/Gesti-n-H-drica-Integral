import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { appConfig } from './app.config';
import { router } from './app/router';
import { registerServiceWorker } from './shared/pwa/register-sw';
import './shared/styles/reset.css';
import './shared/styles/tokens.css';
import './shared/styles/global.css';
import { ErrorBoundary } from './shared/ui/ErrorBoundary/ErrorBoundary';

document.title = appConfig.name;
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
