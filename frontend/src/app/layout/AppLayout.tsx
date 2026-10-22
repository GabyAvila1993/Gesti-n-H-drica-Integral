import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useMatches } from 'react-router-dom';
import { appConfig } from '../../app.config';
import { PwaInstallButton } from '../../shared/pwa/PwaInstallButton';
import { ThemeToggle } from '../../shared/theme/ThemeToggle';
import { classNames } from '../../shared/ui/class-names';
import { ROUTES } from '../routes';
import { BackendStatus } from './BackendStatus';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Panel central', shortLabel: 'Panel', icon: '📊', end: true },
  {
    to: ROUTES.satellite,
    label: 'Monitoreo satelital',
    shortLabel: 'Satelital',
    icon: '🛰️',
    end: false,
  },
  {
    to: ROUTES.urban,
    label: 'Acequias urbanas',
    shortLabel: 'Acequias',
    icon: '🏙️',
    end: false,
  },
];

export function AppLayout() {
  const matches = useMatches();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = [...matches].reverse().find((m) => (m.handle as { title?: string })?.title);
  const pageTitle = (current?.handle as { title?: string } | undefined)?.title ?? appConfig.name;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className={styles.appLayout}>
      <div
        className={classNames(styles.sidebarBackdrop, menuOpen && styles.sidebarBackdropOpen)}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="main-sidebar"
        className={classNames(styles.sidebar, menuOpen && styles.sidebarOpen)}
        aria-label="Menú lateral"
      >
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarLogo} aria-hidden="true">
              {appConfig.shortName}
            </span>
            <div>
              <p className={styles.sidebarName}>{appConfig.name}</p>
              <p className={styles.sidebarRegion}>Mendoza · AR</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                classNames(styles.sidebarLink, isActive && styles.sidebarLinkActive)
              }
            >
              <span className={styles.sidebarLinkIcon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className={styles.sidebarFooter}>{appConfig.region}</p>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.headerMenuBtn}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="main-sidebar"
              aria-label="Abrir menú de navegación"
            >
              ☰
            </button>
            <div className={styles.headerTitles}>
              <h1 className={styles.headerTitle}>{pageTitle}</h1>
              <p className={styles.headerSubtitle}>{appConfig.tagline}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <PwaInstallButton />
            <ThemeToggle />
            <BackendStatus />
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>

        <nav className={styles.bottomNav} aria-label="Navegación móvil rápida">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                classNames(styles.bottomNavLink, isActive && styles.bottomNavLinkActive)
              }
            >
              <span className={styles.bottomNavIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.shortLabel}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
