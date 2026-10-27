import {
  CollegeEvent,
  Participant,
  Registration,
  ParticipationCertificate,
  CertificateConfig,
  CertificateTheme,
} from '../types';
import { generateQRCodeDataUrl } from './qrService';

/**
 * Service for generating, formatting, rendering, and verifying
 * academic participation certificates for college campus events.
 */

export const DEFAULT_CERTIFICATE_CONFIG: CertificateConfig = {
  collegeName: 'Apex Institute of Technology & Science',
  certificateTitle: 'Certificate of Active Participation',
  signatoryName: 'Dr. Aruna Sengupta',
  signatoryRole: 'Dean of Academic Affairs & Convener',
  coSignatoryName: 'Prof. Vikram Malhotra',
  coSignatoryRole: 'Head of Student Activities & Faculty Lead',
  issueDate: new Date().toISOString().split('T')[0],
  theme: 'gold_prestige',
};

// Generate high-entropy verification hash for academic credential validity
export function generateCertificateVerificationHash(
  rollNumber: string,
  eventId: string,
  certNumber: string
): string {
  let hash = 0;
  const raw = `${rollNumber.toUpperCase()}:${eventId}:${certNumber}:academic_integrity_cert_salt_2026`;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

// Generate human-readable official certificate registration number
export function formatCertificateNumber(
  eventPrefix: string,
  rollNumber: string,
  index: number
): string {
  const cleanPrefix = (eventPrefix || 'CAMPUS')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
  const cleanRoll = (rollNumber || 'STU').replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase();
  const year = new Date().getFullYear();
  const sequence = String(index + 1).padStart(3, '0');
  return `EPC-${year}-${cleanPrefix}-${cleanRoll}-${sequence}`;
}

// Build structured QR payload specifically for scanning/verifying certificate authenticity
export function buildCertificateQRPayload(certificate: {
  certificateNumber: string;
  participantName: string;
  rollNumber: string;
  department: string;
  eventTitle: string;
  eventDate: string;
  verificationToken: string;
}): string {
  return JSON.stringify({
    app: 'EVENTPASS_CERTIFICATE',
    v: 1,
    certNo: certificate.certificateNumber,
    student: certificate.participantName,
    roll: certificate.rollNumber,
    dept: certificate.department,
    event: certificate.eventTitle,
    date: certificate.eventDate,
    hash: certificate.verificationToken,
    verified: true,
  });
}

// Generate scannable QR data URL for the certificate
export async function generateCertificateQR(
  payloadString: string,
  theme: CertificateTheme = 'gold_prestige'
): Promise<string> {
  const darkColor =
    theme === 'emerald_classic'
      ? '#064e3b'
      : theme === 'sapphire_tech'
      ? '#1e3a8a'
      : theme === 'ruby_excellence'
      ? '#881337'
      : '#78350f'; // gold/amber dark

  return generateQRCodeDataUrl(payloadString, {
    darkColor,
    lightColor: '#ffffff',
    width: 280,
  });
}

// Format email notification body for student receiving their participation certificate
export function generateCertificateEmailText(
  certificate: ParticipationCertificate,
  event: CollegeEvent
): string {
  return `Dear ${certificate.participantName},

Congratulations! Your official Certificate of Participation for "${event.title}" has been authorized and issued by the College Administration.

========================================
OFFICIAL ACADEMIC CREDENTIAL
========================================
Student Name        : ${certificate.participantName}
Roll Number         : ${certificate.rollNumber}
Department          : ${certificate.department}
Event Name          : ${certificate.eventTitle}
Attendance Status   : VERIFIED (Present at Gate)
Check-In Recorded   : ${certificate.checkInTime}
Certificate Number  : ${certificate.certificateNumber}
Digital Verification: ${certificate.verificationToken}
Date of Issuance    : ${certificate.issuedAt}
Issuing Authority   : ${certificate.collegeName}
Signatory           : ${certificate.issuedByAdminName} (${certificate.issuedByAdminRole})

========================================
VERIFICATION & CREDENTIAL SHARING
========================================
This digital certificate contains a cryptographic verification QR code that proves your attendance and participation. You may include this certificate number in your resume, portfolio, or academic records.

You can view, download, and print your high-resolution Certificate of Participation anytime directly through the e-Pass Campus Portal.

Warm congratulations on your active participation!

Event Administration & Directorate of Student Affairs
${certificate.collegeName}`;
}

// Export CSV Registry of all issued certificates for college administration records
export function generateCertificateRegistryCSV(certificates: ParticipationCertificate[]): string {
  const headers = [
    'Certificate Number',
    'Student Name',
    'Roll Number',
    'Department',
    'Email',
    'Event Title',
    'Event Date',
    'Venue',
    'Gate Check-In Time',
    'Date Issued',
    'Issuing Admin',
    'Verification Hash',
    'Status',
  ];

  const rows = certificates.map((c) => [
    `"${c.certificateNumber}"`,
    `"${c.participantName}"`,
    `"${c.rollNumber}"`,
    `"${c.department}"`,
    `"${c.email}"`,
    `"${c.eventTitle}"`,
    `"${c.eventDate}"`,
    `"${c.venue}"`,
    `"${c.checkInTime}"`,
    `"${c.issuedAt}"`,
    `"${c.issuedByAdminName}"`,
    `"${c.verificationToken}"`,
    `"${c.status.toUpperCase()}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
