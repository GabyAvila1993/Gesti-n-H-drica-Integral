import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, resolveBackendAssetUrl } from '../../shared/api/http-client';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Input/Input';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { Select, type SelectOption } from '../../shared/ui/Select/Select';
import { Spinner } from '../../shared/ui/Spinner/Spinner';
import styles from '../OperationsPanelPage.module.css';
import { operationsApi } from '../services/operations.api';
import type { MunicipalOperationsStats, PublicUser } from '../types';

interface AdminDashboardViewProps {
  token: string;
  currentUser: PublicUser;
}

const ROLE_OPTIONS: readonly SelectOption[] = [
  { value: 'ENCARGADO', label: 'Encargado Operativo (Mapa Estratégico)' },
  { value: 'CUADRILLA', label: 'Cuadrilla de Limpieza (Mapa Táctico)' },
];

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Mendoza',
});

export function AdminDashboardView({ token, currentUser }: AdminDashboardViewProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [stats, setStats] = useState<MunicipalOperationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ENCARGADO' | 'CUADRILLA'>('CUADRILLA');
  const [fullName, setFullName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffList, statsData] = await Promise.all([
        operationsApi.getAdminUsers(token),
        operationsApi.getAdminStats(token),
      ]);
      setUsers(staffList);
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la información del Panel Administrador.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormFeedback(null);

    if (username.trim().length < 3 || password.trim().length < 6) {
      setFormFeedback({
        tone: 'error',
        text: 'El usuario debe tener al menos 3 caracteres y la contraseña un mínimo de 6 caracteres.',
      });
      return;
    }

    setCreating(true);
    try {
      const created = await operationsApi.createStaffUser(token, {
        username: username.trim(),
        password: password.trim(),
        role,
        fullName: fullName.trim() || undefined,
      });
      setUsers((prev) => [...prev, created]);
      setUsername('');
      setPassword('');
      setFullName('');
      setFormFeedback({
        tone: 'success',
        text: `Usuario "${created.username}" (${created.role}) registrado en ${created.municipality}.`,
      });
      void loadData();
    } catch (err) {
      setFormFeedback({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'No se pudo crear el usuario.',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading && !stats) {
    return <Spinner label="Cargando estadísticas históricas y personal del municipio…" />;
  }

  if (error) {
    return (
      <EmptyState
        tone="error"
        icon="⚠️"
        title="Error al cargar el Panel Administrador"
        description={error}
        action={<Button onClick={() => void loadData()}>Reintentar</Button>}
      />
    );
  }

  return (
    <div className={styles.page}>
      {stats && (
        <section className={styles.kpiGrid} aria-label="Indicadores históricos del municipio">
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total histórico ({stats.municipality})</span>
            <span className={styles.kpiValue}>{stats.totalHistoricalAlerts}</span>
            <span className={styles.kpiSub}>Reportes registrados en base de datos</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Alertas activas (Mapa público)</span>
            <span className={styles.kpiValue}>{stats.pendingAlertsCount}</span>
            <span className={styles.kpiSub}>Estado PENDING en curso</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Acequias limpiadas (Soft Delete)</span>
            <span className={styles.kpiValue}>{stats.resolvedAlertsCount}</span>
            <span className={styles.kpiSub}>Estado RESOLVED · ocultas del mapa público</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Tiempo promedio de limpieza</span>
            <span className={styles.kpiValue}>
              {stats.avgResolutionMinutes > 0 ? `${stats.avgResolutionMinutes} min` : '—'}
            </span>
            <span className={styles.kpiSub}>Desde asignación hasta cierre de tarea</span>
          </div>
        </section>
      )}

      <div className={styles.adminTwoCol}>
        <Card title={`Alta de personal · ${currentUser.municipality}`}>
          <form className={styles.staffForm} onSubmit={(e) => void handleCreateUser(e)}>
            <div className={styles.lockedField}>
              Jurisdicción asignada por tu rol ADMIN: <strong>{currentUser.municipality}</strong>
            </div>

            <Select
              label="Rol operativo"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(e) => setRole(e.target.value as 'ENCARGADO' | 'CUADRILLA')}
            />

            <Input
              label="Nombre de usuario"
              placeholder="Ej.: cuadrillaCapital3 o encargadoNorte"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Contraseña inicial (hash bcrypt)"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Identificación / Nombre completo"
              placeholder="Ej.: Cuadrilla Hidráulica #3 (Sexta Sección)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            {formFeedback && (
              <div
                className={
                  formFeedback.tone === 'success' ? styles.successBox : styles.errorBox
                }
                role="status"
              >
                {formFeedback.text}
              </div>
            )}

            <Button type="submit" disabled={creating}>
              {creating ? 'Guardando usuario…' : 'Crear usuario municipal'}
            </Button>
          </form>
        </Card>

        <Card title={`Rendimiento de Cuadrillas y Personal (${users.length})`}>
          {stats && stats.crewEfficiency.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cuadrilla</th>
                    <th>Usuario</th>
                    <th>Limpiadas (RESOLVED)</th>
                    <th>En curso (PENDING)</th>
                    <th>Tiempo medio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.crewEfficiency.map((crew) => (
                    <tr key={crew.crewId}>
                      <td>
                        <strong>{crew.fullName}</strong>
                      </td>
                      <td>{crew.username}</td>
                      <td>{crew.resolvedCount}</td>
                      <td>{crew.pendingCount}</td>
                      <td>
                        {crew.avgResolutionMinutes > 0
                          ? `${crew.avgResolutionMinutes} min`
                          : 'Sin cierres aún'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Nombre / Identificación</th>
                  <th>Municipio</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td>
                      <span className={styles.roleBadge}>{u.role}</span>
                    </td>
                    <td>{u.fullName}</td>
                    <td>{u.municipality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title={`Histórico de Acequias Resueltas — Soft Delete RESOLVED (${
          stats?.resolvedHistory.length ?? 0
        })`}
        actions={
          <Button variant="ghost" onClick={() => void loadData()}>
            Actualizar estadísticas
          </Button>
        }
      >
        {!stats || stats.resolvedHistory.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Aún no hay alertas cerradas en este municipio"
            description="Cuando una cuadrilla presione 'Acequia Limpia / Cerrar Tarea', la alerta pasará a estado RESOLVED y aparecerá en este registro estadístico."
          />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dirección</th>
                  <th>Riesgo</th>
                  <th>Asignado por (Encargado)</th>
                  <th>Ejecutado por (Cuadrilla)</th>
                  <th>Auditoría Fotográfica</th>
                  <th>Tiempo de resolución</th>
                  <th>Cierre (RESOLVED)</th>
                </tr>
              </thead>
              <tbody>
                {stats.resolvedHistory.map((item) => {
                  const beforeUrl =
                    item.alert.evidenceBeforeUrl ?? item.assignment?.evidenceBeforeUrl;
                  const afterUrl =
                    item.alert.evidenceAfterUrl ?? item.assignment?.evidenceAfterUrl;

                  return (
                    <tr key={item.alert.id}>
                      <td>
                        <strong>{item.alert.address}</strong>
                        {item.alert.notes && (
                          <div className={styles.demoAccountSub}>{item.alert.notes}</div>
                        )}
                      </td>
                      <td>
                        <RiskBadge level={item.alert.riskLevel} />
                      </td>
                      <td>{item.assignment?.assignedByName ?? 'Supervisión Municipal'}</td>
                      <td>{item.assignment?.crewName ?? 'Cuadrilla de Guardia'}</td>
                      <td>
                        {beforeUrl && afterUrl ? (
                          <div className={styles.evidenceLinksCell}>
                            <a
                              href={resolveBackendAssetUrl(beforeUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.evidenceLink}
                            >
                              📷 Foto Antes
                            </a>
                            <a
                              href={resolveBackendAssetUrl(afterUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.evidenceLink}
                            >
                              📷 Foto Después
                            </a>
                          </div>
                        ) : (
                          <span className={styles.demoAccountSub}>Registro previo</span>
                        )}
                      </td>
                      <td>
                        <strong>{item.resolutionMinutes} min</strong>
                      </td>
                      <td>
                        {item.alert.resolvedAt
                          ? dateFormatter.format(new Date(item.alert.resolvedAt))
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
