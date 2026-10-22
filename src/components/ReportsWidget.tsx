import React from 'react';
import { Job, User, ClockLog } from '../types';
import { TrendingUp, Clock, CheckCircle, BarChart3 } from 'lucide-react';

interface ReportsWidgetProps {
  jobs: Job[];
  users: User[];
  clockLogs: ClockLog[];
}

export default function ReportsWidget({ jobs, users, clockLogs }: ReportsWidgetProps) {
  // Aggregate stats
  const completedJobs = jobs.filter(j => j.status === 'completed');
  
  // Calculate average completion time for completed jobs
  let avgCompletionMs = 0;
  let validJobStats = 0;
  completedJobs.forEach(j => {
    if (j.startedAt && j.completedAt) {
      avgCompletionMs += new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime();
      validJobStats++;
    }
  });

  const avgCompletionMins = validJobStats > 0 ? Math.round(avgCompletionMs / validJobStats / 60000) : 0;
  
  // Calculate top performer
  const techPerformance: Record<string, number> = {};
  completedJobs.forEach(j => {
    if (!techPerformance[j.assignedUserName]) {
      techPerformance[j.assignedUserName] = 0;
    }
    techPerformance[j.assignedUserName]++;
  });

  const topTechName = Object.keys(techPerformance).sort((a,b) => techPerformance[b] - techPerformance[a])[0] || 'No Data';
  const topTechCount = topTechName !== 'No Data' ? techPerformance[topTechName] : 0;

  return (
    <div className="space-y-6">
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-stone-800 pb-3 mb-4">
          <BarChart3 className="h-5 w-5 text-amber-400" /> Executive Analytics & Reports
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/40 border border-stone-850 p-4 rounded flex flex-col justify-between">
            <h4 className="text-[10px] uppercase font-mono text-stone-500 tracking-wider">Overall Operational Efficiency</h4>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-black text-amber-400">{(completedJobs.length / (jobs.length || 1) * 100).toFixed(0)}%</span>
              <span className="text-xs text-stone-400 mb-1">Clearance Rate</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-2">{completedJobs.length} of {jobs.length} tickets completed</p>
          </div>

          <div className="bg-black/40 border border-stone-850 p-4 rounded flex flex-col justify-between">
            <h4 className="text-[10px] uppercase font-mono text-stone-500 tracking-wider">Average Job Resolution</h4>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-black text-white">{avgCompletionMins}</span>
              <span className="text-xs text-stone-400 mb-1">Minutes</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-2">from dispatch to completion sign-off</p>
          </div>

          <div className="bg-black/40 border border-stone-850 p-4 rounded flex flex-col justify-between">
            <h4 className="text-[10px] uppercase font-mono text-stone-500 tracking-wider">Top Field Performer</h4>
            <div className="mt-2 flex flex-col pb-1">
              <span className="text-xl font-bold text-emerald-400 leading-tight">{topTechName}</span>
              <span className="text-xs text-stone-400 mt-1">{topTechCount} Tickets Resolved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-stone-800 pb-3 mb-4">
          <Clock className="h-5 w-5 text-amber-400" /> Crew Activity Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase">
                <th className="py-2 px-2">Personnel</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Job Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-850">
              {users.map(u => {
                const activeShifts = clockLogs.some(log => log.userId === u.id && !log.clockOutTime);
                const assignedTickets = jobs.filter(j => j.assignedUserId === u.id && j.status !== 'completed').length;
                return (
                  <tr key={u.id} className="hover:bg-black/20 text-stone-200">
                    <td className="py-3 px-2">
                      <span className="font-semibold block">{u.name}</span>
                      <span className="text-[10px] text-stone-500">{u.position}</span>
                    </td>
                    <td className="py-3 px-2">
                      {activeShifts ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider items-center inline-flex gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> CLOCKED IN
                        </span>
                      ) : (
                        <span className="text-stone-500 bg-stone-800 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider">
                          OFF DUTY
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {assignedTickets > 0 ? (
                        <span className="text-amber-400 font-bold">{assignedTickets} Active</span>
                      ) : (
                        <span className="text-stone-500">Available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
