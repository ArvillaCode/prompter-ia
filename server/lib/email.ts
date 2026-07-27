import { randomBytes, createHash } from 'node:crypto';

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESET_TOKEN_TTL_MS = 3_600_000; // 1 hora

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resetTokenExpiresAt(): number {
  return Date.now() + RESET_TOKEN_TTL_MS;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  displayName: string | null,
  resetUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY no está configurada.');

  const from = process.env.EMAIL_FROM || 'ProPrompter AI <onboarding@resend.dev>';
  const greeting = displayName ? `Hola, ${displayName}` : 'Hola';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#080C14;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080C14;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#0F172A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <h1 style="margin:0 0 8px;color:#FFFFFF;font-size:22px;font-weight:700;">Restablece tu contraseña</h1>
          <p style="margin:0;color:#94A3B8;font-size:15px;line-height:1.6;">
            ${greeting}. Recibimos una solicitud para restablecer la contraseña de tu cuenta de ProPrompter AI.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <a href="${resetUrl}" style="display:inline-block;width:100%;max-width:280px;margin:0 auto;background-color:#00E5FF;color:#080C14;font-weight:600;font-size:15px;text-align:center;text-decoration:none;padding:14px 24px;border-radius:10px;box-sizing:border-box;">
            Restablecer contraseña
          </a>
        </td></tr>
        <tr><td style="padding:0 32px 8px;">
          <p style="margin:0;color:#64748B;font-size:13px;line-height:1.6;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:8px 0 0;color:#00E5FF;font-size:12px;word-break:break-all;">
            ${resetUrl}
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 32px;">
          <p style="margin:0;color:#64748B;font-size:13px;line-height:1.6;">
            Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo; tu contraseña seguirá siendo la misma.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#475569;font-size:12px;text-align:center;">
        ProPrompter AI · Upfunnel
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: 'Restablece tu contraseña · ProPrompter AI',
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
}
