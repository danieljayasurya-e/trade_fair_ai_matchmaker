import { useId } from 'react';

interface LogoMarkProps {
  className?: string;
}

/**
 * Two overlapping ceramic tiles: a visitor and an exhibitor, with the overlap as the match.
 * Decorative; the brand name next to it carries the accessible text. The same shapes are
 * inlined as the favicon in index.html.
 */
export function LogoMark({ className }: LogoMarkProps) {
  const clipId = useId();
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <rect x="6" y="6" width="17" height="17" rx="3.5" />
        </clipPath>
      </defs>
      <rect width="36" height="36" rx="9" fill="#1d4ed8" />
      <rect x="6" y="6" width="17" height="17" rx="3.5" fill="#ffffff" />
      <rect x="13" y="13" width="17" height="17" rx="3.5" fill="#5eead4" />
      <rect x="13" y="13" width="17" height="17" rx="3.5" fill="#0f766e" clipPath={`url(#${clipId})`} />
    </svg>
  );
}
