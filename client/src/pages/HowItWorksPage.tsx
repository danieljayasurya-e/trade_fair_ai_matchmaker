import { Link } from 'react-router-dom';
import { BUYER_FIT_FLOOR, G2E_WEIGHTS } from '../services/scoring';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const percent = (weight: number) => `${Math.round(weight * 100)}%`;

export function HowItWorksPage() {
  useDocumentTitle('How it works');

  return (
    <div className="container prose">
      <h1>How matching works</h1>
      <p className="prose__lead">
        Every exhibitor is scored against your details in both directions. A stall ranks high only when it sells what
        you want and you are a likely buyer for it.
      </p>

      <h2>You → stall: does it sell what you want?</h2>
      <ul className="how-list">
        <li>
          <h3>
            Semantic similarity <span className="how-list__weight">{percent(G2E_WEIGHTS.semantic)} of this direction</span>
          </h3>
          <p>How closely the words in your profile and your free text read like the stall's name, description and products.</p>
        </li>
        <li>
          <h3>
            Interest overlap <span className="how-list__weight">{percent(G2E_WEIGHTS.interest)} of this direction</span>
          </h3>
          <p>How many of the product areas you picked the stall offers.</p>
        </li>
        <li>
          <h3>
            Intent match <span className="how-list__weight">{percent(G2E_WEIGHTS.intent)} of this direction</span>
          </h3>
          <p>Whether your own description mentions the stall's products, plus a bonus when the stall sells to your sector.</p>
        </li>
      </ul>

      <h2>Stall → you: are you a likely buyer?</h2>
      <ul className="how-list">
        <li>
          <h3>Sells to your sector</h3>
          <p>
            Whether the stall sells to businesses in your sector. The sector lists are inferred, so a gap still keeps {percent(BUYER_FIT_FLOOR)} and a
            strong product match stays visible. Region, seniority and company size are collected but not scored: the
            exhibitor data has no buyer criteria, and favouring nearby stalls would push down overseas exhibitors.
          </p>
        </li>
      </ul>

      <h2>The final score</h2>
      <p>
        The match percentage is the geometric mean of the two directions, so a weak side pulls the whole score down.
        Every stall is scored, and you see the top 30.
      </p>

      <h2>What we don't do</h2>
      <ul className="plain-list">
        <li>No exhibitor can pay to rank higher, and none is hidden or boosted.</li>
        <li>Ties are broken by your fit with the stall, then by company name, so the same profile always gets the same order.</li>
        <li>Your profile is stored on our server to work out your matches, and isn't sent to any outside AI service.</li>
      </ul>

      <p>
        <Link to="/details" className="btn btn--primary">
          Find my stalls
        </Link>
      </p>
    </div>
  );
}
