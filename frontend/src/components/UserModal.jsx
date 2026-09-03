/* Add a new user account — role decides everything else via the
   existing PERMS matrix (Access & governance), this just creates the
   login. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { ROLES } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

export default function UserModal({ onClose, onCreated }) {
  const [draft, setDraft] = useState({ name: '', email: '', role: ROLES[0], password: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors || {});
        toast.error('Could not add user', 'Fix the highlighted field and try again.');
        return;
      }
      toast.success('User added', `${draft.name} can now sign in.`);
      onCreated(body);
      onClose();
    } catch {
      toast.error('Could not reach the server', 'Confirm the backend is running and reachable, then try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add user"
      subtitle="Creates a new sign-in — access is decided entirely by role"
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add user'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Name</label>
          <input value={draft.name} onChange={set('name')} className={formInputCls(!!errors.name)} />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Email</label>
          <input value={draft.email} onChange={set('email')} className={formInputCls(!!errors.email)} placeholder="name@neoteric.test" />
          {errors.email && <div className={formErrorCls}>{errors.email}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Role</label>
          <ThemedSelect value={draft.role} onChange={(v) => setDraft((d) => ({ ...d, role: v }))} options={ROLE_OPTIONS} />
          {errors.role && <div className={formErrorCls}>{errors.role}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Temporary password</label>
          <input type="password" value={draft.password} onChange={set('password')} className={formInputCls(!!errors.password)} placeholder="At least 8 characters" />
          {errors.password && <div className={formErrorCls}>{errors.password}</div>}
        </div>
      </div>
    </Modal>
  );
}
