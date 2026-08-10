import { Card, Banner } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';
import { docsFor } from '../../lib/derived.js';

export default function MDocuments({ c }) {
  const d = docsFor(c);
  const miss = d.filter((x) => !x.ok);

  return (
    <Card title="Document vault" hint={`${d.length - miss.length} of ${d.length} on file`}>
      <table>
        <tbody>
          {d.map((x, i) => (
            <tr key={i}>
              <td><span className={`dt ${x.ok ? 'g' : 'r'}`} />{x.n}</td>
              <td className="r sub2">
                {x.d ? fmtD(x.d) : <span style={{ color: 'var(--block)' }}>not on file</span>}
              </td>
              <td className="r"><button className="btn ghost sm">{x.ok ? 'View' : 'Request'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {!!miss.length && (
        <Banner kind="warn" style={{ margin: '12px 0 0' }}>
          <b>{miss.length} document{miss.length > 1 ? 's' : ''} missing.</b> {miss.map((x) => x.n).join(', ')}.
        </Banner>
      )}

      <div className="note" style={{ marginTop: 12 }}>
        Customers want their own papers back more often than you would expect, and it is an honest reason
        for them to log in — unlike a live value dashboard, which becomes a price ticker they check weekly
        and which teaches them the market is flat in the two quarters it does not move.
      </div>
    </Card>
  );
}
