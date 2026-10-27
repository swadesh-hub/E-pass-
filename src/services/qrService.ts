import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QRPayloadStructure {
  v: number; // version
  app: string; // "EVENTPASS_QR"
  token: string;
  eid: string; // event id
  roll: string; // roll number
  name: string;
  secHash: string; // cryptographic hash simulation
  issuedAt: string;
}

// Generate deterministic-looking security token
export function generateQRToken(eventPrefix: string, rollNumber: string): string {
  const cleanRoll = rollNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanPrefix = eventPrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `EPQR-${cleanPrefix}-${cleanRoll}-${randomSuffix}`;
}

// Simple checksum generator for QR payload
export function generateSecurityHash(token: string, eventId: string, roll: string): string {
  let hash = 0;
  const str = `${token}:${eventId}:${roll}:eventpass_secret_salt_2026`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

// Create encoded JSON string payload for the QR code
export function buildQRPayload(
  token: string,
  eventId: string,
  roll: string,
  name: string
): string {
  const payload: QRPayloadStructure = {
    v: 1,
    app: 'EVENTPASS_QR',
    token,
    eid: eventId,
    roll,
    name,
    secHash: generateSecurityHash(token, eventId, roll),
    issuedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload);
}

// Parse either structured JSON payload or raw token string
export function parseScannedQRData(raw: string): {
  token: string;
  eventId?: string;
  roll?: string;
  rawPayload: string;
} {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as QRPayloadStructure;
    if (parsed.app === 'EVENTPASS_QR' && parsed.token) {
      return {
        token: parsed.token,
        eventId: parsed.eid,
        roll: parsed.roll,
        rawPayload: trimmed,
      };
    }
  } catch {
    // If not JSON, it might be a direct token string e.g. "EPQR-HACK-CS23042-8F92A"
  }

  return {
    token: trimmed,
    rawPayload: trimmed,
  };
}

// Generate high-resolution QR image data URL
export async function generateQRCodeDataUrl(
  text: string,
  options?: { darkColor?: string; lightColor?: string; width?: number }
): Promise<string> {
  const width = options?.width || 320;
  const darkColor = options?.darkColor || '#090d16';
  const lightColor = options?.lightColor || '#ffffff';

  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'H',
  });
}

// Scan QR from an uploaded Image element or canvas
export function scanImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
  return code ? code.data : null;
}
