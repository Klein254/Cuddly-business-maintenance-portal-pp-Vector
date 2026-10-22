import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Save, UserCog, UserPlus, CheckCircle2, Trash2 } from 'lucide-react';

interface TeamWidgetProps {
  users: User[];
  currentUserRole: string;
  onUpdateUserStatus: (id: string, updates: Partial<User>) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export default function TeamWidget({ users, currentUserRole, onUpdateUserStatus, onAddUser, onDeleteUser }: TeamWidgetProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Partial<User>>({});
  
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
      pin: u.pin, 
      role: u.role 
    });
  };

  const saveEdit = (id: string) => {
    if (currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') {
      onUpdateUserStatus(id, editUser);
    }
    setEditingUserId(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserSurname.trim()) return;

    const newUser: User = {
      id: `emp-${Date.now()}`,
      name: `${newUserName.trim()} ${newUserSurname.trim()}`,
      username: newUserSurname.trim(),
      email: newUserEmail,
      role: newUserRole,
      pin: newUserPin.trim() || '0000', // use provided pin or default
      balanceDue: 0,
      phone: newUserPhone,
      position: newUserPosition,
      avatarColor: 'bg-emerald-500 text-black'
    };

    onAddUser(newUser);
    setShowAddForm(false);
    setNewUserName('');
    setNewUserSurname('');
    setNewUserEmail('');
    setNewUserRole('employee');
    setNewUserPhone('');
    setNewUserPosition('');
    setNewUserPin('');
  };

  return (
    <div className="space-y-6 animate-fade">
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
                <input required value={newUserPin} onChange={e => setNewUserPin(e.target.value)} type="text" className="w-full bg-stone-950 border border-stone-800 p-2 rounded text-stone-100 outline-none focus:border-amber-400" />
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
              <button type="submit" className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold uppercase hover:bg-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Enroll Personnel
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
                              <input value={editUser.pin || ''} onChange={e => setEditUser({...editUser, pin: e.target.value})} className="bg-stone-950 border border-stone-700 text-red-400 outline-none p-1 rounded w-1/2 min-w-0" placeholder="Password" />
                            </div>
                          </div>
                        ) : (
                          <>
                            {u.email}<br/>
                            {u.phone}
                            {(currentUserRole === 'super-admin' || currentUserRole === 'head-procurement') && (
                              <span className="block mt-1 text-red-400">
                                u/n: {u.username} | p/w: {u.pin}
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
                              onClick={() => saveEdit(u.id)}
                              className="font-mono text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-1 px-3 rounded transition-all uppercase inline-flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" /> Save
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (u.role === 'super-admin' && currentUserRole !== 'super-admin') {
                                  alert("Only the super admin can modify a super admin's status.");
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
                               onClick={() => {
                                 if (confirm(`Are you sure you want to delete ${u.name}?`)) {
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
