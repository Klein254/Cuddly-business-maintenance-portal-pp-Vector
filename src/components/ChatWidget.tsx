import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Users, User as UserIcon, ChevronLeft, CheckCheck } from 'lucide-react';
import { ChatMessage, User } from '../types';

interface ChatWidgetProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  onUpdateUserStatus: (id: string, updates: Partial<User>) => void;
}

export default function ChatWidget({ currentUser, users, messages, onSendMessage, onUpdateUserStatus }: ChatWidgetProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.filter(m => {
    if (!selectedChatId) return false;
    if (selectedChatId === 'general') {
      return m.recipientId === 'general' || !m.recipientId; // Fallback for old messages
    }
    return (
      (m.senderId === currentUser.id && m.recipientId === selectedChatId) ||
      (m.senderId === selectedChatId && m.recipientId === currentUser.id)
    );
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChatId]);

  useEffect(() => {
    if (selectedChatId) {
      onUpdateUserStatus(currentUser.id, {
        lastReadMessagesAt: {
          ...(currentUser.lastReadMessagesAt || {}),
          [selectedChatId]: new Date().toISOString()
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, messages.length, currentUser.id]);

  const getUnreadCount = (chatId: string) => {
    return messages.filter(m => {
      const isForMe = m.recipientId === currentUser.id || m.recipientId === 'general' || !m.recipientId;
      if (!isForMe || m.senderId === currentUser.id) return false;
      const mChatId = (!m.recipientId || m.recipientId === 'general') ? 'general' : m.senderId;
      if (mChatId !== chatId) return false;
      const lastReadMsg = currentUser.lastReadMessagesAt?.[chatId] ? new Date(currentUser.lastReadMessagesAt[chatId]).getTime() : 0;
      return new Date(m.timestamp).getTime() > lastReadMsg;
    }).length;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: selectedChatId,
      content: inputText,
      timestamp: new Date().toISOString()
    });

    setInputText('');
  };

  const isUserActuallyOnline = (user: User) => {
    if (!user.isOnline) return false;
    if (!user.lastActiveUpdatedAt) return false;
    const diffMinutes = (new Date().getTime() - new Date(user.lastActiveUpdatedAt).getTime()) / 60000;
    return diffMinutes < 2; // 2 minutes heartbeat fallback
  };

  const otherUsers = [...users]
    .filter(u => u.id !== currentUser.id)
    .sort((a, b) => {
      // Admins and CEO first
      if (a.role === 'super-admin') return -1;
      if (b.role === 'super-admin') return 1;
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return a.name.localeCompare(b.name);
    });

  const activeChatName = selectedChatId === 'general' 
    ? 'General Group' 
    : (selectedChatId ? (users.find(u => u.id === selectedChatId)?.name || 'Unknown User') : '');

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl h-[600px] flex flex-col">
      {!selectedChatId ? (
      <div className="flex-1 flex flex-col bg-stone-950">
        {/* Contact List */}
        <div className="p-4 border-b border-stone-800">
          <h3 className="font-sans font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            Comms Hub
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <button
            onClick={() => setSelectedChatId('general')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              selectedChatId === 'general' 
                ? 'bg-stone-800 text-stone-200' 
                : getUnreadCount('general') > 0 
                  ? 'bg-stone-900 text-stone-200 border border-stone-800 border-l-2 border-l-amber-400' 
                  : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
            }`}
          >
            <div className="relative shrink-0">
              <div className={`p-2 rounded-full ${getUnreadCount('general') > 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-stone-800'}`}>
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm block truncate ${getUnreadCount('general') > 0 ? 'font-bold text-amber-400' : 'text-stone-200 font-bold'}`}>General Group</span>
                {getUnreadCount('general') > 0 && (
                  <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-2">
                    {getUnreadCount('general')}
                  </span>
                )}
              </div>
              <span className={`text-[10px] uppercase block truncate ${getUnreadCount('general') > 0 ? 'text-stone-400 font-bold' : 'text-stone-500'}`}>Company-wide dispatch</span>
            </div>
          </button>
          
          <div className="px-3 pt-4 pb-2 text-[10px] font-mono uppercase tracking-wider text-stone-500">
            Direct Messages
          </div>
          
          {otherUsers.map(u => {
            const unreadCount = getUnreadCount(u.id);
            const hasUnread = unreadCount > 0;
            return (
            <button
              key={u.id}
              onClick={() => setSelectedChatId(u.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                selectedChatId === u.id 
                  ? 'bg-stone-800 text-stone-200' 
                  : hasUnread 
                    ? 'bg-stone-900 text-stone-200 border border-stone-800 border-l-2 border-l-amber-400' 
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
              }`}
            >
              <div className="relative shrink-0">
                <div className={`p-2 rounded-full ${hasUnread ? 'bg-amber-400/20 text-amber-400' : 'bg-stone-800'}`}>
                  <UserIcon className="h-4 w-4" />
                </div>
                {isUserActuallyOnline(u) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-950 rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm block truncate ${hasUnread ? 'font-bold text-amber-400' : 'text-stone-200'}`}>{u.name}</span>
                  {hasUnread && (
                    <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-2">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] uppercase block truncate ${hasUnread ? 'text-stone-400 font-bold' : 'text-stone-500'}`}>{u.position}</span>
              </div>
            </button>
            );
          })}
        </div>
      </div>
      ) : (
      <div className="flex-1 flex flex-col bg-stone-900">
        {/* Main Chat Area */}
        {/* Chat Header */}
        <div className="p-4 border-b border-stone-800 flex items-center gap-3 bg-stone-950/50">
          <button 
            onClick={() => setSelectedChatId(null)}
            className="p-1 -ml-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="relative">
            <div className="p-2 rounded-full bg-stone-800 text-stone-400">
              {selectedChatId === 'general' ? <Users className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
            </div>
            {selectedChatId !== 'general' && (() => {
              const u = users.find(u => u.id === selectedChatId);
              return u && isUserActuallyOnline(u);
            })() && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-stone-950 rounded-full"></span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-stone-100 text-sm">{activeChatName}</h4>
            </div>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest block">
              {selectedChatId === 'general' 
                ? 'Company-wide dispatch' 
                : (() => {
                    const u = users.find(u => u.id === selectedChatId);
                    return u && isUserActuallyOnline(u) ? 'Online' : 'Offline';
                  })()}
            </span>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 font-mono text-xs uppercase space-y-2 opacity-50">
              <MessageSquare className="h-8 w-8 mb-2" />
              <span>No messages in this conversation.</span>
              <span>Send a message to start.</span>
            </div>
          ) : (
            visibleMessages.map(msg => {
              const isMe = msg.senderId === currentUser.id;
              
              const isLastSentByMe = isMe && visibleMessages.filter(m => m.senderId === currentUser.id).pop()?.id === msg.id;
              let isRead = false;
              if (isLastSentByMe && selectedChatId !== 'general') {
                const otherUser = users.find(u => u.id === selectedChatId);
                if (otherUser?.lastReadMessagesAt?.[currentUser.id]) {
                  isRead = new Date(otherUser.lastReadMessagesAt[currentUser.id]).getTime() >= new Date(msg.timestamp).getTime();
                }
              }
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold text-stone-400">{isMe ? 'You' : msg.senderName}</span>
                    {!isMe && selectedChatId === 'general' && (
                      <span className={`text-[8px] uppercase tracking-wider px-1 rounded ${
                        msg.senderRole === 'super-admin' ? 'bg-emerald-500/20 text-emerald-400' :
                        msg.senderRole === 'admin' ? 'bg-amber-400/20 text-amber-400' :
                        'bg-stone-800 text-stone-500'
                      }`}>
                        {msg.senderRole}
                      </span>
                    )}
                    <span className="text-[9px] text-stone-600 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`px-4 py-2 text-sm max-w-[85%] ${
                    isMe 
                      ? 'bg-amber-500 text-stone-950 rounded-2xl rounded-br-sm font-medium' 
                      : 'bg-stone-800 text-stone-200 rounded-2xl rounded-bl-sm border border-stone-700'
                  }`}>
                    {msg.content}
                  </div>
                  {isLastSentByMe && selectedChatId !== 'general' && isRead && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500 font-bold tracking-wide uppercase px-1">
                      <CheckCheck className="h-3 w-3" />
                      Read
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-stone-950 border-t border-stone-800">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeChatName}...`}
              className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-amber-400 text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:bg-amber-400 text-stone-950 px-5 rounded-xl font-bold transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}
