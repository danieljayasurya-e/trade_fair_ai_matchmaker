import { Link } from 'react-router-dom';
import { segmentLabel } from '../data/taxonomy';
import { SHOW_HOW_IT_WORKS, SHOW_MAP } from '../features';
import type { Match } from '../types';
import { bandFor, initialsOf } from '../utils/score';
import { Icon } from './Icon';
import { ScoreRing } from './ScoreRing';

export interface MatchDetailProps {
  match: Match;
  /** How many exhibitors were scored, for "Rank #1 of 50". */
  totalExhibitors: number;
  isSaved: boolean;
  onToggleSave: (exhibitorId: string) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** Explanation panel for one match. Rendered inline on laptops and inside a dialog elsewhere. */
export function MatchDetail({
  match,
  totalExhibitors,
  isSaved,
  onToggleSave,
  onClose,
  onPrevious,
  onNext,
}: MatchDetailProps) {
  const { exhibitor, score, rank, factors, insights } = match;
  const band = bandFor(score);

  const subscores = [
    { label: 'Semantic similarity', value: Math.round(factors.semantic * 100) },
    { label: 'Interest overlap', value: Math.round(factors.interest * 100) },
    { label: 'Intent match', value: Math.round(factors.intent * 100) },
    { label: 'Buyer fit', value: Math.round(factors.buyerFit * 100) },
  ];

  return (
    <div className="detail">
      <header className="detail__head">
        <span className="detail__initials" aria-hidden="true">
          {initialsOf(exhibitor.name)}
        </span>
        <div className="detail__title">
          <h2 id="detail-title">{exhibitor.name}</h2>
          <p>
            Hall 1 · Booth {[exhibitor.booth, ...exhibitor.otherBooths].join(' / ')}
          </p>
          {SHOW_MAP && (
            <Link to={`/map?stall=${exhibitor.id}`} className="detail__route">
              <Icon name="pin" size={16} />
              Take me there
            </Link>
          )}
        </div>
        <button type="button" className="icon-btn" aria-label="Close details" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>

      <div className="detail__body">
        <section className="detail__section" aria-labelledby="detail-why">
          <div className="detail__score">
            <span role="img" aria-label={`Match score ${score} percent, ${band.label}`}>
              <ScoreRing score={score} size="lg" />
            </span>
            <div>
              <h3 id="detail-why">Why this is a {score}% match</h3>
              <p>
                <span className={`tone-${band.tone} band-text`}>{band.label}</span> · Rank #{rank} of{' '}
                {totalExhibitors} exhibitors
              </p>
            </div>
          </div>

          <ul className="subscores">
            {subscores.map(({ label, value }) => (
              <li key={label}>
                <div className="subscores__row">
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${value}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <p className="detail__direction">
            You → stall <strong>{Math.round(factors.g2e * 100)}%</strong> · Stall → you <strong>{Math.round(factors.e2g * 100)}%</strong>
          </p>

          <ul className="factors">
            {insights.map((factor) => (
              <li key={factor.label}>
                <span className="factors__tick" aria-hidden="true">
                  <Icon name="check" size={13} strokeWidth={3} />
                </span>
                <span>
                  <strong>{segmentLabel(factor.label)}</strong>
                  <br />
                  <span className="muted">{factor.why}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="detail__note">
            The score is the geometric mean of both directions, from profile data only.
            {SHOW_HOW_IT_WORKS && (
              <>
                {' '}
                <Link to="/how-it-works">How scoring works</Link>
              </>
            )}
          </p>
        </section>

        <section className="detail__section" aria-labelledby="detail-products">
          {exhibitor.description && <p className="muted">{exhibitor.description}</p>}
          <h3 id="detail-products">Products</h3>
          {exhibitor.products.length > 0 ? (
            <ul className="chip-list">
              {exhibitor.products.map((product) => (
                <li key={product} className="chip chip--grey">
                  {product}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No product details on file.</p>
          )}
          <h3>Based in</h3>
          <p className="muted">{[exhibitor.city, exhibitor.country].filter(Boolean).join(', ') || 'Not on file'}</p>
        </section>
      </div>

      <footer className="detail__foot">
        <button
          type="button"
          className={`btn btn--primary detail__save${isSaved ? ' is-saved' : ''}`}
          aria-pressed={isSaved}
          onClick={() => onToggleSave(exhibitor.id)}
        >
          <Icon name="bookmark" size={18} filled={isSaved} />
          {isSaved ? 'Saved to visit list' : 'Save to visit list'}
        </button>
        <button type="button" className="btn btn--outline btn--square" aria-label="Previous exhibitor" onClick={onPrevious}>
          <Icon name="chevronLeft" size={18} strokeWidth={2} />
        </button>
        <button type="button" className="btn btn--outline btn--square" aria-label="Next exhibitor" onClick={onNext}>
          <Icon name="chevronRight" size={18} strokeWidth={2} />
        </button>
      </footer>
    </div>
  );
}
