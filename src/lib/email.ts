import { Resend } from 'resend'

// Lazily construct the client so a missing key doesn't crash the build /
// page-data collection — it only errors if we actually try to send an email.
let _resend: Resend | null = null
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set — cannot send email')
  if (!_resend) _resend = new Resend(key)
  return _resend
}
const FROM = process.env.RESEND_FROM_EMAIL || 'Gold Heist Trading <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://community.ghttrading.co'

export async function sendVerificationEmail(email: string, code: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your Gold Heist Trading verification code: ${code}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">GHT <span style="color:#ad9045;">Community</span></h1>
        </td></tr>
        <tr><td style="padding:32px;text-align:center;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">Verify your email</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">Enter this code to finish creating your account:</p>
          <div style="display:inline-block;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:900;letter-spacing:8px;color:#ad9045;">${code}</div>
          <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">This code expires in <strong style="color:#9090a8;">15 minutes</strong>. If you didn't sign up, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
  })
}

export async function sendApprovalEmail(email: string, name?: string | null) {
  const loginUrl = `${APP_URL}/login`
  const greeting = name ? `Welcome, ${name}!` : 'Welcome!'

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Your Gold Heist Trading account has been approved 🎉',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
              GHT <span style="color:#ad9045;">Community</span>
            </h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9090a8;">Premium Trading Insights & Gold Signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">${greeting}</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
              Great news — your account has been <strong style="color:#ad9045;">approved</strong> by our team.
              You now have full access to the Gold Heist Trading community, live gold signals, and premium insights.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Log in to your account
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">
              If you were already signed in, just log out and back in to refresh your access.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Gold Heist Trading password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #2a2a3a;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
              GHT <span style="color:#ad9045;">Community</span>
            </h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9090a8;">Premium Trading Insights & Gold Signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f0f0f8;">Reset your password</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#9090a8;line-height:1.6;">
              We received a request to reset the password for your Gold Heist Trading account. Click the button below to choose a new password.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display:inline-block;background:#ad9045;color:#000000;font-weight:700;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#5a5a72;line-height:1.6;">
              This link expires in <strong style="color:#9090a8;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#3a3a4a;word-break:break-all;">
              Or copy this link: ${resetUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3a3a4a;">© 2026 Gold Heist Trading · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  })
}
