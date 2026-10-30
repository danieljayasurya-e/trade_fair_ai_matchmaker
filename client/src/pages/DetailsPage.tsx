import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuestForm } from '../components/GuestForm';
import { Icon } from '../components/Icon';
import { SampleCard } from '../components/SampleCard';
import { EmptyState } from '../components/StatePanels';
import { UploadDialog } from '../components/UploadDialog';
import { useSession } from '../context/SessionContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSampleProfiles } from '../hooks/useSampleProfiles';
import type { GuestInput, SampleProfile } from '../types';
import { EMPTY_FORM, formFromGuest, toGuest } from '../utils/guestForm';
import type { GuestFormValues } from '../utils/guestForm';

// Second screen of the guest flow. Doubles as "Edit my details" when a profile already exists:
// saving then re-runs the match with the new values and keeps the saved stalls.
export function DetailsPage() {
  const navigate = useNavigate();
  const { guest, selectGuest, clearGuest } = useSession();
  const samples = useSampleProfiles();

  const [isEdit, setIsEdit] = useState(guest !== null);
  const [values, setValues] = useState<GuestFormValues>(() => (guest ? formFromGuest(guest) : EMPTY_FORM));
  const [filledFrom, setFilledFrom] = useState<{ id: string | null; message: string } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  useDocumentTitle(isEdit ? 'Edit your details' : 'Your details');

  const handleChange = useCallback((patch: Partial<GuestFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  const handleSample = useCallback((sample: SampleProfile) => {
    setValues({ ...sample.profile, interests: [...sample.profile.interests] });
    setFilledFrom({
      id: sample.id,
      message: `Filled in ${sample.profile.name}'s details. Review them, then choose Find my stalls.`,
    });
    // Focus the next step without scrolling the filled form out of view.
    submitRef.current?.focus({ preventScroll: true });
  }, []);

  const handleUpload = useCallback((loaded: Partial<GuestFormValues>, fileName: string) => {
    setValues((current) => ({ ...current, ...loaded }));
    setFilledFrom({ id: null, message: `Filled in what we could read from ${fileName}. Check the rest, then continue.` });
    setIsUploadOpen(false);
  }, []);

  const handleStartOver = () => {
    clearGuest();
    setIsEdit(false);
    setValues(EMPTY_FORM);
    setFilledFrom(null);
  };

  const handleSubmit = (input: GuestInput) => {
    // Editing keeps the id, so saved stalls follow the visitor; a new profile gets a fresh one.
    selectGuest(toGuest(input, isEdit && guest ? guest.id : undefined));
    navigate('/matching');
  };

  return (
    <div className="container details-page">
      <header className="details-head">
        <div>
          <h1>{isEdit ? 'Edit your details' : 'Tell us what you are looking for'}</h1>
          <p className="muted">
            {isEdit
              ? 'Change anything and your matches update. Saved stalls are kept.'
              : 'A few details are enough. We only use them to rank exhibitors, and they stay in this browser.'}
          </p>
        </div>
        <div className="details-head__actions">
          <button type="button" className="btn btn--outline" onClick={() => setIsUploadOpen(true)}>
            <Icon name="upload" size={18} />
            Upload profile
          </button>
          {isEdit && (
            <button type="button" className="link-btn" onClick={handleStartOver}>
              Start over
            </button>
          )}
        </div>
      </header>

      {!isEdit && (
        <section aria-labelledby="samples-title" className="details-samples">
          <h2 id="samples-title" className="section-title">
            Try a sample profile
          </h2>

          {samples.status === 'loading' && (
            <div className="profile-grid" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          )}

          {samples.status === 'error' && (
            <EmptyState title="Samples didn't load" icon="alert">
              {samples.message} You can still fill in the form below.
            </EmptyState>
          )}

          {samples.status === 'success' && (
            <div className="profile-grid">
              {samples.data.map((sample) => (
                <SampleCard
                  key={sample.id}
                  sample={sample}
                  isFilled={filledFrom?.id === sample.id}
                  onUse={handleSample}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* The live region stays mounted so the message is announced when it appears. */}
      <div role="status" className="details-status">
        {filledFrom && <p className="form-note form-note--ok">{filledFrom.message}</p>}
      </div>

      <GuestForm
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? 'Save and update matches' : 'Find my stalls'}
        submitRef={submitRef}
      />

      <UploadDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onLoad={handleUpload} />
    </div>
  );
}
