import React, { useState } from 'react';
import {
  X,
  Shield,
  GraduationCap,
  CheckCircle2,
  UserCheck,
  DoorOpen,
  UserPlus,
  Mail,
  Sparkles,
  Search,
  LogIn,
  Users,
} from 'lucide-react';
import { AdminUser, CollegeEvent, Participant } from '../types';
import {
  getAdmins,
  getCurrentAdmin,
  setCurrentAdmin,
  addAuthorizedScanner,
  getParticipants,
  getRegistrationsForEvent,
} from '../services/storage';
import { sendScannerAccessEmail } from '../services/emailService';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: CollegeEvent | null;
  onAdminChanged: (admin: AdminUser) => void;
  onSelectStudentAttendee?: (participant: Participant) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  onAdminChanged,
  onSelectStudentAttendee,
}) => {
  const admins = getAdmins();
  const currentAdmin = getCurrentAdmin();
  const participants = getParticipants();
  const eventRegistrations = activeEvent ? getRegistrationsForEvent(activeEvent.id) : [];

  const [activeTab, setActiveTab] = useState<'admin' | 'student'>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState(currentAdmin.id);
  const [customGate, setCustomGate] = useState(currentAdmin.gateAssigned);

  // New student authorization form state
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoll, setNewRoll] = useState('');
  const [newGate, setNewGate] = useState(activeEvent?.entryGate || 'Gate 1');
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter staff admins vs student volunteers
  const facultyAdmins = admins.filter(
    (a) => !a.isStudentVolunteer && a.role !== 'gate_scanner' && !a.id.startsWith('SCAN-STU')
  );
  const studentVolunteers = admins.filter(
    (a) => a.isStudentVolunteer || a.role === 'gate_scanner' || a.id.startsWith('SCAN-STU')
  );

  const handleSelectAdmin = (admin: AdminUser) => {
    setSelectedAdminId(admin.id);
    setCustomGate(admin.gateAssigned);
  };

  const handleConfirmSwitch = (adminToActivate?: AdminUser) => {
    const admin = adminToActivate || admins.find((a) => a.id === selectedAdminId) || admins[0];
    const updatedAdmin: AdminUser = {
      ...admin,
      gateAssigned: customGate.trim() || admin.gateAssigned,
    };
    setCurrentAdmin(updatedAdmin);
    onAdminChanged(updatedAdmin);
    onClose();
  };

  const handleAuthorizeStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const resolvedName =
      newName.trim() ||
      newEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const created = addAuthorizedScanner({
      email: newEmail.trim(),
      name: resolvedName,
      studentRollNumber: newRoll.trim().toUpperCase() || undefined,
      gateAssigned: newGate.trim() || activeEvent?.entryGate || 'Gate 1',
    });

    try {
      await sendScannerAccessEmail(created, activeEvent, 'backend');
    } catch {
      // ignore
    }

    setAuthStatus(`Authorized ${created.name} as student gate volunteer.`);
    setNewEmail('');
    setNewName('');
    setNewRoll('');
    setIsAddingStudent(false);

    // Switch to this student immediately
    handleConfirmSwitch(created);
  };

  // Filtered lists
  const filteredFaculty = facultyAdmins.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = studentVolunteers.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.studentRollNumber && a.studentRollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isCurrentStudent = currentAdmin.isStudentVolunteer || currentAdmin.role === 'gate_scanner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Switch Role &amp; Active User
              </h2>
              <p className="text-xs text-slate-500">
                Seamlessly toggle between College Admin / Faculty &amp; Student Volunteer Scanner
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

        {/* Current Active User Banner */}
        <div className="px-6 py-3 bg-blue-50/80 border-b border-blue-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Currently Operating As:</span>
            <span className="font-extrabold text-blue-900">{currentAdmin.name}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCurrentStudent
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {isCurrentStudent ? 'Student Volunteer' : 'Admin / Faculty'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
            <DoorOpen className="w-3.5 h-3.5 text-orange-600" />
            <span>Station: <strong>{currentAdmin.gateAssigned}</strong></span>
          </div>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-500/10 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Admin &amp; Faculty Staff ({facultyAdmins.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-orange-700 shadow-md shadow-orange-500/10 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-orange-600" />
              <span>Student Volunteers ({studentVolunteers.length})</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-6 py-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'admin'
                  ? 'Search admin name, email, or department...'
                  : 'Search student name, roll number, or email...'
              }
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Body Content */}
        <div className="px-6 py-3 max-h-[50vh] overflow-y-auto space-y-3">
          {authStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{authStatus}</span>
            </div>
          )}

          {activeTab === 'admin' ? (
            /* Admin / Faculty List */
            <div className="space-y-2">
              {filteredFaculty.map((adm) => {
                const isSelected = adm.id === selectedAdminId;
                const isCurrent = adm.id === currentAdmin.id;

                return (
                  <div
                    key={adm.id}
                    onClick={() => handleSelectAdmin(adm)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {adm.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900">{adm.name}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            {adm.roleTitle}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {adm.department} · {adm.email} · Gate: {adm.gateAssigned}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmSwitch(adm);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-500 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Student Volunteers List */
            <div className="space-y-3">
              {/* Add Student Button / Form */}
              {!isAddingStudent ? (
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-dashed border-orange-300 text-xs font-bold text-orange-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-orange-600" />
                  <span>+ Authorize New Student Gate Scanner</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAuthorizeStudent}
                  className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-orange-200">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Authorize Student Scanner
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingStudent(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Student Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="student@college.edu"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Student Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        value={newRoll}
                        onChange={(e) => setNewRoll(e.target.value)}
                        placeholder="e.g. 2024CSB085"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Assigned Gate
                      </label>
                      <input
                        type="text"
                        value={newGate}
                        onChange={(e) => setNewGate(e.target.value)}
                        placeholder="Gate 1"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!newEmail.trim()}
                      className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-xs font-bold text-white shadow-xs"
                    >
                      Authorize &amp; Switch
                    </button>
                  </div>
                </form>
              )}

              {/* Student Volunteer List */}
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu) => {
                  const isSelected = stu.id === selectedAdminId;
                  const isCurrent = stu.id === currentAdmin.id;

                  return (
                    <div
                      key={stu.id}
                      onClick={() => handleSelectAdmin(stu)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {stu.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900">{stu.name}</span>
                            {stu.studentRollNumber && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                                {stu.studentRollNumber}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Active Scanner
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            {stu.email} · Assigned Gate: <strong>{stu.gateAssigned}</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmSwitch(stu);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-500 cursor-default'
                            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white shadow-xs'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Select'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No student volunteers registered yet. Click &apos;+ Authorize New Student Gate Scanner&apos; above.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assigned Gate Station Override */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Gate Location Station Override
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customGate}
                  onChange={(e) => setCustomGate(e.target.value)}
                  placeholder="e.g. Gate 1 (North Concourse)"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-medium focus:outline-none"
                />
                <DoorOpen className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSwitch()}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-xs font-bold text-white shadow-md shadow-orange-500/20 active:scale-95"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
