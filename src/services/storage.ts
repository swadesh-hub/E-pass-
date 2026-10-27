import {
  AdminUser,
  CollegeEvent,
  Participant,
  Registration,
  ScanAuditLog,
  VerificationResponse,
  ParticipationCertificate,
  CertificateConfig,
} from '../types';
import {
  INITIAL_ADMINS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EVENTS,
  INITIAL_PARTICIPANTS,
  INITIAL_REGISTRATIONS,
  DEMO_EVENT,
  DEMO_PARTICIPANTS,
  DEMO_REGISTRATIONS,
} from '../data/mockData';
import { buildQRPayload, generateQRToken, parseScannedQRData } from './qrService';
import {
  DEFAULT_CERTIFICATE_CONFIG,
  formatCertificateNumber,
  generateCertificateVerificationHash,
  buildCertificateQRPayload,
} from './certificateService';

const CLEAN_SLATE_VERSION_KEY = 'epass_clean_slate_user_data_v6';

const STORAGE_KEYS = {
  ADMINS: 'epass_admins_v6',
  CURRENT_ADMIN: 'epass_current_admin_v6',
  EVENTS: 'epass_events_v6',
  CURRENT_EVENT_ID: 'epass_active_event_id_v6',
  PARTICIPANTS: 'epass_participants_v6',
  REGISTRATIONS: 'epass_registrations_v6',
  AUDIT_LOGS: 'epass_audit_logs_v6',
  CERTIFICATES: 'epass_certificates_v6',
};

// Listeners for multi-component reactive sync
type StateListener = () => void;
const listeners: Set<StateListener> = new Set();

export function subscribeToStore(cb: StateListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifySubscribers() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifySubscribers();
  } catch (err) {
    console.error(`Failed to save to storage ${key}:`, err);
  }
}

// Initialize storage: ensure default demo event, registrations and admin are loaded
export function initStore() {
  if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN)) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(INITIAL_ADMINS[0]));
  }

  const existingEvents = safeGet<CollegeEvent[]>(STORAGE_KEYS.EVENTS, []);
  if (!existingEvents || existingEvents.length === 0) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([DEMO_EVENT]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_EVENT_ID, JSON.stringify(DEMO_EVENT.id));
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(DEMO_PARTICIPANTS));
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(DEMO_REGISTRATIONS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CERTIFICATES)) {
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify([]));
  }
}

export function resetStoreToDefaults(): void {
  localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
  localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(INITIAL_ADMINS[0]));
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([DEMO_EVENT]));
  localStorage.setItem(STORAGE_KEYS.CURRENT_EVENT_ID, JSON.stringify(DEMO_EVENT.id));
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(DEMO_PARTICIPANTS));
  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(DEMO_REGISTRATIONS));
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify([]));
  notifySubscribers();
}

// Admin getters & setters
export function getAdmins(): AdminUser[] {
  return safeGet<AdminUser[]>(STORAGE_KEYS.ADMINS, INITIAL_ADMINS);
}

export function getCurrentAdmin(): AdminUser {
  return safeGet<AdminUser>(STORAGE_KEYS.CURRENT_ADMIN, INITIAL_ADMINS[0]);
}

export function setCurrentAdmin(admin: AdminUser): void {
  safeSet(STORAGE_KEYS.CURRENT_ADMIN, admin);
}

// Add a student or staff member as an authorized scanner admin
export function addAuthorizedScanner(data: {
  name: string;
  email: string;
  studentRollNumber?: string;
  department?: string;
  gateAssigned?: string;
}): AdminUser {
  const admins = getAdmins();
  const existingIndex = admins.findIndex(
    (a) => a.email.trim().toLowerCase() === data.email.trim().toLowerCase()
  );

  const nowStr = formatNow();

  if (existingIndex >= 0) {
    admins[existingIndex] = {
      ...admins[existingIndex],
      name: data.name.trim() || admins[existingIndex].name,
      gateAssigned: data.gateAssigned?.trim() || admins[existingIndex].gateAssigned,
      studentRollNumber: data.studentRollNumber?.trim() || admins[existingIndex].studentRollNumber,
      isStudentVolunteer: true,
    };
    safeSet(STORAGE_KEYS.ADMINS, admins);
    return admins[existingIndex];
  }

  const newAdmin: AdminUser = {
    id: `SCAN-STU-${Date.now().toString().slice(-4)}`,
    name: data.name.trim() || (data.studentRollNumber ? `Volunteer (${data.studentRollNumber})` : 'Student Scanner'),
    email: data.email.trim().toLowerCase(),
    role: 'gate_scanner',
    roleTitle: 'Student Scanner Volunteer',
    department: data.department || 'Event Volunteer Crew',
    gateAssigned: data.gateAssigned || 'Gate 1',
    isStudentVolunteer: true,
    studentRollNumber: data.studentRollNumber?.trim(),
    addedAt: nowStr,
  };

  admins.push(newAdmin);
  safeSet(STORAGE_KEYS.ADMINS, admins);

  addAuditLog({
    timestamp: nowStr,
    qrToken: 'AUTH_SCANNER',
    eventId: '',
    eventName: 'Platform Security',
    adminId: newAdmin.id,
    adminName: newAdmin.name,
    gate: newAdmin.gateAssigned,
    result: 'GRANTED',
    message: `Student scanner permission granted to ${newAdmin.name} (${newAdmin.email}) for ${newAdmin.gateAssigned}.`,
  });

  return newAdmin;
}

export function removeAuthorizedScanner(adminId: string): void {
  const admins = getAdmins().filter((a) => a.id !== adminId);
  safeSet(STORAGE_KEYS.ADMINS, admins);

  // If active admin was removed, fallback to primary admin
  const current = getCurrentAdmin();
  if (current.id === adminId && admins.length > 0) {
    setCurrentAdmin(admins[0]);
  }
}

export function getAuthorizedStudentScanners(): AdminUser[] {
  return getAdmins().filter((a) => a.isStudentVolunteer || a.role === 'gate_scanner');
}

// Events
export function getEvents(): CollegeEvent[] {
  const events = safeGet<CollegeEvent[]>(STORAGE_KEYS.EVENTS, []);
  if (!events || events.length === 0) {
    return [DEMO_EVENT];
  }
  return events;
}

export function getActiveEventId(): string | null {
  const events = getEvents();
  const stored = safeGet<string | null>(STORAGE_KEYS.CURRENT_EVENT_ID, null);
  if (stored && events.some((e) => e.id === stored)) {
    return stored;
  }
  return events.length > 0 ? events[0].id : DEMO_EVENT.id;
}

export function setActiveEventId(id: string): void {
  safeSet(STORAGE_KEYS.CURRENT_EVENT_ID, id);
}

export function getActiveEvent(): CollegeEvent | null {
  const events = getEvents();
  if (events.length === 0) return DEMO_EVENT;
  const id = getActiveEventId();
  return events.find((e) => e.id === id) || events[0] || DEMO_EVENT;
}

export function saveEvent(event: CollegeEvent): void {
  const events = getEvents();
  const existingIdx = events.findIndex((e) => e.id === event.id);
  if (existingIdx >= 0) {
    events[existingIdx] = event;
  } else {
    events.unshift(event);
  }
  safeSet(STORAGE_KEYS.EVENTS, events);
  // Also make it the active event if it's new
  if (existingIdx < 0 || !getActiveEventId()) {
    setActiveEventId(event.id);
  }
}

// Participants
export function getParticipants(): Participant[] {
  const parts = safeGet<Participant[]>(STORAGE_KEYS.PARTICIPANTS, []);
  if (!parts || parts.length === 0) {
    return DEMO_PARTICIPANTS;
  }
  return parts;
}

export function getParticipantById(id: string): Participant | undefined {
  return getParticipants().find((p) => p.id === id);
}

// Registrations
export function getRegistrations(): Registration[] {
  const regs = safeGet<Registration[]>(STORAGE_KEYS.REGISTRATIONS, []);
  if (!regs || regs.length === 0) {
    return DEMO_REGISTRATIONS;
  }
  return regs;
}

export function getRegistrationsForEvent(eventId: string): Registration[] {
  const regs = getRegistrations();
  const eventRegs = regs.filter((r) => r.eventId === eventId);
  if (eventRegs.length === 0 && eventId === DEMO_EVENT.id) {
    return DEMO_REGISTRATIONS;
  }
  return eventRegs;
}

// Audit Logs
export function getAuditLogs(): ScanAuditLog[] {
  return safeGet<ScanAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

export function addAuditLog(log: Omit<ScanAuditLog, 'id'>): void {
  const logs = getAuditLogs();
  const newLog: ScanAuditLog = {
    ...log,
    id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
  };
  logs.unshift(newLog);
  safeSet(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200));
}

// Register a single participant to an event
export function registerParticipantToEvent(
  participantData: Omit<Participant, 'id'>,
  eventId: string
): { participant: Participant; registration: Registration } {
  const participants = getParticipants();
  const registrations = getRegistrations();
  const events = getEvents();
  const targetEvent = events.find((e) => e.id === eventId);

  // Check if participant already exists by roll number or email
  let participant = participants.find(
    (p) =>
      p.rollNumber.trim().toUpperCase() === participantData.rollNumber.trim().toUpperCase() ||
      p.email.trim().toLowerCase() === participantData.email.trim().toLowerCase()
  );

  if (!participant) {
    participant = {
      ...participantData,
      id: `PART-${Date.now().toString(36).toUpperCase()}`,
      rollNumber: participantData.rollNumber.trim().toUpperCase(),
    };
    participants.unshift(participant);
    safeSet(STORAGE_KEYS.PARTICIPANTS, participants);
  }

  // Check if already registered for this event
  const existingReg = registrations.find(
    (r) => r.participantId === participant!.id && r.eventId === eventId
  );
  if (existingReg) {
    return { participant, registration: existingReg };
  }

  const prefix = targetEvent ? targetEvent.title.slice(0, 4) : 'PASS';
  const token = generateQRToken(prefix, participant.rollNumber);
  const payload = buildQRPayload(token, eventId, participant.rollNumber, participant.name);

  const registration: Registration = {
    id: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
    participantId: participant.id,
    eventId,
    qrToken: token,
    qrPayload: payload,
    status: 'registered',
    registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  registrations.unshift(registration);
  safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

  return { participant, registration };
}

// Bulk registration
export function bulkRegisterParticipants(
  rows: Array<{
    name: string;
    rollNumber: string;
    department: string;
    email: string;
    phone?: string;
    year?: string;
  }>,
  eventId: string
): { count: number; duplicates: number } {
  let createdCount = 0;
  let duplicateCount = 0;

  rows.forEach((row) => {
    if (!row.name || !row.rollNumber) return;
    try {
      const existing = getRegistrations().find((r) => {
        const p = getParticipantById(r.participantId);
        return p && p.rollNumber.toUpperCase() === row.rollNumber.trim().toUpperCase() && r.eventId === eventId;
      });
      if (existing) {
        duplicateCount++;
      } else {
        registerParticipantToEvent(
          {
            name: row.name.trim(),
            rollNumber: row.rollNumber.trim(),
            department: row.department?.trim() || 'Engineering Dept',
            email: row.email?.trim() || `${row.rollNumber.toLowerCase()}@college.edu`,
            phone: row.phone?.trim() || '',
            year: row.year?.trim() || '1st Year',
          },
          eventId
        );
        createdCount++;
      }
    } catch {
      // ignore
    }
  });

  return { count: createdCount, duplicates: duplicateCount };
}

function formatNow(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${year}-${month}-${day} ${hoursStr}:${mins} ${ampm}`;
}

// Core Verification Engine for QR Scans
export function verifyAndProcessScan(
  scannedText: string,
  targetEventId: string,
  admin: AdminUser,
  mode: 'entry' | 'exit' = 'entry'
): VerificationResponse {
  const parsed = parseScannedQRData(scannedText);
  const token = parsed.token;

  const registrations = getRegistrations();
  const participants = getParticipants();
  const events = getEvents();

  const targetEvent = events.find((e) => e.id === targetEventId);

  // Find registration either by exact token, or token included in raw payload
  const registration = registrations.find(
    (r) => r.qrToken === token || r.qrPayload.includes(token) || (parsed.roll && r.qrToken.includes(parsed.roll))
  );

  if (!registration) {
    addAuditLog({
      timestamp: formatNow(),
      qrToken: token,
      eventId: targetEventId,
      eventName: targetEvent?.title || 'Unknown Event',
      adminId: admin.id,
      adminName: admin.name,
      gate: admin.gateAssigned,
      result: 'INVALID_TOKEN',
      message: 'Unknown QR code or ticket pass. Not found in system database.',
    });

    return {
      result: 'INVALID_TOKEN',
      message: 'Unrecognized pass. This QR code is not registered in the system.',
      event: targetEvent || undefined,
    };
  }

  const participant = participants.find((p) => p.id === registration.participantId);
  const registeredEvent = events.find((e) => e.id === registration.eventId);

  // Check event mismatch
  if (registration.eventId !== targetEventId) {
    addAuditLog({
      timestamp: formatNow(),
      qrToken: token,
      eventId: targetEventId,
      eventName: targetEvent?.title || targetEventId,
      participantId: participant?.id,
      participantName: participant?.name,
      rollNumber: participant?.rollNumber,
      department: participant?.department,
      adminId: admin.id,
      adminName: admin.name,
      gate: admin.gateAssigned,
      result: 'INVALID_EVENT',
      message: `Pass is valid for "${registeredEvent?.title || registration.eventId}", not for "${targetEvent?.title || 'this event'}".`,
    });

    return {
      result: 'INVALID_EVENT',
      message: `Event Mismatch! Pass is issued for "${registeredEvent?.title || 'another event'}", not for this venue.`,
      registration,
      participant,
      event: registeredEvent,
    };
  }

  // Process Entry Mode
  if (mode === 'entry') {
    if (registration.status === 'checked_in') {
      addAuditLog({
        timestamp: formatNow(),
        qrToken: token,
        eventId: targetEventId,
        eventName: targetEvent?.title || targetEventId,
        participantId: participant?.id,
        participantName: participant?.name,
        rollNumber: participant?.rollNumber,
        department: participant?.department,
        adminId: admin.id,
        adminName: admin.name,
        gate: admin.gateAssigned,
        result: 'DUPLICATE',
        message: `Duplicate entry alert! Already checked in at ${registration.checkInTime} by ${registration.scannedByAdminName || 'Admin'}.`,
        previousCheckInTime: registration.checkInTime,
        previousAdminName: registration.scannedByAdminName,
      });

      return {
        result: 'DUPLICATE',
        message: `DUPLICATE PASS! Attendee already checked in earlier at ${registration.checkInTime}.`,
        registration,
        participant,
        event: targetEvent,
        previousCheckInTime: registration.checkInTime,
        previousAdminName: registration.scannedByAdminName,
      };
    }

    const nowStr = formatNow();
    registration.status = 'checked_in';
    registration.checkInTime = nowStr;
    registration.scannedByAdminId = admin.id;
    registration.scannedByAdminName = admin.name;
    registration.gate = admin.gateAssigned;

    safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

    addAuditLog({
      timestamp: nowStr,
      qrToken: token,
      eventId: targetEventId,
      eventName: targetEvent?.title || targetEventId,
      participantId: participant?.id,
      participantName: participant?.name,
      rollNumber: participant?.rollNumber,
      department: participant?.department,
      adminId: admin.id,
      adminName: admin.name,
      gate: admin.gateAssigned,
      result: 'GRANTED',
      message: 'Access granted. Attendance saved automatically.',
    });

    return {
      result: 'GRANTED',
      message: 'Entry Granted! Attendance verified and stored in database.',
      registration,
      participant,
      event: targetEvent,
    };
  }

  // Process Exit Mode
  if (mode === 'exit') {
    const nowStr = formatNow();
    registration.status = 'checked_out';
    registration.checkOutTime = nowStr;

    safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

    addAuditLog({
      timestamp: nowStr,
      qrToken: token,
      eventId: targetEventId,
      eventName: targetEvent?.title || targetEventId,
      participantId: participant?.id,
      participantName: participant?.name,
      rollNumber: participant?.rollNumber,
      department: participant?.department,
      adminId: admin.id,
      adminName: admin.name,
      gate: admin.gateAssigned,
      result: 'EXIT_RECORDED',
      message: 'Exit recorded successfully.',
    });

    return {
      result: 'EXIT_RECORDED',
      message: 'Exit Recorded. Participant checked out of venue.',
      registration,
      participant,
      event: targetEvent,
    };
  }

  return {
    result: 'INVALID_TOKEN',
    message: 'Unknown scan condition.',
  };
}

// Manual Toggle Status
export function manualUpdateAttendance(
  registrationId: string,
  newStatus: 'checked_in' | 'registered',
  admin: AdminUser
): void {
  const registrations = getRegistrations();
  const reg = registrations.find((r) => r.id === registrationId);
  if (!reg) return;

  const nowStr = formatNow();
  if (newStatus === 'checked_in') {
    reg.status = 'checked_in';
    reg.checkInTime = nowStr;
    reg.scannedByAdminId = admin.id;
    reg.scannedByAdminName = `${admin.name} (Manual)`;
    reg.gate = admin.gateAssigned;
  } else {
    reg.status = 'registered';
    reg.checkInTime = undefined;
    reg.scannedByAdminId = undefined;
    reg.scannedByAdminName = undefined;
  }

  safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

  const participant = getParticipantById(reg.participantId);
  const event = getEvents().find((e) => e.id === reg.eventId);

  addAuditLog({
    timestamp: nowStr,
    qrToken: reg.qrToken,
    eventId: reg.eventId,
    eventName: event?.title || 'College Event',
    participantId: participant?.id,
    participantName: participant?.name,
    rollNumber: participant?.rollNumber,
    department: participant?.department,
    adminId: admin.id,
    adminName: admin.name,
    gate: admin.gateAssigned,
    result: newStatus === 'checked_in' ? 'GRANTED' : 'EXIT_RECORDED',
    message: `Attendance status updated manually to ${newStatus.toUpperCase()} by ${admin.name}.`,
  });
}

// Generate CSV export
export function generateAttendanceCSV(eventId: string): string {
  const registrations = getRegistrationsForEvent(eventId);
  const participants = getParticipants();
  const event = getEvents().find((e) => e.id === eventId);

  const headers = [
    'Registration ID',
    'Event Name',
    'Participant Name',
    'Roll Number',
    'Department',
    'Email',
    'Phone',
    'Year',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Verified By Admin',
    'Entry Gate',
    'Unique QR Token',
  ];

  const rows = registrations.map((r) => {
    const p = participants.find((part) => part.id === r.participantId);
    return [
      `"${r.id}"`,
      `"${event?.title || eventId}"`,
      `"${p?.name || 'Unknown'}"`,
      `"${p?.rollNumber || ''}"`,
      `"${p?.department || ''}"`,
      `"${p?.email || ''}"`,
      `"${p?.phone || ''}"`,
      `"${p?.year || ''}"`,
      `"${r.status.toUpperCase()}"`,
      `"${r.checkInTime || 'N/A'}"`,
      `"${r.checkOutTime || 'N/A'}"`,
      `"${r.scannedByAdminName || 'N/A'}"`,
      `"${r.gate || 'N/A'}"`,
      `"${r.qrToken}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}


// Mark registration pass email as sent
export function markRegistrationEmailSent(
  registrationId: string,
  admin?: AdminUser
): void {
  const registrations = getRegistrations();
  const reg = registrations.find((r) => r.id === registrationId);
  if (!reg) return;

  const nowStr = formatNow();
  reg.emailSent = true;
  reg.emailSentAt = nowStr;

  safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

  const participant = getParticipantById(reg.participantId);
  const event = getEvents().find((e) => e.id === reg.eventId);
  const currentAdmin = admin || getCurrentAdmin();

  addAuditLog({
    timestamp: nowStr,
    qrToken: reg.qrToken,
    eventId: reg.eventId,
    eventName: event?.title || 'College Event',
    participantId: participant?.id,
    participantName: participant?.name,
    rollNumber: participant?.rollNumber,
    department: participant?.department,
    adminId: currentAdmin.id,
    adminName: currentAdmin.name,
    gate: currentAdmin.gateAssigned,
    result: 'EMAIL_SENT',
    message: `Pass dispatched via email to ${participant?.email || 'participant'}.`,
  });
}

// Certificates Management
export function getCertificates(): ParticipationCertificate[] {
  return safeGet<ParticipationCertificate[]>(STORAGE_KEYS.CERTIFICATES, []);
}

export function getCertificatesForEvent(eventId: string): ParticipationCertificate[] {
  return getCertificates().filter((c) => c.eventId === eventId);
}

export function getCertificateForRegistration(regId: string): ParticipationCertificate | undefined {
  return getCertificates().find((c) => c.registrationId === regId);
}

export function saveCertificate(certificate: ParticipationCertificate): void {
  const certs = getCertificates();
  const idx = certs.findIndex((c) => c.id === certificate.id);
  if (idx >= 0) {
    certs[idx] = certificate;
  } else {
    certs.unshift(certificate);
  }
  safeSet(STORAGE_KEYS.CERTIFICATES, certs);
}

export function generateCertificatesForPresentStudents(
  eventId: string,
  customConfig?: Partial<CertificateConfig>
): { generated: ParticipationCertificate[]; count: number; totalPresent: number } {
  const events = getEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return { generated: [], count: 0, totalPresent: 0 };

  const registrations = getRegistrationsForEvent(eventId);
  const presentRegistrations = registrations.filter((r) => r.status === 'checked_in');
  const participants = getParticipants();
  const currentAdmin = getCurrentAdmin();
  const certs = getCertificates();

  const cfg: CertificateConfig = {
    ...DEFAULT_CERTIFICATE_CONFIG,
    ...(customConfig || {}),
  };

  const generated: ParticipationCertificate[] = [];
  const nowStr = formatNow();

  presentRegistrations.forEach((reg, idx) => {
    const participant = participants.find((p) => p.id === reg.participantId);
    if (!participant) return;

    // Check if certificate already exists for this registration
    const existingIdx = certs.findIndex((c) => c.registrationId === reg.id);
    const certNumber =
      existingIdx >= 0
        ? certs[existingIdx].certificateNumber
        : formatCertificateNumber(event.title, participant.rollNumber, idx);

    const verificationToken = generateCertificateVerificationHash(
      participant.rollNumber,
      event.id,
      certNumber
    );

    const qrPayload = buildCertificateQRPayload({
      certificateNumber: certNumber,
      participantName: participant.name,
      rollNumber: participant.rollNumber,
      department: participant.department,
      eventTitle: event.title,
      eventDate: event.date,
      verificationToken,
    });

    const cert: ParticipationCertificate = {
      id: existingIdx >= 0 ? certs[existingIdx].id : `CERT-${Date.now().toString(36).toUpperCase()}-${idx}`,
      certificateNumber: certNumber,
      registrationId: reg.id,
      participantId: participant.id,
      eventId: event.id,
      participantName: participant.name,
      rollNumber: participant.rollNumber,
      department: participant.department,
      year: participant.year,
      email: participant.email,
      eventTitle: event.title,
      eventCategory: event.category,
      eventDate: event.date,
      venue: event.venue,
      checkInTime: reg.checkInTime || 'Verified at Gate',
      issuedAt: cfg.issueDate || nowStr.split(' ')[0],
      issuedByAdminName: cfg.signatoryName || currentAdmin.name,
      issuedByAdminRole: cfg.signatoryRole || currentAdmin.roleTitle,
      collegeName: cfg.collegeName,
      certificateTitle: cfg.certificateTitle,
      coSignatoryName: cfg.coSignatoryName,
      coSignatoryTitle: cfg.coSignatoryRole,
      verificationToken,
      qrPayload,
      theme: cfg.theme || 'gold_prestige',
      status: 'issued',
    };

    if (existingIdx >= 0) {
      certs[existingIdx] = cert;
    } else {
      certs.push(cert);
    }
    generated.push(cert);
  });

  safeSet(STORAGE_KEYS.CERTIFICATES, certs);

  if (generated.length > 0) {
    addAuditLog({
      timestamp: nowStr,
      qrToken: 'CERT_BATCH_GEN',
      eventId: event.id,
      eventName: event.title,
      adminId: currentAdmin.id,
      adminName: currentAdmin.name,
      gate: currentAdmin.gateAssigned,
      result: 'GRANTED',
      message: `Automatically generated ${generated.length} official participation certificates for present students.`,
    });
  }

  return {
    generated,
    count: generated.length,
    totalPresent: presentRegistrations.length,
  };
}

export function generateCertificateForStudent(
  registrationId: string,
  customConfig?: Partial<CertificateConfig>
): ParticipationCertificate | null {
  const reg = getRegistrations().find((r) => r.id === registrationId);
  if (!reg || reg.status !== 'checked_in') return null;

  const event = getEvents().find((e) => e.id === reg.eventId);
  const participant = getParticipantById(reg.participantId);
  if (!event || !participant) return null;

  const currentAdmin = getCurrentAdmin();
  const certs = getCertificates();
  const existingIdx = certs.findIndex((c) => c.registrationId === reg.id);

  const cfg: CertificateConfig = {
    ...DEFAULT_CERTIFICATE_CONFIG,
    ...(customConfig || {}),
  };

  const certNumber =
    existingIdx >= 0
      ? certs[existingIdx].certificateNumber
      : formatCertificateNumber(event.title, participant.rollNumber, Math.floor(Math.random() * 900));

  const verificationToken = generateCertificateVerificationHash(
    participant.rollNumber,
    event.id,
    certNumber
  );

  const qrPayload = buildCertificateQRPayload({
    certificateNumber: certNumber,
    participantName: participant.name,
    rollNumber: participant.rollNumber,
    department: participant.department,
    eventTitle: event.title,
    eventDate: event.date,
    verificationToken,
  });

  const cert: ParticipationCertificate = {
    id: existingIdx >= 0 ? certs[existingIdx].id : `CERT-${Date.now().toString(36).toUpperCase()}`,
    certificateNumber: certNumber,
    registrationId: reg.id,
    participantId: participant.id,
    eventId: event.id,
    participantName: participant.name,
    rollNumber: participant.rollNumber,
    department: participant.department,
    year: participant.year,
    email: participant.email,
    eventTitle: event.title,
    eventCategory: event.category,
    eventDate: event.date,
    venue: event.venue,
    checkInTime: reg.checkInTime || 'Verified at Gate',
    issuedAt: cfg.issueDate || formatNow().split(' ')[0],
    issuedByAdminName: cfg.signatoryName || currentAdmin.name,
    issuedByAdminRole: cfg.signatoryRole || currentAdmin.roleTitle,
    collegeName: cfg.collegeName,
    certificateTitle: cfg.certificateTitle,
    coSignatoryName: cfg.coSignatoryName,
    coSignatoryTitle: cfg.coSignatoryRole,
    verificationToken,
    qrPayload,
    theme: cfg.theme || 'gold_prestige',
    status: 'issued',
  };

  if (existingIdx >= 0) {
    certs[existingIdx] = cert;
  } else {
    certs.unshift(cert);
  }

  safeSet(STORAGE_KEYS.CERTIFICATES, certs);
  return cert;
}

// 1-Click Demo loader with active hackathon and present students
export function loadDemoEventWithPresentStudents(): CollegeEvent {
  const events = getEvents();
  const existingDemoIdx = events.findIndex((e) => e.id === DEMO_EVENT.id);
  if (existingDemoIdx >= 0) {
    events[existingDemoIdx] = DEMO_EVENT;
  } else {
    events.unshift(DEMO_EVENT);
  }
  safeSet(STORAGE_KEYS.EVENTS, events);
  setActiveEventId(DEMO_EVENT.id);

  // Merge demo participants
  const participants = getParticipants();
  DEMO_PARTICIPANTS.forEach((demoPart) => {
    const idx = participants.findIndex((p) => p.id === demoPart.id || p.rollNumber === demoPart.rollNumber);
    if (idx >= 0) {
      participants[idx] = demoPart;
    } else {
      participants.push(demoPart);
    }
  });
  safeSet(STORAGE_KEYS.PARTICIPANTS, participants);

  // Merge demo registrations
  const registrations = getRegistrations();
  DEMO_REGISTRATIONS.forEach((demoReg) => {
    const idx = registrations.findIndex((r) => r.id === demoReg.id);
    if (idx >= 0) {
      registrations[idx] = demoReg;
    } else {
      registrations.push(demoReg);
    }
  });
  safeSet(STORAGE_KEYS.REGISTRATIONS, registrations);

  // Auto generate certificates for demo present students
  generateCertificatesForPresentStudents(DEMO_EVENT.id);

  notifySubscribers();
  return DEMO_EVENT;
}


