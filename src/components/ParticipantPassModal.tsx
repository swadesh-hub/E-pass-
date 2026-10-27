import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Download,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Share2,
  Send,
  ExternalLink,
  Check,
} from 'lucide-react';
import { CollegeEvent, Participant, Registration } from '../types';
import { generateQRCodeDataUrl } from '../services/qrService';
import {
  sendParticipantPassEmail,
  sharePassDirect,
  copyPassEmailToClipboard,
  generatePassEmailText,
} from '../services/emailService';

interface ParticipantPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  registration: Registration | null;
  event: CollegeEvent | null;
  onScanThisPass?: (qrText: string) => void;
}

export const ParticipantPassModal: React.FC<ParticipantPassModalProps> = ({
  isOpen,
  onClose,
  participant,
  registration,
  event,
  onScanThisPass,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (registration) {
      generateQRCodeDataUrl(registration.qrPayload || registration.qrToken, {
        width: 380,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
      }).then(setQrDataUrl);
    }
  }, [registration]);

  if (!isOpen || !participant || !registration || !event) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(registration.qrToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleOpenEmailModal = () => {
    setEmailModalOpen(true);
    setEmailSentSuccess(false);
    setStatusMsg(null);
    setPreviewUrl(null);
  };

  const handleSendViaMethod = async (method: 'backend' | 'gmail' | 'outlook' | 'client') => {
    setIsSending(true);
    setStatusMsg(null);
    setPreviewUrl(null);

    const res = await sendParticipantPassEmail(event, participant, registration, method);
    setIsSending(false);

    if (res.success) {
      setEmailSentSuccess(true);
      setStatusMsg(res.message);
      if (res.previewUrl) {
        setPreviewUrl(res.previewUrl);
      }
    } else {
      setStatusMsg(`Dispatch notice: ${res.message}. Please use Gmail Web or Default Client below.`);
    }
  };

  const handleSharePass = async () => {
    const res = await sharePassDirect(event, participant, registration);
    if (res.success) {
      setEmailSentSuccess(true);
      setStatusMsg('Pass shared successfully!');
    }
  };

  const handleCopyEmailContent = async () => {
    const ok = await copyPassEmailToClipboard(event, participant, registration);
    if (ok) {
      setCopiedEmailText(true);
      setTimeout(() => setCopiedEmailText(false), 2500);
    }
  };

  const handleDownloadPass = () => {
    const link = document.createElement('a');
    link.download = `EventPass_${participant.rollNumber}_${event.id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold tracking-wider text-slate-800 uppercase">
              Official Campus Pass
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* E-Ticket Card Body */}
        <div className="p-5" ref={passCardRef}>
          <div className="relative bg-gradient-to-b from-white to-amber-50/40 border-2 border-slate-200 rounded-3xl p-5 shadow-xs overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-blue-600" />

            {/* Event Header */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-orange-600 font-bold mb-1">
                <span>{event.category.toUpperCase()}</span>
                <span className="text-slate-500 font-mono text-[11px]">{event.date}</span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{event.tagline}</p>
            </div>

            {/* QR Code Container */}
            <div className="my-5 flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-md border-2 border-slate-200">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Attendance Pass"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-500">
                  Generating QR...
                </div>
              )}
              <div className="mt-2 text-center">
                <p className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                  {registration.qrToken}
                </p>
                <p className="text-[10px] text-blue-700 font-bold mt-0.5">
                  Scan at {event.entryGate}
                </p>
              </div>
            </div>

            {/* Perforated Divider Ticket Effect */}
            <div className="relative my-4 flex items-center justify-between">
              <div className="w-4 h-4 -ml-7 bg-white border-r-2 border-slate-200 rounded-full" />
              <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />
              <div className="w-4 h-4 -mr-7 bg-white border-l-2 border-slate-200 rounded-full" />
            </div>

            {/* Participant Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold">ATTENDEE</span>
                  <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                    {participant.name}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold">ROLL NUMBER</span>
                  <span className="text-sm font-mono font-bold text-blue-700 block mt-0.5">
                    {participant.rollNumber}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold">DEPARTMENT</span>
                  <span className="text-xs text-slate-800 font-medium block mt-0.5 line-clamp-1">
                    {participant.department}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold">YEAR / CLASS</span>
                  <span className="text-xs text-slate-800 font-medium block mt-0.5">
                    {participant.year}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="line-clamp-1">{event.venue}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 font-mono">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>{event.time.split('–')[0]}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold">Pass Status</span>
                {registration.status === 'checked_in' ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checked In ({registration.checkInTime?.split(' ')[1] || 'Today'})
                  </span>
                ) : (
                  <span className="text-xs font-bold text-orange-600">
                    Valid • Ready for Scan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyToken}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            {copiedToken ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Token</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPass}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download</span>
          </button>

          <button
            onClick={handleOpenEmailModal}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>{registration.emailSent ? 'Re-send Pass' : 'Email Pass'}</span>
          </button>
        </div>

        {/* Quick Test Simulator Button */}
        {onScanThisPass && (
          <div className="px-4 pb-4">
            <button
              onClick={() => {
                onScanThisPass(registration.qrPayload || registration.qrToken);
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <span>Simulate Admin Gate Scan with this Pass</span>
            </button>
          </div>
        )}

        {/* Real Email Dispatcher Modal Overlay */}
        {emailModalOpen && (
          <div className="absolute inset-0 bg-white/98 p-5 flex flex-col justify-between z-20 backdrop-blur-md overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Campus Pass Mail Dispatcher</h3>
                    <p className="text-[10px] text-slate-500">Send official QR pass ticket to attendee</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Email Envelope Header */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold text-[11px]">To Participant:</span>
                  <span className="font-mono text-blue-700 font-bold text-[11px] truncate max-w-[210px]">{participant.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold text-[11px]">Subject:</span>
                  <span className="font-semibold text-slate-900 text-[11px] truncate max-w-[210px]">[Official Entry Pass] {event.title}</span>
                </div>

                {/* Body Preview with Scroll */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass Message Content</span>
                    <button
                      type="button"
                      onClick={handleCopyEmailContent}
                      className="text-[10px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                    >
                      {copiedEmailText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmailText ? 'Copied Content!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                    {generatePassEmailText(event, participant, registration)}
                  </pre>
                </div>
              </div>

              {/* Status Banner */}
              {statusMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{statusMsg}</span>
                  </div>
                  {previewUrl && (
                    <a
                      href={previewUrl}
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
            </div>

            {/* Action Buttons: Multi-Channel Dispatch */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Choose Preferred Dispatch Method:
              </div>

              {/* Automated Backend Delivery */}
              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSendViaMethod('backend')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Sending Pass to Inbox...' : '🚀 1-Click Automated Send (Direct Delivery)'}</span>
              </button>

              {/* Webmail Alternatives */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendViaMethod('gmail')}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <span className="text-red-500 font-bold">M</span>
                  <span>Open in Gmail Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendViaMethod('outlook')}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <span className="text-blue-500 font-bold">O</span>
                  <span>Outlook / Live Web</span>
                </button>
              </div>

              {/* Client & Share */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSendViaMethod('client')}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Default Mail App</span>
                </button>

                <button
                  type="button"
                  onClick={handleSharePass}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share Pass</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="w-full py-1 text-center text-xs font-semibold text-slate-400 hover:text-slate-700 pt-1"
              >
                Close Dispatcher
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
