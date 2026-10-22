import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../shared/api/http-client';
import { Button } from '../shared/ui/Button/Button';
import { Card } from '../shared/ui/Card/Card';
import { Input } from '../shared/ui/Input/Input';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CrewTacticalView } from './components/CrewTacticalView';
import { ManagerStrategicView } from './components/ManagerStrategicView';
import styles from './OperationsPanelPage.module.css';
import { operationsApi } from './services/operations.api';
import type { LoginResponse, PublicUser } from './types';

const SESSION_STORAGE_KEY = 'ghi_municipal_session_v1';
const DEMO_DEFAULT_PASSWORD = 'mendoza2026';

function loadStoredSession(): LoginResponse | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function OperationsPanelPage() {
  const [session, setSession] = useState<LoginResponse | null>(() => loadStoredSession());
  const [demoAccounts, setDemoAccounts] = useState<PublicUser[]>([]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    operationsApi
      .getDemoAccounts(controller.signal)
      .then((accounts) => setDemoAccounts(accounts))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const performLogin = async (targetUser: string, targetPass: string) => {
    setSubmitting(true);
    setLoginError(null);
    try {
      const response = await operationsApi.login(targetUser, targetPass);
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(response));
      setSession(response);
      setUsername('');
      setPassword('');
    } catch (err) {
      setLoginError(
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión en el servidor.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('Completá tu nombre de usuario y contraseña municipal.');
      return;
    }
    void performLogin(username.trim(), password);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  };

  if (!session) {
    return (
      <div className={styles.loginLayout}>
        <Card title="Acceso Operativo Municipal (RBAC · JWT)">
          <form className={styles.loginForm} onSubmit={handleFormSubmit}>
            <p className={styles.loginHint}>
              Ingresá con tu cuenta municipal para acceder al panel según tu rol asignado (
              <strong>ADMIN</strong>, <strong>ENCARGADO</strong> o <strong>CUADRILLA</strong>).
            </p>

            <Input
              label="Usuario municipal"
              placeholder="Ej.: adminCapital, encargadoCapital, cuadrillaCapital1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Contraseña operativa"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {loginError && (
              <div className={styles.errorBox} role="alert">
                {loginError}
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Verificando credenciales…' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>

        <Card title="Acceso Rápido para Evaluación de los 3 Roles">
          <div className={styles.demoAccountsList}>
            <p className={styles.loginHint}>
              Seleccioná cualquiera de las cuentas preconfiguradas (contraseña:{' '}
              <code>{DEMO_DEFAULT_PASSWORD}</code>) para inspeccionar las vistas de{' '}
              <strong>ADMIN</strong>, <strong>ENCARGADO</strong> y <strong>CUADRILLA</strong>:
            </p>

            {demoAccounts.map((acc) => (
              <div key={acc.id} className={styles.demoAccountItem}>
                <div className={styles.demoAccountMeta}>
                  <span className={styles.demoAccountTitle}>
                    {acc.username} · <span className={styles.roleBadge}>{acc.role}</span>
                  </span>
                  <span className={styles.demoAccountSub}>
                    {acc.fullName} — Municipio: <strong>{acc.municipality}</strong>
                  </span>
                </div>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void performLogin(acc.username, DEMO_DEFAULT_PASSWORD)}
                >
                  Ingresar como {acc.role}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.sessionBar} aria-label="Sesión operativa activa">
        <div className={styles.sessionInfo}>
          <span className={styles.roleBadge}>Rol: {session.user.role}</span>
          <span className={styles.municipalityTag}>Municipio: {session.user.municipality}</span>
          <span className={styles.sessionUserText}>
            {session.user.fullName} ({session.user.username})
          </span>
        </div>

        <div className={styles.sessionActions}>
          {demoAccounts
            .filter((acc) => acc.municipality === session.user.municipality)
            .map((acc) => (
              <Button
                key={acc.id}
                variant={acc.username === session.user.username ? 'primary' : 'ghost'}
                disabled={submitting || acc.username === session.user.username}
                onClick={() => void performLogin(acc.username, DEMO_DEFAULT_PASSWORD)}
              >
                Ver rol {acc.role} ({acc.username})
              </Button>
            ))}
          <Button variant="secondary" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      {session.user.role === 'ADMIN' && (
        <AdminDashboardView token={session.accessToken} currentUser={session.user} />
      )}

      {session.user.role === 'ENCARGADO' && (
        <ManagerStrategicView token={session.accessToken} currentUser={session.user} />
      )}

      {session.user.role === 'CUADRILLA' && (
        <CrewTacticalView token={session.accessToken} currentUser={session.user} />
      )}
    </div>
  );
}
