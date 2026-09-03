/* Log a new open complaint — any open complaint closes the Contact
   Gate immediately (see GATE_ORDER's OPEN_COMPLAINT rule). */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import { todayInput } from '../utils/core.js';
import { toast } from '../utils/toast.js';

const OWNERS = ['AGM Projects', 'AGM CRM', 'Site Engineering'];

/* defaults to this app's fixed TODAY (see core.js), not the real
   calendar date — the backend validates "not in the future" against
   that same fixed date, so a real-clock default would fail instantly */
export default function ComplaintModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ t: '', raised: todayInput(), owner: OWNERS[0], ncr: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/complaints`, draft, 'POST');
      toast.success('Complaint logged', `Now open on ${customer.name}'s record — the contact gate is closed.`);
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
      title="Log complaint"
      subtitle={`${customer.salutation} ${customer.name} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log complaint'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>What happened</label>
          <textarea value={draft.t} onChange={set('t')} rows={2} className={formInputCls(!!errors.t)} placeholder="e.g. Seepage — master bathroom wall" />
          {errors.t && <div className={formErrorCls}>{errors.t}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Raised on</label>
          <input type="date" value={draft.raised} onChange={set('raised')} className={formInputCls(!!errors.raised)} />
          {errors.raised && <div className={formErrorCls}>{errors.raised}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Owner of the fix</label>
          <input value={draft.owner} onChange={set('owner')} className={formInputCls(!!errors.owner)} placeholder="e.g. AGM CRM" />
          {errors.owner && <div className={formErrorCls}>{errors.owner}</div>}
        </div>
        <div>
          <label className={formLabelCls}>NCR reference</label>
          <input value={draft.ncr} onChange={set('ncr')} className={formInputCls(!!errors.ncr)} placeholder="e.g. NCR-2026-0142" />
          {errors.ncr && <div className={formErrorCls}>{errors.ncr}</div>}
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          This closes the contact gate immediately until the complaint is closed.
        </div>
      </div>
    </Modal>
  );
}
