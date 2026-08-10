import { psf } from '../lib/core.js';

/* The three-band rate ladder: what was paid, the government circle rate,
   and the recent registered resale. Used on the customer master and on
   the customer-facing statement, with different label wording. */
export default function RateLadder({ u, labels = ['paid', 'circle', 'resale'], style }) {
  const w1 = Math.max(8, (u.rate / u.valueRate) * 100);
  const w2 = Math.max(0, ((Math.min(u.val.circle, u.valueRate) - u.rate) / u.valueRate) * 100);
  const w3 = Math.max(0, 100 - w1 - w2);

  return (
    <div className="rl" style={style}>
      <div className="bar">
        <div className="b1" style={{ width: `${w1}%` }} />
        <div className="b2" style={{ width: `${w2}%` }} />
        <div className="b3" style={{ width: `${w3}%` }} />
      </div>
      <div className="tk">
        <div style={{ width: `${w1}%` }}>{labels[0]}<b className="num">{psf(u.rate)}</b></div>
        <div style={{ width: `${w2}%` }}>{labels[1]}<b className="num">{psf(u.val.circle)}</b></div>
        <div style={{ width: `${w3}%`, textAlign: 'right' }}>{labels[2]}<b className="num">{psf(u.val.resale)}</b></div>
      </div>
    </div>
  );
}
