import { memo } from 'react';
import { bandFor } from '../utils/score';

interface ScoreRingProps {
  score: number;
  /** "sm" is the list size (shrinks again on phones); "lg" is the detail drawer. */
  size?: 'sm' | 'lg';
}

const GEOMETRY = {
  sm: { box: 56, radius: 24, stroke: 6 },
  lg: { box: 96, radius: 42, stroke: 8 },
} as const;

/** Circular gauge. The number in the middle carries the value; colour only reinforces the band. */
export const ScoreRing = memo(function ScoreRing({ score, size = 'sm' }: ScoreRingProps) {
  const { box, radius, stroke } = GEOMETRY[size];
  const circumference = 2 * Math.PI * radius;
  const centre = box / 2;

  return (
    <span className={`score-ring score-ring--${size} tone-${bandFor(score).tone}`}>
      <svg viewBox={`0 0 ${box} ${box}`} aria-hidden="true" focusable="false">
        <circle className="score-ring__track" cx={centre} cy={centre} r={radius} strokeWidth={stroke} />
        <circle
          className="score-ring__value"
          cx={centre}
          cy={centre}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${((score / 100) * circumference).toFixed(1)} ${circumference.toFixed(1)}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </svg>
      <span className="score-ring__label" aria-hidden="true">
        {score}
        <span className="score-ring__pct">%</span>
      </span>
    </span>
  );
});
