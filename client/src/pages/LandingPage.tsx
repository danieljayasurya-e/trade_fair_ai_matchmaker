import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { EXHIBITORS } from '../data/exhibitors';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { TOP_N } from '../services';

// Same three points as the mobile landing screen, worded for what the web app does.
const POINTS = [
  {
    title: 'Matched both ways',
    body: 'A stall ranks high only if it sells what you need and you are the buyer it wants.',
  },
  {
    title: 'Explained, not guessed',
    body: 'Every match shows what it matched on and a score breakdown.',
  },
  {
    title: 'Plan your day',
    body: 'Save stalls to a visit list grouped by row, then print it or export it to take with you.',
  },
];

// First screen of the guest flow: a short hook, then straight to the details form.
export function LandingPage() {
  useDocumentTitle('Find your stalls');
  const navigate = useNavigate();
  const { guest, clearGuest } = useSession();

  const handleStartOver = () => {
    clearGuest();
    navigate('/details');
  };

  return (
    <div className="container landing">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">LASER World of PHOTONICS INDIA · Hall 1, BIEC Bengaluru</p>
        <h1 id="hero-title">
          <span>{EXHIBITORS.length} stalls.</span> <span>Find your {TOP_N} in 2 seconds.</span>
        </h1>
        <p className="hero__lead">
          Tell us about your business and we rank every exhibitor by how well you fit each other.
        </p>
      </section>

      <ul className="points">
        {POINTS.map((point) => (
          <li key={point.title} className="point">
            <h2>{point.title}</h2>
            <p>{point.body}</p>
          </li>
        ))}
      </ul>

      <div className="landing__cta">
        {guest ? (
          <>
            <Link to="/matches" className="btn btn--primary btn--lg">
              Continue as {guest.name}
            </Link>
            <button type="button" className="link-btn" onClick={handleStartOver}>
              Not you? Start over
            </button>
          </>
        ) : (
          <Link to="/details" className="btn btn--primary btn--lg">
            Find my stalls
          </Link>
        )}
      </div>
    </div>
  );
}
