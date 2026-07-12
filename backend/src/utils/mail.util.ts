import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "../configs/constant";

const transporter = SMTP_HOST
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;

/**
 * Sends an email if SMTP is configured, otherwise logs it to the console.
 * Never throws — a mail failure must not fail the mutation that triggered
 * it (e.g. approving a case request still succeeds even if the email
 * bounces). This also means local dev/grading works with zero SMTP setup.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!transporter) {
        console.log(`[mail:console] to=${to} subject="${subject}"\n${text}`);
        return;
    }
    try {
        await transporter.sendMail({ from: SMTP_FROM, to, subject, text });
    } catch (error) {
        console.error(`[mail:error] failed to send to ${to}:`, error);
    }
}
