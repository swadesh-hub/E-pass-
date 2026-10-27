import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import nodemailer from 'nodemailer';

let cachedTestAccount: any = null;

function emailApiPlugin() {
  return {
    name: 'email-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // GET /api/smtp-info - Check SMTP status
        if (req.url === '/api/smtp-info' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
              defaultProvider: process.env.SMTP_USER ? 'Custom / Env SMTP' : 'Ethereal Free Test SMTP',
              supportedFreeProviders: ['Ethereal (Instant Zero-Config)', 'Brevo (300 free/day)', 'Gmail SMTP', 'Resend', 'Mailtrap'],
            })
          );
          return;
        }

        // POST /api/send-email
        if (req.url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { to, subject, text, html, smtpConfig } = JSON.parse(body || '{}');
              if (!to) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Recipient "to" email is required.' }));
                return;
              }

              let transporter: any;
              let isTestAccount = false;
              let providerName = 'Ethereal Free Test SMTP';

              // Priority 1: User-supplied free SMTP config in request
              const user = smtpConfig?.user || process.env.SMTP_USER;
              const pass = smtpConfig?.pass || process.env.SMTP_PASS;
              const host = smtpConfig?.host || process.env.SMTP_HOST;
              const port = Number(smtpConfig?.port || process.env.SMTP_PORT) || 587;
              const secure = (smtpConfig?.secure ?? (process.env.SMTP_SECURE === 'true')) || port === 465;

              if (user && pass) {
                providerName = smtpConfig?.provider || (host?.includes('brevo') ? 'Brevo Free SMTP' : host?.includes('gmail') ? 'Gmail SMTP' : host?.includes('resend') ? 'Resend Free SMTP' : 'Custom SMTP');
                transporter = nodemailer.createTransport({
                  host: host || 'smtp.gmail.com',
                  port,
                  secure,
                  auth: { user, pass },
                });
              } else {
                // Priority 2: Built-in Free Ethereal SMTP with zero setup needed
                isTestAccount = true;
                if (!cachedTestAccount) {
                  try {
                    cachedTestAccount = await nodemailer.createTestAccount();
                  } catch (e) {
                    console.warn('Could not generate ethereal test account, using simulated relay:', e);
                  }
                }

                if (cachedTestAccount) {
                  transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                      user: cachedTestAccount.user,
                      pass: cachedTestAccount.pass,
                    },
                  });
                } else {
                  // Fallback virtual mock transporter if offline
                  transporter = {
                    sendMail: async () => ({
                      messageId: `sim-${Date.now()}@college.edu`,
                    }),
                  };
                }
              }

              const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_FROM || '"e-Pass Campus Gate" <events@college.edu>';

              const info = await transporter.sendMail({
                from: fromEmail,
                to,
                subject,
                text,
                html: html || `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap;padding:20px;background:#f8fafc;border-radius:12px;color:#0f172a;">${text}</div>`,
              });

              const previewUrl = typeof nodemailer.getTestMessageUrl === 'function' ? nodemailer.getTestMessageUrl(info) : undefined;

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  messageId: info.messageId,
                  previewUrl: previewUrl || undefined,
                  isTestAccount,
                  provider: providerName,
                  message: `Pass email dispatched via ${providerName} to ${to}`,
                })
              );
            } catch (err: any) {
              console.error('Email API Error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emailApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
