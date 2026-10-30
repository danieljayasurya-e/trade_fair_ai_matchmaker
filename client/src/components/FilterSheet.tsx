import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface FilterSheetProps {
  isOpen: boolean;
  resultCount: number;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet that holds the filters on screens too narrow for the sidebar. */
export function FilterSheet({ isOpen, resultCount, onClose, children }: FilterSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet--filters"
      aria-label="Filters"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="sheet__content">
        {children}
        <button type="button" className="btn btn--primary btn--block" onClick={() => dialogRef.current?.close()}>
          Show {resultCount} {resultCount === 1 ? 'match' : 'matches'}
        </button>
      </div>
    </dialog>
  );
}
