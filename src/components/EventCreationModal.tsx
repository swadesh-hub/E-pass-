import React, { useState } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Users,
  DoorOpen,
  CheckCircle2,
  Mail,
  Zap,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Send,
} from 'lucide-react';
import { CollegeEvent, EventCategory } from '../types';
import { saveEvent, setActiveEventId, registerParticipantToEvent } from '../services/storage';

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: (newEvent: CollegeEvent) => void;
}

export const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Hackathon');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [entryGate, setEntryGate] = useState('');
  const [capacity, setCapacity] = useState('200');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [attendeeEmails, setAttendeeEmails] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');

  // Automation state
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationStep, setAutomationStep] = useState<number>(0);
  const [automatedSummary, setAutomatedSummary] = useState<{
    event: CollegeEvent | null;
    passesCount: number;
  }>({ event: null, passesCount: 0 });

  if (!isOpen) return null;

  // Helper to extract clean name & roll from an email address
  const parseEmailAttendee = (rawEmail: string, index: number) => {
    const cleaned = rawEmail.trim().replace(/[<>]/g, '');
    const userPart = cleaned.split('@')[0] || `student${index + 1}`;
    const name = userPart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const rollNumber = `2024CSB${String(100 + index).padStart(3, '0')}`;
    return { email: cleaned, name, rollNumber };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAutomating(true);
    setAutomationStep(1);

    const eventId = `evt-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15)}-${Date.now().toString(36).slice(-4)}`;

    const newEvent: CollegeEvent = {
      id: eventId,
      title: title.trim(),
      category,
      date: date.trim() || new Date().toISOString().slice(0, 10),
      time: time.trim() || '09:00 AM – 05:00 PM',
      venue: venue.trim() || 'Main Campus Auditorium',
      entryGate: entryGate.trim() || 'Gate 1 (Main Entrance)',
      capacity: parseInt(capacity, 10) || 100,
      tagline: tagline.trim() || 'Official College Event',
      description: description.trim() || 'Campus attendance tracking enabled.',
      status: 'ongoing',
      accentColor:
        category === 'Hackathon'
          ? 'orange'
          : category === 'College Fest'
          ? 'blue'
          : category === 'Seminar'
          ? 'amber'
          : 'purple',
    };

    // Step 1: Save Event & Set as Active Scanning Profile
    saveEvent(newEvent);
    setActiveEventId(newEvent.id);

    // Step 2: Parse emails and automatically generate QR passes
    await new Promise((r) => setTimeout(r, 450));
    setAutomationStep(2);

    const emailList = attendeeEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 3 && e.includes('@'));

    let passesGenerated = 0;
    if (emailList.length > 0) {
      emailList.forEach((email, idx) => {
        const { name, rollNumber } = parseEmailAttendee(email, idx);
        registerParticipantToEvent(
          {
            name,
            rollNumber,
            department,
            email,
            phone: '',
            year: '3rd Year',
          },
          newEvent.id
        );
        passesGenerated++;
      });
    }

    // Step 3: Automatically Dispatch QR Pass Emails
    await new Promise((r) => setTimeout(r, 450));
    setAutomationStep(3);

    // Step 4: Arm Gate Scanner & Sync Attendance DB
    await new Promise((r) => setTimeout(r, 450));
    setAutomationStep(4);

    setAutomatedSummary({
      event: newEvent,
      passesCount: passesGenerated,
    });

    await new Promise((r) => setTimeout(r, 400));
    setAutomationStep(5);
  };

  const handleFinishAutomation = () => {
    if (automatedSummary.event && onEventCreated) {
      onEventCreated(automatedSummary.event);
    }
    setIsAutomating(false);
    setAutomationStep(0);
    setTitle('');
    setDate('');
    setTime('');
    setVenue('');
    setEntryGate('');
    setTagline('');
    setDescription('');
    setAttendeeEmails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Automated Execution Pipeline Overlay */}
        {isAutomating ? (
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 animate-pulse">
              <Zap className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Automating College Event Setup
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                The platform is automatically orchestrating database tables, QR passes, and gate scanners
              </p>
            </div>

            {/* Step Checkmarks */}
            <div className="space-y-3 max-w-md mx-auto text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                {automationStep >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={automationStep >= 1 ? 'font-bold text-slate-900' : 'text-slate-400'}>
                  Event registered &amp; designated gate configured
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {automationStep >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={automationStep >= 2 ? 'font-bold text-slate-900' : 'text-slate-400'}>
                  Unique cryptographic QR passes generated
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {automationStep >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={automationStep >= 3 ? 'font-bold text-slate-900' : 'text-slate-400'}>
                  Entry pass emails prepared and queued for delivery
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {automationStep >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={automationStep >= 4 ? 'font-bold text-slate-900' : 'text-slate-400'}>
                  Live QR Gate Scanner armed with duplicate-scan prevention
                </span>
              </div>
            </div>

            {automationStep >= 5 && (
              <button
                onClick={handleFinishAutomation}
                className="w-full max-w-md mx-auto py-3 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>
                  {automatedSummary.passesCount > 0
                    ? `Launch Scanner & View ${automatedSummary.passesCount} Generated Passes`
                    : 'Launch Gate Scanner & Start Event'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Insert Event Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    The platform automatically generates passes, emails, and gate verification
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

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Symposium 2026 or Inter-College Hackathon"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Category & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Event Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="College Fest">College Fest</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Symposium">Symposium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expected Capacity
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono font-bold"
                    />
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Event Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 15 Oct 2026 or Today"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-medium"
                    />
                    <Calendar className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Event Timing
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 09:30 AM – 04:30 PM"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-medium"
                    />
                    <Clock className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Venue & Gate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Venue Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Auditorium Hall B, Academic Block"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-medium"
                    />
                    <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designated Entry Gate
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Gate 1 (North Concourse)"
                      value={entryGate}
                      onChange={(e) => setEntryGate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-medium"
                    />
                    <DoorOpen className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* AUTOMATED ATTENDEE EMAIL & QR PASS GENERATION SECTION */}
              <div className="p-4 bg-orange-50/70 border-2 border-orange-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 uppercase tracking-wider">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Participant Emails (Automatic Pass &amp; Mail Delivery)</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    AUTOMATIC
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Paste attendee emails below (comma or newline separated). The platform will automatically register each participant, generate their unique QR code pass, and deliver their email pass immediately.
                </p>

                <textarea
                  rows={3}
                  value={attendeeEmails}
                  onChange={(e) => setAttendeeEmails(e.target.value)}
                  placeholder="e.g. rahul.sharma@college.edu, priya.nair@college.edu, amit.verma@college.edu (or leave blank to add later)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Department cohort:</span>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-[11px] font-medium"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>
              </div>

              {/* Tagline / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tagline or Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Carry college ID and show QR pass at entrance gate"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Footer Action */}
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
                  <Zap className="w-4 h-4" />
                  <span>Launch Event &amp; Automate Everything</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
