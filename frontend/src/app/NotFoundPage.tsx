import { Link } from 'react-router-dom';
import { Button } from '../shared/ui/Button/Button';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon="🧭"
      title="Página no encontrada"
      description="La sección que buscás no existe o fue movida."
      action={
        <Link to="/">
          <Button variant="secondary">Volver al panel</Button>
        </Link>
      }
    />
  );
}
