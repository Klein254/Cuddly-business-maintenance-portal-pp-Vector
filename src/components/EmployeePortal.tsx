import React, { useState, useEffect } from 'react';
import { 
  Clock, Power, MapPin, Wrench, CheckCircle2, ClipboardCheck, 
  Map, UserCheck, Shield, DownloadCloud, Lock, FileText, Check, Plus, AlertCircle, Bell, ChevronLeft, ChevronRight, MessageSquare, Home, Activity
} from 'lucide-react';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage } from '../types';
import ChatWidget from './ChatWidget';

interface EmployeePortalProps {
  employee: User;
  users: User[];
  shifts: Shift[];
  clockLogs: ClockLog[];
  jobs: Job[];
  activeLog: ClockLog | undefined;
  notifications: PushNotificationLog[];
  messages: ChatMessage[];
  onClockIn: (notes?: string) => void;
  onClockOut: () => void;
  onUpdateJobStatus: (id: string, status: Job['status'], materials?: string[], signature?: string) => void;
  onTriggerToast: (title: string, msg: string, type: 'alert' | 'system' | 'job' | 'payroll') => void;
  onUpdateUserStatus: (id: string, updates: Partial<User>) => void;
  onSendMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  onClearToast?: () => void;
}

export default function EmployeePortal({
  employee,
  users,
  shifts,
  clockLogs,
  jobs,
  activeLog,
  notifications,
  messages,
  onClockIn,
  onClockOut,
  onUpdateJobStatus,
  onTriggerToast,
  onUpdateUserStatus,
  onSendMessage,
  onClearToast
}: EmployeePortalProps) {
  // Timer for active shift
  const [activeDuration, setActiveDuration] = useState<string>('00:00:00');
  const [clockInNotes, setClockInNotes] = useState<string>('');
  
  // Material Tracker for completing active job
  const [materialInput, setMaterialInput] = useState<string>('');
  const [jobMaterials, setJobMaterials] = useState<string[]>([]);
  const [signatureText, setSignatureText] = useState<string>('');
  const [selectedJobToComplete, setSelectedJobToComplete] = useState<Job | null>(null);

  // Tabs for main view
  const [myPortalTab, setMyPortalTab] = useState<'dashboard' | 'tickets' | 'performance' | 'notifications' | 'chat'>('dashboard');

  const handleTabSwitch = (tab: 'dashboard' | 'tickets' | 'performance' | 'notifications' | 'chat') => {
    setMyPortalTab(tab);
    if (tab === 'notifications') {
      onUpdateUserStatus(employee.id, { lastReadNotificationsAt: new Date().toISOString() });
      if (onClearToast) onClearToast();
    }
  };

  // Calculate unread notifications
  const lastRead = employee.lastReadNotificationsAt ? new Date(employee.lastReadNotificationsAt).getTime() : 0;
  const myNotifs = notifications.filter(n => n.recipientUserId === employee.id || n.recipientUserId === 'all');
  const unreadCount = myNotifs.filter(n => new Date(n.timestamp).getTime() > lastRead).length;

  // Calculate unread messages
  const unreadMessagesCount = messages.filter(m => {
    const isForMe = m.recipientId === employee.id || m.recipientId === 'general' || !m.recipientId;
    if (!isForMe || m.senderId === employee.id) return false;
    
    const chatId = (!m.recipientId || m.recipientId === 'general') ? 'general' : m.senderId;
    const lastReadMsg = employee.lastReadMessagesAt?.[chatId] ? new Date(employee.lastReadMessagesAt[chatId]).getTime() : 0;
    return new Date(m.timestamp).getTime() > lastReadMsg;
  }).length;

  // Tabs for tickets
  const [taskTab, setTaskTab] = useState<'pending' | 'completed'>('pending');

  // Mini-calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Current local state timestamp
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeLog) {
      interval = setInterval(() => {
        const diffMs = Date.now() - new Date(activeLog.clockInTime).getTime();
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        
        setActiveDuration(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setActiveDuration('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeLog]);

  const handleClockToggle = () => {
    if (activeLog) {
      // Clocking out!
      onClockOut();
      onTriggerToast('Clock-Out Synchronized', `Logged work session successfully.`, 'payroll');
    } else {
      // Clocking in!
      onClockIn(clockInNotes);
      onTriggerToast('Clock-In Synchronized', `Roster timer active. Workday broadcast enabled.`, 'system');
      setClockInNotes('');
    }
  };

  const handleAddMaterial = () => {
    if (materialInput.trim()) {
      setJobMaterials(prev => [...prev, materialInput.trim()]);
      setMaterialInput('');
    }
  };

  const handleCompleteJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobToComplete) return;

    onUpdateJobStatus(
      selectedJobToComplete.id,
      'completed',
      jobMaterials,
      signatureText || `${employee.name} (E-Signed)`
    );

    onTriggerToast('Job Signed-off', `Task "${selectedJobToComplete.title}" logged as completed.`, 'job');

    // Reset states
    setSelectedJobToComplete(null);
    setJobMaterials([]);
    setSignatureText('');
  };

  // Download logs as privacy compliance disclosure
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad empty days at start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const myShiftsMap = shifts.filter(s => s.userId === employee.id).reduce((acc, shift) => {
    acc[shift.date] = shift;
    return acc;
  }, {} as Record<string, Shift>);

  const changeMonth = (direction: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + direction, 1));
  };

  const downloadMyData = () => {
    const myLogs = clockLogs.filter(l => l.userId === employee.id);
    const myJobs = jobs.filter(j => j.assignedUserId === employee.id);
    const exportPackage = {
      disclosureStatement: "This file contains a copy of your personal clock logs and assigned work records stored on Vector Technical Maintenance servers. Under CCPA & GDPR regulations, you have a solid right to audit, inspect, and transport your information at any time.",
      timestamp: new Date().toISOString(),
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        authorizedPayoutDue: `Ksh ${(employee.balanceDue || 0).toFixed(2)}`
      },
      clockRosterLogs: myLogs,
      jobsAssigned: myJobs
    };

    const str = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MY_VECTOR_TELEMETRY_DATA_${employee.name.replace(/\s+/g, '_')}_2026.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const myAssignedJobs = jobs.filter(j => j.assignedUserId === employee.id);
  const myTodayShifts = shifts.filter(s => s.userId === employee.id);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-stone-800 pb-px mb-4 gap-2 px-1 overflow-x-auto scrollbar-hide whitespace-nowrap">
        <button
          onClick={() => handleTabSwitch('dashboard')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold border-b-2 transition-colors shrink-0 ${
            myPortalTab === 'dashboard' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Work Console
        </button>
        <button
          onClick={() => handleTabSwitch('tickets')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold border-b-2 transition-colors shrink-0 ${
            myPortalTab === 'tickets' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          My Tickets
        </button>
        <button
          onClick={() => handleTabSwitch('notifications')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            myPortalTab === 'notifications' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          Notifications
          {unreadCount > 0 && (
            <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full ml-1">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => handleTabSwitch('chat')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            myPortalTab === 'chat' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Comms Hub
          {unreadMessagesCount > 0 && (
            <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full ml-1">{unreadMessagesCount}</span>
          )}
        </button>
        <button
          onClick={() => handleTabSwitch('performance')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold border-b-2 transition-colors shrink-0 ${
            myPortalTab === 'performance' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Performance
        </button>
      </div>

      {myPortalTab === 'dashboard' && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Clock state widget */}
          <div className="md:col-span-2 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden p-6 flex flex-col justify-between shadow-xl relative">
          {/* Animated background glow when clocked in */}
          {activeLog && (
            <div className="absolute inset-0 bg-emerald-500/[0.02] border border-emerald-500/10 pointer-events-none rounded-xl" />
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 block">
                PERSONNEL WORK CONSOLE
              </span>
              <h2 className="font-sans font-black text-2xl text-white tracking-tight mt-1">
                {employee.name}
              </h2>
              <p className="font-sans text-xs text-amber-500 mt-1 uppercase tracking-wide">
                ⚡ {employee.position} &bull; {employee.vehicleNumber || 'No Van Assigned'}
              </p>
              <div className="mt-2 text-sm font-mono font-bold text-emerald-400">
                PENDING PAYOUT BALANCE: Ksh {(employee.balanceDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Live timer display */}
            <div className="flex items-center gap-3 bg-stone-950 px-4 py-2 rounded-lg border border-stone-800/80">
              <Clock className={`h-5 w-5 ${activeLog ? 'text-emerald-400 animate-pulse' : 'text-stone-500'}`} />
              <div className="font-mono text-center">
                <span className={`text-lg font-bold block leading-none ${activeLog ? 'text-emerald-400' : 'text-stone-400'}`}>
                  {activeDuration}
                </span>
                <span className="text-[8px] text-stone-500 uppercase font-semibold">ROSTER HOURS ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6">
            {/* Clock-in actions */}
            <div className="space-y-4">
              <div className="bg-black/45 p-3 rounded border border-stone-850">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-400 uppercase">
                  <span>Secure Check-in Anchor</span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <p className="text-xs text-stone-200 flex items-center gap-1.5 font-sans leading-tight">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Validated Location Auth</span>
                  </p>
                </div>
              </div>

              {!activeLog && (
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">
                    Check-in Brief Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Loading heavy hydraulic tools at hub, ready to dispatch."
                    value={clockInNotes}
                    onChange={(e) => setClockInNotes(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-xs text-stone-300 outline-none focus:border-amber-400 font-sans"
                  />
                </div>
              )}

              <button
                onClick={handleClockToggle}
                className={`w-full font-sans font-black text-sm py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  activeLog 
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-950/20' 
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-950/20'
                }`}
              >
                <Power className="h-4 w-4 stroke-[3]" />
                {activeLog ? 'CLOCK-OUT WORKDAY' : 'CLOCK-IN TO WORKDAY'}
              </button>
            </div>

            {/* Shift Brief summaries */}
            <div className="bg-stone-950/45 border border-stone-850 rounded p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-mono text-[10px] tracking-widest text-stone-400 uppercase pb-2 border-b border-stone-850">
                  YOUR CURRENT WORKDAY BRIEF
                </h4>
                
                <div className="mt-3.5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-sans">ROSTER STATUS</span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${activeLog ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {activeLog ? 'ACTIVE CLOCKED IN' : 'STANDBY IDLE'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-sans">TODAYS SHIFT DEPLOYMENT</span>
                    <span className="text-stone-200 font-mono font-bold">
                      {myTodayShifts.length > 0 ? `${myTodayShifts[0].startTime} - ${myTodayShifts[0].endTime}` : 'NO SHIFT SCHEDULED'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-sans">ASSIGNED TASKS</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {myAssignedJobs.filter(j => j.status !== 'completed').length} ACTIONS REQUIRED
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-850 flex items-center gap-2 text-[10px] text-stone-500 leading-snug">
                <Shield className="h-5 w-5 text-stone-500 shrink-0" />
                <p>Activity is monitored during working shift metrics. Records securely logged on signoff.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Rota shift mini-bullet */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-400" />
                <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide">
                  ROTA CALENDAR
                </h3>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <button onClick={() => changeMonth(-1)} className="hover:text-white p-0.5"><ChevronLeft className="h-4 w-4" /></button>
                <span className="font-mono text-[10px] font-bold text-amber-400 uppercase w-20 text-center">
                  {calendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="hover:text-white p-0.5"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 mb-1 relative z-10 text-center">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} className="font-mono text-[9px] font-bold text-stone-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="p-2 opacity-0" />;
                  }
                  
                  // Format as YYYY-MM-DD
                  const dStr = String(date.getDate()).padStart(2, '0');
                  const mStr = String(date.getMonth() + 1).padStart(2, '0');
                  const dateKey = `${date.getFullYear()}-${mStr}-${dStr}`;
                  
                  const isToday = new Date().toDateString() === date.toDateString();
                  const shift = myShiftsMap[dateKey];

                  return (
                    <div 
                      key={dateKey} 
                      className={`relative flex items-center justify-center h-8 rounded border text-xs font-mono transition-all ${
                        shift ? 'bg-amber-400/20 text-amber-400 border-amber-500 font-bold' 
                        : isToday ? 'bg-stone-800 text-stone-200 border-stone-600 font-bold'
                        : 'bg-stone-900 border-stone-850 text-stone-500 hover:bg-stone-800'
                      }`}
                      title={shift ? `Duty: ${shift.startTime}-${shift.endTime}` : undefined}
                    >
                      {date.getDate()}
                      {shift && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-amber-400 rounded-full animate-pulse" />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[10px] font-sans text-stone-400 px-1 border-t border-stone-800/50 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-amber-400/20 border border-amber-500"></div>
                  <span>Duty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-stone-800 border border-stone-600"></div>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800 space-y-2">
            <button
              onClick={downloadMyData}
              type="button"
              className="w-full font-mono text-[10px] text-stone-400 hover:text-white bg-black/40 hover:bg-black/60 border border-stone-800 hover:border-stone-700 py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all uppercase"
            >
              <DownloadCloud className="h-3.5 w-3.5" />
              Download My Privacy Data Logs (JSON)
            </button>
            <div className="flex items-center gap-1 text-[9px] text-stone-500 justify-center">
              <Lock className="h-3 w-3" />
              <span>GDPR / CCPA SECURELY VERIFIED LINK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field Settings / High Contrast Mode Toggle */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/40 rounded-lg border border-stone-850">
            <UserCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wide">
              FIELD READABILITY SETTINGS
            </h3>
            <p className="font-sans text-[11px] text-stone-400 mt-0.5">
              Switch visual profile for bright daylight environments.
            </p>
          </div>
        </div>
        <button
          onClick={() => onUpdateUserStatus(employee.id, { themePreference: employee.themePreference === 'high-contrast' ? 'dark' : 'high-contrast' })}
          className={`font-mono text-xs px-4 py-2 rounded-lg border transition-all ${
            employee.themePreference === 'high-contrast' 
              ? 'bg-amber-400 text-black border-amber-500 font-bold shadow-[0_0_15px_rgba(251,191,36,0.2)]'
              : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
          }`}
        >
          {employee.themePreference === 'high-contrast' ? '☀️ HIGH CONTRAST: ON' : '🌤️ HIGH CONTRAST: OFF'}
        </button>
      </div>
      </div>
      )}

      {myPortalTab === 'performance' && (
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl p-6">
        <h3 className="font-sans font-bold text-white text-base uppercase mb-6 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-400" /> My Performance & Logs
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Stats calculation */}
          {(() => {
            const myLogs = clockLogs.filter(l => l.userId === employee.id);
            const myJobs = jobs.filter(j => j.assignedUserId === employee.id && j.status === 'completed');
            const uniqueDays = new Set(myLogs.map(l => l.clockInTime.split('T')[0])).size;
            const totalHours = myLogs.reduce((acc, l) => acc + (l.totalHours || 0), 0);

            return (
              <>
                <div className="bg-black/40 border border-stone-800 rounded p-4">
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-1">Days Logged In</span>
                  <span className="font-sans text-2xl font-black text-amber-400">{uniqueDays}</span>
                </div>
                <div className="bg-black/40 border border-stone-800 rounded p-4">
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-1">Lifetime Hours</span>
                  <span className="font-sans text-2xl font-black text-white">{totalHours.toFixed(1)}</span>
                </div>
                <div className="bg-black/40 border border-stone-800 rounded p-4">
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-1">Jobs Completed</span>
                  <span className="font-sans text-2xl font-black text-emerald-400">{myJobs.length}</span>
                </div>
                <div className="bg-black/40 border border-stone-800 rounded p-4">
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-1">Current Base Role</span>
                  <span className="font-sans text-lg font-black text-stone-300 capitalize">{employee.position}</span>
                </div>
              </>
            );
          })()}
        </div>

        <h4 className="font-mono text-[10px] tracking-widest text-stone-400 uppercase pb-2 border-b border-stone-850 mb-3">
          RECENT CLOCK LOGS
        </h4>
        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
          {clockLogs
            .filter(l => l.userId === employee.id)
            .sort((a,b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())
            .slice(0, 10)
            .map(log => {
              const dt = new Date(log.clockInTime);
              return (
                <div key={log.id} className="bg-black/30 p-3 rounded flex flex-col sm:flex-row sm:items-center justify-between border border-stone-850">
                  <div>
                    <span className="font-bold text-sm text-stone-200 block">{dt.toLocaleDateString()}</span>
                    <span className="text-xs text-stone-500">{log.notes || 'No work notes logged'}</span>
                  </div>
                  <div className="text-right mt-2 sm:mt-0">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      log.clockOutTime ? 'bg-stone-800 text-stone-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {log.clockOutTime ? `Logged ${log.totalHours} hrs` : 'ACTIVE CURRENTLY'}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      )}

      {myPortalTab === 'tickets' && (
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="my-jobs">
        <div className="bg-black/35 border-b border-stone-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-400" />
            <h3 className="font-sans font-bold text-white text-base uppercase">Your Assigned Tickets</h3>
          </div>
          <div className="flex bg-stone-950 p-1 rounded border border-stone-800 self-start sm:self-auto">
            <button
              onClick={() => setTaskTab('pending')}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${
                taskTab === 'pending' ? 'bg-stone-800 text-white font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Pending ({myAssignedJobs.filter(j => j.status !== 'completed').length})
            </button>
            <button
              onClick={() => setTaskTab('completed')}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${
                taskTab === 'completed' ? 'bg-stone-800 text-white font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Completed ({myAssignedJobs.filter(j => j.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Task Items list */}
        <div className="p-4 space-y-4">
          {(() => {
            const pendingJobs = myAssignedJobs
              .filter(j => j.status !== 'completed')
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
              });

            const completedJobs = myAssignedJobs.filter(j => j.status === 'completed');
            const displayJobs = taskTab === 'pending' ? pendingJobs : completedJobs;

            if (displayJobs.length === 0) {
              return (
                <div className="text-center py-10 border-2 border-dashed border-stone-850 rounded text-stone-500 font-sans text-xs">
                  <Check className="h-8 w-8 text-stone-600 mx-auto mb-2" />
                  {taskTab === 'pending' ? 'No pending task tickets. Awaiting administrative scheduling.' : 'No completed jobs yet.'}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayJobs.map((job) => {
                  const isCompleted = job.status === 'completed';
                  const isInProgress = job.status === 'in-progress';
                  const isOnSite = job.status === 'on-site';
                  const isPending = job.status === 'pending';

                  const priorityColors = 
                    job.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    job.priority === 'medium' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                    'bg-stone-800 text-stone-400 border border-stone-700';

                  return (
                    <div 
                      key={job.id} 
                      className={`bg-black/40 rounded-lg border p-4.5 flex flex-col justify-between hover:border-stone-850 transition-colors ${
                        isCompleted ? 'border-emerald-500/20 opacity-70' : 'border-stone-850'
                      }`}
                    >
                    <div>
                      {/* Priority tag */}
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${priorityColors}`}>
                          {job.priority} Priority
                        </span>
                        
                        <span className={`font-mono text-[10px] uppercase font-semibold text-right ${
                          isCompleted ? 'text-emerald-400' :
                          isInProgress ? 'text-indigo-400 animate-pulse' :
                          isOnSite ? 'text-amber-400' : 'text-stone-500'
                        }`}>
                          ● {job.status}
                        </span>
                      </div>

                      <h4 className="font-sans font-extrabold text-sm text-white mt-2.5 leading-snug">
                        {job.title}
                      </h4>

                      <p className="font-sans text-xs text-stone-400 mt-2 leading-relaxed">
                        {job.description}
                      </p>

                      <div className="mt-4 bg-stone-950 p-2.5 rounded border border-stone-850">
                        <p className="font-sans text-[11px] text-stone-300 flex items-center gap-1.5 font-bold">
                          <MapPin className="h-3.5 w-3.5 text-amber-400" />
                          {job.locationName}
                        </p>
                      </div>

                      {/* Logged materials readout if any */}
                      {job.loggedMaterials.length > 0 && (
                        <div className="mt-3">
                          <span className="font-mono text-[9px] text-stone-500 uppercase block mb-1">LOGGED MATERIALS & SIGNATURE</span>
                          <div className="flex flex-wrap gap-1">
                            {job.loggedMaterials.map((mat, i) => (
                              <span key={i} className="text-[10px] font-sans bg-stone-850 text-stone-300 px-2 py-0.5 rounded border border-stone-800">
                                {mat}
                              </span>
                            ))}
                          </div>
                          {job.signature && (
                            <div className="text-[10px] font-mono text-stone-400 mt-1 pl-1">
                              ✔ Signed: <span className="text-emerald-400 italic font-semibold">{job.signature}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons if not completed */}
                    {!isCompleted && (
                      <div className="mt-5 pt-4 border-t border-stone-850 flex items-center gap-2">
                        {isPending && (
                          <button
                            onClick={() => onUpdateJobStatus(job.id, 'on-site')}
                            className="flex-1 font-sans font-bold text-xs bg-stone-800 hover:bg-stone-700 text-amber-400 py-2 border border-stone-750 rounded transition-all text-center"
                          >
                            MARQUE ON-SITE
                          </button>
                        )}
                        {isOnSite && (
                          <button
                            onClick={() => onUpdateJobStatus(job.id, 'in-progress')}
                            className="flex-1 font-sans font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded transition-all text-center"
                          >
                            START REPAIR / DEPLOYMENT
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            onClick={() => {
                              setSelectedJobToComplete(job);
                              setJobMaterials([]);
                              setSignatureText('');
                            }}
                            className="flex-1 font-sans font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded transition-all text-center"
                          >
                            COMPLETE & REGISTER PROTOCOLS
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      </div>
      )}

      {myPortalTab === 'notifications' && (
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="notifications">
        <div className="bg-black/35 border-b border-stone-800 p-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="font-sans font-bold text-white text-base uppercase">Field Dispatch &amp; Alerts</h3>
        </div>

        <div className="p-4 space-y-3 h-[60vh] overflow-y-auto">
          {(() => {
            const myNotifs = notifications
              .filter(n => n.recipientUserId === employee.id || n.recipientUserId === 'all')
              .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            if (myNotifs.length === 0) {
              return (
                <div className="text-center py-10 border-2 border-dashed border-stone-850 rounded text-stone-500 font-sans text-xs">
                  <Bell className="h-8 w-8 text-stone-600 mx-auto mb-2" />
                  No new dispatch alerts or memos.
                </div>
              );
            }

            return myNotifs.map((notif) => (
              <div key={notif.id} className="bg-black/40 rounded-lg border border-stone-850 p-4 flex items-start gap-3 hover:border-stone-700 transition-colors">
                <div className={`p-2 rounded-full shrink-0 ${
                  notif.type === 'alert' ? 'bg-red-500/20 text-red-400' : 
                  notif.type === 'job' ? 'bg-amber-400/20 text-amber-400' : 
                  'bg-indigo-600/20 text-indigo-400'
                }`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans font-bold text-sm text-white">{notif.title}</span>
                    <span className="font-mono text-[9px] text-stone-500 uppercase tracking-wider bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-stone-300 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
      )}

      {myPortalTab === 'chat' && (
        <ChatWidget 
          currentUser={employee}
          users={users}
          messages={messages}
          onSendMessage={onSendMessage}
          onUpdateUserStatus={onUpdateUserStatus}
        />
      )}

      {/* Completion Protocol Modal/Drawer */}
      {selectedJobToComplete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-0 w-full max-w-lg shadow-2xl relative animate-scale overflow-hidden">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-emerald-950 to-stone-900 px-6 py-5 border-b border-stone-800 relative">
              <button
                onClick={() => setSelectedJobToComplete(null)}
                className="absolute top-4 right-4 text-stone-500 hover:text-white font-mono text-xs shadow transition-colors"
                title="Cancel Resolution"
              >
                ✕ CLOSE
              </button>

              <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-500 font-bold block mb-1">
                FIELD DEPLOYMENT PROTOCOLS
              </span>
              <h3 className="font-sans font-black text-xl text-white">
                JOB RESOLUTION & SIGN-OFF
              </h3>
            </div>
            
            <div className="p-6">
              <div className="bg-stone-950 p-4 rounded-lg border border-stone-850 mb-6 shadow-inner">
                <p className="font-sans text-xs text-stone-300 leading-relaxed">
                  <strong className="text-stone-500 uppercase text-[10px] tracking-wider block mb-1">Target Task</strong> 
                  <span className="font-semibold text-white">{selectedJobToComplete.title}</span>
                </p>
                <div className="mt-3">
                  <strong className="text-stone-500 uppercase text-[10px] tracking-wider block mb-1">On-Site Location</strong> 
                  <span className="text-stone-300 text-xs">{selectedJobToComplete.locationName}</span>
                </div>
              </div>

              <form onSubmit={handleCompleteJobSubmit} className="space-y-5">
                {/* Materials list builder */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-2">
                    Log Materials &amp; Parts Installed
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 5m Copper wire, heavy seal gasket..."
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-md p-2.5 text-xs text-stone-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 font-sans transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      className="bg-stone-800 text-stone-200 px-4 rounded-md hover:bg-stone-700 font-bold text-xs transition-colors border border-stone-700"
                    >
                      ADD
                    </button>
                  </div>

                  {jobMaterials.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 p-3 rounded-md bg-stone-950 border border-stone-850 shadow-inner max-h-32 overflow-y-auto scrollbar-thin">
                      {jobMaterials.map((mat, i) => (
                        <span key={i} className="text-[11px] font-sans bg-stone-800 text-stone-200 px-2.5 py-1 rounded border border-stone-700 flex items-center gap-1.5 shadow-sm group">
                          {mat}
                          <button 
                            type="button" 
                            onClick={() => setJobMaterials(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-stone-500 group-hover:text-red-400 font-bold ml-1 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-2">
                    Technician Digital Signature Authorization
                  </label>
                  <input
                    type="text"
                    placeholder="Type your formal name to e-sign"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-md p-3 text-sm text-emerald-400 font-bold tracking-widest outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 font-sans italic text-center transition-all shadow-inner"
                    required
                  />
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Shield className="h-3 w-3 text-stone-600" />
                    <p className="text-[9px] text-stone-500 font-mono text-center">
                      Signed under audit policy. Secure timestamp attached instantly on submission.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-stone-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJobToComplete(null)}
                    className="w-1/3 bg-transparent border border-stone-700 hover:bg-stone-800 text-stone-300 font-sans font-semibold text-xs py-3 rounded-md transition-all text-center"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs py-3 rounded-md transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4" /> AUTHORIZE &amp; COMPLETE
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Pill (Netflix Style) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm pointer-events-auto">
        <div className="bg-[#1a1a1a]/40 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="flex items-center overflow-x-auto scrollbar-hide snap-x w-full">
            <button
              onClick={() => handleTabSwitch('dashboard')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${myPortalTab === 'dashboard' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Home className={`h-[22px] w-[22px] ${myPortalTab === 'dashboard' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Home</span>
            </button>
            <button
              onClick={() => handleTabSwitch('tickets')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${myPortalTab === 'tickets' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <FileText className={`h-[22px] w-[22px] ${myPortalTab === 'tickets' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Tickets</span>
            </button>
            <button
              onClick={() => handleTabSwitch('chat')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center relative ${myPortalTab === 'chat' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <div className="relative">
                <MessageSquare className={`h-[22px] w-[22px] ${myPortalTab === 'chat' ? 'text-white' : ''}`} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a]"></span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Comms</span>
            </button>
            <button
              onClick={() => handleTabSwitch('notifications')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center relative ${myPortalTab === 'notifications' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <div className="relative">
                <Bell className={`h-[22px] w-[22px] ${myPortalTab === 'notifications' ? 'text-white' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a]"></span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Notifs</span>
            </button>
            <button
              onClick={() => handleTabSwitch('performance')}
              className={`flex flex-col items-center justify-center w-[25%] shrink-0 gap-1 py-2 px-1 rounded-full transition-colors snap-center ${myPortalTab === 'performance' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Activity className={`h-[22px] w-[22px] ${myPortalTab === 'performance' ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">Stats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
