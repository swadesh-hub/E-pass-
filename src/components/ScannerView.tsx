import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  Flashlight,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DoorOpen,
  ArrowRightLeft,
  User,
  ShieldCheck,
  Sparkles,
  Zap,
  Mail,
  Plus,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { AdminUser, CollegeEvent, VerificationResponse } from '../types';
import {
  verifyAndProcessScan,
  getRegistrationsForEvent,
  getParticipants,
  getEvents,
} from '../services/storage';
import { playAudioFeedback } from '../services/audioService';
import { scanImageData } from '../services/qrService';

interface ScannerViewProps {
  currentAdmin: AdminUser;
  activeEvent: CollegeEvent | null;
  onViewPass?: (registrationId: string) => void;
  onCreateEvent?: () => void;
  onOpenBulkEmails?: () => void;
  onOpenStudentScanner?: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  currentAdmin,
  activeEvent,
  onViewPass,
  onCreateEvent,
  onOpenBulkEmails,
  onOpenStudentScanner,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [recentVerification, setRecentVerification] = useState<VerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastScannedToken = useRef<string | null>(null);
  const scanCooldownTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-start camera immediately on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // If no event has been created yet, show clean minimal setup card
  if (!activeEvent) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4 my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Event Scanner</h2>
          <p className="text-xs text-slate-500 mt-1">
            Create or select an event to start gate scanning and attendance verification.
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

  // Start camera stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraActive(false);
        setCameraError('Camera stream not supported in this browser. Use test simulator or file upload below.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
      setCameraError(
        'Camera is not connected or permission was declined. Use the simulator buttons or upload pass image below.'
      );
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities() as { torch?: boolean };
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet],
          });
          setTorchEnabled(!torchEnabled);
        } else {
          alert('Flashlight is not supported on this device/camera.');
        }
      } catch {
        alert('Could not toggle flashlight on this hardware.');
      }
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };


  // Frame processing loop with jsQR
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const detectedData = scanImageData(imageData);

          if (detectedData && detectedData !== lastScannedToken.current) {
            handleProcessScannedCode(detectedData);
            lastScannedToken.current = detectedData;
            if (scanCooldownTimer.current) clearTimeout(scanCooldownTimer.current);
            scanCooldownTimer.current = setTimeout(() => {
              lastScannedToken.current = null;
            }, 3000);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(scanFrame);
    };

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  const handleProcessScannedCode = (rawCode: string) => {
    if (!rawCode.trim() || isVerifying) return;
    setIsVerifying(true);

    const result = verifyAndProcessScan(rawCode, activeEvent.id, currentAdmin, 'entry');

    if (result.result === 'GRANTED') {
      playAudioFeedback.success();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ea580c', '#3b82f6', '#f59e0b', '#10b981'],
        });
      } catch {
        // ignore
      }
    } else if (result.result === 'DUPLICATE') {
      playAudioFeedback.duplicate();
    } else {
      playAudioFeedback.error();
    }

    setRecentVerification(result);
    setManualToken('');
    setIsVerifying(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const decoded = scanImageData(imgData);
          if (decoded) {
            handleProcessScannedCode(decoded);
          } else {
            alert('No valid QR code detected in the selected image. Please try another image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const eventRegistrations = getRegistrationsForEvent(activeEvent.id);
  const participants = getParticipants();
  const allEvents = getEvents();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Top Banner / Event Bar */}
      <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-600">Active Gate: {activeEvent.category}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {activeEvent.title}
          </h2>
          <div className="flex items-center gap-2.5 text-xs text-slate-600 mt-1">
            <span className="font-medium text-slate-700">{activeEvent.venue}</span>
            <span>·</span>
            <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {activeEvent.entryGate}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Scanning as:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{currentAdmin.name}</span>
              <span className="text-[10px] text-blue-600 font-mono font-medium">({currentAdmin.email})</span>
            </span>

          </div>
        </div>

        {/* Gate Actions: Admin can Authorize Volunteer (Scan-Only) by Email */}
        <div className="flex items-center gap-2 shrink-0">
          {currentAdmin.role === 'super_admin' ? (
            onOpenStudentScanner && (
              <button
                onClick={onOpenStudentScanner}
                className="py-2 px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-700 flex items-center gap-2 shadow-xs transition-all active:scale-95"
                title="Admin: Grant scan-only access to volunteers by email"
              >
                <UserPlus className="w-4 h-4 text-orange-600" />
                <span>+ Authorize Volunteer (Scan-Only)</span>
              </button>
            )
          ) : (
            <span className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Volunteer (Scan-Only Mode)</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Scanner Viewport Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Camera & Viewfinder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-900 border-2 border-slate-200 rounded-3xl overflow-hidden shadow-lg flex flex-col items-center justify-center">
            {/* Hidden video & offscreen canvas */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${
                !cameraActive ? 'hidden' : ''
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Inactive Camera State */}
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-1">Gate Camera Scanner</h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Start camera to scan participant QR codes at the gate with real-time duplicate check.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={startCamera}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Live Camera</span>
                  </button>

                  <label className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors backdrop-blur-md">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {cameraError && (
                  <p className="text-[11px] text-amber-300 mt-3 font-semibold bg-amber-950/70 px-3 py-1.5 rounded-lg border border-amber-800">
                    {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* Active Viewfinder Overlays */}
            {cameraActive && (
              <>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-64 h-64 border-2 border-orange-400/50 rounded-2xl flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 -mb-1 -mr-1 rounded-br-lg" />

                    {/* Laser Scanner Line in Yellow-Orange */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-pulse" />
                  </div>
                </div>

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-white/20">
                    Live Feed Active
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleTorch}
                      title="Toggle Torch"
                      className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                        torchEnabled
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={flipCamera}
                      title="Flip Camera"
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={stopCamera}
                      title="Stop Camera"
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-rose-400 hover:bg-black/80 transition-colors"
                    >
                      <CameraOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-3 text-center px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[11px] text-white font-medium">
                  Align QR code inside box
                </div>
              </>
            )}
          </div>

          {/* Quick Manual Token Entry */}
          <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 flex items-center gap-2.5 shadow-xs">
            <input
              type="text"
              placeholder="Paste or type Pass Token (e.g. EPQR-HACK-2024ITB015-7C3D2)..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcessScannedCode(manualToken);
              }}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono font-medium"
            />
            <button
              onClick={() => handleProcessScannedCode(manualToken)}
              disabled={!manualToken.trim()}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-bold text-white whitespace-nowrap transition-colors shadow-sm"
            >
              Verify Code
            </button>
          </div>
        </div>

        {/* Right: Real-time Scan Result Card & Verification Badge (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {recentVerification ? (
            <div
              className={`rounded-3xl p-5 border-2 transition-all duration-300 shadow-lg relative overflow-hidden ${
                recentVerification.result === 'GRANTED'
                  ? 'bg-emerald-50 border-emerald-500 shadow-emerald-500/10'
                  : recentVerification.result === 'DUPLICATE'
                  ? 'bg-rose-50 border-rose-500 shadow-rose-500/10'
                  : recentVerification.result === 'EXIT_RECORDED'
                  ? 'bg-blue-50 border-blue-500 shadow-blue-500/10'
                  : 'bg-amber-50 border-amber-500 shadow-amber-500/10'
              }`}
            >
              {/* Header Status Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {recentVerification.result === 'GRANTED' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  {recentVerification.result === 'DUPLICATE' && (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  {recentVerification.result === 'EXIT_RECORDED' && (
                    <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  )}
                  {recentVerification.result === 'INVALID_EVENT' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  {recentVerification.result === 'INVALID_TOKEN' && (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}

                  <span
                    className={`text-sm font-extrabold tracking-wide uppercase ${
                      recentVerification.result === 'GRANTED'
                        ? 'text-emerald-700'
                        : recentVerification.result === 'DUPLICATE'
                        ? 'text-rose-700'
                        : recentVerification.result === 'EXIT_RECORDED'
                        ? 'text-blue-700'
                        : 'text-amber-800'
                    }`}
                  >
                    {recentVerification.result === 'GRANTED' && 'Entry Access Granted'}
                    {recentVerification.result === 'DUPLICATE' && 'Duplicate Scan Prevented!'}
                    {recentVerification.result === 'EXIT_RECORDED' && 'Exit Recorded'}
                    {recentVerification.result === 'INVALID_EVENT' && 'Wrong Event Pass'}
                    {recentVerification.result === 'INVALID_TOKEN' && 'Unrecognized Pass'}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Duplicate Warning Callout */}
              {recentVerification.result === 'DUPLICATE' && (
                <div className="my-3 p-3.5 bg-rose-100 border border-rose-300 rounded-2xl text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>ALREADY USED TICKET</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This pass was previously verified at{' '}
                    <strong className="underline font-bold">
                      {recentVerification.previousCheckInTime || 'Earlier'}
                    </strong>{' '}
                    by{' '}
                    <strong className="font-bold">
                      {recentVerification.previousAdminName || 'Staff'}
                    </strong>
                    . Duplicate entry denied.
                  </p>
                </div>
              )}

              {/* Participant Card Information */}
              {recentVerification.participant ? (
                <div className="mt-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-900 font-extrabold text-base shadow-sm">
                      {recentVerification.participant.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                        {recentVerification.participant.name}
                      </h4>
                      <p className="text-xs font-mono text-blue-700 font-bold mt-0.5">
                        {recentVerification.participant.rollNumber}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs shadow-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="text-slate-800 font-bold text-right">
                        {recentVerification.participant.department}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Class / Year:</span>
                      <span className="text-slate-800 font-semibold">
                        {recentVerification.participant.year}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Verified By:</span>
                      <span className="text-blue-700 font-bold font-mono text-[11px]">
                        {currentAdmin.name} ({currentAdmin.gateAssigned})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                  {recentVerification.message}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {recentVerification.registration && onViewPass && (
                  <button
                    onClick={() => onViewPass(recentVerification.registration!.id)}
                    className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition-colors shadow-xs"
                  >
                    View E-Ticket
                  </button>
                )}
                <button
                  onClick={() => setRecentVerification(null)}
                  className="ml-auto py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  Clear / Next
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[220px] bg-white border-2 border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-orange-600 mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mb-1">Gate Scanner Ready</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Scan attendee QR code via live camera, upload pass screenshot, or select a test attendee from the simulator below.
              </p>
            </div>
          )}

          {/* Gate Volunteer Info */}
          <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-slate-500">Logged in Admin: </span>
                <strong className="text-slate-900 font-bold">{currentAdmin.name}</strong>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {currentAdmin.gateAssigned}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Pass Simulator Tray */}
      <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Quick Gate Test Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Test instant entry check-in, duplicate prevention, and wrong-event rejection with one click
            </p>
          </div>
          <span className="text-[11px] text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {eventRegistrations.length} registered attendees
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {eventRegistrations.length === 0 ? (
            <div className="col-span-full py-6 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-800">No attendees registered for this event yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Paste participant emails to automatically generate their unique QR passes and email tickets.
                </p>
              </div>
              {onOpenBulkEmails && (
                <button
                  onClick={onOpenBulkEmails}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>+ Add Participant Emails (Auto-Generate Passes)</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Fresh un-scanned attendee */}
              {eventRegistrations
                .filter((r) => r.status === 'registered')
                .slice(0, 3)
                .map((reg) => {
                  const part = participants.find((p) => p.id === reg.participantId);
                  return (
                    <button
                      key={reg.id}
                      onClick={() => handleProcessScannedCode(reg.qrPayload || reg.qrToken)}
                      className="text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border-2 border-slate-200 hover:border-orange-400 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                          {part?.name || 'Attendee'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                          Fresh Pass
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {part?.rollNumber} · {part?.department.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-orange-600 font-bold mt-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-orange-500" />
                        <span>Test Valid Entry Check-In</span>
                      </div>
                    </button>
                  );
                })}

              {/* Already checked-in attendee to test duplicate detection */}
              {eventRegistrations
                .filter((r) => r.status === 'checked_in')
                .slice(0, 2)
                .map((reg) => {
                  const part = participants.find((p) => p.id === reg.participantId);
                  return (
                    <button
                      key={reg.id}
                      onClick={() => handleProcessScannedCode(reg.qrPayload || reg.qrToken)}
                      className="text-left p-3.5 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-400 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                          {part?.name || 'Attendee'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                          Already Checked In
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Checked in at {reg.checkInTime?.split(' ')[1] || 'Earlier'}
                      </div>
                      <div className="text-[10px] text-rose-700 font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Test Duplicate Rejection Alert</span>
                      </div>
                    </button>
                  );
                })}
            </>
          )}

          {/* Wrong Event Pass test */}
          {allEvents
            .filter((e) => e.id !== activeEvent.id)
            .slice(0, 1)
            .map((otherEvent) => (
              <button
                key={otherEvent.id}
                onClick={() =>
                  handleProcessScannedCode(`EPQR-DIFF-${otherEvent.id.slice(0, 4)}-TESTPASS-99`)
                }
                className="text-left p-3.5 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border-2 border-amber-200 hover:border-amber-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    Pass for {otherEvent.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    Different Event
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{otherEvent.title}</div>
                <div className="text-[10px] text-amber-800 font-bold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Test Wrong Event Rejection</span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
