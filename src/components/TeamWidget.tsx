import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Save, UserCog, UserPlus, CheckCircle2, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { confirmAction, showAlert } from '../platform';
import { MIN_PASSWORD_LENGTH, SecureAccountsReport } from '../auth';
import { newId } from '../useFirebase';

interface TeamWidgetProps {
  users: User[];
  currentUserRole: string;
  secured: boolean; // signed in with a secured (Firebase Authentication) account
  rulesPublished: boolean | null; // whether the locked-down database rules are live
  onAddUser: (user: User, password: string) => Promise<boolean>;
  onSaveUser: (user: User, changes: Partial<User>, newPassword?: string) => Promise<boolean>;
  onDeleteUser: (userId: string) => void;
  onSecureAccounts: () => Promise<SecureAccountsReport | null>;
  onSignOut: () => void;
}

// Accounts the switch-over flagged as having weak or publicly known passwords, remembered on this device
// until their password is reset (a reset changes the account's sign-in, which clears the reminder)
const WEAK_PASSWORDS_KEY = 'vector_weak_password_accounts';

function loadWeakPasswordAccounts(): SecureAccountsReport['weakPasswords'] {
  try {
    return JSON.parse(localStorage.getItem(WEAK_PASSWORDS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export default function TeamWidget({ users, currentUserRole, secured, rulesPublished, onAddUser, onSaveUser, onDeleteUser, onSecureAccounts, onSignOut }: TeamWidgetProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Partial<User>>({});
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Account Security panel (one-time switch-over to secure sign-in)
  const [securing, setSecuring] = useState(false);
  const [secureReport, setSecureReport] = useState<SecureAccountsReport | null>(null);
  const [weakPasswordAccounts, setWeakPasswordAccounts] = useState(loadWeakPasswordAccounts);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserSurname, setNewUserSurname] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('employee');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserPin, setNewUserPin] = useState('');

  const startEdit = (u: User) => {
    setEditingUserId(u.id);
    setEditUser({
      name: u.name,
      position: u.position,
      email: u.email,
      phone: u.phone,
      username: u.username,
      role: u.role
    });
    // Passwords are never shown; typing a new one replaces it
    setEditPassword('');
  };

  const saveEdit = async (u: User) => {
    if (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') {
      const newPassword = editPassword.trim();
      if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
        showAlert(`New passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      setSaving(true);
      const saved = await onSaveUser(u, editUser, newPassword || undefined);
      setSaving(false);
      if (!saved) return;
    }
    setEditingUserId(null);
    setEditPassword('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserSurname.trim()) return;
    if (newUserPin.trim().length < MIN_PASSWORD_LENGTH) {
      showAlert(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    const newUser: User = {
      id: newId('emp'),
      name: `${newUserName.trim()} ${newUserSurname.trim()}`,
      username: newUserSurname.trim(),
      email: newUserEmail,
      role: newUserRole,
      balanceDue: 0,
      phone: newUserPhone,
      position: newUserPosition,
      avatarColor: 'bg-emerald-500 text-black'
    };

    setSaving(true);
    const created = await onAddUser(newUser, newUserPin.trim());
    setSaving(false);
    if (!created) return;
    setShowAddForm(false);
    setNewUserName('');
    setNewUserSurname('');
    setNewUserEmail('');
    setNewUserRole('employee');
    setNewUserPhone('');
    setNewUserPosition('');
    setNewUserPin('');
  };

  const canManageAccounts = currentUserRole === 'super-admin' || currentUserRole === 'head-procurement';
  const unsecuredUsers = users.filter(u => !u.authEmail);
  const weakPasswordsToReset = weakPasswordAccounts.filter(w => users.some(u => u.id === w.id && u.authEmail === w.authEmail));
  const showSecurityPanel = canManageAccounts &&
    (unsecuredUsers.length > 0 || rulesPublished === false || weakPasswordsToReset.length > 0 || !!secureReport);

  const handleSecureAccounts = async () => {
    if (!(await confirmAction('Give every person a secure sign-in (same surname and password as now) and delete the stored plain-text passwords?'))) return;
    setSecuring(true);
    const report = await onSecureAccounts();
    setSecuring(false);
    if (!report) return;
    setSecureReport(report);
    try { localStorage.setItem(WEAK_PASSWORDS_KEY, JSON.stringify(report.weakPasswords)); } catch (e) {}
    setWeakPasswordAccounts(report.weakPasswords);
  };

  return (
    <div className="space-y-6 animate-fade">
      {showSecurityPanel && (
        <div className="bg-stone-900 border border-amber-400/40 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-amber-400/5 border-b border-stone-800 p-4">
            <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Lock className="h-5 w-5 text-amber-400" /> Account Security
            </h3>
            <p className="font-sans text-xs text-stone-400 mt-1">
              Protected sign-in for every person, and a database only your staff can reach.
            </p>
          </div>
          <div className="p-4 space-y-3 font-sans text-xs text-stone-300 leading-relaxed">
            {!secured && !secureReport && rulesPublished !== true && (
              <div className="space-y-3">
                <p>
                  Passwords are currently stored in the database as plain text. Securing accounts gives everyone a
                  protected sign-in with the <span className="text-white font-semibold">same surname and password they use today</span>,
                  then deletes the stored passwords.
                </p>
                <button
                  onClick={handleSecureAccounts}
                  disabled={securing}
                  className="bg-amber-400 text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-amber-300 disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Shield className="h-4 w-4" /> {securing ? 'Securing accounts…' : 'Secure all accounts'}
                </button>
              </div>
            )}

            {secureReport && (
              <div className="space-y-2">
                <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> {secureReport.secured.length} accounts secured.
                </p>
                {secureReport.needsPassword.length > 0 && (
                  <p className="text-red-400">
                    Can't sign in until you set a password with Modify: {secureReport.needsPassword.map(n => `${n.name} (${n.reason})`).join(', ')}
                  </p>
                )}
                {!secured && (
                  <div className="bg-black/40 border border-stone-800 rounded p-3 space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Next steps</p>
                    <p>1. Publish the new database rules now (README → Security). Until then the database is still open.</p>
                    <p>2. Sign in again with your usual surname and password.</p>
                    <button
                      onClick={onSignOut}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    >
                      Sign in again
                    </button>
                  </div>
                )}
              </div>
            )}

            {weakPasswordsToReset.length > 0 && (
              <p className="text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Weak or publicly known passwords: give these people a new password with Modify as soon as possible.{' '}
                  <span className="text-white font-semibold">{weakPasswordsToReset.map(w => w.name).join(', ')}</span>
                </span>
              </p>
            )}

            {secured && unsecuredUsers.length > 0 && (
              <p className="text-red-400">
                No sign-in yet. Set a password with Modify: {unsecuredUsers.map(u => u.name).join(', ')}
              </p>
            )}

            {rulesPublished === false && (secured || !!secureReport) && (
              <p className="text-red-400 flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                The database is still open to anyone on the internet. Publish firestore.rules (README → Security) to lock it down.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-black/30 border-b border-stone-800 p-4 flex justify-between items-center">
          <div>
            <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
              <UserCog className="h-5 w-5 text-emerald-400" /> Administrative Team Console
            </h3>
            <p className="font-sans text-xs text-stone-400 mt-1">
              {currentUserRole === 'super-admin' || currentUserRole === 'head-procurement' ? 'Super/Procurement privileges active. Modify access clearances, roles, and compensation rates.' : 'Admin privileges active. View personnel records.'}
            </p>
          </div>
          {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && (
            <div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-amber-400 text-black px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-amber-300 flex items-center gap-1"
              >
                <UserPlus className="h-4 w-4" /> Register Employee
              </button>
            </div>
          )}
        </div>

        {showAddForm && (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && (
          <form onSubmit={handleCreateUser} className="p-4 border-b border-stone-800 bg-black/40">
            <h4 className="font-sans font-bold text-amber-400 text-xs uppercase mb-3 text-center">New Personnel Enrollment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">First Name</label>
                <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} type="text" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">Surname (Username)</label>
                <input required value={newUserSurname} onChange={e => setNewUserSurname(e.target.value)} type="text" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">Login PIN / Password</label>
                <input required minLength={MIN_PASSWORD_LENGTH} value={newUserPin} onChange={e => setNewUserPin(e.target.value)} type="text" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400 placeholder:text-stone-700" />
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">Email</label>
                <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} type="email" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">System Role Designation</label>
                <select 
                  value={newUserRole} 
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  disabled={currentUserRole !== 'super-admin' && currentUserRole !== 'head-procurement'}
                  className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400 disabled:opacity-50"
                  title={(currentUserRole !== 'super-admin' && currentUserRole !== 'head-procurement') ? "Limited permissions" : ""}
                >
                  <option value="employee">Field Tech</option>
                  <option value="admin">Admin / Manager</option>
                  <option value="head-procurement">Head Procurement</option>
                  <option value="finance">Finance</option>
                  <option value="super-admin" disabled={currentUserRole !== 'super-admin'}>Super Admin</option>
                </select>
                {(currentUserRole !== 'super-admin' && currentUserRole !== 'head-procurement') && <p className="text-[9px] text-red-400 mt-1">Only the CEO (super-admin) can give special designations.</p>}
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">Official Position Title</label>
                <input required value={newUserPosition} onChange={e => setNewUserPosition(e.target.value)} type="text" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="block text-stone-500 font-mono text-[10px] uppercase mb-1">Phone Number</label>
                <input value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} type="text" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={saving} className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold uppercase hover:bg-emerald-400 disabled:opacity-60 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {saving ? 'Enrolling…' : 'Enroll Personnel'}
              </button>
            </div>
          </form>
        )}
        
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase">
                  <th className="py-3 px-2">Personnel File</th>
                  <th className="py-3 px-2">Contact Link</th>
                  <th className="py-3 px-2 text-center">System Role Designation</th>
                  {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && <th className="py-3 px-2 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-850 font-sans">
                {users.map((u) => {
                  const isEditing = editingUserId === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-black/20 ${isEditing ? 'bg-amber-400/5' : ''}`}>
                      <td className="py-3 px-2">
                        {isEditing && (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') ? (
                          <div className="space-y-1 w-32">
                            <input value={editUser.name || ''} onChange={e => setEditUser({...editUser, name: e.target.value})} className="bg-stone-950 border border-stone-700 text-stone-200 outline-none text-xs p-1 rounded w-full text-white" placeholder="Name" />
                            <input value={editUser.position || ''} onChange={e => setEditUser({...editUser, position: e.target.value})} className="bg-stone-950 border border-stone-700 text-stone-200 outline-none text-[10px] p-1 rounded w-full uppercase" placeholder="Position" />
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold block text-white">{u.name}</span>
                            <span className="text-[10px] text-stone-500 uppercase">{u.position}</span>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-2 text-stone-400 font-mono text-[10px]">
                        {isEditing && (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') ? (
                          <div className="space-y-1 min-w-[150px]">
                            <input value={editUser.email || ''} onChange={e => setEditUser({...editUser, email: e.target.value})} className="bg-stone-950 border border-stone-700 text-stone-200 outline-none p-1 rounded w-full" placeholder="Email" />
                            <input value={editUser.phone || ''} onChange={e => setEditUser({...editUser, phone: e.target.value})} className="bg-stone-950 border border-stone-700 text-stone-200 outline-none p-1 rounded w-full" placeholder="Phone" />
                            <div className="flex gap-1">
                              <input value={editUser.username || ''} onChange={e => setEditUser({...editUser, username: e.target.value})} className="bg-stone-950 border border-stone-700 text-red-400 outline-none p-1 rounded w-1/2 min-w-0" placeholder="Username" />
                              <input value={editPassword} onChange={e => setEditPassword(e.target.value)} className="bg-stone-950 border border-stone-700 text-red-400 outline-none p-1 rounded w-1/2 min-w-0" placeholder="New password" title="Leave blank to keep the current password" />
                            </div>
                          </div>
                        ) : (
                          <>
                            {u.email}<br/>
                            {u.phone}
                            {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && (
                              <span className="block mt-1 text-red-400">
                                u/n: {u.username} | {u.authEmail ? <span className="text-emerald-400">sign-in secured</span> : 'no secure sign-in yet'}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center align-top">
                        {isEditing && (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') ? (
                          <select 
                            value={editUser.role || ''} 
                            onChange={(e) => setEditUser({...editUser, role: e.target.value as UserRole})}
                            className="bg-stone-950 border border-stone-700 text-stone-200 outline-none text-xs p-1 rounded w-full uppercase font-mono tracking-wider mt-1"
                          >
                            <option value="employee">Field Tech</option>
                            <option value="head-procurement">Head Procurement</option>
                            <option value="finance">Finance</option>
                            <option value="admin">Admin / Manager</option>
                            <option value="super-admin" disabled={currentUserRole !== 'super-admin'}>Super Admin</option>
                          </select>
                        ) : (
                          <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full inline-block ${
                            u.role === 'super-admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            u.role === 'admin' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
                            'bg-stone-800 text-stone-400 border border-stone-700'
                          }`}>
                            {u.role}
                          </span>
                         )}
                      </td>
                      {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && (
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <button
                              onClick={() => saveEdit(u)}
                              disabled={saving}
                              className="font-mono text-[10px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-1 px-3 rounded transition-all uppercase inline-flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (u.role === 'super-admin' && currentUserRole !== 'super-admin') {
                                  showAlert("Only the super admin can modify a super admin's status.");
                                  return;
                                }
                                startEdit(u);
                              }}
                              className="font-mono text-[10px] text-stone-400 hover:text-white transition-colors uppercase border border-stone-700 px-2 py-1 rounded"
                            >
                              Modify
                            </button>
                          )}
                          {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && u.role !== 'super-admin' && (
                             <button
                               onClick={async () => {
                                 if (await confirmAction(`Are you sure you want to delete ${u.name}?`)) {
                                   onDeleteUser(u.id);
                                 }
                               }}
                               className="text-red-500 hover:text-red-400 transition-colors uppercase text-[9px] font-bold border border-red-900/50 hover:bg-red-950 px-2 py-1 rounded flex items-center"
                               title="Purge Record"
                             >
                                <Trash2 className="h-3 w-3" />
                             </button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
