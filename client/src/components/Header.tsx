import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { SHOW_HOW_IT_WORKS, SHOW_MAP } from '../features';
import { Breadcrumbs } from './Breadcrumbs';
import { LogoMark } from './Logo';
import { initialsOf } from '../utils/score';

export function Header() {
  const { guest, bookmarkIds } = useSession();
  const { pathname } = useLocation();
  // Before there is a profile (landing, or the blank details form) the header shows no section links.
  const isStart = pathname === '/' || (pathname === '/details' && !guest);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="Matchmaker, home">
          <LogoMark className="brand__mark" />
          <span className="brand__name">Matchmaker</span>
        </Link>

        <nav className={`site-nav${isStart ? ' site-nav--end' : ''}`} aria-label="Main">
          {!isStart && (
            <>
              <NavLink to="/matches">Matches</NavLink>
              {SHOW_MAP && <NavLink to="/map">Map</NavLink>}
              <NavLink to="/visit-list">
                Visit list
                <span className="count-badge" aria-label={`${bookmarkIds.length} saved`}>
                  {bookmarkIds.length}
                </span>
              </NavLink>
            </>
          )}
          {SHOW_HOW_IT_WORKS && <NavLink to="/how-it-works">How it works</NavLink>}
        </nav>

        <span className="live-pill">
          <span className="live-pill__dot" aria-hidden="true" />
          Live
        </span>

        {guest && !isStart && (
          <span className="avatar" role="img" aria-label={`Profile: ${guest.name}`}>
            {initialsOf(guest.name)}
          </span>
        )}
      </div>
      <Breadcrumbs />
    </header>
  );
}
