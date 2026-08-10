import { Fragment } from 'react';
import { Card, Chip } from '../components/Ui.jsx';
import { DICT } from '../lib/reference.js';

const reqChip = (req) =>
  req === 'Yes' ? <Chip cls="r">yes</Chip>
  : req === 'Cond.' ? <Chip cls="w">cond</Chip>
  : <Chip cls="m">{req}</Chip>;

export default function FieldDictionary() {
  const total = DICT.reduce((s, d) => s + d[1].length, 0);

  return (
    <Card title="Field dictionary" hint={`${total} fields across 5 layers`}>
      <div className="note" style={{ marginBottom: 12 }}>
        Columns: what it is called in the database, what the screen calls it, where the value comes from,
        and who is accountable for capturing it. <b>Capture owner</b> is the column that matters — a field
        with no named owner never gets filled.
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Field</th><th>On screen</th><th>Type</th><th>Source</th>
              <th>Capture owner</th><th>Req.</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {DICT.map(([layer, fields]) => (
              <Fragment key={layer}>
                <tr className="layer"><td colSpan={7}>{layer}</td></tr>
                {fields.map(([f, l, t, src, own, req, pii, note]) => (
                  <tr key={f}>
                    <td>
                      <code>{f}</code>
                      {pii && (
                        <span style={{ fontSize: 9, color: 'var(--block)', fontWeight: 700 }}> PII</span>
                      )}
                    </td>
                    <td>{l}</td>
                    <td className="sub2">{t}</td>
                    <td className="sub2">{src}</td>
                    <td><b>{own}</b></td>
                    <td>{reqChip(req)}</td>
                    <td className="sub2">{note}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
