import { useState } from 'react';
import { Card, Chip, Banner, TableWrap, rowActionCls } from '../components/Ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { fmtD } from '../lib/core.js';
import CompleteRecordModal from '../components/CompleteRecordModal.jsx';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';

function missingFrom(c) {
  const u = c.units[0] || {};
  const miss = [];
  if (!c.pan) miss.push('PAN');
  if (!(u.saleable > 0)) miss.push('Area');
  if (!(u.rate > 0)) miss.push('Rate');
  if (!(u.consideration > 0)) miss.push('Consideration');
  if (!u.bookDate) miss.push('Booking date');
  return miss;
}

export default function IncompleteRecords() {
  const { incompleteRecords } = useApp();
  const [completing, setCompleting] = useState(null);

  return (
    <>
      <Banner kind="warn">
        <b>These records don't have a real PAN and/or confirmed unit financials yet</b> — they came from a
        raw allotment/inventory list, not a booking form. They're held out of the owner base entirely
        (no score, no segment, no gate) until completed, so a guessed number never reaches a customer.
      </Banner>

      <Card title="Incomplete records" hint={`${incompleteRecords.length} held`} pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Owner</th>
                <th className={th}>Mobile</th>
                <th className={th}>Project / unit</th>
                <th className={th}>Missing</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {incompleteRecords.map((c) => {
                const u = c.units[0] || {};
                const miss = missingFrom(c);
                return (
                  <tr key={c.id}>
                    <td className={td}>
                      <b className="text-gray-900 dark:text-white">{c.name}</b>
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.id}</div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>{c.mobile}</td>
                    <td className={td}>
                      {u.unit}
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                        {u.project}{u.consideration ? ` · ${fmtD(u.bookDate)}` : ''}
                      </div>
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {miss.map((m) => <Chip key={m} cls="r">{m}</Chip>)}
                      </div>
                    </td>
                    <td className={`${td} text-right`}>
                      <button className={rowActionCls('primary')} onClick={() => setCompleting(c)}>
                        Complete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!incompleteRecords.length && (
                <tr><td className={td} colSpan={5}>Nothing held — every record has a real PAN and confirmed financials.</td></tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {completing && <CompleteRecordModal customer={completing} onClose={() => setCompleting(null)} />}
    </>
  );
}
