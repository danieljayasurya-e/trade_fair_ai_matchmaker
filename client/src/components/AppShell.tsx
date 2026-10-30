import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { Icon } from './Icon';
import { TabBar } from './TabBar';

const TAB_BAR_ROUTES = ['/matches', '/map', '/visit-list'];

export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const hasTabBar = TAB_BAR_ROUTES.includes(pathname);

  // Move focus to the new page's content so keyboard and screen-reader users aren't left in the nav.
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="shell" data-tab-bar={hasTabBar}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="shell__main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>
            <Icon name="shield" size={18} />
            Rankings come only from how well profiles fit. No exhibitor pays for placement.
          </p>
          <p>Sample profiles are fictional. Exhibitors and booths are from the 2026 visitor guide; product details come from public web sources.</p>
        </div>
      </footer>
      {hasTabBar && <TabBar />}
    </div>
  );
}
