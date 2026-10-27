import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  Eye,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { CollegeEvent, Participant, Registration } from '../types';
import { getEvents, getActiveEventId, registerParticipantToEvent, markRegistrationEmailSent } from '../services/storage';
import { generateQRCodeDataUrl } from '../services/qrService';
import { sendParticipantPassEmail, copyPassEmailToClipboard, openBulkEmailComposer } from '../services/emailService';

interface BulkEmailPassDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPassesGenerated?: (count: number) => void;
  onCreateEvent?: () => void;
}

interface GeneratedEmailPass {
  id: string;
  email: string;
  name: string;
  rollNumber: string;
  qrToken: string;
  qrDataUrl: string;
  status: 'queued' | 'sending' | 'sent';
  sentAt?: string;
}

export const BulkEmailPassDispatcherModal: React.FC<BulkEmailPassDispatcherModalProps> = ({
  isOpen,
  onClose,
  onPassesGenerated,
  onCreateEvent,
}) => {
  const events = getEvents();
  const activeEventId = getActiveEventId();

  const [selectedEventId, setSelectedEventId] = useState(activeEventId || events[0]?.id || '');
  const [emailsInput, setEmailsInput] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [generatedPasses, setGeneratedPasses] = useState<GeneratedEmailPass[]>([]);
  const [previewPass, setPreviewPass] = useState<GeneratedEmailPass | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [sentIndividual, setSentIndividual] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  const parseEmailAttendee = (rawEmail: string, index: number) => {
    const cleaned = rawEmail.trim().replace(/[<>]/g, '');
    const userPart = cleaned.split('@')[0] || `student${index + 1}`;
    const name = userPart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const rollNumber = `2024CSB${String(500 + index).padStart(3, '0')}`;
    return { email: cleaned, name, rollNumber };
  };

  const handleGeneratePasses = async () => {
    if (!emailsInput.trim()) return;
    setIsProcessing(true);

    const emailList = emailsInput
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 3 && e.includes('@'));

    const passes: GeneratedEmailPass[] = [];

    for (let i = 0; i < emailList.length; i++) {
      const { email, name, rollNumber } = parseEmailAttendee(emailList[i], i);

      const res = registerParticipantToEvent(
        {
          name,
          rollNumber,
          department,
          email,
          phone: '+91 98000 00000',
          year: '3rd Year',
        },
        selectedEventId
      );

      const qrDataUrl = await generateQRCodeDataUrl(res.registration.qrPayload, {
        width: 280,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
      });

      passes.push({
        id: res.registration.id,
        email,
        name,
        rollNumber,
        qrToken: res.registration.qrToken,
        qrDataUrl,
        status: 'queued',
      });
    }

    setGeneratedPasses(passes);
    if (passes.length > 0) {
      setPreviewPass(passes[0]);
    }
    setIsProcessing(false);
    if (onPassesGenerated) {
      onPassesGenerated(passes.length);
    }
  };

  const handleSendIndividualPass = async (pass: GeneratedEmailPass) => {
    if (!currentEvent) return;
    const participant: Participant = {
      id: pass.id,
      name: pass.name,
      rollNumber: pass.rollNumber,
      department: department,
      email: pass.email,
      phone: '+91 98000 00000',
      year: '3rd Year',
    };
    const registration: Registration = {
      id: pass.id,
      participantId: pass.id,
      eventId: currentEvent.id,
      qrToken: pass.qrToken,
      qrPayload: pass.qrToken,
      status: 'registered',
      registeredAt: new Date().toISOString(),
    };
    await sendParticipantPassEmail(currentEvent, participant, registration, 'backend');
    markRegistrationEmailSent(pass.id);
    setSentIndividual(pass.id);
    setTimeout(() => setSentIndividual(null), 3000);
  };

  const handleCopyIndividualPass = async (pass: GeneratedEmailPass) => {
    if (!currentEvent) return;
    const participant: Participant = {
      id: pass.id,
      name: pass.name,
      rollNumber: pass.rollNumber,
      department: department,
      email: pass.email,
      phone: '+91 98000 00000',
      year: '3rd Year',
    };
    const registration: Registration = {
      id: pass.id,
      participantId: pass.id,
      eventId: currentEvent.id,
      qrToken: pass.qrToken,
      qrPayload: pass.qrToken,
      status: 'registered',
      registeredAt: new Date().toISOString(),
    };
    await copyPassEmailToClipboard(currentEvent, participant, registration);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const handleSimulateDispatch = () => {
    if (generatedPasses.length === 0) return;
    setIsDispatching(true);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= generatedPasses.length) {
        clearInterval(interval);
        setIsDispatching(false);
        setDispatchComplete(true);
        if (currentEvent) {
          const emailList = generatedPasses.map((p) => p.email);
          openBulkEmailComposer(currentEvent, emailList);
        }
        return;
      }

      const pass = generatedPasses[currentIndex];
      if (pass) {
        markRegistrationEmailSent(pass.id);
      }

      setGeneratedPasses((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex
            ? {
                ...item,
                status: 'sent',
                sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            : item
        )
      );

      currentIndex++;
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Bulk Email Pass Generator &amp; Dispatcher
              </h2>
              <p className="text-xs text-slate-500">
                Paste attendee emails — system automatically creates encrypted QR passes and mails them
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
        {events.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">No Events Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Please create a college event first before generating attendee email passes.
              </p>
            </div>
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
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
            {/* Left Form: Email Input (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cohort Department
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
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Multiple Attendee Emails
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Comma or line separated</span>
              </div>
              <textarea
                rows={6}
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="alice@college.edu, bob@college.edu, charlie@college.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGeneratePasses}
              disabled={isProcessing || !emailsInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Generating QR Passes...' : 'Generate Passes & Prepare Emails'}</span>
            </button>

            {/* Generated Queue List */}
            {generatedPasses.length > 0 && (
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Pass Queue ({generatedPasses.length} Attendees)</span>
                  {dispatchComplete && (
                    <span className="text-emerald-700 text-[11px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dispatched
                    </span>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {generatedPasses.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setPreviewPass(item)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                        previewPass?.id === item.id
                          ? 'bg-orange-50 border-2 border-orange-400 text-slate-900 font-bold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold text-slate-900 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{item.email}</div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {item.status === 'sent' ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            Sent {item.sentAt}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                            Queued
                          </span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSimulateDispatch}
                  disabled={isDispatching || dispatchComplete}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isDispatching
                      ? 'Dispatching Emails...'
                      : dispatchComplete
                      ? 'Dispatch Completed'
                      : `Send ${generatedPasses.length} Email Passes`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Live Email Pass Template Preview (7 cols) */}
          <div className="lg:col-span-7">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Student Inbox Preview</span>
              <span className="text-blue-700 lowercase font-mono font-bold">
                {previewPass ? previewPass.email : 'Waiting for generation'}
              </span>
            </div>

            {previewPass ? (
              <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-md overflow-hidden text-slate-800 text-xs">
                {/* Simulated Email Client Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">From:</span>
                    <span className="font-mono text-slate-700 font-medium">
                      Dean Student Affairs &lt;events@college.edu&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">To:</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {previewPass.name} &lt;{previewPass.email}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Subject:</span>
                    <span className="font-bold text-slate-900">
                      [CONFIRMED] Your Official Entry Pass for {currentEvent?.title || 'College Event'}
                    </span>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-5 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Welcome, {previewPass.name}!
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Your registration for <strong className="text-slate-900">{currentEvent?.title || 'the event'}</strong> is confirmed. Below is your unique non-transferable QR entrance pass.
                    </p>
                  </div>

                  {/* High-res QR Pass embedded in email */}
                  <div className="bg-gradient-to-b from-amber-50/50 to-orange-50/40 border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                      <img
                        src={previewPass.qrDataUrl}
                        alt="Scannable QR Ticket"
                        className="w-40 h-40 object-contain"
                      />
                    </div>

                    <div className="mt-3">
                      <div className="font-mono text-xs font-bold text-blue-700 tracking-wider">
                        {previewPass.qrToken}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                        Attendee: {previewPass.name} ({previewPass.rollNumber})
                      </div>
                    </div>

                    {/* Event logistics badge */}
                    <div className="mt-3 pt-3 border-t border-slate-200 w-full grid grid-cols-2 gap-2 text-[11px] text-left">
                      <div>
                        <span className="text-slate-500 font-bold block">VENUE:</span>
                        <span className="text-slate-800 font-semibold">{currentEvent?.venue || 'Main Venue'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">GATE:</span>
                        <span className="text-orange-600 font-bold font-mono">
                          {currentEvent?.entryGate || 'Gate 1'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">DATE:</span>
                        <span className="text-slate-800">{currentEvent?.date || 'Today'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">TIME:</span>
                        <span className="text-slate-800">{currentEvent?.time?.split('–')[0] || '09:00 AM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Show this QR code at the entrance scanner. Duplicate entry is automatically blocked by the gate validation system.
                    </span>
                  </div>

                  {/* Actions for this specific previewed pass */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyIndividualPass(previewPass)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedPreview ? 'Copied Content!' : 'Copy Pass Email'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendIndividualPass(previewPass)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sentIndividual === previewPass.id ? 'Mail Client Opened!' : `Send Pass Email to ${previewPass.name}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-slate-50">
                <Mail className="w-8 h-8 mb-2 text-slate-400" />
                <p className="text-xs font-medium">
                  Click &apos;Generate Passes &amp; Prepare Emails&apos; to view how the attendee email with the QR pass will look.
                </p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            {generatedPasses.length > 0
              ? `${generatedPasses.length} unique passes armed and ready for gate scanning.`
              : 'Add email addresses to begin batch pass generation.'}
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
