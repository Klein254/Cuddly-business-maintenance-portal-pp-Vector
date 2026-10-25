import React, { useState } from 'react';
import { Calendar, Plus, Clock, Users, Trash2, ClipboardList, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { User, Shift } from '../types';
import { showAlert } from '../platform';

interface CalendarWidgetProps {
  users: User[];
  shifts: Shift[];
  isAdmin: boolean;
  currentUserRole?: string;
  onAddShift?: (newShift: Omit<Shift, 'id'>) => void;
  onDeleteShift?: (id: string) => void;
}

export default function CalendarWidget({ users, shifts, isAdmin, currentUserRole, onAddShift, onDeleteShift }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Assignment form state
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('16:30');
  const [formType, setFormType] = useState<Shift['type']>('normal');
  const [formNotes, setFormNotes] = useState<string>('');

  const handleOpenAssignModal = (user: User) => {
    setActiveUser(user);
    const existingShift = shifts.find(s => s.userId === user.id && s.date === selectedDay);
    if (existingShift) {
      setFormStart(existingShift.startTime);
      setFormEnd(existingShift.endTime);
      setFormType(existingShift.type);
      setFormNotes(existingShift.notes || '');
    } else {
      setFormStart('08:00');
      setFormEnd('16:30');
      setFormType('normal');
      setFormNotes('');
    }
  };

  const handleAddShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddShift && activeUser) {
      // First delete existing shift if it exists, to overwrite
      const existingShift = shifts.find(s => s.userId === activeUser.id && s.date === selectedDay);
      if (existingShift && onDeleteShift) {
        onDeleteShift(existingShift.id);
      }

      onAddShift({
        userId: activeUser.id,
        date: selectedDay,
        startTime: formStart,
        endTime: formEnd,
        type: formType,
        notes: formNotes || undefined
      });
      setActiveUser(null);
    }
  };

  const getShiftTypeStyles = (type: Shift['type']) => {
    switch (type) {
      case 'on-call':
        return 'bg-amber-400/10 text-amber-400 border border-amber-400/30';
      case 'night':
        return 'bg-indigo-400/10 text-indigo-400 border border-indigo-400/20';
      case 'off':
        return 'bg-stone-800 text-stone-500 border border-stone-850';
      default:
        return 'bg-stone-100/10 text-stone-300 border border-stone-700/50';
    }
  };

  // Calendar generation logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

  const changeMonth = (dir: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="shifts-calendar-module">
      {/* Header controls */}
      <div className="bg-black/30 border-b border-stone-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            <h3 className="font-sans font-bold text-white text-base uppercase">ROSTER & SHIFT MANAGEMENT</h3>
          </div>
          <p className="font-sans text-xs text-stone-400 mt-1">
            Complete month overview and operational technician schedule.
          </p>
        </div>
      </div>

      {/* Calendar Full Month View */}
      <div className="p-4 bg-stone-950/60 border-b border-stone-800">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-1 px-3 bg-stone-800 hover:bg-stone-700 rounded text-stone-300 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="font-mono font-bold text-amber-400 tracking-widest uppercase text-sm">
            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-1 px-3 bg-stone-800 hover:bg-stone-700 rounded text-stone-300 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-mono font-bold text-stone-500 uppercase tracking-widest">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="h-12 rounded-lg" />;
            
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const activeShiftsOnDay = shifts.filter(s => s.date === dateStr && s.type !== 'off');
            const isSelected = selectedDay === dateStr;
            const isToday = d.toDateString() === new Date().toDateString();

            return (
              <button 
                key={dateStr}
                onClick={() => setSelectedDay(dateStr)}
                className={`relative flex flex-col items-center p-1.5 h-12 rounded-lg border transition-all ${
                  isSelected 
                    ? 'border-amber-400 bg-amber-400/10 text-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.15)] font-bold' 
                    : isToday 
                    ? 'border-stone-600 bg-stone-800 text-white font-bold'
                    : 'border-stone-850 hover:border-stone-700 bg-stone-900/50 text-stone-400'
                }`}
              >
                <span className="text-sm font-sans">{d.getDate()}</span>
                {activeShiftsOnDay.length > 0 && (
                  <div className="mt-auto flex items-center justify-center gap-0.5">
                    <span className="bg-amber-400 w-1.5 h-1.5 rounded-full" />
                    {activeShiftsOnDay.length > 1 && <span className="bg-amber-400 w-1.5 h-1.5 rounded-full" />}
                    {activeShiftsOnDay.length > 2 && <span className="bg-amber-400 w-1.5 h-1.5 rounded-full" />}
                  </div> // Mini indicators for multiple shifts
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Roster Listing Grid for Selected Day */}
      <div className="p-4 bg-stone-900/40 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-stone-800 text-stone-400 font-mono text-xs gap-2">
          <span className="uppercase font-bold tracking-widest flex items-center gap-1">
            <Users className="h-4 w-4 text-amber-400" /> CREW DEPLOYMENT: {new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-[10px] bg-stone-800 px-2 py-0.5 rounded border border-stone-700 text-stone-300">
             {shifts.filter(s => s.date === selectedDay && s.type !== 'off').length} SHIFTS ACTIVE
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(emp => {
            const shift = shifts.find(s => s.userId === emp.id && s.date === selectedDay);
            
            return (
              <div 
                key={emp.id}
                onClick={() => {
                  if (!isAdmin) return;
                  if (emp.role === 'super-admin' && currentUserRole !== 'super-admin') {
                    showAlert("Only the CEO (super-admin) can assign the Super-Admin to the roster.");
                    return;
                  }
                  handleOpenAssignModal(emp);
                }} // Only clickable logic
                className={`bg-black/35 rounded-lg border p-4 flex flex-col justify-between transition-colors ${isAdmin ? 'cursor-pointer hover:border-amber-400/50' : ''} ${shift ? 'border-stone-700' : 'border-stone-850 opacity-60 hover:opacity-100'}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.avatarColor}`}>
                        {emp.name.split(' ').map(x => x[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-xs text-white">{emp.name}</h4>
                        <p className="font-mono text-[10px] text-stone-500">{emp.position}</p>
                      </div>
                    </div>
                    {shift && isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteShift && onDeleteShift(shift.id); }}
                        title="Delete Shift"
                        className="text-stone-500 hover:text-red-400 p-1.5 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4">
                    {shift ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-xs text-white flex items-center gap-1 bg-stone-900 px-2 py-1 rounded border border-stone-800">
                            <Clock className="h-3.5 w-3.5 text-amber-400 inline" />
                            {shift.startTime} – {shift.endTime}
                          </span>
                          <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full font-semibold ${getShiftTypeStyles(shift.type)}`}>
                            {shift.type === 'normal' ? 'Normal Shift' : shift.type}
                          </span>
                        </div>
                        
                        {shift.notes && (
                          <div className="text-[11px] text-stone-400 bg-stone-950/45 p-2 rounded border border-stone-800/60 flex items-start gap-1">
                            <ClipboardList className="h-3.5 w-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-sans">{shift.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1 text-stone-500 font-mono text-xs italic">
                         <span>No shift assigned</span>
                         <span className="bg-stone-800/30 font-semibold px-2 py-0.5 rounded uppercase tracking-wider text-[9px]">OFF</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* The Action Modal overlay for Form */}
        {activeUser && isAdmin && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-stone-950 border border-stone-700 shadow-2xl rounded-xl w-full max-w-md animate-fade animate-duration-150 max-h-[90vh] overflow-y-auto flex flex-col">
               <div className="flex items-center justify-between border-b border-stone-800 p-4 shrink-0 top-0 sticky bg-stone-950 z-10">
                  <h4 className="font-bold text-amber-400 text-xs uppercase tracking-widest">
                    ASSIGN: {activeUser.name}
                  </h4>
                  <button onClick={() => setActiveUser(null)} className="text-stone-400 hover:text-white p-1">
                    <X className="h-5 w-5" />
                  </button>
               </div>
               <form onSubmit={handleAddShiftSubmit} className="p-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" /> Date Selection
                    </label>
                    <input
                      type="date"
                      value={selectedDay}
                      disabled
                      className="w-full bg-stone-900 border border-stone-800 rounded p-2 text-xs text-stone-300 cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Start Time</label>
                      <input
                        type="text"
                        placeholder="08:00"
                        value={formStart}
                        onChange={(e) => setFormStart(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded p-2.5 text-xs text-stone-200 text-center outline-none focus:border-amber-400 focus:bg-black transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">End Time</label>
                      <input
                        type="text"
                        placeholder="16:30"
                        value={formEnd}
                        onChange={(e) => setFormEnd(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded p-2.5 text-xs text-stone-200 text-center outline-none focus:border-amber-400 focus:bg-black transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Shift Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as Shift['type'])}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-2.5 text-xs text-stone-200 outline-none focus:border-amber-400 focus:bg-black transition-colors"
                    >
                      <option value="normal">Normal Day Shift</option>
                      <option value="on-call">On-Call Support</option>
                      <option value="night">Night Standby</option>
                      <option value="off">Roster Off (Clears Assignment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Shift Orders & Briefing Notes</label>
                    <textarea
                      placeholder="e.g. Mandatory site gear checks..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-2.5 text-xs text-stone-200 outline-none focus:border-amber-400 focus:bg-black resize-none h-20 transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full text-center bg-amber-400 text-black font-bold text-xs tracking-widest py-3 rounded-lg hover:bg-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all uppercase"
                    >
                      {shifts.some(s => s.userId === activeUser.id && s.date === selectedDay) ? 'UPDATE SHIFT' : 'ASSIGN SHIFT'}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

