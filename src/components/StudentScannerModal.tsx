import React, { useState } from 'react';
import {
  X,
  UserPlus,
  ShieldCheck,
  Mail,
  DoorOpen,
  CheckCircle2,
  Trash2,
  ExternalLink,
  GraduationCap,
  Sparkles,
  QrCode,
  LogIn,
} from 'lucide-react';
import { AdminUser, CollegeEvent } from '../types';
import {
  getAdmins,
  getCurrentAdmin,
  setCurrentAdmin,
  addAuthorizedScanner,
  removeAuthorizedScanner,
} from '../services/storage';
import { sendScannerAccessEmail } from '../services/emailService';

interface StudentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: CollegeEvent | null;
  onScannerChanged?: (admin: AdminUser) => void;
}

export const StudentScannerModal: React.FC<StudentScannerModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  onScannerChanged,
}) => {
  const admins = getAdmins();
  const currentAdmin = getCurrentAdmin();

  // Form states
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [assignedGate, setAssignedGate] = useState(activeEvent?.entryGate || 'Gate 1');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const studentScanners = admins.filter(
    (a) => a.isStudentVolunteer || a.role === 'gate_scanner' || a.id.startsWith('SCAN-STU')
  );

  const handleAuthorizeStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) {
      setStatusMessage('Please enter a valid student email address.');
      setStatusType('error');
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    setEmailPreviewUrl(null);

    // Derive name if empty
    const resolvedName =
      studentName.trim() ||
      studentEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newAdmin = addAuthorizedScanner({
      email: studentEmail.trim(),
      name: resolvedName,
      studentRollNumber: studentRoll.trim().toUpperCase() || undefined,
      department: department,
      gateAssigned: assignedGate.trim() || activeEvent?.entryGate || 'Gate 1',
    });

    // Send access credentials to the student
    const emailResult = await sendScannerAccessEmail(newAdmin, activeEvent, 'backend');

    setIsSending(false);
    setStatusType('success');
    setStatusMessage(
      `Access granted! Scanner authorization emailed to ${newAdmin.name} (${newAdmin.email}).`
    );

    if (emailResult.previewUrl) {
      setEmailPreviewUrl(emailResult.previewUrl);
    }

    // Reset form
    setStudentEmail('');
    setStudentName('');
    setStudentRoll('');
  };

  const handleSwitchToScanner = (admin: AdminUser) => {
    setCurrentAdmin(admin);
    if (onScannerChanged) {
      onScannerChanged(admin);
    }
    setStatusMessage(`Switched active scanner to ${admin.name} at ${admin.gateAssigned}`);
    setStatusType('success');
  };

  const handleResendInvite = async (admin: AdminUser) => {
    setIsSending(true);
    const res = await sendScannerAccessEmail(admin, activeEvent, 'gmail');
    setIsSending(false);
    setStatusMessage(`Scanner invitation re-sent to ${admin.email}`);
    setStatusType('success');
    if (res.previewUrl) {
      setEmailPreviewUrl(res.previewUrl);
    }
  };

  const handleRemoveScanner = (adminId: string, name: string) => {
    if (window.confirm(`Revoke scanner access for ${name}?`)) {
      removeAuthorizedScanner(adminId);
      setStatusMessage(`Revoked scanner permission for ${name}.`);
      setStatusType('success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Authorize Volunteer (Scan-Only Access)
              </h2>
              <p className="text-xs text-slate-500">
                Admin gives scan-only ticket verification access to volunteers by email
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs ${
                statusType === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              {emailPreviewUrl && (
                <a
                  href={emailPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-700 underline text-[11px]"
                >
                  <span>View Delivered Email Proof</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Form: Add New Student Scanner */}
          <form
            onSubmit={handleAuthorizeStudent}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <UserPlus className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Grant Scan-Only Access to Volunteer
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Volunteer Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Volunteer Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student.scanner@college.edu"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Volunteer Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  placeholder="e.g. 2024CSB085"
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none"
                />
              </div>

              {/* Assigned Gate */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Gate Station
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={assignedGate}
                    onChange={(e) => setAssignedGate(e.target.value)}
                    placeholder="e.g. Gate 1 (North), Main Auditorium"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-medium focus:outline-none"
                  />
                  <DoorOpen className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                A verification link and login credentials will be dispatched to this email immediately.
              </span>
              <button
                type="submit"
                disabled={isSending || !studentEmail.trim()}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending Credentials...' : 'Authorize & Email Pass'}</span>
              </button>
            </div>
          </form>

          {/* List of Authorized Scanners */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Authorized Scanners ({admins.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Current Active: <strong className="text-blue-700">{currentAdmin.name}</strong> ({currentAdmin.gateAssigned})
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
              {admins.map((adm) => {
                const isCurrent = adm.id === currentAdmin.id;
                const isStudent = adm.isStudentVolunteer || adm.id.startsWith('SCAN-STU');

                return (
                  <div
                    key={adm.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCurrent ? 'bg-orange-50/40 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{adm.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-100 text-orange-700 border border-orange-300">
                            Active Scanner
                          </span>
                        )}
                        {isStudent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Student Volunteer
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {adm.gateAssigned}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {adm.email} {adm.studentRollNumber ? `· Roll: ${adm.studentRollNumber}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSwitchToScanner(adm)}
                          className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Switch to scan with this account"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Use Scanner</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResendInvite(adm)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition-colors"
                        title="Re-send scanner pass email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>

                      {isStudent && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScanner(adm.id, adm.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs transition-colors"
                          title="Revoke scanner access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Authorized student scanners can verify tickets and prevent duplicate scans at designated gates.
          </span>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
