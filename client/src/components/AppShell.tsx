import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { TabBar } from './TabBar';

const TAB_BAR_ROUTES = ['/matches', '/map', '/visit-list'];

export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const hasTabBar = TAB_BAR_ROUTES.includes(pathname);
  // Every page but the landing page has a breadcrumb row, which makes the sticky header taller.
  const hasCrumbs = pathname !== '/';

  // Move focus to the new page's content so keyboard and screen-reader users aren't left in the nav.
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="shell" data-tab-bar={hasTabBar} data-crumbs={hasCrumbs}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="shell__main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      {hasTabBar && <TabBar />}
    </div>
  );
}
