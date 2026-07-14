const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const sendMail = async (to, subject, html) => {
    await transporter.sendMail({
        from: `"G-PORTAL" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html
    });
};

// ── Base wrapper ──────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#006B64,#005A54);padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">G-PORTAL</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px">GITAM University</p>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="background:#f8fffe;border-top:1px solid #e6f7f5;padding:16px;text-align:center">
      <p style="margin:0;font-size:12px;color:#666">Need help? Contact IT Support at support@gitam.edu</p>
      <p style="margin:4px 0 0;font-size:11px;color:#999">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

// ── Template 1: OTP ───────────────────────────────────────
const purposeLabels = {
    first_login:   'verify your identity for first-time setup',
    login:         'complete your login',
    admin_login:   'complete your admin login',
    google_login:  'complete your Google login',
    student_login: 'complete your Google login',
    reset:         'reset your password'
};

const otpEmailTemplate = (name, otp, purpose) => baseTemplate(`
  <p style="color:#333;margin:0 0 8px">Hello <strong>${name}</strong>,</p>
  <p style="color:#666;margin:0 0 24px">Use the OTP below to ${purposeLabels[purpose] || 'verify your identity'}:</p>
  <div style="background:#e6f7f5;border:2px solid #006B64;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
    <p style="margin:0 0 4px;font-size:12px;color:#006B64;font-weight:600;letter-spacing:1px">YOUR ONE-TIME PASSWORD</p>
    <p style="margin:0;font-size:40px;font-weight:700;color:#006B64;letter-spacing:8px">${otp}</p>
  </div>
  <p style="color:#999;font-size:13px;margin:0">⏱ Valid for <strong>10 minutes</strong> only.</p>
  <p style="color:#999;font-size:13px;margin:4px 0 0">🔒 Do not share this OTP with anyone.</p>
  <p style="color:#999;font-size:13px;margin:4px 0 0">❌ If you did not request this, please ignore this email.</p>
`);

// ── Template 2: Welcome (after first login setup) ─────────
const welcomeEmailTemplate = (name, facultyId) => baseTemplate(`
  <p style="color:#333;margin:0 0 8px">Welcome, <strong>${name}</strong>!</p>
  <p style="color:#666;margin:0 0 24px">Your G-PORTAL account has been set up successfully.</p>
  <div style="background:#e6f7f5;border-radius:8px;padding:16px;margin:0 0 24px">
    <p style="margin:0;font-size:13px;color:#666">Your Faculty ID: <strong style="color:#006B64">${facultyId}</strong></p>
  </div>
  <p style="color:#666;margin:0 0 16px">Next step: Complete your profile to unlock all modules.</p>
  <a href="http://localhost:5173/onboarding" style="display:inline-block;background:#006B64;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Complete Profile →</a>
`);

// ── Template 3: Password reset confirmation ───────────────
const passwordResetConfirmTemplate = (name) => baseTemplate(`
  <p style="color:#333;margin:0 0 8px">Hello <strong>${name}</strong>,</p>
  <p style="color:#666;margin:0 0 16px">Your G-PORTAL password has been successfully changed.</p>
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="margin:0;font-size:13px;color:#92400e">
      ⚠️ If you did not make this change, contact IT Support immediately at support@gitam.edu.
    </p>
  </div>
  <p style="color:#999;font-size:12px;margin:0">Changed at: ${new Date().toLocaleString('en-IN')}</p>
`);

// ── Template 4: Account Created by Admin ──────────────────
const accountCreatedTemplate = (name, facultyId, role) => baseTemplate(`
  <p style="color:#333;margin:0 0 8px">Hello <strong>${name}</strong>,</p>
  <p style="color:#666;margin:0 0 16px">
    Your G-PORTAL ${role === 'student' ? 'student' : 'faculty'} account has been created by the administrator.
  </p>
  <div style="background:#e6f7f5;border-radius:8px;padding:16px;margin:0 0 20px">
    <p style="margin:0 0 6px;font-size:13px;color:#666">
      Your ${role === 'student' ? 'Registration Number' : 'Faculty ID'}:
      <strong style="color:#006B64">${facultyId}</strong>
    </p>
    <p style="margin:0;font-size:13px;color:#666">
      Temporary password: <strong style="color:#006B64">${facultyId}</strong>
    </p>
  </div>
  <p style="color:#666;margin:0 0 16px">
    To activate your account, go to the portal and click "First time? Set up your account".
    You will be asked to verify your email and set a new password.
  </p>
  <a href="http://localhost:5173/first-login"
     style="display:inline-block;background:#006B64;color:white;text-decoration:none;
            padding:12px 28px;border-radius:8px;font-weight:600">
    Activate My Account →
  </a>
  <p style="color:#999;font-size:12px;margin:20px 0 0">
    If you did not expect this email, please contact IT Support at support@gitam.edu
  </p>
`);

module.exports = {
    sendMail,
    otpEmailTemplate,
    welcomeEmailTemplate,
    passwordResetConfirmTemplate,
    accountCreatedTemplate
};