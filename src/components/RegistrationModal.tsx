import React, { useState } from 'react';
import {
  X,
  UserPlus,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Download,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { Participant, Registration } from '../types';
import {
  getEvents,
  getActiveEventId,
  registerParticipantToEvent,
  bulkRegisterParticipants,
} from '../services/storage';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (participant: Participant, registration: Registration) => void;
  onCreateEvent?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
  onCreateEvent,
}) => {
  const events = getEvents();
  const activeEventId = getActiveEventId();

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [selectedEventId, setSelectedEventId] = useState(activeEventId || events[0]?.id || '');

  // Single form state
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('3rd Year');

  // Bulk state
  const [csvText, setCsvText] = useState('');
  const [bulkResult, setBulkResult] = useState<{ count: number; duplicates: number } | null>(null);

  if (!isOpen) return null;

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim()) return;

    const finalEmail = email.trim() || `${rollNumber.trim().toLowerCase()}@college.edu`;
    const res = registerParticipantToEvent(
      {
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        department,
        email: finalEmail,
        phone: phone.trim() || '+91 98000 00000',
        year,
      },
      selectedEventId
    );

    onRegistered(res.participant, res.registration);
    onClose();
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
    const parsedRows: Array<{
      name: string;
      rollNumber: string;
      department: string;
      email: string;
      phone?: string;
      year?: string;
    }> = [];

    const startIndex = lines[0].toLowerCase().includes('roll') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        parsedRows.push({
          name: parts[0] || 'Unknown',
          rollNumber: parts[1] || `ROLL-${i}`,
          department: parts[2] || 'Computer Science & Engineering',
          email: parts[3] || `${parts[1]?.toLowerCase()}@college.edu`,
          phone: parts[4] || '+91 98000 00000',
          year: parts[5] || '3rd Year',
        });
      }
    }

    const res = bulkRegisterParticipants(parsedRows, selectedEventId);
    setBulkResult(res);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Name,RollNumber,Department,Email,Phone,Year\n' +
      'Kunal Verma,2023CSB112,Computer Science & Engineering,kunal.v@student.college.edu,+91 98765 43210,3rd Year\n' +
      'Pooja Nair,2024ECB044,Electronics & Communication,pooja.n@student.college.edu,+91 98123 45678,2nd Year\n' +
      'Rahul Iyer,2022MEB091,Mechanical Engineering,rahul.i@student.college.edu,+91 98456 78901,4th Year';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EventPass_Participant_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Register Event Participants</h2>
              <p className="text-xs text-slate-500">Generates unique encrypted QR passes instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`pb-3 text-xs font-bold tracking-wide border-b-2 transition-all ${
              activeTab === 'single'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Single Attendee
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`pb-3 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV / Excel Import</span>
          </button>
        </div>

        {/* Event Selection or Warning */}
        {events.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              No events found. Please create a college event first before registering individual participants.
            </p>
            <div className="flex items-center justify-center gap-3">
              {onCreateEvent && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateEvent();
                  }}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-md shadow-orange-500/20 active:scale-95"
                >
                  Insert Event Details Now
                </button>
              )}
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target College Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab 1: Single Participant */}
        {events.length > 0 && activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Siddharth Nair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Roll / ID Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2023CSB099"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department / Branch
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Information Technology">Information Technology</option>
                <option value="AI & Data Science">AI & Data Science</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Biotechnology & Bioinformatics">Biotechnology & Bioinformatics</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  College Email
                </label>
                <input
                  type="email"
                  placeholder="name@student.college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Generate Unique QR Pass</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Bulk CSV Upload */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Upload or paste comma-separated attendee data:
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Template</span>
              </button>
            </div>

            <label className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-colors">
              <Upload className="w-6 h-6 text-orange-500 mb-1.5" />
              <span className="text-xs text-slate-800 font-bold">Click to upload CSV file</span>
              <span className="text-[11px] text-slate-500">or paste records directly below</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                CSV Data (Name, RollNumber, Department, Email, Phone, Year)
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Rohit Gupta, 2023CSB077, Computer Science, rohit@college.edu, +91 98000 11111, 3rd Year"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>

            {bulkResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully registered <strong>{bulkResult.count}</strong> attendees!
                    {bulkResult.duplicates > 0 && ` (${bulkResult.duplicates} duplicates skipped)`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold text-[11px]"
                >
                  Done
                </button>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!csvText.trim()}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Process &amp; Generate Passes</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
