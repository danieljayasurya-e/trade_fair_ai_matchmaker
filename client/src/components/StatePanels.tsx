import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface PanelProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}

export function EmptyState({ title, children, action, icon = 'inbox' }: PanelProps) {
  return (
    <section className="state-panel">
      <span className="state-panel__icon">
        <Icon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </section>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="state-panel state-panel--error" role="alert">
      <span className="state-panel__icon">
        <Icon name="alert" size={28} />
      </span>
      <h2>We couldn't load your matches</h2>
      <p>{message} Your profile and saved stalls are safe. Try again to rerun the match.</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

/** Grey placeholder rows with the same footprint as match cards. */
export function MatchSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <span className="skeleton-row__ring" />
          <span className="skeleton-row__lines">
            <span style={{ width: '40%' }} />
            <span style={{ width: '70%' }} />
            <span style={{ width: '30%' }} />
          </span>
        </div>
      ))}
    </div>
  );
}
