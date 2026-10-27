export type AdminRole = 'super_admin' | 'event_lead' | 'gate_scanner';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  roleTitle: string;
  department: string;
  gateAssigned: string;
  isStudentVolunteer?: boolean;
  studentRollNumber?: string;
  addedAt?: string;
}

export type EventCategory = 'Hackathon' | 'College Fest' | 'Seminar' | 'Workshop' | 'Symposium';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export interface CollegeEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  status: EventStatus;
  description: string;
  capacity: number;
  entryGate: string;
  tagline: string;
  accentColor: string; // Tailwind accent theme
}

export interface Participant {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  phone: string;
  year: string;
  avatarSeed?: string;
}

export type AttendanceStatus = 'registered' | 'checked_in' | 'checked_out';

export interface Registration {
  id: string;
  participantId: string;
  eventId: string;
  qrToken: string;
  qrPayload: string;
  status: AttendanceStatus;
  registeredAt: string;
  checkInTime?: string;
  checkOutTime?: string;
  scannedByAdminId?: string;
  scannedByAdminName?: string;
  gate?: string;
  notes?: string;
  emailSent?: boolean;
  emailSentAt?: string;
}

export type ScanVerificationResult =
  | 'GRANTED'
  | 'DUPLICATE'
  | 'INVALID_EVENT'
  | 'INVALID_TOKEN'
  | 'EXIT_RECORDED'
  | 'EMAIL_SENT';

export interface ScanAuditLog {
  id: string;
  timestamp: string;
  qrToken: string;
  eventId: string;
  eventName: string;
  participantId?: string;
  participantName?: string;
  rollNumber?: string;
  department?: string;
  adminId: string;
  adminName: string;
  gate: string;
  result: ScanVerificationResult;
  message: string;
  previousCheckInTime?: string;
  previousAdminName?: string;
}

export interface VerificationResponse {
  result: ScanVerificationResult;
  message: string;
  registration?: Registration;
  participant?: Participant;
  event?: CollegeEvent;
  previousCheckInTime?: string;
  previousAdminName?: string;
}

export type CertificateTheme = 'gold_prestige' | 'emerald_classic' | 'sapphire_tech' | 'ruby_excellence';

export interface ParticipationCertificate {
  id: string;
  certificateNumber: string;
  registrationId: string;
  participantId: string;
  eventId: string;
  participantName: string;
  rollNumber: string;
  department: string;
  year?: string;
  email: string;
  eventTitle: string;
  eventCategory: EventCategory;
  eventDate: string;
  venue: string;
  checkInTime: string;
  issuedAt: string;
  issuedByAdminName: string;
  issuedByAdminRole: string;
  collegeName: string;
  certificateTitle: string;
  coSignatoryName?: string;
  coSignatoryTitle?: string;
  verificationToken: string;
  qrPayload: string;
  theme: CertificateTheme;
  status: 'issued' | 'revoked';
}

export interface CertificateConfig {
  collegeName: string;
  certificateTitle: string;
  signatoryName: string;
  signatoryRole: string;
  coSignatoryName: string;
  coSignatoryRole: string;
  issueDate: string;
  theme: CertificateTheme;
}

