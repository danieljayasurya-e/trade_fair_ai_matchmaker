import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { SPOT_BY_ID } from '../data/venue';
import { SHOW_MAP } from '../features';
import { Icon } from './Icon';

interface Crumb {
  label: string;
  /** Where it goes; the current page has none. */
  to?: string;
  /** Shown as a booth chip rather than plain text, e.g. the stall picked on the map. */
  isBooth?: boolean;
}

const HOME: Crumb = { label: 'Home', to: '/' };

/**
 * Where a page sits in the visit: home → your details → your matches → the map or your visit list.
 * Null on the landing page, which has nothing above it.
 */
export function crumbsFor(
  pathname: string,
  hasGuest: boolean,
  stallId: string | null,
  from: string | null,
): Crumb[] | null {
  const matches: Crumb[] = hasGuest ? [{ label: 'Your matches', to: '/matches' }] : [];
  switch (pathname) {
    case '/':
      return null;
    case '/details':
      return [HOME, { label: hasGuest ? 'Edit your details' : 'Your details' }];
    case '/matching':
      return [HOME, { label: 'Your details', to: '/details' }, { label: 'Matching' }];
    case '/matches':
      return [HOME, { label: 'Your matches' }];
    case '/visit-list':
      return [HOME, ...matches, { label: 'Visit list' }];
    case '/how-it-works':
      return [HOME, { label: 'How it works' }];
    case '/map': {
      if (!SHOW_MAP) break;
      const spot = stallId ? SPOT_BY_ID.get(stallId) : undefined;
      if (!spot) return [HOME, ...matches, { label: 'Map' }];
      // Back to the map keeps where you said you are, so only the picked stall is dropped.
      const mapTo = from ? `/map?from=${encodeURIComponent(from)}` : '/map';
      return [HOME, ...matches, { label: 'Map', to: mapTo }, { label: spot.exhibitor.booth, isBooth: true }];
    }
  }
  return [HOME, { label: 'Page not found' }];
}

/**
 * The trail under the header. Laptops see all of it; phones see one "‹ parent" link and the current
 * page, which is all the room there is and the step people actually take.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { guest } = useSession();
  const crumbs = crumbsFor(pathname, guest !== null, params.get('stall'), params.get('from'));
  if (!crumbs) return null;

  const parentIndex = crumbs.length - 2;
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          const place = isCurrent ? 'current' : index === parentIndex ? 'parent' : 'far';
          const isHome = crumb === HOME;
          return (
            <li key={`${index}-${crumb.label}`} className={`crumbs__item crumbs__item--${place}`}>
              {index > 0 && <Icon name="chevronRight" size={14} strokeWidth={2} className="crumbs__sep" />}
              {crumb.to && !isCurrent ? (
                <Link to={crumb.to} className={`crumbs__link${isHome ? ' crumbs__link--home' : ''}`}>
                  {/* On phones the parent is the only link shown, so it reads as "back". */}
                  <Icon name="chevronLeft" size={16} strokeWidth={2.25} className="crumbs__back" />
                  {isHome && <Icon name="home" size={16} strokeWidth={2} className="crumbs__home-icon" />}
                  <span className={isHome ? 'crumbs__home-label' : undefined}>{crumb.label}</span>
                </Link>
              ) : (
                <span
                  className={`crumbs__current${crumb.isBooth ? ' crumbs__current--booth' : ''}`}
                  aria-current="page"
                >
                  {crumb.isBooth && <span className="visually-hidden">Booth </span>}
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
