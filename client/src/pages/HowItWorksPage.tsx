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
          <p>How closely the words in your profile and your free text read like the stall's name and segments.</p>
        </li>
        <li>
          <h3>
            Interest overlap <span className="how-list__weight">{percent(G2E_WEIGHTS.interest)} of this direction</span>
          </h3>
          <p>How many of the segments you picked the stall is listed under.</p>
        </li>
        <li>
          <h3>
            Intent match <span className="how-list__weight">{percent(G2E_WEIGHTS.intent)} of this direction</span>
          </h3>
          <p>Whether your own description mentions the stall's segments, plus a bonus when businesses in your sector buy them.</p>
        </li>
      </ul>

      <h2>Stall → you: are you a likely buyer?</h2>
      <ul className="how-list">
        <li>
          <h3>Buyer fit</h3>
          <p>
            Half is whether businesses in your sector buy what the stall sells, and half is whether the stall is based
            in your region. Even a poor fit keeps {percent(BUYER_FIT_FLOOR)} so a strong segment match stays visible.
            Seniority and company size are collected but not scored yet, because the exhibitor list has no buyer criteria.
          </p>
        </li>
      </ul>

      <h2>The final score</h2>
      <p>
        The match percentage is the geometric mean of the two directions, so a weak side pulls the whole score down.
        Stalls with almost no overlap with what you asked for are left out.
      </p>

      <h2>What we don't do</h2>
      <ul className="plain-list">
        <li>No exhibitor can pay to rank higher, and none is hidden or boosted.</li>
        <li>Ties are broken by company name, so the order is always the same for the same profile.</li>
        <li>Your profile stays in this browser. Nothing is sent anywhere in this demo.</li>
      </ul>

      <p>
        <Link to="/details" className="btn btn--primary">
          Find my stalls
        </Link>
      </p>
    </div>
  );
}
