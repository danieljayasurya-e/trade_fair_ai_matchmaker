import { NavLink } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { SHOW_MAP } from '../features';
import { Icon } from './Icon';

/** Phone-only bottom navigation. Wider screens use the links in the header. */
export function TabBar() {
  const { bookmarkIds } = useSession();
  return (
    <nav className="tab-bar" aria-label="Main">
      <NavLink to="/matches">
        <Icon name="target" size={22} />
        Matches
      </NavLink>
      {SHOW_MAP && (
        <NavLink to="/map">
          <Icon name="map" size={22} />
          Map
        </NavLink>
      )}
      <NavLink to="/visit-list">
        <Icon name="bookmark" size={22} />
        Visit list{bookmarkIds.length > 0 && ` (${bookmarkIds.length})`}
      </NavLink>
      <NavLink to="/details">
        <Icon name="user" size={22} />
        Profile
      </NavLink>
    </nav>
  );
}
