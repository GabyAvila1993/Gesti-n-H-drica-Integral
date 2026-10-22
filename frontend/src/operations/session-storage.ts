import { useEffect, useState } from 'react';
import type { LoginResponse, UserRole } from './types';

export const SESSION_STORAGE_KEY = 'ghi_municipal_session_v1';
const SESSION_CHANGE_EVENT = 'ghi-municipal-session-change';

const ROLE_PANEL_TITLES: Record<UserRole, string> = {
  ADMIN: 'Panel Administrador',
  ENCARGADO: 'Panel Encargado',
  CUADRILLA: 'Panel Cuadrilla',
};

const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  ENCARGADO: 'Encargado',
  CUADRILLA: 'Cuadrilla',
};

export function loadStoredSession(): LoginResponse | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: LoginResponse | null): void {
  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
  } catch {
    // Ignorar errores de cuota de almacenamiento
  }
}

export function getRolePanelTitle(role?: UserRole | null): string {
  if (!role) return 'Panel Administrador';
  return ROLE_PANEL_TITLES[role] ?? 'Panel Administrador';
}

export function getRoleShortLabel(role?: UserRole | null): string {
  if (!role) return 'Admin';
  return ROLE_SHORT_LABELS[role] ?? 'Admin';
}

export function useStoredSession(): LoginResponse | null {
  const [session, setSession] = useState<LoginResponse | null>(() => loadStoredSession());

  useEffect(() => {
    const handleSync = () => {
      setSession(loadStoredSession());
    };
    window.addEventListener(SESSION_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SESSION_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return session;
}
