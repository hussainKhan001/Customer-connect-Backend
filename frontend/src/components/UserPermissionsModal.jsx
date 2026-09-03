/* Per-user exceptions to the role's PERMS row (Access & governance) —
   only capabilities explicitly overridden here differ from what the
   person's role normally gets; everything else still tracks the role
   matrix automatically, including future role changes. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, Chip } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { PERMS, PERM_LABEL, ROLES, NON_OVERRIDABLE } from '../utils/reference.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const OVERRIDE_OPTIONS = [
  { value: '', label: '(use role default)' },
  { value: 'F', label: 'Full' },
  { value: 'S', label: 'Own scope' },
  { value: 'O', label: 'Own customers' },
  { value: 'N', label: 'None' },
];

export default function UserPermissionsModal({ user, onClose, onSaved }) {
  const roleIdx = ROLES.indexOf(user.role);
  const rows = PERMS.filter(([label]) => label !== NON_OVERRIDABLE);
  const [overrides, setOverrides] = useState(() => ({ ...(user.permissionOverrides || {}) }));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      rows.forEach(([label]) => { payload[label] = overrides[label] || null; });
      const res = await apiFetch(`/api/users/${user.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not save.');
      toast.success('Permissions updated', `${user.name}'s overrides saved.`);
      onSaved(body);
      onClose();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Permission overrides"
      subtitle={`${user.name} · role: ${user.role}`}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save overrides'}</BtnPrimary>
        </>
      }
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3.5">
        Only set an override where this specific person genuinely needs more or less than their role. Leave
        everything else on "(use role default)" — it then tracks their role automatically, including if the
        role changes later. The contact gate can never be overridden, for anyone.
      </div>

      <div className="space-y-2">
        {rows.map(([label, cells]) => {
          const roleDefault = cells[roleIdx];
          const current = overrides[label] || '';
          const isOverridden = !!current;
          return (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 dark:text-gray-100">{label}</div>
                <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                  role default: <Chip cls={PERM_LABEL[roleDefault]?.cls === 'yes' ? 'g' : PERM_LABEL[roleDefault]?.cls === 'no' ? 'm' : 'w'}>
                    {PERM_LABEL[roleDefault]?.t}
                  </Chip>
                </div>
              </div>
              <ThemedSelect
                className={`w-40 flex-shrink-0 ${isOverridden ? '[&>button]:border-primary-400' : ''}`}
                value={current}
                onChange={(v) => setOverrides((o) => ({ ...o, [label]: v }))}
                options={OVERRIDE_OPTIONS}
              />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
