import { Card, Banner, Dot, TableWrap, btnGhost } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';
import { docsFor } from '../../lib/derived.js';

export default function MDocuments({ c }) {
  const d = docsFor(c);
  const miss = d.filter((x) => !x.ok);

  return (
    <Card title="Document vault" hint={`${d.length - miss.length} of ${d.length} on file`}>
      <TableWrap>
        <table className="w-full border-collapse">
          <tbody>
            {d.map((x, i) => (
              <tr key={i}>
                <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                  <Dot tone={x.ok ? 'g' : 'r'} />{x.n}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right text-[10.5px] text-gray-400 dark:text-gray-500">
                  {x.d ? fmtD(x.d) : <span className="text-red-600 dark:text-red-400">not on file</span>}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                  <button className={`${btnGhost} text-xs px-2.5 py-1.5`}>{x.ok ? 'View' : 'Request'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {!!miss.length && (
        <Banner kind="warn" style={{ margin: '12px 0 0' }}>
          <b>{miss.length} document{miss.length > 1 ? 's' : ''} missing.</b> {miss.map((x) => x.n).join(', ')}.
        </Banner>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
        Customers want their own papers back more often than you would expect, and it is an honest reason
        for them to log in — unlike a live value dashboard, which becomes a price ticker they check weekly
        and which teaches them the market is flat in the two quarters it does not move.
      </div>
    </Card>
  );
}
