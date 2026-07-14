
const { sendMail, otpEmailTemplate } = require('./emailService');

// ── Generate ─────────────────────────────────────────────
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── Store (10 min expiry, reset attempts) ─────────────────
const storeOTP = async (userId, otp, pool) => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
        `UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0 WHERE id = $3`,
        [otp, expiresAt, userId]
    );
};

// ── Verify ────────────────────────────────────────────────
const verifyOTP = async (userId, submittedOTP, pool) => {
    const result = await pool.query(
        'SELECT otp_code, otp_expires_at, otp_attempts, otp_locked_until FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
    }

    const u = result.rows[0];

    if (u.otp_locked_until && new Date() < new Date(u.otp_locked_until)) {
        const minutesLeft = Math.ceil((new Date(u.otp_locked_until) - new Date()) / 60000);
        return { success: false, error: `Too many attempts. Try again in ${minutesLeft} minute(s).` };
    }

    if (!u.otp_code || new Date() > new Date(u.otp_expires_at)) {
        return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (u.otp_code !== submittedOTP) {
        const newAttempts = u.otp_attempts + 1;
        if (newAttempts >= 3) {
            const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            await pool.query(
                'UPDATE users SET otp_attempts = $1, otp_locked_until = $2 WHERE id = $3',
                [newAttempts, lockUntil, userId]
            );
            return { success: false, error: 'Too many wrong attempts. Locked for 15 minutes.' };
        }
        await pool.query(
            'UPDATE users SET otp_attempts = $1 WHERE id = $2',
            [newAttempts, userId]
        );
        return { success: false, error: `Incorrect OTP. ${3 - newAttempts} attempt(s) remaining.` };
    }

    // Success — clear all OTP fields
    await pool.query(
        `UPDATE users 
         SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, otp_locked_until = NULL 
         WHERE id = $1`,
        [userId]
    );
    return { success: true };
};

// ── Rate limit (50 OTPs per hour) ─────────────────────────
const checkOTPRateLimit = async (userId, pool) => {
    const result = await pool.query(
        'SELECT otp_requests_count, otp_requests_reset_at FROM users WHERE id = $1',
        [userId]
    );

    const u = result.rows[0];
    const now = new Date();
    const resetAt = u.otp_requests_reset_at ? new Date(u.otp_requests_reset_at) : null;

    // Reset window expired — start fresh
    if (!resetAt || now > resetAt) {
        await pool.query(
            `UPDATE users SET otp_requests_count = 1, otp_requests_reset_at = $1 WHERE id = $2`,
            [new Date(now.getTime() + 60 * 60 * 1000), userId]
        );
        return { allowed: true };
    }

    if (u.otp_requests_count >= 50) {
        const minutesLeft = Math.ceil((resetAt - now) / 60000);
        return { allowed: false, error: `Too many OTP requests. Try again in ${minutesLeft} minute(s).` };
    }

    await pool.query(
        'UPDATE users SET otp_requests_count = otp_requests_count + 1 WHERE id = $1',
        [userId]
    );
    return { allowed: true };
};

// ── Send OTP (combines all steps above + email) ───────────
// Used by authController, googleController, passwordController, otpController
const sendOtp = async (userId, name, email, purpose, pool) => {
    const rateCheck = await checkOTPRateLimit(userId, pool);
    if (!rateCheck.allowed) return rateCheck; // { allowed: false, error }

    const otp = generateOTP();
    await storeOTP(userId, otp, pool);

    if (process.env.DEV_MODE === 'true') {
        console.log(`[DEV MODE] OTP for ${email} | purpose: ${purpose} | OTP: ${otp}`);
        return { allowed: true, success: true };
    }

    await sendMail(email, 'Your G-PORTAL OTP', otpEmailTemplate(name, otp, purpose));
    return { allowed: true, success: true };
};

module.exports = { generateOTP, storeOTP, verifyOTP, checkOTPRateLimit, sendOtp };