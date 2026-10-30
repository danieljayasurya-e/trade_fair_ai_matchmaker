import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import type { GuestFormValues } from '../utils/guestForm';
import { EXAMPLE_PROFILE_JSON, parseProfileText } from '../utils/profileImport';
import type { ParseResult } from '../utils/profileImport';
import { Icon } from './Icon';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the recognised fields; the form then shows them for review. */
  onLoad: (values: Partial<GuestFormValues>, fileName: string) => void;
}

const MAX_FILE_BYTES = 200_000;

export function UploadDialog({ isOpen, onClose, onLoad }: UploadDialogProps) {
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
      className="modal"
      aria-labelledby="upload-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      {isOpen && (
        <div className="modal__content">
          <div className="modal__head">
            <div>
              <h2 id="upload-title">Upload a profile</h2>
              <p>We read it in your browser and fill in the form. You can change anything before matching.</p>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => dialogRef.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
          <UploadForm onLoad={onLoad} onCancel={() => dialogRef.current?.close()} />
        </div>
      )}
    </dialog>
  );
}

interface UploadFormProps {
  onLoad: UploadDialogProps['onLoad'];
  onCancel: () => void;
}

function UploadForm({ onLoad, onCancel }: UploadFormProps) {
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setResult({ ok: false, error: 'That file is too large. Keep it under 200 KB.' });
      return;
    }
    setResult(parseProfileText(await file.text(), file.name));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (result?.ok) onLoad(result.values, fileName);
  };

  return (
    <form className="modal__form" onSubmit={handleSubmit}>
      <label
        className={`dropzone${isDragging ? ' is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Icon name="file" size={32} strokeWidth={1.5} />
        <span className="dropzone__title">
          Drop a file here or <span className="dropzone__browse">browse</span>
        </span>
        <span className="muted">JSON or CSV with fields such as “industry”, “jobRole” and “interests”</span>
        <input
          type="file"
          accept=".json,.csv"
          className="visually-hidden"
          onChange={(e) => void readFile(e.target.files?.[0])}
        />
      </label>

      {result?.ok && (
        <p className="form-note form-note--ok" role="status">
          Read {result.filled} {result.filled === 1 ? 'field' : 'fields'} from {fileName}. Anything missing stays blank
          for you to fill in.
        </p>
      )}
      {result && !result.ok && (
        <p className="form-note form-note--error" role="alert">
          {result.error}
        </p>
      )}

      <p className="muted">
        No file handy?{' '}
        <button
          type="button"
          className="link-btn link-btn--inline"
          onClick={() => {
            setFileName('example.json');
            setResult(parseProfileText(EXAMPLE_PROFILE_JSON, 'example.json'));
          }}
        >
          Use an example profile
        </button>
      </p>

      <div className="modal__actions">
        <button type="button" className="btn btn--outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={!result?.ok}>
          Fill in the form
        </button>
      </div>
    </form>
  );
}
