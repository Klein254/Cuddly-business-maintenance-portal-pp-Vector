import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Settings, Wifi, UserCheck, Bell, Sparkles, 
  MapPin, LogOut, CheckCircle, Database, HelpCircle, AlertTriangle 
} from 'lucide-react';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage } from './types';
import AdminPanel from './components/AdminPanel';
import EmployeePortal from './components/EmployeePortal';
import LoginScreen from './components/LoginScreen';
import { useFirebase } from './useFirebase';

export default function App() {
  const {
    users, shifts, clockLogs, jobs, notifications, messages, loading,
    addClockLog, updateClockLog, addJob, updateJob, addShift, deleteShift, updateUser, deleteUser, addNotification, addMessage
  } = useFirebase();

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminView, setIsAdminView] = useState<boolean>(true);

  // Notification banners (Live simulated toast logs)
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; desc: string; type: string } | null>(null);

  // Track recent notifications to avoid duplicate toast alerts during initial load
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());

  // Request Web Notification permission and register Service Worker
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    // Register a dummy service worker to allow push notifications on Android Chrome
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, []);

  // Listen for new notifications addressed to the current user
  useEffect(() => {
    if (!currentUser) return;
    
    notifications.forEach(notif => {
      // Only show toast if it's for this user and we haven't seen it yet
      const isForMe = notif.recipientUserId === currentUser.id || notif.recipientUserId === 'all';
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

    // Trigger internal OS Web Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body: desc, icon: '/favicon.svg' });
      } catch (e) {
        // Fallback for Android Chrome which requires ServiceWorkerRegistration.showNotification()
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, { body: desc, icon: '/favicon.svg' });
          });
        }
      }
    }

    // Auto dismiss after 5s
    setTimeout(() => {
      setActiveToast(prev => prev && prev.id === newToast.id ? null : prev);
    }, 5000);
  };

  const handleLogin = (user: User, rememberMe: boolean) => {
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('vector_saved_user_id', user.id);
    } else {
      localStorage.removeItem('vector_saved_user_id');
    }
    updateUser({ ...user, isOnline: true, lastActiveUpdatedAt: new Date().toISOString() });
  };

  const handleLogout = () => {
    if (currentUser) {
      updateUser({ ...currentUser, isOnline: false, lastActiveUpdatedAt: new Date().toISOString() });
    }
    setCurrentUser(null);
    localStorage.removeItem('vector_saved_user_id');
  };

  // Attempt automatic login from localStorage if available
  useEffect(() => {
    if (!loading && !currentUser) {
      const savedId = localStorage.getItem('vector_saved_user_id');
      if (savedId) {
        const u = users.find(x => x.id === savedId);
        if (u) {
          setCurrentUser(u);
          updateUser({ ...u, isOnline: true, lastActiveUpdatedAt: new Date().toISOString() });
        } else {
          localStorage.removeItem('vector_saved_user_id');
        }
      }
    }
  }, [loading, users, currentUser]);
  // Use a ref to hold the latest users array to avoid stale closures in event listeners
  const usersRef = React.useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Track page visibility / online status
  useEffect(() => {
    if (!currentUser) return;

    const updateOnlineStatus = (isOnline: boolean) => {
      // Use usersRef.current to get the most up-to-date user data without adding to dependency array
      const u = usersRef.current.find(x => x.id === currentUser.id);
      if (u) {
        updateUser({ 
          ...u, 
          isOnline, 
          lastActiveUpdatedAt: new Date().toISOString() 
        });
      }
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

  // Sync currentUser with users array to get real-time updates
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users, currentUser]);

  // Clock in handler
  const handleClockIn = async (notes?: string) => {
    if (!currentUser) return;
    const newLog: ClockLog = {
      id: `l-now-${Date.now()}`,
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
    let normH = hrs;
    let ovH = 0;
    if (hrs > 8) {
      normH = 8;
      ovH = hrs - 8;
    }

    const pay = 0; // Employees are paid based on jobs completed, not clock time.

    const updatedLog: ClockLog = {
      ...activeLog,
      clockOutTime: outTime,
      totalHours: hrs,
      overtimeHours: ovH,
      calculatedPay: pay,
      verified: false
    };
    await updateClockLog(updatedLog);
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

    const historyUpdate = [...job.statusHistory, { status, timestamp: rightNow }];
    const updatedJob: Job = {
      ...job,
      status,
      startedAt: (status === 'on-site' || status === 'in-progress' && !job.startedAt) ? rightNow : job.startedAt,
      completedAt: status === 'completed' ? rightNow : job.completedAt,
      loggedMaterials: materials ? [...job.loggedMaterials, ...materials] : job.loggedMaterials,
      signature: signature || job.signature,
      statusHistory: historyUpdate
    };
    await updateJob(updatedJob);

    // If job is completed, credit the user's balance
    if (status === 'completed' && job.payoutAmount > 0) {
      const assignedUser = users.find(u => u.id === job.assignedUserId);
      if (assignedUser) {
        await updateUser({ ...assignedUser, balanceDue: (assignedUser.balanceDue || 0) + job.payoutAmount });
      }
    }

    // Push broadcast
    const newBroadcast: PushNotificationLog = {
      id: `n-${Date.now()}`,
      title: 'Status Update Filed',
      message: `Technician ${currentUser?.name} reported "${status.toUpperCase()}" status for job "${job.title}".`,
      timestamp: rightNow,
      recipientUserId: 'admin-1', // admin
      recipientUserName: 'Director Marcus Vector',
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
      id: `job-${Date.now()}`,
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
      id: `n-${Date.now()}`,
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
    const shiftInstance: Shift = { ...newShift, id: `s-${Date.now()}` };
    await addShift(shiftInstance);
    
    const worker = users.find(x => x.id === newShift.userId);
    const workerName = worker ? worker.name : 'Unknown';

    const newBroadcast: PushNotificationLog = {
      id: `n-${Date.now()}`,
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
    const broadcastInstance: PushNotificationLog = { ...newNotification, id: `n-${Date.now()}`, timestamp: new Date().toISOString(), isSent: true };
    await addNotification(broadcastInstance);
    triggerToastAlert(broadcastInstance.title, broadcastInstance.message, broadcastInstance.type);
  };

  const handleVerifyClockLog = async (id: string) => {
    const log = clockLogs.find(x => x.id === id);
    if (!log) return;
    await updateClockLog({ ...log, verified: true });
    triggerToastAlert('Ledger Approved & Locked', `Biometric timesheet for ${log.userName} successfully certified.`, 'payroll');
  };

  const handleAdminClockOutUser = async (id: string) => {
    const log = clockLogs.find(x => x.id === id);
    if (!log || log.clockOutTime) return;
    const now = new Date().toISOString();
    const diffMs = new Date(now).getTime() - new Date(log.clockInTime).getTime();
    const hrs = diffMs / 3600000;
    
    await updateClockLog({
      ...log,
      clockOutTime: now,
      totalHours: Number(hrs.toFixed(2)),
      calculatedPay: Number((hrs * 25).toFixed(2)) // 25 is default base pay assumed in ClockWidget
    });
    
    triggerToastAlert('User Checked Out', `Admin safely logged out ${log.userName}.`, 'system');
  };

  const handleUpdateUserStatus = async (userId: string, updates: Partial<User>) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    
    // Optimistic UI updates
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
      
      // Also apply theme immediately
      if (updates.themePreference !== undefined) {
        if (updates.themePreference === 'high-contrast') {
          document.documentElement.setAttribute('data-theme', 'high-contrast');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    }
    
    await updateUser({ ...u, ...updates });
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

  const handleAddUser = async (user: User) => {
    await updateUser(user); // since updateUser uses setDoc, it'll create a new document if it doesn't exist
    triggerToastAlert('New Personnel File Created', `Added ${user.name} to the system.`, 'system');
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    triggerToastAlert('Personnel File Deleted', `Removed user from the sector.`, 'system');
  };

  const handleSendMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    };
    addMessage(newMessage);
  };

  if (loading) {
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
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased selection:bg-amber-400 selection:text-black">
      
      {/* Main Top Header containing the Custom geometric logo matching image */}
      <header className="bg-[#0F0F0F] border-b border-stone-800 p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
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
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Urgent alert banners (simulating live notifications from push notifications) */}
        {activeToast && (
          <div className="fixed top-18 right-4 z-50 animate-enter max-w-sm w-full shadow-2xl overflow-hidden rounded-lg border border-amber-400 bg-stone-900/95 backdrop-blur-md p-4">
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
            onDeleteUser={handleDeleteUser}
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
