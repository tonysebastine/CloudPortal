import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'notifications@example.com',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (!process.env.SMTP_HOST) {
      console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
      return;
    }

    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || '"CloudPortal Support" <notifications@example.com>',
      to,
      subject,
      html,
    });
    console.log(`✉️ Email sent to ${to} (${subject})`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

