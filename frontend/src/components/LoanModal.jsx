/* Edit one unit's loan/funding info — Score-only (capacity + timing
   pillars via loan.closed/prepaid/selfFunded), never touches the Gate. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls, formCheckCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import { toDateInput } from '../lib/core.js';
import { toast } from '../lib/toast.js';

export default function LoanModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    bank: unit.loan.bank || '',
    tenure: unit.loan.tenure ?? 0,
    start: toDateInput(unit.loan.start),
    closure: toDateInput(unit.loan.closure),
    closedOn: toDateInput(unit.loan.closedOn),
    prepaid: !!unit.loan.prepaid,
    selfFunded: !!unit.loan.selfFunded,
    closed: !!unit.loan.closed,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setBool = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.checked }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/loan`, {
        ...draft, unit: unit.unit, project: unit.project,
      });
      toast.success('Loan updated', `${unit.unit} — funding details saved.`);
      onClose();
    } catch (err) {
      const fieldErrors = err.errors || {};
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      setErrors(fieldErrors);
      toast.error(
        hasFieldErrors ? 'Could not save' : 'Could not reach the server',
        hasFieldErrors ? 'Fix the highlighted field and try again.' : 'Confirm the backend is running and reachable, then try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit loan"
      subtitle={`${unit.unit} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save loan'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={draft.selfFunded} onChange={setBool('selfFunded')} className={formCheckCls} />
          Self-funded (no bank loan)
        </label>

        {!draft.selfFunded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={formLabelCls}>Bank</label>
              <input value={draft.bank} onChange={set('bank')} className={formInputCls(false)} />
            </div>
            <div>
              <label className={formLabelCls}>Tenure (years)</label>
              <input type="number" min="0" value={draft.tenure} onChange={set('tenure')} className={formInputCls(!!errors.tenure)} />
              {errors.tenure && <div className={formErrorCls}>{errors.tenure}</div>}
            </div>
            <div>
              <label className={formLabelCls}>EMI started</label>
              <input type="date" value={draft.start} onChange={set('start')} className={formInputCls(!!errors.start)} />
              {errors.start && <div className={formErrorCls}>{errors.start}</div>}
            </div>
            <div>
              <label className={formLabelCls}>Scheduled closure</label>
              <input type="date" value={draft.closure} onChange={set('closure')} className={formInputCls(!!errors.closure)} />
              {errors.closure && <div className={formErrorCls}>{errors.closure}</div>}
            </div>
            <div>
              <label className={formLabelCls}>Actual closure</label>
              <input type="date" value={draft.closedOn} onChange={set('closedOn')} className={formInputCls(!!errors.closedOn)} />
              {errors.closedOn && <div className={formErrorCls}>{errors.closedOn}</div>}
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={draft.closed} onChange={setBool('closed')} className={formCheckCls} />
                Loan closed
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={draft.prepaid} onChange={setBool('prepaid')} className={formCheckCls} />
                Foreclosed (prepaid)
              </label>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
