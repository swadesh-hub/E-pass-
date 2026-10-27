import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  QrCode,
  Check,
  Undo2,
  Mail,
  UserPlus,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AdminUser, CollegeEvent, Participant, Registration } from '../types';
import {
  getRegistrationsForEvent,
  getParticipants,
  manualUpdateAttendance,
  generateAttendanceCSV,
} from '../services/storage';
import { sendParticipantPassEmail } from '../services/emailService';

interface DashboardViewProps {
  currentAdmin: AdminUser;
  activeEvent: CollegeEvent | null;
  onOpenPass: (participant: Participant, registration: Registration) => void;
  onOpenRegister: () => void;
  onOpenBulkEmails: () => void;
  onCreateEvent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentAdmin,
  activeEvent,
  onOpenPass,
  onOpenRegister,
  onOpenBulkEmails,
  onCreateEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'registered' | 'checked_out'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  if (!activeEvent) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4 my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
          <Users className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance &amp; Passes</h2>
          <p className="text-xs text-slate-500 mt-1">
            Select or create an event to view registered attendees, verify check-ins, and export reports.
          </p>
        </div>
        {onCreateEvent && (
          <button
            onClick={onCreateEvent}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white shadow-sm transition-all"
          >
            Create New Event
          </button>
        )}
      </div>
    );
  }

  const registrations = getRegistrationsForEvent(activeEvent.id);
  const participants = getParticipants();

  // Metrics computation
  const totalRegistrations = registrations.length;
  const checkedInCount = registrations.filter((r) => r.status === 'checked_in').length;
  const pendingCount = registrations.filter((r) => r.status === 'registered').length;
  const checkedOutCount = registrations.filter((r) => r.status === 'checked_out').length;
  const checkInRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;

  // Filtered rows
  const filteredRows = registrations
    .map((reg) => {
      const participant = participants.find((p) => p.id === reg.participantId);
      return { reg, participant };
    })
    .filter(({ reg, participant }) => {
      if (!participant) return false;

      // Status filter
      if (statusFilter !== 'all' && reg.status !== statusFilter) return false;

      // Department filter
      if (departmentFilter !== 'all' && participant.department !== departmentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = participant.name.toLowerCase().includes(q);
        const matchesRoll = participant.rollNumber.toLowerCase().includes(q);
        const matchesDept = participant.department.toLowerCase().includes(q);
        const matchesToken = reg.qrToken.toLowerCase().includes(q);
        return matchesName || matchesRoll || matchesDept || matchesToken;
      }

      return true;
    });

  // Unique departments for filter
  const departments = Array.from(
    new Set(
      registrations
        .map((r) => participants.find((p) => p.id === r.participantId)?.department)
        .filter((d): d is string => Boolean(d))
    )
  );

  const handleExportCSV = () => {
    const csvData = generateAttendanceCSV(activeEvent.id);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${activeEvent.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [emailToast, setEmailToast] = useState<string | null>(null);

  const handleManualToggle = (regId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'checked_in' ? 'registered' : 'checked_in';
    manualUpdateAttendance(regId, newStatus, currentAdmin);
  };

  const handleQuickEmailPass = async (participant: Participant, reg: Registration) => {
    if (!activeEvent) return;
    const res = await sendParticipantPassEmail(activeEvent, participant, reg, 'auto');
    if (res.success) {
      setEmailToast(`Pass email dispatched to ${participant.name} (${participant.email})`);
      setTimeout(() => setEmailToast(null), 4000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {emailToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{emailToast}</span>
          </div>
          <button onClick={() => setEmailToast(null)} className="text-emerald-700 hover:text-emerald-950 text-xs">
            ✕
          </button>
        </div>
      )}
      {/* Event Overview & Action Toolbar */}
      <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="text-orange-600">{activeEvent.category}</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">{activeEvent.date}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {activeEvent.title}
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {activeEvent.venue} · Designated Gate: <span className="text-blue-700 font-bold">{activeEvent.entryGate}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenBulkEmails}
            className="py-2.5 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Email Passes</span>
          </button>

          <button
            onClick={onOpenRegister}
            className="py-2.5 px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-700 flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4 text-orange-600" />
            <span>Add Attendee</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Registered */}
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold tracking-wide">Total Registered</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {totalRegistrations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Capacity: <span className="font-mono font-bold text-slate-700">{activeEvent.capacity}</span>
          </div>
        </div>

        {/* Present (Checked-In) */}
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold tracking-wide">Present (Verified)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums">
            {checkedInCount}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{checkInRate}% turnout rate</span>
          </div>
        </div>

        {/* Pending / Absent */}
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold tracking-wide">Pending / Absent</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tabular-nums">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Awaiting gate entry
          </div>
        </div>

        {/* Check-In Progress Bar Card */}
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold tracking-wide">Turnout Progress</span>
              <ShieldCheck className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {checkInRate}%
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2 border border-slate-200">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, checkInRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Attendance Database Table Section */}
      <div className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
        {/* Table Filters & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({registrations.length})
              </button>
              <button
                onClick={() => setStatusFilter('checked_in')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  statusFilter === 'checked_in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Present ({checkedInCount})
              </button>
              <button
                onClick={() => setStatusFilter('registered')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  statusFilter === 'registered' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                Absent ({pendingCount})
              </button>
            </div>

            {/* Department Dropdown */}
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Participant Name</th>
                <th className="py-3.5 px-4">Department &amp; Year</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Scan Time &amp; Admin</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length > 0 ? (
                filteredRows.map(({ reg, participant }) => {
                  if (!participant) return null;
                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-orange-50/30 transition-colors group"
                    >
                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {participant.rollNumber}
                      </td>

                      {/* Participant Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                          {participant.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{participant.email}</span>
                          {reg.emailSent ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Pass emailed ${reg.emailSentAt || ''}`}>
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Emailed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200" title="Pass not emailed yet">
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{participant.department}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{participant.year}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {reg.status === 'checked_in' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Present</span>
                          </span>
                        ) : reg.status === 'checked_out' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 font-bold text-[11px]">
                            <span>Exited</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Check-In Details */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {reg.checkInTime ? (
                          <div>
                            <div className="font-bold text-slate-900">{reg.checkInTime}</div>
                            <div className="text-[10px] text-blue-700 font-medium">
                              By {reg.scannedByAdminName || 'Admin'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickEmailPass(participant, reg)}
                            title={reg.emailSent ? `Re-send entry pass email to ${participant.email}` : `Send pass email to ${participant.email}`}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              reg.emailSent
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                                : 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-600'
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenPass(participant, reg)}
                            title="View E-Ticket Pass"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleManualToggle(reg.id, reg.status)}
                            title={
                              reg.status === 'checked_in'
                                ? 'Undo Check-In'
                                : 'Manual Check-In'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              reg.status === 'checked_in'
                                ? 'bg-slate-100 hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-600'
                                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                            }`}
                          >
                            {reg.status === 'checked_in' ? (
                              <Undo2 className="w-4 h-4" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto border border-orange-200 shadow-xs">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">No participant passes generated yet</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Paste student emails below to automatically generate their unique QR passes and email tickets.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2.5 pt-1">
                        <button
                          onClick={onOpenBulkEmails}
                          className="py-2 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-xs font-bold text-white shadow-xs inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>+ Add Participant Emails</span>
                        </button>
                        <button
                          onClick={onOpenRegister}
                          className="py-2 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200"
                        >
                          Single Attendee
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No attendees match your query.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search filters or registering new participants.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>
            Showing <strong className="text-slate-900">{filteredRows.length}</strong> of{' '}
            <strong className="text-slate-900">{registrations.length}</strong> registered students
          </span>
          <span className="font-mono text-[11px] text-blue-700 font-bold">Database Synced</span>
        </div>
      </div>
    </div>
  );
};
