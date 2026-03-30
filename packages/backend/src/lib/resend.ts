import { Resend } from 'resend';
import { env } from '@/config/env.js';

// Singleton Resend client — initialized once at module load
const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends a password reset email to the user.
 *
 * @param to - Recipient email address
 * @param token - Plain-text reset token (hashed version is stored in DB)
 * @param frontendUrl - Base URL of the frontend (e.g. https://app.gastar.com)
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
  frontendUrl: string,
): Promise<void> {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Restablecer contraseña — Gastar',
    html: `
      <h1>Restablecer tu contraseña</h1>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña. El enlace expira en 1 hora.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:6px;">
        Restablecer contraseña
      </a>
      <p>Si no solicitaste este correo, puedes ignorarlo.</p>
    `,
  });
}
