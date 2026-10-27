import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  XCircle,
  Search,
  Shield,
  Mail,
} from 'lucide-react';
import { getAuditLogs } from '../services/storage';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<'ALL' | 'GRANTED' | 'DUPLICATE' | 'INVALID' | 'EMAIL'>('ALL');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const logs = getAuditLogs();

  const filteredLogs = logs.filter((log) => {
    if (filter === 'GRANTED' && log.result !== 'GRANTED') return false;
    if (filter === 'DUPLICATE' && log.result !== 'DUPLICATE') return false;
    if (
      filter === 'INVALID' &&
      log.result !== 'INVALID_TOKEN' &&
      log.result !== 'INVALID_EVENT'
    )
      return false;
    if (filter === 'EMAIL' && log.result !== 'EMAIL_SENT') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = log.participantName?.toLowerCase().includes(q);
      const matchRoll = log.rollNumber?.toLowerCase().includes(q);
      const matchAdmin = log.adminName.toLowerCase().includes(q);
      const matchToken = log.qrToken.toLowerCase().includes(q);
      return matchName || matchRoll || matchAdmin || matchToken;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Gate Scan Audit Trail &amp; Verification Logs
              </h2>
              <p className="text-xs text-slate-500">
                Live tamper-proof log of all scanned tickets, duplicate alerts, and authorized gate admins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search logs by student, roll number, or admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('GRANTED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === 'GRANTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Granted
            </button>
            <button
              onClick={() => setFilter('DUPLICATE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === 'DUPLICATE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Duplicates
            </button>
            <button
              onClick={() => setFilter('INVALID')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === 'INVALID'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilter('EMAIL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === 'EMAIL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-orange-700'
              }`}
            >
              Emails
            </button>
          </div>
        </div>

        {/* Logs List Table */}
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 sticky top-0 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Attendee / Pass</th>
                <th className="py-3 px-4">Scanning Admin &amp; Gate</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-orange-50/20 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Result */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.result === 'GRANTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>GRANTED</span>
                        </span>
                      )}
                      {log.result === 'EMAIL_SENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 font-bold text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-orange-600" />
                          <span>EMAIL SENT</span>
                        </span>
                      )}
                      {log.result === 'DUPLICATE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>DUPLICATE</span>
                        </span>
                      )}
                      {log.result === 'INVALID_EVENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>WRONG EVENT</span>
                        </span>
                      )}
                      {log.result === 'INVALID_TOKEN' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>INVALID</span>
                        </span>
                      )}
                      {log.result === 'EXIT_RECORDED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 font-bold text-[11px]">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                          <span>EXIT</span>
                        </span>
                      )}
                    </td>

                    {/* Attendee Info */}
                    <td className="py-3 px-4">
                      {log.participantName ? (
                        <div>
                          <div className="font-bold text-slate-900">{log.participantName}</div>
                          <div className="font-mono text-[11px] text-blue-700 font-semibold">
                            {log.rollNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px] block">
                          {log.qrToken}
                        </span>
                      )}
                    </td>

                    {/* Scanning Admin */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-800 font-bold">{log.adminName}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium">{log.gate}</div>
                    </td>

                    {/* Message / Duplicate Detail */}
                    <td className="py-3 px-4 text-slate-600 leading-snug">
                      <span>{log.message}</span>
                      {log.previousCheckInTime && (
                        <span className="block text-[11px] text-rose-700 font-mono font-bold mt-0.5">
                          Initial entry: {log.previousCheckInTime}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No scan records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-slate-900">{filteredLogs.length}</strong> log entries
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
