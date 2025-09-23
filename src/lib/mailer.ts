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

export type SendResult = { ok: true; provider: "resend" | "smtp" | "dev" } | { ok: false; error: string };

export async function sendOtpEmail({ to, code, purpose }: OtpPayload): Promise<SendResult> {
  const subject = `Your ${purpose === "login" ? "login" : "signup"} code`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
      <h2>Your verification code</h2>
      <p>Use the code below to complete ${purpose}:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</div>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;
  const text = `Your ${purpose} verification code is: ${code}\nThis code expires in 10 minutes.`;

  // Build a proper From header: "Name <address>"
  const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Wallet Subscribe";
  const from = /</.test(rawFrom) ? rawFrom : `${fromName} <${rawFrom}>`;

  // Prefer Resend on Vercel (no SMTP required)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const { error } = await resend.emails.send({ from, to, subject, html, text });
      if (error) {
        console.error("[email] Resend send error:", error);
        // fall through to SMTP if configured
      } else {
        return { ok: true, provider: "resend" };
      }
    } catch (err) {
      console.error("[email] Resend threw:", err);
      // fall through to SMTP if configured
    }
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
    await transporter.sendMail({ from, to, subject, html, text });
    return { ok: true, provider: "smtp" };
  }

  // Dev fallback
  console.log(`[DEV] OTP for ${to} (${purpose}): ${code}`);
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, provider: "dev" };
  }
  return { ok: false, error: "No email provider available" };
}
