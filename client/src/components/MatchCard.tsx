import { memo } from 'react';
import type { Match } from '../types';
import { bandFor } from '../utils/score';
import { Icon } from './Icon';
import { ScoreRing } from './ScoreRing';

interface MatchCardProps {
  match: Match;
  isSelected: boolean;
  isSaved: boolean;
  onOpen: (exhibitorId: string) => void;
  onToggleSave: (exhibitorId: string) => void;
}

export const MatchCard = memo(function MatchCard({ match, isSelected, isSaved, onOpen, onToggleSave }: MatchCardProps) {
  const { exhibitor, rank, score, factors } = match;
  const band = bandFor(score);

  return (
    <li className={`mcard${isSelected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="mcard__main"
        aria-current={isSelected || undefined}
        aria-label={`${exhibitor.name}, rank ${rank}, ${score} percent match, ${band.label}, Hall ${exhibitor.hall} booth ${exhibitor.booth}. View details`}
        onClick={() => onOpen(exhibitor.id)}
      >
        <span className="mcard__rank">#{rank}</span>
        <span className="mcard__score">
          <ScoreRing score={score} />
          <span className={`band tone-${band.tone}`}>{band.label}</span>
        </span>
        <span className="mcard__body">
          <span className="mcard__name">{exhibitor.name}</span>
          <span className="mcard__where-short">
            #{rank} · Hall {exhibitor.hall} · {exhibitor.booth}
          </span>
          <span className="mcard__desc">{exhibitor.description}</span>
          <span className="mcard__chips">
            <span className="mcard__chips-label">Matched on</span>
            {factors.slice(0, 3).map((factor) => (
              <span key={factor.label} className="chip chip--teal">
                {factor.label}
              </span>
            ))}
          </span>
          <span className="mcard__facts">
            <span>
              <Icon name="pin" size={16} />
              Hall {exhibitor.hall} · {exhibitor.booth}
            </span>
            <span className="mcard__category">
              <Icon name="layers" size={16} />
              {exhibitor.tags[0]}
              {exhibitor.tags.length > 1 && <span className="muted"> +{exhibitor.tags.length - 1}</span>}
            </span>
          </span>
        </span>
      </button>

      <button
        type="button"
        className={`save-btn${isSaved ? ' is-saved' : ''}`}
        aria-pressed={isSaved}
        aria-label={`Save ${exhibitor.name} to visit list`}
        onClick={() => onToggleSave(exhibitor.id)}
      >
        <Icon name="bookmark" filled={isSaved} />
        <span className="save-btn__label">{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    </li>
  );
});
