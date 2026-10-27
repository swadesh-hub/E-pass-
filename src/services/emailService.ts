import { CollegeEvent, Participant, Registration, AdminUser } from '../types';
import { markRegistrationEmailSent } from './storage';

/**
 * Service to handle sending, formatting, and sharing campus event passes to participants via Email.
 * Supports:
 * 1. Automatic background delivery via /api/send-email (Nodemailer SMTP / Relay)
 * 2. 1-Click direct Gmail Web compose window
 * 3. 1-Click direct Outlook Web compose window
 * 4. Default OS Mail app (mailto:)
 * 5. Native Web Share API for Mobile devices
 * 6. Student Scanner authorization invitation emails
 */

export function generatePassEmailSubject(event: CollegeEvent, participant: Participant): string {
  return `[Official Entry Pass] ${event.title} - ${participant.name}`;
}

export function generatePassEmailText(
  event: CollegeEvent,
  participant: Participant,
  registration: Registration
): string {
  const gateInfo = event.entryGate ? `Gate: ${event.entryGate}` : 'Designated Gate';
  const venueInfo = event.venue || 'College Campus';
  const timeInfo = event.time || 'Check schedule';
  const dateInfo = event.date || 'Event Day';

  return `Dear ${participant.name},

Your official entry pass for "${event.title}" has been successfully generated and confirmed!

========================================
CAMPUS PASS CREDENTIALS
========================================
Attendee Name: ${participant.name}
Roll Number  : ${participant.rollNumber}
Department   : ${participant.department}
College Email: ${participant.email}
Pass Token   : ${registration.qrToken}

========================================
EVENT DETAILS & ENTRANCE LOGISTICS
========================================
Event Name   : ${event.title}
Date         : ${dateInfo}
Time         : ${timeInfo}
Venue        : ${venueInfo}
Assigned Gate: ${gateInfo}

========================================
SECURITY & ADMISSION GUIDELINES
========================================
1. Keep this email and your Unique QR Pass ready on your smartphone when arriving at ${gateInfo}.
2. Each pass is digitally tokenized and strictly valid for single admission. Duplicate scans will trigger security alerts and will be automatically rejected.
3. If you have any questions or require special accommodation, please contact the Event Organizing Desk.

We look forward to seeing you at ${event.title}!

Warm regards,
Event Organizing Committee & Gate Verification Desk
${venueInfo}`;
}

export function generateScannerAccessEmailText(
  scannerAdmin: AdminUser,
  event?: CollegeEvent | null
): string {
  const gateInfo = scannerAdmin.gateAssigned || 'Gate 1';
  const eventTitle = event ? event.title : 'College Campus Events';
  const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return `Dear ${scannerAdmin.name},

You have been officially granted SCANNER & GATE VERIFICATION ACCESS for:
"${eventTitle}"

========================================
AUTHORIZED SCANNER CREDENTIALS
========================================
Staff / Volunteer Name : ${scannerAdmin.name}
Student Email         : ${scannerAdmin.email}
Student Roll Number   : ${scannerAdmin.studentRollNumber || 'N/A'}
Designated Gate Station: ${gateInfo}
Staff ID Token        : ${scannerAdmin.id}
Role Title            : ${scannerAdmin.roleTitle}

========================================
HOW TO USE THE SCANNER
========================================
1. Open the EventPass portal on your mobile phone or laptop:
   ${portalUrl}
2. Tap the "Scanner" tab at the top.
3. Tap "Admin Profile" or login with your student email: ${scannerAdmin.email}
4. Point your camera at attendee QR passes or paste their pass tokens.
5. The system will automatically verify single-entry, prevent duplicate scans, and stamp attendance with your Admin ID and Gate (${gateInfo}).

Authorized by Campus Security & Event Administration`;
}

/**
 * 1-Click Launch Gmail Web compose in a new tab pre-filled with recipient, subject & body.
 */
export function openGmailWeb(to: string, subject: string, body: string): boolean {
  try {
    const encodedTo = encodeURIComponent(to);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch (err) {
    console.error('Failed to open Gmail Web:', err);
    return false;
  }
}

/**
 * 1-Click Launch Outlook / Office 365 Web compose in a new tab.
 */
export function openOutlookWeb(to: string, subject: string, body: string): boolean {
  try {
    const encodedTo = encodeURIComponent(to);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch (err) {
    console.error('Failed to open Outlook Web:', err);
    return false;
  }
}

/**
 * Open default OS mail client (mailto:).
 */
export function openMailClient(to: string, subject: string, body: string): boolean {
  try {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to trigger mail client:', err);
    return false;
  }
}

export interface FreeSmtpConfig {
  provider: 'ethereal' | 'brevo' | 'gmail' | 'resend' | 'mailtrap' | 'custom';
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromEmail: string;
}

const SMTP_STORAGE_KEY = 'epass_user_smtp_config_v1';

export function getSavedSmtpConfig(): FreeSmtpConfig | null {
  try {
    const raw = localStorage.getItem(SMTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSmtpConfig(config: FreeSmtpConfig | null): void {
  if (!config) {
    localStorage.removeItem(SMTP_STORAGE_KEY);
  } else {
    localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(config));
  }
}

/**
 * Send email automatically via backend Nodemailer endpoint
 * Uses Free Ethereal SMTP by default, or configured Brevo/Gmail/Resend/Mailtrap
 */
export async function sendEmailViaBackend(
  to: string,
  subject: string,
  text: string,
  html?: string,
  customConfig?: FreeSmtpConfig
): Promise<{ success: boolean; message: string; previewUrl?: string; provider?: string }> {
  try {
    const smtpConfig = customConfig || getSavedSmtpConfig();
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html, smtpConfig }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message,
        previewUrl: data.previewUrl,
        provider: data.provider,
      };
    }
    return { success: false, message: data.error || 'Server dispatch failed' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

export type EmailDeliveryMethod = 'backend' | 'gmail' | 'outlook' | 'client' | 'share' | 'auto';

/**
 * Send participant pass via selected or best available method.
 */
export async function sendParticipantPassEmail(
  event: CollegeEvent,
  participant: Participant,
  registration: Registration,
  method: EmailDeliveryMethod = 'auto' as any
): Promise<{ success: boolean; method: string; message: string; previewUrl?: string }> {
  const subject = generatePassEmailSubject(event, participant);
  const text = generatePassEmailText(event, participant, registration);

  // Try automated backend dispatch first if requested or auto
  if (method === 'backend' || (method as string) === 'auto') {
    const backendRes = await sendEmailViaBackend(participant.email, subject, text);
    if (backendRes.success) {
      markRegistrationEmailSent(registration.id);
      return {
        success: true,
        method: 'backend',
        message: backendRes.message,
        previewUrl: backendRes.previewUrl,
      };
    }
    // If backend returned error, fallback to Gmail Web or client
    if (method === 'backend') {
      // User explicitly wanted backend, return result
      return { success: false, method: 'backend', message: backendRes.message };
    }
  }

  if (method === 'gmail' || (method as string) === 'auto') {
    const opened = openGmailWeb(participant.email, subject, text);
    if (opened) {
      markRegistrationEmailSent(registration.id);
      return {
        success: true,
        method: 'gmail',
        message: `Gmail compose opened for ${participant.email}`,
      };
    }
  }

  if (method === 'outlook') {
    const opened = openOutlookWeb(participant.email, subject, text);
    if (opened) {
      markRegistrationEmailSent(registration.id);
      return {
        success: true,
        method: 'outlook',
        message: `Outlook compose opened for ${participant.email}`,
      };
    }
  }

  // Fallback to mailto
  const clientOk = openMailClient(participant.email, subject, text);
  if (clientOk) {
    markRegistrationEmailSent(registration.id);
    return {
      success: true,
      method: 'client',
      message: `Mail client triggered for ${participant.email}`,
    };
  }

  return { success: false, method: 'none', message: 'Could not open any mail service.' };
}

/**
 * Send scanner access invitation to student volunteer
 */
export async function sendScannerAccessEmail(
  scannerAdmin: AdminUser,
  event?: CollegeEvent | null,
  method: EmailDeliveryMethod = 'gmail'
): Promise<{ success: boolean; method: string; message: string; previewUrl?: string }> {
  const subject = `[Authorized Staff Access] Scanner Privileges - ${scannerAdmin.name}`;
  const text = generateScannerAccessEmailText(scannerAdmin, event);

  if (method === 'backend') {
    const backendRes = await sendEmailViaBackend(scannerAdmin.email, subject, text);
    if (backendRes.success) {
      return {
        success: true,
        method: 'backend',
        message: backendRes.message,
        previewUrl: backendRes.previewUrl,
      };
    }
  }

  if (method === 'gmail' || method === 'backend') {
    const ok = openGmailWeb(scannerAdmin.email, subject, text);
    if (ok) {
      return {
        success: true,
        method: 'gmail',
        message: `Gmail opened with scanner credentials for ${scannerAdmin.email}`,
      };
    }
  }

  if (method === 'outlook') {
    const ok = openOutlookWeb(scannerAdmin.email, subject, text);
    if (ok) {
      return {
        success: true,
        method: 'outlook',
        message: `Outlook opened with scanner credentials for ${scannerAdmin.email}`,
      };
    }
  }

  openMailClient(scannerAdmin.email, subject, text);
  return {
    success: true,
    method: 'client',
    message: `Mail client triggered for ${scannerAdmin.email}`,
  };
}

/**
 * Share pass using native Web Share API
 */
export async function sharePassDirect(
  event: CollegeEvent,
  participant: Participant,
  registration: Registration
): Promise<{ success: boolean; method: 'web_share' | 'gmail' | 'mailto' | 'failed' }> {
  const subject = generatePassEmailSubject(event, participant);
  const text = generatePassEmailText(event, participant, registration);

  if (navigator.share) {
    try {
      await navigator.share({
        title: subject,
        text: text,
      });
      markRegistrationEmailSent(registration.id);
      return { success: true, method: 'web_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'web_share' };
      }
    }
  }

  const ok = openGmailWeb(participant.email, subject, text);
  if (ok) {
    markRegistrationEmailSent(registration.id);
    return { success: true, method: 'gmail' };
  }

  const mailSuccess = openMailClient(participant.email, subject, text);
  if (mailSuccess) {
    markRegistrationEmailSent(registration.id);
    return { success: true, method: 'mailto' };
  }

  return { success: false, method: 'failed' };
}

/**
 * Copy email pass content directly to clipboard.
 */
export async function copyPassEmailToClipboard(
  event: CollegeEvent,
  participant: Participant,
  registration: Registration
): Promise<boolean> {
  try {
    const text = generatePassEmailText(event, participant, registration);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Open mail composer with multiple attendees in BCC
 */
export function openBulkEmailComposer(
  event: CollegeEvent,
  recipients: string[],
  summaryText?: string
): boolean {
  try {
    const to = '';
    const bcc = recipients.join(',');
    const subject = encodeURIComponent(`[Event Admission Notice] ${event.title} - Entry Passes Issued`);
    const defaultBody = `Dear Attendees,

Your official entry passes for "${event.title}" have been generated and configured at ${event.entryGate || 'Gate 1'}.

Event Date: ${event.date || 'Scheduled'}
Venue: ${event.venue || 'College Campus'}
Entry Gate: ${event.entryGate || 'Main Gate'}

Please present your individual QR pass token at the entrance verification desk.

Event Organizing Committee`;

    const body = encodeURIComponent(summaryText || defaultBody);
    const mailtoUrl = `mailto:${to}?bcc=${bcc}&subject=${subject}&body=${body}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to open bulk email client:', err);
    return false;
  }
}
