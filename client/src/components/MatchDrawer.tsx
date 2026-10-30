import { useEffect, useRef } from 'react';
import type { Match } from '../types';
import { MatchDetail } from './MatchDetail';
import type { MatchDetailProps } from './MatchDetail';

interface MatchDrawerProps extends Omit<MatchDetailProps, 'match'> {
  match: Match | null;
  /** "inline" sits beside the list (laptop); "modal" opens as a sheet over it (phone, tablet). */
  mode: 'inline' | 'modal';
}

export function MatchDrawer({ match, mode, ...detailProps }: MatchDrawerProps) {
  if (mode === 'inline') {
    return match ? (
      <aside className="drawer" aria-labelledby="detail-title">
        <MatchDetail match={match} {...detailProps} />
      </aside>
    ) : null;
  }
  return <ModalDrawer match={match} {...detailProps} />;
}

function ModalDrawer({ match, ...detailProps }: Omit<MatchDrawerProps, 'mode'>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Native <dialog> provides the focus trap, Esc to close and focus restore.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (match && !dialog.open) dialog.showModal();
    if (!match && dialog.open) dialog.close();
  }, [match]);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="detail-title"
      onClose={detailProps.onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      {match && <MatchDetail match={match} {...detailProps} />}
    </dialog>
  );
}
