import React, { useState } from 'react';
import { 
  Briefcase, Plus, MapPin, ClipboardList, RefreshCw, CheckCircle2, 
  Calendar, DollarSign, Bell, Shield, TrendingUp, Search, UserCheck, Truck, MessageSquare
} from 'lucide-react';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage } from '../types';
import CalendarWidget from './CalendarWidget';
import PayrollWidget from './PayrollWidget';
import NotificationsWidget from './NotificationsWidget';
import ReportsWidget from './ReportsWidget';
import TeamWidget from './TeamWidget';
import ChatWidget from './ChatWidget';
import { showAlert } from '../platform';
import { SecureAccountsReport } from '../auth';

interface AdminPanelProps {
  users: User[];
  shifts: Shift[];
  clockLogs: ClockLog[];
  jobs: Job[];
  notifications: PushNotificationLog[];
  messages: ChatMessage[];
  currentUser: User;
  currentUserRole: string;
  onAddJob: (newJob: Omit<Job, 'id' | 'status' | 'startedAt' | 'completedAt' | 'loggedMaterials' | 'signature' | 'statusHistory' | 'assignedUserName'>) => void;
  onAddShift: (newShift: Omit<Shift, 'id'>) => void;
  onDeleteShift: (id: string) => void;
  onDispatchNotification: (newNotification: Omit<PushNotificationLog, 'id' | 'timestamp' | 'isSent'>) => void;
  onVerifyClockLog: (id: string) => void;
  onAdminClockOutUser?: (id: string) => void;
  onUpdateUserStatus: (id: string, updates: Partial<User>) => void;
  onAddUser: (user: User, password: string) => Promise<boolean>;
  onSaveUser: (user: User, changes: Partial<User>, newPassword?: string) => Promise<boolean>;
  onDeleteUser: (userId: string) => void;
  secured: boolean;
  rulesPublished: boolean | null;
  onSecureAccounts: () => Promise<SecureAccountsReport | null>;
  onSignOut: () => void;
  onUpdateJobStatus: (id: string, status: Job['status']) => void;
  onSendMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  onClearToast?: () => void;
}

export default function AdminPanel({
  users,
  shifts,
  clockLogs,
  jobs,
  notifications,
  messages,
  currentUser,
  currentUserRole,
  onAddJob,
  onAddShift,
  onDeleteShift,
  onDispatchNotification,
  onVerifyClockLog,
  onAdminClockOutUser,
  onUpdateUserStatus,
  onAddUser,
  onSaveUser,
  onDeleteUser,
  secured,
  rulesPublished,
  onSecureAccounts,
  onSignOut,
  onUpdateJobStatus,
  onSendMessage,
  onClearToast
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'team' | 'roster' | 'tickets' | 'payroll' | 'telemetry' | 'alerts' | 'vehicles' | 'chat'>('reports');
  const [ticketTab, setTicketTab] = useState<'pending' | 'completed'>('pending');
  const [showAddJobModal, setShowAddJobModal] = useState<boolean>(false);

  // New Job formulation state
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobDesc, setJobDesc] = useState<string>('');
  const [jobCategory, setJobCategory] = useState<Job['category']>('maintenance');
  const [jobAssignee, setJobAssignee] = useState<string>('emp-1');
  const [jobLocation, setJobLocation] = useState<string>('');
  const [jobPriority, setJobPriority] = useState<Job['priority']>('medium');
  const [jobPayout, setJobPayout] = useState<number>(0);

  // Coordinates matrix for major commercial buildings to inject into new jobs automatically
  const siteCoordinates: Record<string, { lat: number; lng: number }> = {
    'Sutter Medical Tower': { lat: 37.7812, lng: -122.4302 },
    'Mission Bay Data Center': { lat: 37.7501, lng: -122.3920 },
    'Bay Shore Steam Plant': { lat: 37.7490, lng: -122.4350 },
    'General Clinic Emergency Annex': { lat: 37.7550, lng: -122.4050 },
    'District Substation 6': { lat: 37.7651, lng: -122.4095 },
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobLocation.trim()) return;

    const assignedUser = users.find(u => u.id === jobAssignee);
    if (!assignedUser) {
      showAlert("Please select a valid technician.");
      return;
    }

    if (assignedUser.role === 'super-admin' && currentUserRole !== 'super-admin') {
      showAlert("You cannot assign the CEO/Super-Admin to tickets.");
      return;
    }

    onAddJob({
      title: jobTitle,
      description: jobDesc,
      category: jobCategory,
      assignedUserId: jobAssignee,
      locationName: jobLocation,
      priority: jobPriority,
      payoutAmount: jobPayout
    });

    // Reset Form
    setJobTitle('');
    setJobDesc('');
    setJobLocation('');
    setJobPayout(0);
    setShowAddJobModal(false);
  };

  const handleTabSwitch = (tab: 'reports' | 'team' | 'roster' | 'tickets' | 'payroll' | 'telemetry' | 'alerts' | 'vehicles' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'alerts') {
      onUpdateUserStatus(currentUser.id, { lastReadNotificationsAt: new Date().toISOString() });
      if (onClearToast) onClearToast();
    }
  };

  const lastReadAdmin = currentUser.lastReadNotificationsAt ? new Date(currentUser.lastReadNotificationsAt).getTime() : 0;
  const unreadAdminCount = notifications.filter(n => new Date(n.timestamp).getTime() > lastReadAdmin).length;

  // Calculate unread messages
  const unreadMessagesCount = messages.filter(m => {
    const isForMe = m.recipientId === currentUser.id || m.recipientId === 'general' || !m.recipientId;
    if (!isForMe || m.senderId === currentUser.id) return false;
    
    const chatId = (!m.recipientId || m.recipientId === 'general') ? 'general' : m.senderId;
    const lastReadMsg = currentUser.lastReadMessagesAt?.[chatId] ? new Date(currentUser.lastReadMessagesAt[chatId]).getTime() : 0;
    return new Date(m.timestamp).getTime() > lastReadMsg;
  }).length;

  return (
    <div className="space-y-6">
      {/* Top action dashboard & tabs switcher */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 block">
              SECURE SECTOR DISPATCH HUBS
            </span>
            <h2 className="font-sans font-black text-white text-xl md:text-2xl mt-0.5 tracking-tight flex items-center gap-2">
               VECTOR GENERAL CONTROL HEADQUARTERS
            </h2>
            <p className="font-sans text-xs text-stone-400 mt-1">
              Live fleet tracking, automated payroll calculators, interactive timesheet audits, and technical scheduler.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddJobModal(true)}
              className="w-full md:w-auto font-sans font-bold text-xs bg-amber-400 hover:bg-amber-300 text-black px-4.5 py-2.5 rounded shadow-lg shadow-amber-950/20 flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              DISPATCH NEW FIELD JOB
            </button>
          </div>
        </div>

        {/* Tab List */}
        <div className="flex flex-wrap border-t border-stone-800/80 mt-5 pt-4 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => handleTabSwitch('reports')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Executive Reports
          </button>
          {(currentUserRole === 'super-admin' || currentUserRole === 'admin' || currentUserRole === 'head-procurement') && (
            <button
              onClick={() => handleTabSwitch('team')}
              className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'team' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Team Management
            </button>
          )}
          <button
            onClick={() => handleTabSwitch('roster')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'roster' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Roster Scheduler
          </button>
          <button
            onClick={() => handleTabSwitch('tickets')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'tickets' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Ticket Completion
          </button>
          {(currentUserRole === 'super-admin' || currentUserRole === 'finance') && (
            <button
              onClick={() => handleTabSwitch('payroll')}
              className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'payroll' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              Contractor Payments
            </button>
          )}
          <button
            onClick={() => handleTabSwitch('telemetry')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'telemetry' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Check-In Log Audits
          </button>
          <button
            onClick={() => handleTabSwitch('alerts')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'alerts' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Bell className="h-4 w-4" />
            Alerts &amp; Notifications
            {unreadAdminCount > 0 && (
              <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
                {unreadAdminCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabSwitch('vehicles')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'vehicles' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Truck className="h-4 w-4" />
            Fleet Vehicles
          </button>
          <button
            onClick={() => handleTabSwitch('chat')}
            className={`px-4 py-2 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'chat' ? 'bg-amber-400 text-black font-black' : 'text-stone-400 hover:text-white hover:bg-stone-850'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Comms Hub
            {unreadMessagesCount > 0 && (
              <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
                {unreadMessagesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Tab Outputs */}
      <div className="transition-all animate-fade">
        {activeTab === 'reports' && (
          <ReportsWidget jobs={jobs} users={users} clockLogs={clockLogs} />
        )}

        {activeTab === 'team' && (currentUserRole === 'super-admin' || currentUserRole === 'admin' || currentUserRole === 'head-procurement') && (
          <TeamWidget
            users={users}
            currentUserRole={currentUserRole}
            secured={secured}
            rulesPublished={rulesPublished}
            onAddUser={onAddUser}
            onSaveUser={onSaveUser}
            onDeleteUser={onDeleteUser}
            onSecureAccounts={onSecureAccounts}
            onSignOut={onSignOut}
          />
        )}

        {activeTab === 'tickets' && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4.5 shadow-md">
            <h3 className="font-sans font-bold text-white text-xs uppercase tracking-wider pb-2.5 border-b border-stone-800 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>Fleet Repair Ticket Pipeline</span>
                <span className="text-[10px] font-mono text-stone-500">Live Updating</span>
              </div>
              <div className="flex bg-stone-950 p-1 rounded border border-stone-800">
                <button
                  onClick={() => setTicketTab('pending')}
                  className={`px-4 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${
                    ticketTab === 'pending' ? 'bg-stone-800 text-white font-bold' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Pending ({jobs.filter(j => j.status !== 'completed').length})
                </button>
                <button
                  onClick={() => setTicketTab('completed')}
                  className={`px-4 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${
                    ticketTab === 'completed' ? 'bg-stone-800 text-white font-bold' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Completed ({jobs.filter(j => j.status === 'completed').length})
                </button>
              </div>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.filter(j => ticketTab === 'completed' ? j.status === 'completed' : j.status !== 'completed').sort((a,b) => {
                const p = { high: 0, medium: 1, low: 2 };
                return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
              }).map(j => {
                const statusColors = 
                  j.status === 'completed' ? 'text-emerald-400 font-bold bg-emerald-500/10' :
                  j.status === 'in-progress' ? 'text-indigo-400 font-bold bg-indigo-500/10' :
                  j.status === 'on-site' ? 'text-amber-400 font-bold bg-amber-400/10' :
                  'text-stone-400 bg-stone-800';

                return (
                  <div key={j.id} className={`bg-black/40 border border-stone-850 p-3 rounded flex flex-col justify-between ${j.status === 'completed' ? 'opacity-70 border-emerald-500/20' : ''}`}>
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full uppercase ${statusColors}`}>{j.status}</span>
                        <span className="text-stone-500 font-semibold">{j.priority.toUpperCase()} PRIORITY</span>
                      </div>
                      <h4 className="font-sans font-bold text-xs text-stone-100 truncate">{j.title}</h4>
                      <p className="font-sans text-[11px] text-stone-400 mt-1 block truncate"><span className="text-stone-600 font-bold">📍</span> {j.locationName}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-850/60 font-mono text-[9px] text-stone-400">
                      <span>TECH: {j.assignedUserName}</span>
                      <span className="text-amber-400 uppercase">{j.category}</span>
                    </div>

                    {/* Admin Override Controls */}
                    <div className="mt-3 pt-3 border-t border-stone-850 bg-black/20 -mx-3 -mb-3 p-3 flex flex-wrap gap-1">
                      <span className="w-full text-[8px] font-mono text-stone-600 mb-1 leading-none uppercase">Admin Status Override</span>
                      <button 
                        onClick={() => onUpdateJobStatus(j.id, 'pending')}
                        className={`px-2 py-1 rounded text-[9px] uppercase border ${j.status === 'pending' ? 'bg-stone-800 border-stone-700 text-stone-300' : 'border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-white'}`}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => onUpdateJobStatus(j.id, 'on-site')}
                        className={`px-2 py-1 rounded text-[9px] uppercase border ${j.status === 'on-site' ? 'bg-amber-400/20 border-amber-500/30 text-amber-400' : 'border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-white'}`}
                      >
                        On-Site
                      </button>
                      <button 
                        onClick={() => onUpdateJobStatus(j.id, 'in-progress')}
                        className={`px-2 py-1 rounded text-[9px] uppercase border ${j.status === 'in-progress' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-white'}`}
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => onUpdateJobStatus(j.id, 'completed')}
                        className={`px-2 py-1 rounded text-[9px] uppercase border ${j.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-white'}`}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <CalendarWidget 
            users={users} 
            shifts={shifts} 
            isAdmin={true} 
            currentUserRole={currentUserRole}
            onAddShift={onAddShift} 
            onDeleteShift={onDeleteShift} 
          />
        )}

        {activeTab === 'payroll' && (currentUserRole === 'super-admin' || currentUserRole === 'finance') && (
          <PayrollWidget 
            users={users} 
            onClearPayment={(id) => {
              const u = users.find(x => x.id === id);
              if (u) {
                onUpdateUserStatus(id, { balanceDue: 0 });
                onDispatchNotification({
                  title: 'Settlement Cleared',
                  message: `Payment of Ksh ${u.balanceDue} has been cleared and settled by the admin.`,
                  recipientUserId: id,
                  recipientUserName: u.name,
                  type: 'payroll'
                });
              }
            }}
          />
        )}

        {activeTab === 'telemetry' && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="timesheet-telemetry-room">
            <div className="bg-black/30 border-b border-stone-800 p-4">
              <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="h-5 w-5 text-amber-400" /> Biometric Check-In & GPS Ledger Audits
              </h3>
              <p className="font-sans text-xs text-stone-400 mt-1">
                Verify coordinate matches, clocked hours, and approve timesheets to feed general payroll cycles.
              </p>
            </div>

            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase">
                      <th className="py-3 px-2">Technician</th>
                      <th className="py-3 px-2">Roster Ranging Date</th>
                      <th className="py-3 px-2 text-right">Hours Logged</th>
                      <th className="py-3 px-2 text-center text-stone-500">Status</th>
                      <th className="py-3 px-2 text-center">Auditing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 font-sans">
                    {clockLogs.slice().reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-black/20 text-stone-200">
                        <td className="py-3 px-2">
                          <span className="font-semibold block text-white">{log.userName}</span>
                          <span className="text-[10px] text-stone-500">{log.notes || 'No work notes logged'}</span>
                        </td>
                        <td className="py-3 px-2 text-stone-400">
                          <p className="font-semibold font-mono">{new Date(log.clockInTime).toLocaleDateString([], {month: 'short', day: 'numeric'})}</p>
                          <p className="text-[10px] font-mono">
                            {new Date(log.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            &ndash;
                            {log.clockOutTime ? new Date(log.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active Rota'}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-stone-300">
                          {log.totalHours ? `${log.totalHours.toFixed(2)}h` : 'IN-PROGRESS'}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold">
                          <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full ${log.verified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-400/10 text-red-400 border border-red-400/20 animate-pulse'}`}>
                            {log.verified ? ' Ledger Verified' : 'Pending Audit'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {!log.clockOutTime ? (
                            <button
                              onClick={() => {
                                if (onAdminClockOutUser) {
                                  onAdminClockOutUser(log.id);
                                }
                              }}
                              className="font-mono text-[10px] bg-red-500 hover:bg-red-400 text-white font-semibold py-1 px-3 rounded shadow transition-all uppercase cursor-pointer"
                            >
                              Force Auth Check-Out
                            </button>
                          ) : !log.verified ? (
                            <button
                              onClick={() => onVerifyClockLog(log.id)}
                              className="font-mono text-[10px] bg-amber-400 hover:bg-amber-300 text-black font-semibold py-1 px-3 rounded shadow transition-all uppercase cursor-pointer"
                            >
                              Verify & Certify
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-500 font-mono">✔ Locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <NotificationsWidget 
            users={users} 
            notifications={notifications} 
            isAdmin={true} 
            onDispatchNotification={onDispatchNotification} 
          />
        )}

        {activeTab === 'chat' && (
          <ChatWidget 
            currentUser={currentUser}
            users={users}
            messages={messages}
            onSendMessage={onSendMessage}
            onUpdateUserStatus={onUpdateUserStatus}
          />
        )}

        {activeTab === 'vehicles' && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="admin-vehicles-panel">
            <div className="bg-black/30 border-b border-stone-800 p-4">
              <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="h-5 w-5 text-amber-400" /> Fleet Vehicle Assignment
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(user => (
                <div key={user.id} className="bg-black/30 border border-stone-800 p-4 rounded-lg flex flex-col justify-between hover:border-stone-700 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold uppercase shrink-0" style={{ backgroundColor: user.avatarColor }}>
                      {user.name.slice(0, 2)}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-white text-sm truncate">{user.name}</h4>
                      <p className="text-[10px] text-stone-500 font-mono uppercase truncate">{user.position}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-stone-500 mb-1.5 block tracking-wider">Assigned Vehicle (Reg. Plate)</label>
                    <input
                      type="text"
                      className="w-full bg-stone-900 border border-stone-700 text-amber-400 p-2.5 rounded focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 text-xs font-mono uppercase placeholder-stone-700 transition-colors"
                      placeholder="UNASSIGNED"
                      defaultValue={user.vehicleNumber || ''}
                      onBlur={(e) => {
                        const val = e.target.value.trim().toUpperCase();
                        if (val !== (user.vehicleNumber || '').toUpperCase()) {
                          onUpdateUserStatus(user.id, { vehicleNumber: val });
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="col-span-full py-8 text-center text-stone-500 font-mono text-sm border border-dashed border-stone-800 rounded-lg">
                  No active operational staff found in ledger.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DISPATCH NEW JOB FORM MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative animate-scale m-auto">
            <button
              onClick={() => setShowAddJobModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white font-mono text-sm shadow"
            >
              ✕ CLOSE
            </button>

            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-500 block mb-1">
              OPERATIONS ROOM DISPATCHER
            </span>
            <h3 className="font-sans font-black text-lg text-white mb-4">
              DISPATCH FIELD MAINTENANCE JOB
            </h3>

            <form onSubmit={handleCreateJob} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Repair or Supply Title</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Turbine Overhaul"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Scope of work briefing instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide precise steps, security measures, and materials expected for technician deploy..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Category</label>
                  <select
                    value={jobCategory}
                    onChange={(e) => setJobCategory(e.target.value as Job['category'])}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="general-supply">General Supply Delivery</option>
                    <option value="urgent">Urgent Call-out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Priority</label>
                  <select
                    value={jobPriority}
                    onChange={(e) => setJobPriority(e.target.value as Job['priority'])}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">Urgent/High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Assign Technician / Crew</label>
                  <select
                    value={jobAssignee}
                    onChange={(e) => setJobAssignee(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs"
                  >
                    {users
                      .filter(u => currentUserRole === 'super-admin' || u.role !== 'super-admin')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1">Due Payout (Ksh)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 15000.00"
                    className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-emerald-400 outline-none focus:border-emerald-400 text-xs font-mono font-bold"
                    name="jobPayout"
                    id="jobPayout"
                    value={jobPayout}
                    onChange={e => setJobPayout(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Site / Client Location</label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="Enter site or client location manually"
                  className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-100 outline-none focus:border-amber-400 text-xs"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="w-1/3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-sans text-xs py-2.5 rounded transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-amber-400 hover:bg-amber-300 text-black font-sans font-black text-xs py-2.5 rounded transition-all shadow-lg shadow-amber-950/20"
                >
                  DISPATCH TO FLEET TELEMETRY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Pill (Netflix Style) */}
      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm pointer-events-auto">
        <div className="bg-[#1a1a1a]/40 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="flex items-center overflow-x-auto scrollbar-hide snap-x w-full">
            <button
              onClick={() => handleTabSwitch('reports')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'reports' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <TrendingUp className={`h-[22px] w-[22px] ${activeTab === 'reports' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Reports</span>
            </button>
            {(currentUserRole === 'super-admin' || currentUserRole === 'admin' || currentUserRole === 'head-procurement') && (
              <button
                onClick={() => handleTabSwitch('team')}
                className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'team' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
              >
                <Briefcase className={`h-[22px] w-[22px] ${activeTab === 'team' ? 'text-white' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Team</span>
              </button>
            )}
            <button
              onClick={() => handleTabSwitch('roster')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'roster' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Calendar className={`h-[22px] w-[22px] ${activeTab === 'roster' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Roster</span>
            </button>
            <button
              onClick={() => handleTabSwitch('tickets')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'tickets' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <CheckCircle2 className={`h-[22px] w-[22px] ${activeTab === 'tickets' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Tickets</span>
            </button>
            {(currentUserRole === 'super-admin' || currentUserRole === 'finance') && (
              <button
                onClick={() => handleTabSwitch('payroll')}
                className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'payroll' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
              >
                <DollarSign className={`h-[22px] w-[22px] ${activeTab === 'payroll' ? 'text-white' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Payroll</span>
              </button>
            )}
            <button
              onClick={() => handleTabSwitch('telemetry')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'telemetry' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <ClipboardList className={`h-[22px] w-[22px] ${activeTab === 'telemetry' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Logs</span>
            </button>
            <button
              onClick={() => handleTabSwitch('alerts')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center relative ${activeTab === 'alerts' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <div className="relative">
                <Bell className={`h-[22px] w-[22px] ${activeTab === 'alerts' ? 'text-white' : ''}`} />
                {unreadAdminCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a]"></span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Alerts</span>
            </button>
            <button
              onClick={() => handleTabSwitch('vehicles')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${activeTab === 'vehicles' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Truck className={`h-[22px] w-[22px] ${activeTab === 'vehicles' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Fleet</span>
            </button>
            <button
              onClick={() => handleTabSwitch('chat')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center relative ${activeTab === 'chat' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <div className="relative">
                <MessageSquare className={`h-[22px] w-[22px] ${activeTab === 'chat' ? 'text-white' : ''}`} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a]"></span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Comms</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
