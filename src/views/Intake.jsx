import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Banner, confColor } from '../components/Ui.jsx';
import { PROJECTS } from '../lib/core.js';
import { CHECKS, FILES, FORM_FIELDS, SAMPLE_DRAFT, exceptions, validateDraft } from '../lib/intake.js';

const EMPTY = Object.fromEntries(FORM_FIELDS.map(([k]) => [k, '']));

const fixOwner = (fails) =>
  fails.some((f) => ['RATE_AREA', 'PAID_LE_CONSID'].includes(f[0])) ? 'Finance'
  : fails.some((f) => f[0] === 'VAL_CURRENT') ? 'Finance — valuation'
  : fails.some((f) => f[0] === 'REG_ON_POSSESSION') ? 'Legal'
  : 'CRM';

export default function Intake() {
  const { base, addCustomer, openCustomer } = useApp();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const ex = exceptions(base);
  const byCode = {};
  ex.forEach((x) => x.fails.forEach(([code]) => { byCode[code] = (byCode[code] || 0) + 1; }));

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const submit = () => {
    const errs = validateDraft(draft, base);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const c = addCustomer(draft);
    setDraft(EMPTY);
    setErrors({});
    openCustomer(c.id);
  };

  return (
    <>
      <Banner kind="info">
        <b>This is the write path.</b> Three files in, validated on import, with everything that fails held
        here rather than quietly loaded. A record in this queue cannot be scored, cannot be sent a
        statement and cannot appear in an outreach list. That is deliberate — the queue is the thing
        standing between a reconciliation error and a customer's hands.
      </Banner>

      <div className="grid g3 mb14">
        {FILES.map(([n, d, cols]) => (
          <Card key={n} title={n} hint={<span className="num">{cols.length} columns</span>}>
            <div className="note" style={{ marginBottom: 9 }}>{d}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cols.map((x) => <code key={x}>{x}</code>)}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid g2 mb14" style={{ gridTemplateColumns: '1fr 1.3fr' }}>
        <Card title="Add an owner" hint="validated live">
          {FORM_FIELDS.map(([k, l, t]) => (
            <div className={`fld${errors[k] ? ' bad' : ''}`} key={k}>
              <label htmlFor={`fld-${k}`}>{l}</label>
              {t === 'select' ? (
                <select id={`fld-${k}`} value={draft[k] ?? ''} onChange={set(k)}>
                  <option value="">Choose</option>
                  {PROJECTS.map((p) => <option key={p.code} value={p.name}>{p.name}</option>)}
                </select>
              ) : (
                <input id={`fld-${k}`} type={t} value={draft[k] ?? ''} onChange={set(k)} />
              )}
              {errors[k] && <div className="err">{errors[k]}</div>}
            </div>
          ))}
          <button className="btn orange full" onClick={submit}>Validate and add</button>
          <button className="btn ghost full" onClick={() => { setDraft(SAMPLE_DRAFT()); setErrors({}); }}>
            Fill with a sample row
          </button>
          <div className="note">
            Adding here writes to the in-memory base. The record appears in the owner base immediately,
            scored and gated like any other.
          </div>
        </Card>

        <Card title="Import validation rules" hint="reject, do not guess">
          <table>
            <tbody>
              {CHECKS.map(([code, l]) => (
                <tr key={code}>
                  <td><code>{code}</code></td>
                  <td>{l}</td>
                  <td className="r num">
                    {byCode[code] ? <Chip cls="r">{byCode[code]} failing</Chip> : <Chip cls="g">all clear</Chip>}
                  </td>
                </tr>
              ))}
              <tr>
                <td><code>DEDUPE_PAN</code></td>
                <td>Deduplicate on PAN first, mobile second, never on name</td>
                <td className="r"><Chip cls="g">enforced</Chip></td>
              </tr>
              <tr>
                <td><code>ONE_CUSTOMER_ID</code></td>
                <td>One customer ID across all three entities — merge candidates surfaced for a human,
                  never merged silently</td>
                <td className="r"><Chip cls="g">enforced</Chip></td>
              </tr>
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 11 }}>
            Reject rather than guess. A row that does not reconcile is held, not adjusted — the variance
            between <code>rate × area</code> and consideration is either an unrecorded discount or an
            error, and you want to know which before it reaches a customer.
          </div>
        </Card>
      </div>

      <Card
        title="Exceptions queue"
        hint={`${ex.length} records held · ${base.length - ex.length} clean`}
        pad={false}
      >
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Owner</th><th>Unit</th><th className="r">Confidence</th>
                <th>Failing checks</th><th>Owner of the fix</th>
              </tr>
            </thead>
            <tbody>
              {ex.slice(0, 30).map(({ c, fails }) => (
                <tr key={c.id} className="clk" onClick={() => openCustomer(c.id)}>
                  <td><div className="nmb">{c.name}</div><div className="sub2">{c.id}</div></td>
                  <td>{c._unit}<div className="sub2">{c._project}</div></td>
                  <td className="r num" style={{ color: confColor(c._conf) }}>{c._conf}%</td>
                  <td>{fails.map(([code]) => <code key={code} style={{ marginRight: 4 }}>{code}</code>)}</td>
                  <td className="sub2">{fixOwner(fails)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
