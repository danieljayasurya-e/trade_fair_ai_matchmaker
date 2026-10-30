import { memo } from 'react';
import { segmentLabel } from '../data/taxonomy';
import type { SampleProfile } from '../types';
import { initialsOf } from '../utils/score';

interface SampleCardProps {
  sample: SampleProfile;
  isFilled: boolean;
  /** Fill the form with this sample so it can be edited first. */
  onUse: (sample: SampleProfile) => void;
  /** Skip the form and start matching with this sample straight away. */
  onMatch: (sample: SampleProfile) => void;
}

/** A "Try a sample profile" preset: match with it in one tap, or fill the form to edit it first. */
export const SampleCard = memo(function SampleCard({ sample, isFilled, onUse, onMatch }: SampleCardProps) {
  const { profile } = sample;
  return (
    <article className="pcard">
      <div className="pcard__head">
        <span className="avatar avatar--lg" aria-hidden="true">
          {initialsOf(profile.name)}
        </span>
        <div>
          <h3>{sample.label}</h3>
          <p>
            {profile.name} · {profile.jobRole}
          </p>
        </div>
      </div>

      <dl className="pcard__facts">
        <dt>Industry</dt>
        <dd>{profile.industry}</dd>
        <dt>Company size</dt>
        <dd>{profile.companySize} employees</dd>
      </dl>

      <div>
        <p className="pcard__label">Looking for</p>
        <ul className="chip-list">
          {profile.interests.map((interest) => (
            <li key={interest} className="chip chip--teal">
              {segmentLabel(interest)}
            </li>
          ))}
        </ul>
      </div>

      <div className="pcard__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={() => onMatch(sample)}>
          Match with this sample<span className="visually-hidden">: {sample.label}</span>
        </button>
        <button type="button" className="link-btn" aria-pressed={isFilled} onClick={() => onUse(sample)}>
          {isFilled ? 'Filled in below' : 'Edit details first'}
          <span className="visually-hidden">: {sample.label}</span>
        </button>
      </div>
    </article>
  );
});
