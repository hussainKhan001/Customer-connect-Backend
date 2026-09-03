import { psf } from '../utils/core.js';
import { useTheme } from '../context/ThemeContext.jsx';

/* The three-band rate ladder: what was paid, the government circle rate,
   and the recent registered resale. Used on the customer master and on
   the customer-facing statement, with different label wording. */
export default function RateLadder({ u, labels = ['paid', 'circle', 'resale'], style }) {
  const { getThemeColor } = useTheme();
  const w1 = Math.max(8, (u.rate / u.valueRate) * 100);
  const w2 = Math.max(0, ((Math.min(u.val.circle, u.valueRate) - u.rate) / u.valueRate) * 100);
  const w3 = Math.max(0, 100 - w1 - w2);

  return (
    <div style={style}>
      <div className="flex h-6 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
        <div className="bg-gray-800 dark:bg-gray-200" style={{ width: `${w1}%` }} />
        <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${w2}%` }} />
        <div style={{ width: `${w3}%`, backgroundColor: getThemeColor() }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        <div className="flex flex-col" style={{ width: `${w1}%` }}>
          <span>{labels[0]}</span>
          <b className="tabular-nums text-gray-800 dark:text-gray-100 font-semibold text-[11.5px]">{psf(u.rate)}</b>
        </div>
        <div className="flex flex-col" style={{ width: `${w2}%` }}>
          <span>{labels[1]}</span>
          <b className="tabular-nums text-gray-800 dark:text-gray-100 font-semibold text-[11.5px]">{psf(u.val.circle)}</b>
        </div>
        <div className="flex flex-col items-end text-right" style={{ width: `${w3}%` }}>
          <span>{labels[2]}</span>
          <b className="tabular-nums text-gray-800 dark:text-gray-100 font-semibold text-[11.5px]">{psf(u.val.resale)}</b>
        </div>
      </div>
    </div>
  );
}
