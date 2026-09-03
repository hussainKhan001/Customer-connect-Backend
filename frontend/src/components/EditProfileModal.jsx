/* "Complete profile" — the one write path (besides adding an owner and
   sending a statement) for the fields the Data Confidence checklist
   flags as missing: DOB, anniversary, address, occupation, consent,
   plus the adjacent identity fields shown alongside them in the
   Customer Master rail (co-applicant, email, city, community). */
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls as lblCls, formInputCls as inputCls, formErrorCls as errCls, formCheckCls as checkCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { OCC, COMM, toDateInput } from '../utils/core.js';
import { toast } from '../utils/toast.js';

const RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Other'];
const CONSENT_ROWS = [
  ['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'],
  ['marketing', 'Marketing'], ['children', "Children's data"],
];

function draftFrom(c) {
  return {
    dob: toDateInput(c.dob),
    spouseDob: toDateInput(c.spouseDob),
    kycDate: toDateInput(c.kycDate),
    coApplicant: c.coApplicant || '',
    coRelation: c.coRelation || 'Spouse',
    coOnAgreement: !!c.coOnAgreement,
    email: c.email || '',
    corrAddr: c.captured.addr ? c.corrAddr : '',
    city: c.city || '',
    occupation: c.captured.occ ? c.occupation : '',
    community: c.community || '',
    consent: {
      whatsapp: !!c.consent.whatsapp, sms: !!c.consent.sms, email: !!c.consent.email,
      marketing: !!c.consent.marketing, children: !!c.consent.children, purpose: c.consent.purpose || '',
    },
  };
}

export default function EditProfileModal({ customer, onClose }) {
  const { updateProfile } = useApp();
  const [draft, setDraft] = useState(() => draftFrom(customer));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(draftFrom(customer)); setErrors({}); }, [customer.id]);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const setConsent = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, consent: { ...d.consent, [k]: v } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(customer.id, draft);
      toast.success('Profile updated', `${customer.name}'s details are saved.`);
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
      title="Complete profile"
      subtitle={`${customer.salutation} ${customer.name} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label className={lblCls}>Date of birth</label>
            <input type="date" value={draft.dob} onChange={set('dob')} className={inputCls(!!errors.dob)} />
            {errors.dob && <div className={errCls}>{errors.dob}</div>}
          </div>
          <div>
            <label className={lblCls}>Anniversary</label>
            <input type="date" value={draft.spouseDob} onChange={set('spouseDob')} className={inputCls(!!errors.spouseDob)} />
            {errors.spouseDob && <div className={errCls}>{errors.spouseDob}</div>}
          </div>

          <div>
            <label className={lblCls}>KYC completed</label>
            <input type="date" value={draft.kycDate} onChange={set('kycDate')} className={inputCls(!!errors.kycDate)} />
            {errors.kycDate && <div className={errCls}>{errors.kycDate}</div>}
          </div>

          <div>
            <label className={lblCls}>Co-applicant name</label>
            <input value={draft.coApplicant} onChange={set('coApplicant')} className={inputCls(false)} placeholder="Not captured" />
          </div>
          <div>
            <label className={lblCls}>Relation</label>
            <ThemedSelect value={draft.coRelation} onChange={setVal('coRelation')} options={RELATIONS.map((r) => ({ value: r, label: r }))} />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="coOnAgreement"
              type="checkbox"
              checked={draft.coOnAgreement}
              onChange={(e) => setDraft((d) => ({ ...d, coOnAgreement: e.target.checked }))}
              className={checkCls}
            />
            <label htmlFor="coOnAgreement" className="text-sm text-gray-700 dark:text-gray-300">Co-applicant is on the sale agreement</label>
          </div>

          <div>
            <label className={lblCls}>Email</label>
            <input value={draft.email} onChange={set('email')} className={inputCls(!!errors.email)} placeholder="Not captured" />
            {errors.email && <div className={errCls}>{errors.email}</div>}
          </div>
          <div>
            <label className={lblCls}>City</label>
            <input value={draft.city} onChange={set('city')} className={inputCls(false)} />
          </div>

          <div className="sm:col-span-2">
            <label className={lblCls}>Current address</label>
            <textarea value={draft.corrAddr} onChange={set('corrAddr')} rows={2} className={inputCls(!!errors.corrAddr)} placeholder="Not updated since booking" />
            {errors.corrAddr && <div className={errCls}>{errors.corrAddr}</div>}
          </div>

          <div>
            <label className={lblCls}>Occupation</label>
            <ThemedSelect
              value={draft.occupation}
              onChange={setVal('occupation')}
              options={OCC.map((o) => ({ value: o.k, label: o.k }))}
              placeholder="Not captured"
              className={errors.occupation ? '[&>button]:border-red-400' : ''}
            />
            {errors.occupation && <div className={errCls}>{errors.occupation}</div>}
          </div>
          <div>
            <label className={lblCls}>Community</label>
            <ThemedSelect value={draft.community} onChange={setVal('community')} options={COMM.map((x) => ({ value: x, label: x }))} placeholder="Not captured" />
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-1">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-2">DPDP consent</div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3">
              {CONSENT_ROWS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={draft.consent[k]} onChange={setConsent(k)} className={checkCls} />
                  {l}
                </label>
              ))}
            </div>
            <label className={lblCls}>Purpose captured</label>
            <input
              value={draft.consent.purpose}
              onChange={setConsent('purpose')}
              className={inputCls(false)}
              placeholder="e.g. Portfolio statements and re-investment offers"
            />
          </div>
      </div>
    </Modal>
  );
}
