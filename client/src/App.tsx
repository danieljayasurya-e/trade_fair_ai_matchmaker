import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SessionProvider } from './context/SessionContext';
import { ToastProvider } from './context/ToastContext';
import { SHOW_HOW_IT_WORKS, SHOW_MAP } from './features';
import { DetailsPage } from './pages/DetailsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LandingPage } from './pages/LandingPage';
import { LoadingPage } from './pages/LoadingPage';
import { MapPage } from './pages/MapPage';
import { MatchesPage } from './pages/MatchesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { VisitListPage } from './pages/VisitListPage';

// HashRouter keeps the built app working from any static host or a file server, no rewrite rules needed.
export function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<LandingPage />} />
              <Route path="details" element={<DetailsPage />} />
              <Route path="matching" element={<LoadingPage />} />
              <Route path="matches" element={<MatchesPage />} />
              {SHOW_MAP && <Route path="map" element={<MapPage />} />}
              <Route path="visit-list" element={<VisitListPage />} />
              {SHOW_HOW_IT_WORKS && <Route path="how-it-works" element={<HowItWorksPage />} />}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </SessionProvider>
    </ToastProvider>
  );
}
