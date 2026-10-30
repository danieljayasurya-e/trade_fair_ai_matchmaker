import { useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { COMPANY_SIZES, INDUSTRIES, INTERESTS, REGIONS, SENIORITIES, segmentLabel } from '../data/taxonomy';
import type { GuestInput } from '../types';
import { FIELD_ORDER, FREE_TEXT_MAX, NAME_MAX, validateGuestForm } from '../utils/guestForm';
import type { FieldErrors, FieldName, GuestFormValues } from '../utils/guestForm';

/** Props every control shares: id, a hook for focusing the first error, and error state for assistive tech. */
interface ControlProps {
  id: string;
  'data-field': FieldName;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface GuestFormProps {
  values: GuestFormValues;
  onChange: (patch: Partial<GuestFormValues>) => void;
  onSubmit: (input: GuestInput) => void;
  submitLabel: string;
  /** Lets the page move focus to the submit button after a sample fills the form. */
  submitRef?: RefObject<HTMLButtonElement | null>;
}

const toggleIn = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** The visitor details form: same fields, labels and rules as the mobile app. */
export function GuestForm({ values, onChange, onSubmit, submitLabel, submitRef }: GuestFormProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Derived, so errors clear the moment a field is fixed, whether by typing or by a sample.
  const result = useMemo(() => validateGuestForm(values), [values]);
  const errors: FieldErrors = hasSubmitted && !result.ok ? result.errors : {};
  const errorCount = Object.keys(errors).length;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setHasSubmitted(true);
    if (result.ok) {
      onSubmit(result.input);
      return;
    }
    const first = FIELD_ORDER.find((field) => result.errors[field]);
    const target = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
    (target instanceof HTMLFieldSetElement ? target.querySelector<HTMLElement>('input') : target)?.focus();
  };

  const idOf = (field: FieldName) => `${uid}-${field}`;
  const fieldProps = (field: FieldName): ControlProps => ({
    id: idOf(field),
    'data-field': field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${idOf(field)}-error` : undefined,
  });

  return (
    <form ref={formRef} className="guest-form" onSubmit={handleSubmit} noValidate>
      <div className="guest-form__grid">
        <section className="form-card" aria-labelledby={`${uid}-about`}>
          <h2 id={`${uid}-about`}>About you</h2>

          <Field id={idOf('name')} label="Name" error={errors.name}>
            <input
              {...fieldProps('name')}
              type="text"
              autoComplete="name"
              maxLength={NAME_MAX}
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>

          <Field id={idOf('jobRole')} label="Job role" error={errors.jobRole}>
            <input
              {...fieldProps('jobRole')}
              type="text"
              autoComplete="organization-title"
              placeholder="e.g. Plant Manager"
              maxLength={NAME_MAX}
              value={values.jobRole}
              onChange={(e) => onChange({ jobRole: e.target.value })}
            />
          </Field>

          <Field id={idOf('industry')} label="Industry" error={errors.industry}>
            <select
              {...fieldProps('industry')}
              value={values.industry}
              onChange={(e) => onChange({ industry: INDUSTRIES.find((o) => o === e.target.value) ?? '' })}
            >
              <option value="">Select your industry</option>
              {INDUSTRIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>

          <Field id={idOf('seniority')} label="Seniority" error={errors.seniority}>
            <select
              {...fieldProps('seniority')}
              value={values.seniority}
              onChange={(e) => onChange({ seniority: SENIORITIES.find((o) => o === e.target.value) ?? '' })}
            >
              <option value="">Select your seniority</option>
              {SENIORITIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>

          <FieldGroup legend="Company size (employees)" error={errors.companySize} control={fieldProps('companySize')}>
            <div className="choices">
              {COMPANY_SIZES.map((size) => (
                <label key={size} className="choice">
                  <input
                    type="radio"
                    name={idOf('companySize')}
                    value={size}
                    checked={values.companySize === size}
                    onChange={() => onChange({ companySize: size })}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </FieldGroup>

          <Field id={idOf('region')} label="Region" error={errors.region}>
            <select
              {...fieldProps('region')}
              value={values.region}
              onChange={(e) => onChange({ region: REGIONS.find((o) => o === e.target.value) ?? '' })}
            >
              <option value="">Select your region</option>
              {REGIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </section>

        <section className="form-card" aria-labelledby={`${uid}-looking`}>
          <h2 id={`${uid}-looking`}>What you're looking for</h2>

          <FieldGroup
            legend="Procurement interests"
            hint={`${values.interests.length} selected`}
            error={errors.interests}
            control={fieldProps('interests')}
          >
            <div className="choices choices--dense">
              {INTERESTS.map((interest) => (
                <label key={interest} className="choice">
                  <input
                    type="checkbox"
                    value={interest}
                    checked={values.interests.includes(interest)}
                    onChange={() => onChange({ interests: toggleIn(values.interests, interest) })}
                  />
                  <span title={interest}>{segmentLabel(interest)}</span>
                </label>
              ))}
            </div>
          </FieldGroup>

          <Field
            id={idOf('freeText')}
            label="What are you looking for?"
            error={errors.freeText}
            hint={
              <span className={values.freeText.length >= FREE_TEXT_MAX ? 'is-over' : undefined}>
                <span className="visually-hidden">{values.freeText.length} of {FREE_TEXT_MAX} characters</span>
                <span aria-hidden="true">
                  {values.freeText.length}/{FREE_TEXT_MAX}
                </span>
              </span>
            }
          >
            <textarea
              {...fieldProps('freeText')}
              rows={5}
              maxLength={FREE_TEXT_MAX}
              placeholder="Products, problems to solve, budgets, timelines…"
              value={values.freeText}
              onChange={(e) => onChange({ freeText: e.target.value })}
            />
          </Field>
        </section>
      </div>

      <div className="guest-form__actions">
        {errorCount > 0 && (
          <p className="form-note form-note--error" role="alert">
            {errorCount === 1 ? 'One field needs attention.' : `${errorCount} fields need attention.`} Fix the
            highlighted {errorCount === 1 ? 'field' : 'fields'} to continue.
          </p>
        )}
        <button ref={submitRef} type="submit" className="btn btn--primary btn--lg">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  /** Small text on the label row, e.g. a character counter. */
  hint?: ReactNode;
  children: ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field__head">
        <label htmlFor={id}>{label}</label>
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface FieldGroupProps {
  legend: string;
  /** Live-region text shown under the options, e.g. how many are selected. */
  hint?: string;
  error?: string;
  control: ControlProps;
  children: ReactNode;
}

function FieldGroup({ legend, hint, error, control, children }: FieldGroupProps) {
  return (
    <fieldset className="field field--group" {...control}>
      <legend>{legend}</legend>
      {children}
      {hint && (
        <p className="field__hint" aria-live="polite">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${control.id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
