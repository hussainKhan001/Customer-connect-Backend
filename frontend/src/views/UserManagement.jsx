import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, AlertTriangle } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, BtnPrimary, rowActionCls } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import UserModal from '../components/UserModal.jsx';
import UserPermissionsModal from '../components/UserPermissionsModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ROLES } from '../utils/reference.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

export default function UserManagement() {
  const { user: me } = useAuth();
  const { raw, deleteAllCustomers } = useApp();
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [permUser, setPermUser] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = () => {
    apiFetch('/api/users')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(res.status === 403 ? 'Your role does not have access to user management.' : body.error || 'Could not load users.');
        }
        return res.json();
      })
      .then((data) => { setUsers(data); setLoadError(null); })
      .catch((err) => setLoadError(err.message));
  };

  useEffect(load, []);

  const patchUser = async (id, body) => {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || Object.values(updated.errors || {})[0] || 'Update failed.');
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      toast.success('Updated', `${updated.name}'s account saved.`);
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (u) => {
    const next = !u.active;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: next ? 'Reactivate this account?' : 'Deactivate this account?',
      text: next ? `${u.name} will be able to sign in again.` : `${u.name} will no longer be able to sign in.`,
      showCancelButton: true,
      confirmButtonText: next ? 'Reactivate' : 'Deactivate',
    });
    if (!confirm.isConfirmed) return;
    patchUser(u.id, { active: next });
  };

  const resetPassword = async (u) => {
    const { value: password } = await Swal.fire({
      title: `Reset password — ${u.name}`,
      input: 'password',
      inputLabel: 'New password (at least 8 characters)',
      inputPlaceholder: 'Enter a new password',
      showCancelButton: true,
      confirmButtonText: 'Reset password',
      inputValidator: (v) => (!v || v.length < 8 ? 'Must be at least 8 characters' : undefined),
    });
    if (!password) return;
    setBusyId(u.id);
    try {
      const res = await apiFetch(`/api/users/${u.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Reset failed.');
      toast.success('Password reset', `${u.name}'s password has been changed.`);
    } catch (err) {
      toast.error('Could not reset password', err.message);
    } finally {
      setBusyId(null);
    }
  };

  /* type-to-confirm, same reasoning as GitHub's own repo-delete flow —
     this wipes every customer record at once and cannot be undone.
     The server independently requires the exact same phrase in the
     request body, so this dialog isn't the only thing standing
     between a stray click and the whole owner base disappearing. */
  const deleteAllData = async () => {
    const total = raw.length;
    const { value: typed } = await Swal.fire({
      icon: 'error',
      title: `Delete all ${total} customer record${total === 1 ? '' : 's'}?`,
      html: `This permanently removes <b>every owner</b> — complete and incomplete — and cannot be undone.<br/>Type <code>DELETE ALL</code> to confirm.`,
      input: 'text',
      inputPlaceholder: 'DELETE ALL',
      showCancelButton: true,
      confirmButtonText: 'Delete everything',
      confirmButtonColor: '#dc2626',
      inputValidator: (v) => (v !== 'DELETE ALL' ? 'Type DELETE ALL exactly to confirm' : undefined),
    });
    if (typed !== 'DELETE ALL') return;
    setDeletingAll(true);
    try {
      const body = await deleteAllCustomers();
      toast.success('All customer data deleted', `${body.deletedCount} record(s) removed.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  if (loadError) {
    return <Banner kind="block">{loadError}</Banner>;
  }

  return (
    <>
      <Banner kind="info">
        Access is decided entirely by role (see Access &amp; governance) — this page only creates accounts
        and assigns which role each person has. Nobody can deactivate or change their own role here, to
        avoid an accidental lockout.
      </Banner>

      <Card title="Users" hint={users ? `${users.length} accounts` : ''} pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className={td}>
                      <b className="text-gray-900 dark:text-white">{u.name}</b>
                      {isSelf && <span className="text-[10.5px] text-gray-400 dark:text-gray-500"> (you)</span>}
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>{u.email}</td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        {isSelf ? (
                          <span className="text-gray-700 dark:text-gray-300">{u.role}</span>
                        ) : (
                          <ThemedSelect
                            className="w-40"
                            value={u.role}
                            onChange={(role) => patchUser(u.id, { role })}
                            options={ROLE_OPTIONS}
                          />
                        )}
                        {!!Object.keys(u.permissionOverrides || {}).length && (
                          <span title="Has permission overrides"><Chip cls="w">{Object.keys(u.permissionOverrides).length} override{Object.keys(u.permissionOverrides).length > 1 ? 's' : ''}</Chip></span>
                        )}
                      </div>
                    </td>
                    <td className={td}>
                      {u.active ? <Chip cls="g">active</Chip> : <Chip cls="m">deactivated</Chip>}
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex items-center gap-1.5">
                        <button className={rowActionCls('primary')} onClick={() => setPermUser(u)}>
                          Permissions
                        </button>
                        <button className={rowActionCls('primary')} onClick={() => resetPassword(u)} disabled={busyId === u.id}>
                          Reset password
                        </button>
                        {!isSelf && (
                          <button className={rowActionCls(u.active ? 'red' : 'green')} onClick={() => toggleActive(u)} disabled={busyId === u.id}>
                            {u.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <BtnPrimary className="inline-flex items-center gap-1.5" onClick={() => setAddOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add user
      </BtnPrimary>

      <Card title="Danger zone" hint="Irreversible">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2.5 max-w-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
              Permanently deletes every customer record — complete and incomplete — from the database.
              This cannot be undone. Use only to clear test/import data before a fresh upload.
            </p>
          </div>
          <button
            className="shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={deleteAllData}
            disabled={deletingAll || !raw.length}
          >
            {deletingAll ? 'Deleting…' : `Delete all customer data${raw.length ? ` (${raw.length})` : ''}`}
          </button>
        </div>
      </Card>

      {addOpen && (
        <UserModal onClose={() => setAddOpen(false)} onCreated={(u) => setUsers((prev) => [...(prev || []), u])} />
      )}
      {permUser && (
        <UserPermissionsModal
          user={permUser}
          onClose={() => setPermUser(null)}
          onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}
    </>
  );
}
