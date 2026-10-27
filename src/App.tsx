/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  initStore,
  subscribeToStore,
  getCurrentAdmin,
  setCurrentAdmin,
  getAdmins,
  getActiveEvent,
  getParticipantById,
  getRegistrations,
  resetStoreToDefaults,
} from './services/storage';
import { INITIAL_ADMINS } from './data/mockData';
import { CollegeEvent, Participant, Registration, AdminUser } from './types';
import { Navbar } from './components/Navbar';
import { ScannerView } from './components/ScannerView';
import { DashboardView } from './components/DashboardView';
import { EventsView } from './components/EventsView';
import { ParticipantPassModal } from './components/ParticipantPassModal';
import { RegistrationModal } from './components/RegistrationModal';
import { EventCreationModal } from './components/EventCreationModal';
import { BulkEmailPassDispatcherModal } from './components/BulkEmailPassDispatcherModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { StudentScannerModal } from './components/StudentScannerModal';
import { MobileFrame } from './components/MobileFrame';
import {
  QrCode,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [storeVersion, setStoreVersion] = useState(0);

  // Initialize store on mount
  useEffect(() => {
    initStore();
    const unsubscribe = subscribeToStore(() => {
      setStoreVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  const [activeTab, setActiveTab] = useState<'scanner' | 'dashboard' | 'events'>('scanner');
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isStudentScannerOpen, setIsStudentScannerOpen] = useState(false);

  // Selected pass for viewing
  const [selectedPass, setSelectedPass] = useState<{
    participant: Participant | null;
    registration: Registration | null;
  }>({
    participant: null,
    registration: null,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const currentAdmin: AdminUser = getCurrentAdmin();
  const activeEvent: CollegeEvent | null = getActiveEvent();

  const handleOpenPass = (participant: Participant, registration: Registration) => {
    setSelectedPass({ participant, registration });
  };

  const handleViewPassFromRegId = (regId: string) => {
    const reg = getRegistrations().find((r) => r.id === regId);
    if (reg) {
      const part = getParticipantById(reg.participantId);
      if (part) {
        setSelectedPass({ participant: part, registration: reg });
      }
    }
  };

  const handleRegisteredParticipant = (participant: Participant, registration: Registration) => {
    setSelectedPass({ participant, registration });
    showToast(`Pass created for ${participant.name}! E-Ticket is ready.`);
  };

  const handleEventCreated = (newEvent: CollegeEvent) => {
    setActiveTab('scanner');
    showToast(`Event "${newEvent.title}" configured and set as active gate!`);
  };

  const handleResetData = () => {
    if (window.confirm('Clear all stored college events, registrations, and attendance logs?')) {
      resetStoreToDefaults();
      showToast('All event data cleared.');
    }
  };

  const handleSwitchToSuperAdmin = () => {
    const superAdmin = getAdmins().find((a) => a.role === 'super_admin') || INITIAL_ADMINS[0];
    setCurrentAdmin(superAdmin);
    showToast(`Switched active profile to ${superAdmin.name} (Super Admin)`);
  };

  const appContent = (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentAdmin={currentAdmin}
        activeEvent={activeEvent}
        onOpenCreateEvent={() => setIsCreateEventOpen(true)}
        onOpenStudentScanner={() => setIsStudentScannerOpen(true)}
        onSwitchToAdmin={handleSwitchToSuperAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 md:pb-12 max-w-6xl mx-auto w-full">
        {activeTab === 'scanner' && (
          <ScannerView
            currentAdmin={currentAdmin}
            activeEvent={activeEvent}
            onViewPass={handleViewPassFromRegId}
            onCreateEvent={() => setIsCreateEventOpen(true)}
            onOpenBulkEmails={() => setIsBulkEmailOpen(true)}
            onOpenStudentScanner={() => setIsStudentScannerOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            currentAdmin={currentAdmin}
            activeEvent={activeEvent}
            onOpenPass={handleOpenPass}
            onOpenRegister={() => setIsRegisterOpen(true)}
            onOpenBulkEmails={() => setIsBulkEmailOpen(true)}
            onCreateEvent={() => setIsCreateEventOpen(true)}
          />
        )}

        {activeTab === 'events' && (
          <EventsView
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
            onSelectEvent={() => setActiveTab('scanner')}
          />
        )}
      </main>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-white border-2 border-orange-500 text-slate-900 text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Clean Light Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">e-Pass</span>
            <span>·</span>
            <span>Automated Campus Event Entrance &amp; Attendance Management</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Active Admin: <strong className="text-blue-700">{currentAdmin.name}</strong></span>
            <span>·</span>
            <button
              onClick={handleResetData}
              className="text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>
      </footer>

      {/* All Application Modals */}
      <ParticipantPassModal
        isOpen={Boolean(selectedPass.participant && selectedPass.registration)}
        onClose={() => setSelectedPass({ participant: null, registration: null })}
        participant={selectedPass.participant}
        registration={selectedPass.registration}
        event={activeEvent}
        onScanThisPass={() => {
          setActiveTab('scanner');
        }}
      />

      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={handleRegisteredParticipant}
        onCreateEvent={() => setIsCreateEventOpen(true)}
      />

      <EventCreationModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onEventCreated={handleEventCreated}
      />

      <BulkEmailPassDispatcherModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        onCreateEvent={() => setIsCreateEventOpen(true)}
        onPassesGenerated={(count) => {
          showToast(`Generated & queued ${count} QR passes with email dispatchers!`);
        }}
      />

      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onAdminChanged={(admin) => {
          showToast(`Logged in as ${admin.name} at ${admin.gateAssigned}`);
        }}
        onOpenStudentScanner={() => setIsStudentScannerOpen(true)}
      />

      <StudentScannerModal
        isOpen={isStudentScannerOpen}
        onClose={() => setIsStudentScannerOpen(false)}
        activeEvent={activeEvent}
        onScannerChanged={(admin) => {
          showToast(`Active scanner switched to ${admin.name} (${admin.gateAssigned})`);
        }}
      />
    </div>
  );

  return appContent;
}
