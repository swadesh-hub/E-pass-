import React from 'react';
import {
  QrCode,
  Users,
  Calendar,
  Shield,
  Smartphone,
  Monitor,
  User,
  Sparkles,
  Camera,
  DoorOpen,
  Mail,
  UserPlus,
} from 'lucide-react';
import { AdminUser, CollegeEvent } from '../types';

interface NavbarProps {
  activeTab: 'scanner' | 'dashboard' | 'events';
  onSelectTab: (tab: 'scanner' | 'dashboard' | 'events') => void;
  currentAdmin: AdminUser;
  activeEvent: CollegeEvent | null;
  onOpenAuditLogs?: () => void;
  onOpenLoginModal?: () => void;
  onOpenCreateEvent: () => void;
  onOpenBulkEmails?: () => void;
  onOpenStudentScanner?: () => void;
  onSwitchToAdmin?: () => void;
  isMobileFrame?: boolean;
  onToggleMobileFrame?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currentAdmin,
  onOpenCreateEvent,
  onOpenStudentScanner,
  onSwitchToAdmin,
}) => {
  const isVolunteer = currentAdmin.role === 'gate_scanner';

  return (
    <>
      {/* Clean, Simple Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('scanner')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap block">
                    e-Pass<span className="text-orange-600">.QR</span>
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 -mt-0.5 block">
                  Campus Gate Scanner
                </span>
              </div>
            </button>
          </div>

          {/* Simple Clean Tabs */}
          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('scanner')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-orange-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gate Scanner
            </button>
            {!isVolunteer && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Attendees &amp; Passes
                </button>
                <button
                  onClick={() => onSelectTab('events')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === 'events'
                      ? 'bg-white text-orange-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Events
                </button>
              </>
            )}
          </nav>

          {/* Right: Permission Status & Role Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isVolunteer ? (
              <>
                {/* Volunteer Scan-Only Status Chip */}
                <div
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-900"
                  title="Volunteer has scan-only access to verify passes at the assigned gate"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Volunteer (Scan-Only)</span>
                </div>

                {/* Switch Back to Super Admin Button */}
                {onSwitchToAdmin && (
                  <button
                    onClick={onSwitchToAdmin}
                    className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 transition-all active:scale-95 flex items-center gap-1.5"
                    title="Switch profile back to Super Administrator"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Switch to Admin</span>
                    <span className="sm:hidden">Admin</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Admin Full Access Indicator */}
                <div
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800"
                  title="Super Admin: Full Gate & Event Management Access"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Admin (Full Access)</span>
                  <span className="sm:hidden">Admin</span>
                </div>

                {/* Authorize Volunteer by Email */}
                {onOpenStudentScanner && (
                  <button
                    onClick={onOpenStudentScanner}
                    className="hidden md:flex items-center gap-1.5 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-700 transition-all active:scale-95"
                    title="Admin: Authorize volunteers with scan-only privileges by email"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                    <span>Authorize Volunteer</span>
                  </button>
                )}

                {/* Primary Action Button */}
                <button
                  onClick={onOpenCreateEvent}
                  className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg">
        <div className="grid grid-cols-3 items-center gap-1">
          <button
            onClick={() => onSelectTab('scanner')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'scanner' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Camera className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Scanner</span>
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Attendees</span>
          </button>

          <button
            onClick={() => onSelectTab('events')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'events' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Events</span>
          </button>
        </div>
      </div>
    </>
  );
};
