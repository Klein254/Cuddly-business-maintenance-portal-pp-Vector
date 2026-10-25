import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Settings, Wifi, WifiOff, UserCheck, Bell, Sparkles, 
  MapPin, LogOut, CheckCircle, Database, HelpCircle, AlertTriangle 
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage } from './types';
import AdminPanel from './components/AdminPanel';
import EmployeePortal from './components/EmployeePortal';
import LoginScreen from './components/LoginScreen';
import { useFirebase, Session, ADMIN_ROLES, PEOPLE_MANAGER_ROLES, newId } from './useFirebase';
import { useOnlineStatus } from './useOnlineStatus';
import { initNotifications, showSystemNotification, confirmAction } from './platform';
import { auth } from './firebase';
import {
  LEGACY_SESSION_KEY, userIdFromAuthEmail, endSession, changesSynced, setSignInNotice, accountErrorMessage,
  createStaffMember, updateStaffMember, deleteStaffMember, secureAllAccounts, secureRulesPublished
} from './auth';

const roundHours = (hrs: number) => Math.round(hrs * 100) / 100;

export default function App() {
  // Who is signed in: a Firebase Authentication account, or (until accounts are secured) the old PIN check
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => onAuthStateChanged(auth, firebaseUser => {
    if (firebaseUser?.email) {
      setSession({ userId: userIdFromAuthEmail(firebaseUser.email), mode: 'secured' });
    } else {
      // "Keep me logged in" from before accounts were secured
      let savedId: string | null = null;
      try { savedId = localStorage.getItem(LEGACY_SESSION_KEY); } catch (e) {}
      setSession(savedId ? { userId: savedId, mode: 'legacy' } : null);
    }
    setAuthChecked(true);
  }), []);

  const {
    users, shifts, clockLogs, jobs, notifications, messages, loading, usersConfirmed, accessError,
    updateUserFields, setBalance, addClockLog, updateClockLogFields, addJob, updateJobStatus,
    addShift, deleteShift, saveLegacyUser, deleteLegacyUser, addNotification, addMessage
  } = useFirebase(session);
  const isNetworkOnline = useOnlineStatus();

  const currentUser = session ? users.find(u => u.id === session.userId) ?? null : null;
  const [isAdminView, setIsAdminView] = useState<boolean>(true);
  // Whether the locked-down database rules are live (checked for people who manage accounts)
  const [rulesPublished, setRulesPublished] = useState<boolean | null>(null);

  // Notification banners (Live simulated toast logs)
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; desc: string; type: string } | null>(null);

  // Track recent notifications to avoid duplicate toast alerts during initial load
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());

  // Request notification permission (browser or installed app)
  useEffect(() => {
    initNotifications();
  }, []);

  // Listen for new notifications addressed to the current user
  useEffect(() => {
    if (!currentUser) return;
    
    notifications.forEach(notif => {
      // Only show toast if it's for this user and we haven't seen it yet
      const isForMe = notif.recipientUserId === currentUser.id || notif.recipientUserId === 'all' ||
        (notif.recipientUserId === 'admins' && ADMIN_ROLES.includes(currentUser.role));
      if (isForMe && !seenNotificationIds.has(notif.id)) {
        // Skip toast for notifications that are older than 5 minutes to avoid bombarding on login
        if (new Date().getTime() - new Date(notif.timestamp).getTime() < 5 * 60 * 1000) {
          triggerToastAlert(notif.title || 'INCOMING NOTIFICATION', notif.message, notif.type || 'alert');
        }
        setSeenNotificationIds(prev => {
          const updated = new Set(prev);
          updated.add(notif.id);
          return updated;
        });
      }
    });
  }, [notifications, currentUser, seenNotificationIds]);

  // Track recent messages to avoid duplicate toast alerts during initial load
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());

  // Listen for new messages addressed to the current user
  useEffect(() => {
    if (!currentUser) return;
    
    messages.forEach(msg => {
      const isForMe = msg.recipientId === currentUser.id || msg.recipientId === 'general' || !msg.recipientId;
      if (isForMe && msg.senderId !== currentUser.id && !seenMessageIds.has(msg.id)) {
        // Skip toast for messages older than 5 minutes to avoid bombarding on login
        if (new Date().getTime() - new Date(msg.timestamp).getTime() < 5 * 60 * 1000) {
          triggerToastAlert(`New message from ${msg.senderName}`, msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content, 'system');
        }
        setSeenMessageIds(prev => {
          const updated = new Set(prev);
          updated.add(msg.id);
          return updated;
        });
      }
    });
  }, [messages, currentUser, seenMessageIds]);

  // Set theme from user preference
  useEffect(() => {
    if (currentUser?.themePreference === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [currentUser?.themePreference]);

  // Find if current user is clocked in
  const activeLog = currentUser ? clockLogs.find(log => log.userId === currentUser.id && log.clockOutTime === null) : undefined;

  // Handle Dispatch Toast popup manually
  const triggerToastAlert = (title: string, desc: string, type: 'alert' | 'system' | 'job' | 'payroll') => {
    const newToast = { id: Date.now().toString(), title, desc, type };
    setActiveToast(newToast);
    
    // Play subtle audio alert if browser allows
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'alert' ? 880 : 440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}

    // Trigger internal OS Notification
    showSystemNotification(title, desc);

    // Auto dismiss after 5s
    setTimeout(() => {
      setActiveToast(prev => prev && prev.id === newToast.id ? null : prev);
    }, 5000);
  };

  // Sign-ins for accounts that haven't been secured yet (Firebase sign-ins arrive via onAuthStateChanged)
  const handleLegacyLogin = (user: User, rememberMe: boolean) => {
    try {
      if (rememberMe) {
        localStorage.setItem(LEGACY_SESSION_KEY, user.id);
      } else {
        localStorage.removeItem(LEGACY_SESSION_KEY);
      }
    } catch (e) {}
    setSession({ userId: user.id, mode: 'legacy' });
  };

  const handleLogout = async () => {
    if (currentUser) {
      updateUserFields(currentUser.id, { isOnline: false, lastActiveUpdatedAt: new Date().toISOString() }).catch(() => {});
    }
    // Signing out wipes this device's offline copy of the data, so don't lose changes that haven't synced
    if (!(await changesSynced())) {
      const proceed = await confirmAction("Some changes made on this device haven't reached the server yet (no connection). Signing out now will discard them. Sign out anyway?");
      if (!proceed) return;
    }
    endSession();
  };

  // Signed in but no longer allowed in (password reset or account removed by an admin, or the secure
  // database rules were just published): go back to the sign-in screen
  useEffect(() => {
    if (!session || loading) return;
    if (accessError || (usersConfirmed && !currentUser)) {
      setSignInNotice(session.mode === 'legacy'
        ? 'Sign-in has been upgraded. Please sign in again with your usual surname and password.'
        : 'Your session has ended because your sign-in details changed. Please sign in again.');
      endSession();
    }
  }, [session, loading, accessError, usersConfirmed, currentUser]);

  // People who manage accounts are reminded until the locked-down database rules are published
  useEffect(() => {
    if (!currentUser || !PEOPLE_MANAGER_ROLES.includes(currentUser.role)) return;
    secureRulesPublished().then(setRulesPublished);
  }, [currentUser?.id, currentUser?.role]);

  // Track page visibility / online status
  useEffect(() => {
    if (!currentUser) return;

    const updateOnlineStatus = (isOnline: boolean) => {
      updateUserFields(currentUser.id, { isOnline, lastActiveUpdatedAt: new Date().toISOString() }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      updateOnlineStatus(document.visibilityState === 'visible' && document.hasFocus());
    };
    
    const handleFocus = () => updateOnlineStatus(true);
    const handleBlur = () => updateOnlineStatus(false);
    const handleBeforeUnload = () => updateOnlineStatus(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Initial check
    updateOnlineStatus(document.visibilityState === 'visible' && document.hasFocus());
    
    // Heartbeat every 1 minute
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        updateOnlineStatus(true);
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(heartbeatInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Clock in handler
  const handleClockIn = async (notes?: string) => {
    if (!currentUser) return;
    const newLog: ClockLog = {
      id: newId('l'),
      userId: currentUser.id,
      userName: currentUser.name,
      clockInTime: new Date().toISOString(),
      clockOutTime: null,
      totalHours: null,
      overtimeHours: null,
      calculatedPay: null,
      verified: false,
      notes: notes
    };
    await addClockLog(newLog);
  };

  // Clock out handler
  const handleClockOut = async () => {
    if (!activeLog || !currentUser) return;
    
    const outTime = new Date().toISOString();
    const diffMs = new Date(outTime).getTime() - new Date(activeLog.clockInTime).getTime();
    const hrs = diffMs / 3600000;

    // Split timesheets
    const ovH = hrs > 8 ? hrs - 8 : 0;

    const pay = 0; // Employees are paid based on jobs completed, not clock time.

    await updateClockLogFields(activeLog.id, {
      clockOutTime: outTime,
      totalHours: roundHours(hrs),
      overtimeHours: roundHours(ovH),
      calculatedPay: pay
    });
  };

  // Update job statuses (pending -> on-site -> in-progress -> completed)
  const handleUpdateJobStatus = async (
    jobId: string, 
    status: Job['status'], 
    materials?: string[], 
    signature?: string
  ) => {
    const rightNow = new Date().toISOString();
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const fields: Partial<Job> = {
      status,
      statusHistory: [...job.statusHistory, { status, timestamp: rightNow }]
    };
    if ((status === 'on-site' || status === 'in-progress') && !job.startedAt) fields.startedAt = rightNow;
    if (status === 'completed') fields.completedAt = rightNow;
    if (materials && materials.length > 0) fields.loggedMaterials = [...job.loggedMaterials, ...materials];
    if (signature) fields.signature = signature;

    // Credit the technician's balance once, the first time the job is completed (re-marking it never pays twice)
    const firstCompletion = status === 'completed' && job.status !== 'completed' && !job.credited;
    if (firstCompletion) fields.credited = true;
    const credit = firstCompletion && job.payoutAmount > 0 ? { userId: job.assignedUserId, amount: job.payoutAmount } : undefined;
    try {
      await updateJobStatus(jobId, fields, credit);
    } catch (err) {
      console.error('Job status update failed:', err);
      triggerToastAlert('Status Update Failed', accountErrorMessage(err), 'alert');
      return;
    }

    // Push broadcast
    const newBroadcast: PushNotificationLog = {
      id: newId('n'),
      title: 'Status Update Filed',
      message: `Technician ${currentUser?.name} reported "${status.toUpperCase()}" status for job "${job.title}".`,
      timestamp: rightNow,
      recipientUserId: 'admins',
      recipientUserName: 'Operations Admins',
      isSent: true,
      type: 'job'
    };
    await addNotification(newBroadcast);
    triggerToastAlert('Telemetry Alert Dispatch', `${currentUser?.name} updated: "${job.title}" to ${status.toUpperCase()}`, 'job');
  };

  // Add Job assigned from Director
  const handleAddJob = async (newJob: Omit<Job, 'id' | 'status' | 'startedAt' | 'completedAt' | 'loggedMaterials' | 'signature' | 'statusHistory' | 'assignedUserName'>) => {
    const targetWorker = users.find(x => x.id === newJob.assignedUserId);
    const workerName = targetWorker ? targetWorker.name : 'Unassigned Tech';

    const jobInstance: Job = {
      ...newJob,
      id: newId('job'),
      status: 'pending',
      assignedUserName: workerName,
      startedAt: null,
      completedAt: null,
      loggedMaterials: [],
      signature: null,
      statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }],
      payoutAmount: newJob.payoutAmount || 0
    };
    await addJob(jobInstance);

    const newBroadcast: PushNotificationLog = {
      id: newId('n'),
      title: 'New Maintenance Dispatch Assigned',
      message: `You have been assigned: "${newJob.title}" at site ${newJob.locationName}. Please acknowledge.`,
      timestamp: new Date().toISOString(),
      recipientUserId: newJob.assignedUserId,
      recipientUserName: workerName,
      isSent: true,
      type: 'job'
    };
    await addNotification(newBroadcast);
    triggerToastAlert('New Task Dispatched', `Job assigned to ${workerName}: "${newJob.title}"`, 'job');
  };

  // Add shift schedule (rota)
  const handleAddShift = async (newShift: Omit<Shift, 'id'>) => {
    const shiftInstance: Shift = { ...newShift, id: newId('s') };
    await addShift(shiftInstance);
    
    const worker = users.find(x => x.id === newShift.userId);
    const workerName = worker ? worker.name : 'Unknown';

    const newBroadcast: PushNotificationLog = {
      id: newId('n'),
      title: 'Work Rota Update',
      message: `New shift scheduled for ${newShift.date} [${newShift.startTime} - ${newShift.endTime}] has been added to the master roster ledger.`,
      timestamp: new Date().toISOString(),
      recipientUserId: newShift.userId,
      recipientUserName: workerName,
      isSent: true,
      type: 'system'
    };
    await addNotification(newBroadcast);
    triggerToastAlert('Roster Update Synchronized', `Rota added for ${workerName} on ${newShift.date}`, 'system');
  };

  const handleDeleteShift = async (id: string) => {
    await deleteShift(id);
    triggerToastAlert('Roster Cell Purged', 'Technician shift allocation cleared on ledger.', 'system');
  };

  const handleDispatchNotification = async (newNotification: Omit<PushNotificationLog, 'id' | 'timestamp' | 'isSent'>) => {
    const broadcastInstance: PushNotificationLog = { ...newNotification, id: newId('n'), timestamp: new Date().toISOString(), isSent: true };
    await addNotification(broadcastInstance);
    triggerToastAlert(broadcastInstance.title, broadcastInstance.message, broadcastInstance.type);
  };

  const handleVerifyClockLog = async (id: string) => {
    const log = clockLogs.find(x => x.id === id);
    if (!log) return;
    await updateClockLogFields(id, { verified: true });
    triggerToastAlert('Ledger Approved & Locked', `Biometric timesheet for ${log.userName} successfully certified.`, 'payroll');
  };

  const handleAdminClockOutUser = async (id: string) => {
    const log = clockLogs.find(x => x.id === id);
    if (!log || log.clockOutTime) return;
    const now = new Date().toISOString();
    const diffMs = new Date(now).getTime() - new Date(log.clockInTime).getTime();
    const hrs = diffMs / 3600000;

    // Same as a technician's own clock-out: hours only, since pay comes from completed jobs
    await updateClockLogFields(id, {
      clockOutTime: now,
      totalHours: roundHours(hrs),
      overtimeHours: roundHours(hrs > 8 ? hrs - 8 : 0),
      calculatedPay: 0
    });
    
    triggerToastAlert('User Checked Out', `Admin safely logged out ${log.userName}.`, 'system');
  };

  const handleUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;

    // Apply theme immediately
    if (currentUser?.id === userId && updates.themePreference !== undefined) {
      if (updates.themePreference === 'high-contrast') {
        document.documentElement.setAttribute('data-theme', 'high-contrast');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }

    // Pay owed is kept apart from the staff directory (see setBalance)
    const { balanceDue, ...fields } = updates;
    try {
      if (balanceDue !== undefined) await setBalance(userId, balanceDue);
      if (Object.keys(fields).length > 0) await updateUserFields(userId, fields);
    } catch (err) {
      console.error('Personnel update failed:', err);
      triggerToastAlert('Update Failed', accountErrorMessage(err), 'alert');
      return;
    }
    // Don't trigger a toast if the only update is reading notifications/messages or online status
    const isSilentUpdate = Object.keys(updates).every(k => 
      k === 'lastReadNotificationsAt' || 
      k === 'lastReadMessagesAt' || 
      k === 'isOnline' || 
      k === 'lastActiveUpdatedAt'
    );
    if (!isSilentUpdate) {
      triggerToastAlert('Personnel File Updated', `Adjustments made to ${u.name}.`, 'system');
    }
  };

  // Once accounts are secured, creating/editing/removing people also manages their sign-in (src/auth.ts)
  const handleAddUser = async (user: User, password: string) => {
    try {
      if (session?.mode === 'secured') {
        await createStaffMember(user, password);
      } else {
        await saveLegacyUser({ ...user, pin: password });
      }
    } catch (err) {
      console.error('Creating personnel file failed:', err);
      triggerToastAlert('Personnel File Not Created', accountErrorMessage(err), 'alert');
      return false;
    }
    triggerToastAlert('New Personnel File Created', `Added ${user.name} to the system.`, 'system');
    return true;
  };

  const handleSaveUser = async (user: User, changes: Partial<User>, newPassword?: string) => {
    try {
      if (session?.mode === 'secured') {
        await updateStaffMember(user, changes, newPassword);
      } else {
        await updateUserFields(user.id, newPassword ? { ...changes, pin: newPassword } : changes);
      }
    } catch (err) {
      console.error('Saving personnel file failed:', err);
      triggerToastAlert('Personnel File Not Updated', accountErrorMessage(err), 'alert');
      return false;
    }
    triggerToastAlert('Personnel File Updated', `Adjustments made to ${user.name}.`, 'system');
    return true;
  };

  const handleDeleteUser = async (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    try {
      if (session?.mode === 'secured') {
        await deleteStaffMember(u);
      } else {
        await deleteLegacyUser(userId);
      }
    } catch (err) {
      console.error('Deleting personnel file failed:', err);
      triggerToastAlert('Personnel File Not Deleted', accountErrorMessage(err), 'alert');
      return;
    }
    triggerToastAlert('Personnel File Deleted', `Removed user from the sector.`, 'system');
  };

  // One-time switch-over to secure sign-in (Team Management → Account Security)
  const handleSecureAccounts = async () => {
    try {
      const report = await secureAllAccounts();
      setRulesPublished(await secureRulesPublished());
      return report;
    } catch (err) {
      console.error('Securing accounts failed:', err);
      triggerToastAlert('Accounts Not Secured', accountErrorMessage(err), 'alert');
      return null;
    }
  };

  const handleSendMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...msg,
      id: newId('m')
    };
    addMessage(newMessage);
  };

  if (!authChecked || loading || (session && !currentUser)) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 bg-amber-400 flex items-center justify-center rounded-sm shrink-0 mb-4 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse">
           <span className="text-black font-black text-xl">V</span>
        </div>
        <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">Connecting Data Stream</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLegacyLogin={handleLegacyLogin} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased selection:bg-amber-400 selection:text-black">
      
      {/* Main Top Header containing the Custom geometric logo matching image */}
      <header className="bg-[#0F0F0F] border-b border-stone-800 p-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Custom VECTOR TECHNICAL branded geometric frame */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 flex items-center justify-center rounded-sm shrink-0">
              <span className="text-black font-black text-xl">V</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tighter leading-none text-white mt-1">VECTOR TECHNICAL</h1>
              <p className="text-[10px] text-amber-400 uppercase tracking-widest font-medium mt-0.5">Maintenance &amp; Supplies</p>
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-stone-800 shrink-0 ml-2" />
            <div className="hidden sm:block ml-2">
              <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest block">OPERATIONS HEAD</span>
              <span className="font-mono text-xs text-amber-400 font-bold block">PORTAL V3.9</span>
            </div>
          </div>

          {/* Interactive Role Selector Dropdown -> Now user display */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {['super-admin', 'admin', 'head-procurement', 'finance'].includes(currentUser.role) && (
              <div className="bg-stone-900 border border-stone-800 rounded p-1 flex items-center mr-2">
                <button
                  onClick={() => setIsAdminView(true)}
                  className={`px-3 py-1 text-xs font-bold rounded uppercase transition-colors ${isAdminView ? 'bg-amber-400 text-black' : 'text-stone-400 hover:text-white'}`}
                >
                  Admin Panel
                </button>
                <button
                  onClick={() => setIsAdminView(false)}
                  className={`px-3 py-1 text-xs font-bold rounded uppercase transition-colors ${!isAdminView ? 'bg-indigo-500 text-white' : 'text-stone-400 hover:text-white'}`}
                >
                  Terminal
                </button>
              </div>
            )}
            <div className="bg-stone-900 border border-stone-800 rounded px-3 py-1.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-white">{currentUser.name}</span>
                  <span className="block text-[10px] font-mono text-stone-500 uppercase">
                    {currentUser.role === 'super-admin' ? 'CEO / Super-Admin' : 
                     currentUser.role === 'admin' ? 'Admin / Manager' : 
                     currentUser.role === 'finance' ? 'Finance' : 
                     currentUser.role === 'head-procurement' ? 'Head Proc.' : 
                     'Field Technician'}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="text-stone-400 hover:text-white px-2 cursor-pointer transition-colors" title="Disconnect Session">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Offline notice: work continues on the local copy and syncs automatically on reconnect */}
        {!isNetworkOnline && (
          <div className="max-w-7xl mx-auto mt-3 flex items-center justify-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-1.5 text-center">
            <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-[9px] sm:text-[10px] text-amber-400 uppercase tracking-widest">
              Offline Mode &bull; Changes are saved on this device and will sync automatically when the connection returns
            </span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Urgent alert banners (simulating live notifications from push notifications) */}
        {activeToast && (
          <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top))] right-4 z-50 animate-enter max-w-sm w-[calc(100vw-2rem)] shadow-2xl overflow-hidden rounded-lg border border-amber-400 bg-stone-900/95 backdrop-blur-md p-4">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-full ${
                activeToast.type === 'alert' ? 'bg-red-500 text-white' : 
                activeToast.type === 'job' ? 'bg-amber-400 text-black' : 
                'bg-indigo-600 text-white'
              }`}>
                <Bell className="h-4 w-4 animate-swing" />
              </div>
              <div className="flex-1 leading-snug">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">{activeToast.title}</h4>
                  <button onClick={() => setActiveToast(null)} className="text-stone-400 hover:text-white font-mono text-xs">✕</button>
                </div>
                <p className="font-sans text-xs text-stone-300 mt-1">{activeToast.desc}</p>
                <div className="mt-2.5 font-mono text-[8px] text-stone-500 flex items-center gap-1.5 uppercase">
                  <span>Carrier Link Alert</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 animate-pulse">Now</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {['super-admin', 'admin', 'head-procurement', 'finance'].includes(currentUser.role) && isAdminView ? (
          /* ADMIN DASHBOARD PANELS */
          <AdminPanel 
            users={users}
            shifts={shifts}
            clockLogs={clockLogs}
            jobs={jobs}
            notifications={notifications}
            messages={messages}
            currentUser={currentUser}
            currentUserRole={currentUser.role}
            onAddJob={handleAddJob}
            onAddShift={handleAddShift}
            onDeleteShift={handleDeleteShift}
            onDispatchNotification={handleDispatchNotification}
            onVerifyClockLog={handleVerifyClockLog}
            onAdminClockOutUser={handleAdminClockOutUser}
            onUpdateUserStatus={handleUpdateUserStatus}
            onAddUser={handleAddUser}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            secured={session?.mode === 'secured'}
            rulesPublished={rulesPublished}
            onSecureAccounts={handleSecureAccounts}
            onSignOut={handleLogout}
            onUpdateJobStatus={handleUpdateJobStatus}
            onSendMessage={handleSendMessage}
            onClearToast={() => setActiveToast(null)}
          />
        ) : (
          /* FIELD CREW/TECHNICIAN WORKSPACE */
          <EmployeePortal 
            employee={currentUser}
            users={users}
            shifts={shifts}
            clockLogs={clockLogs}
            jobs={jobs}
            activeLog={activeLog}
            notifications={notifications}
            messages={messages}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onUpdateJobStatus={handleUpdateJobStatus}
            onSendMessage={handleSendMessage}
            onTriggerToast={triggerToastAlert}
            onUpdateUserStatus={handleUpdateUserStatus}
            onClearToast={() => setActiveToast(null)}
          />
        )}

      </main>

      {/* Corporate Compliance bottom footer */}
      <footer className="border-t border-stone-800 bg-[#000] py-6 px-4 select-none mt-12 text-stone-500 text-center text-xs">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-mono text-[10px] tracking-wider uppercase text-stone-500">
            Vector Technical Maintenance &amp; General Supplies Ltd. &bull; Enterprise Operations Hub
          </p>
          <p className="font-sans max-w-2xl mx-auto text-[10px] leading-relaxed">
            All biometrics and payroll records are cryptographically masked to comply with General Data Protection Regulation (EU GDPR) Articles 5(1)(f) and the California Consumer Privacy Act (CCPA). Automatic system synchronization utilizes SSL endpoints securely.
          </p>
          <p className="font-mono text-[9px] text-stone-700">
            Powered by Antigravity Core Sync. &copy; 2026 Vector Group. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
