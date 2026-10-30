import { memo } from 'react';
import type { SampleProfile } from '../types';
import { initialsOf } from '../utils/score';

interface SampleCardProps {
  sample: SampleProfile;
  isFilled: boolean;
  onUse: (sample: SampleProfile) => void;
}

/** A "Try a sample profile" preset. Using one fills the form; it does not start matching. */
export const SampleCard = memo(function SampleCard({ sample, isFilled, onUse }: SampleCardProps) {
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
              {interest}
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btn--outline btn--block" aria-pressed={isFilled} onClick={() => onUse(sample)}>
        {isFilled ? 'Filled in below' : 'Use this sample'}
        <span className="visually-hidden">: {sample.label}</span>
      </button>
    </article>
  );
});
