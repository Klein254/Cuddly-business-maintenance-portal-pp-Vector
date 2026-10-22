import React, { useState } from 'react';
import { Bell, Send, Megaphone, CheckCircle, Shield, Archive, AlertTriangle } from 'lucide-react';
import { User, PushNotificationLog } from '../types';

interface NotificationsWidgetProps {
  users: User[];
  notifications: PushNotificationLog[];
  isAdmin: boolean;
  onDispatchNotification?: (newNotification: Omit<PushNotificationLog, 'id' | 'timestamp' | 'isSent'>) => void;
}

export default function NotificationsWidget({ users, notifications, isAdmin, onDispatchNotification }: NotificationsWidgetProps) {
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('all');
  const [notifType, setNotifType] = useState<PushNotificationLog['type']>('system');
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (onDispatchNotification) {
      const recipientUser = recipient === 'all' ? 'All Team Members' : users.find(u => u.id === recipient)?.name || 'Unknown';
      
      onDispatchNotification({
        title,
        message,
        recipientUserId: recipient,
        recipientUserName: recipientUser,
        type: notifType
      });

      setTitle('');
      setMessage('');
      setDispatchSuccess(true);
      setTimeout(() => setDispatchSuccess(false), 3000);
    }
  };

  const getNotifIconStyles = (type: PushNotificationLog['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'job':
        return 'bg-amber-400/10 text-amber-400 border border-amber-400/20';
      case 'payroll':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-stone-800 text-stone-400 border border-stone-700';
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="notifications-matrix-module">
      <div className="bg-black/30 border-b border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="font-sans font-bold text-white text-base">VECTOR ALERT BROADCAST CENTER</h3>
        </div>
        <p className="font-sans text-xs text-stone-400 mt-1">
          Simulate real-time push alerts sent directly to employee smartphones and tablet terminals on site.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left column: Admin composer */}
        {isAdmin && (
          <div className="p-4 border-b lg:border-b-0 lg:border-r border-stone-800 bg-stone-950/20">
            <h4 className="font-sans font-bold text-xs text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-amber-400" /> DISPATCH NEW ALERT PACKET
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Alert Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Danger: Chemical spill advisory at Sector 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs text-stone-200 outline-none focus:border-amber-400 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Target Recipient</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs text-stone-200 outline-none focus:border-amber-400 font-sans"
                >
                  <option value="all">Broadcast Alert (All Employees)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>Personnel: {u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Alert Category</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as PushNotificationLog['type'])}
                    className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs text-stone-200 outline-none focus:border-amber-400 font-sans"
                  >
                    <option value="system">System Memo</option>
                    <option value="alert">High Alert / Danger</option>
                    <option value="job">Assign / Dispatch Board</option>
                    <option value="payroll">Finance & Payroll</option>
                  </select>
                </div>

                <div className="flex items-end">
                  {dispatchSuccess ? (
                    <div className="w-full text-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] py-2 px-4 rounded flex items-center justify-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      DISPATCHED OK!
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-amber-400 text-black hover:bg-amber-300 font-sans font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5 stroke-[2.5]" />
                      BROADCAST TO FLEET
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Notification Body</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed alert instructions here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs text-stone-200 outline-none focus:border-amber-400 font-sans resize-none"
                  required
                />
              </div>
            </form>
          </div>
        )}

        {/* Right column: Notification logs history */}
        <div className={`p-4 ${!isAdmin ? 'col-span-2' : ''} bg-stone-900/50 flex flex-col`}>
          <h4 className="font-sans font-bold text-xs text-stone-400 uppercase tracking-widest mb-4 flex items-center justify-between border-b border-stone-800 pb-2">
            <span>DISPATCH BROADCAST CHANNEL</span>
            <span className="font-mono text-[9px] text-emerald-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
            </span>
          </h4>

          <div className="flex-1 space-y-4 overflow-y-auto h-[50vh] min-h-[300px] pr-2 scrollbar-thin">
            {notifications.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif) => {
              const styles = getNotifIconStyles(notif.type);
              
              // Standardize as chat bubbles originating from "Admin / System"
              return (
                <div key={notif.id} className="flex flex-col items-end animate-enter mb-2">
                  <div className="text-[9px] font-mono text-stone-500 mb-1 flex items-center justify-end gap-2 w-full pr-1">
                    <span className="uppercase">{notif.recipientUserName === 'All Team Members' ? 'To: Everyone' : `To: ${notif.recipientUserName}`}</span>
                    &bull;
                    <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className="bg-stone-800 border-l-[3px] border-amber-400 rounded-2xl rounded-tr-sm p-3.5 max-w-[85%] lg:max-w-[70%] shadow-md">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${styles}`}>
                        {notif.type}
                      </span>
                      <h5 className="font-sans font-bold text-xs text-white">
                        {notif.title}
                      </h5>
                    </div>

                    <p className="font-sans text-xs text-stone-300 mt-1.5 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-end mt-2">
                      <span className="text-emerald-500 flex items-center gap-0.5 text-[9px] font-mono">
                        <CheckCircle className="h-3 w-3" /> DELIVERED
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compliance statement foot */}
      <div className="bg-stone-950 px-4 py-3 border-t border-stone-800 flex items-center gap-2 text-[10px] text-stone-500 select-none">
        <Shield className="h-4 w-4 text-stone-500" />
        <p>
          Push broadcast dispatch utilizes encrypted channels complying with ISO/IEC 27001 data transmission protocols. All active dispatch packets are permanently audited within server logs.
        </p>
      </div>
    </div>
  );
}
