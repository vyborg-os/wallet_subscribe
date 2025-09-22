/* eslint-disable @typescript-eslint/no-var-requires */
import { Resend } from "resend";

export type OtpPayload = {
  to: string;
  code: string;
  purpose: "login" | "signup";
};

function haveSmtp() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

export async function sendOtpEmail({ to, code, purpose }: OtpPayload) {
  const subject = `Your ${purpose === "login" ? "login" : "signup"} code`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
      <h2>Your verification code</h2>
      <p>Use the code below to complete ${purpose}:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</div>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || "Acme <onboarding@resend.dev>";

  // Prefer Resend on Vercel (no SMTP required)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from, to, subject, html });
    return;
  }

  // Fallback to SMTP if configured
  if (haveSmtp()) {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from, to, subject, html });
    return;
  }

  // Dev fallback
  console.log(`[DEV] OTP for ${to} (${purpose}): ${code}`);
}
