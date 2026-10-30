import { Link } from 'react-router-dom';
import { EmptyState } from '../components/StatePanels';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="container">
      <EmptyState
        title="That page doesn't exist"
        action={
          <Link to="/" className="btn btn--primary">
            Back to the start
          </Link>
        }
      >
        Check the address, or head back to the start.
      </EmptyState>
    </div>
  );
}
