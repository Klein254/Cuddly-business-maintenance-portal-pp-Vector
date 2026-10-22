import React, { useState } from 'react';
import { DollarSign, FileSpreadsheet, ShieldCheck, Info } from 'lucide-react';
import { User } from '../types';

interface PaymentsWidgetProps {
  users: User[];
  onClearPayment: (userId: string) => void;
}

export default function PayrollWidget({ users, onClearPayment }: PaymentsWidgetProps) {
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Filter out employees
  const employees = users;

  // Calculate high level KPIs
  const totalOutstandingBalance = employees.reduce((acc, curr) => acc + (curr.balanceDue || 0), 0);

  // Trigger simulated file export
  const exportPayrollData = () => {
    try {
      const dataObj = {
        company: "Vector Technical Maintenance & General Supply",
        exportDate: new Date().toISOString(),
        payrollPeriod: "Contractor Payouts",
        currency: "KES (Ksh)",
        summary: {
          totalPendingPayments: totalOutstandingBalance
        },
        records: employees.map(emp => ({
          technician: emp.name,
          email: emp.email,
          empId: emp.id,
          balanceDue: emp.balanceDue || 0
        }))
      };

      const jsonStr = JSON.stringify(dataObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VECTOR_PAYMENTS_REPORT.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl" id="payroll-system-module">
      {/* Top dashboard header info */}
      <div className="bg-black/45 border-b border-stone-800 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h3 className="font-sans font-bold text-white text-base">AUTOMATED PAYOUT CLERKS & SETTLEMENTS</h3>
          </div>
          <p className="font-sans text-xs text-stone-400 mt-1">
            Compliant job-based compensation payouts. Click clear when wire transfers are completed.
          </p>
        </div>

        <button
          onClick={exportPayrollData}
          className="w-full md:w-auto font-sans font-semibold text-xs bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 rounded flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {downloadSuccess ? (
            <>
              <ShieldCheck className="h-4 w-4 animate-bounce" />
              REPORT EXPORTED! (JSON)
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" />
              EXPORT SETTLEMENT REPORT
            </>
          )}
        </button>
      </div>

      {/* KPI stats blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-stone-800 bg-stone-950/45 text-white">
        <div className="p-4 border-r border-stone-800/80">
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 block">TOTAL OUTSTANDING SETTLEMENT LIABILITY</span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-bold tracking-tight text-amber-400">
              Ksh {totalOutstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono text-stone-500">KES</span>
          </div>
        </div>

        <div className="p-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 block">TOTAL TECH ROSTER</span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-bold tracking-tight text-white">{employees.length}</span>
            <span className="text-xs font-mono text-stone-400">ACTIVE TECHNICIANS</span>
          </div>
        </div>
      </div>

      {/* Payroll calculations detailed list */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-stone-800/80 text-stone-400 font-mono text-[10px] uppercase">
                <th className="py-3 px-2">Technician</th>
                <th className="py-3 px-2">Role/Position</th>
                <th className="py-3 px-2 text-right">Balance Due</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-850">
              {employees.map(employee => (
                <tr key={employee.id} className="hover:bg-black/20 text-stone-200">
                  <td className="py-4.5 px-2">
                    <div className="font-semibold text-white">{employee.name}</div>
                    <div className="text-[10px] text-stone-500 font-mono truncate max-w-[150px]">{employee.email}</div>
                  </td>
                  <td className="py-4.5 px-2 font-mono text-stone-300">
                    {employee.position}
                  </td>
                  <td className="py-4.5 px-2 text-right font-mono text-amber-400 font-bold text-sm bg-amber-500/5">
                    Ksh {(employee.balanceDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4.5 px-2 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to clear payments for ${employee.name}?`)) {
                          onClearPayment(employee.id);
                        }
                      }}
                      disabled={(employee.balanceDue || 0) === 0}
                      className="text-[10px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded uppercase font-bold cursor-pointer transition-colors"
                    >
                      Clear Settlement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info panel explaining rules */}
        <div className="mt-4 p-3.5 bg-black/45 hover:bg-black/60 rounded-lg border border-stone-800 flex items-start gap-3 transition-all">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="font-sans text-[11px] text-stone-400 leading-relaxed">
            <h5 className="font-semibold text-stone-300 uppercase tracking-wide font-mono text-[10px] mb-1">
              AUTOMATED CONTRACTOR COMPLIANCE
            </h5>
            <p>
              Technicians are independent contractors under Section 1099 classification. Remuneration is computed automatically via direct payout matrix values established during Operations Room job dispatch assignment. Select CLEAR SETTLEMENT only upon definitive ACH wire or paper check clearance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
