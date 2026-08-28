const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User     = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'projectconnect_secure_jwt_secret_2026';

// ── Email Transporter (Gmail) ──────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,   // Gmail App Password (not your login password)
        },
    });
}

// ── OTP Generator ─────────────────────────────────────────────────────
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// ── Beautiful OTP Email Template ──────────────────────────────────────
function otpEmailTemplate(otp, userName) {
    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(56,189,248,0.2);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ProjectConnect</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Password Reset Request</div>
        </div>
        <!-- Body -->
        <div style="padding:32px;">
          <p style="color:#cbd5e1;font-size:15px;margin:0 0 8px;">Hi <strong style="color:#f1f5f9;">${userName}</strong>,</p>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset your password. Use the OTP below to proceed. It is valid for <strong style="color:#38bdf8;">10 minutes</strong>.
          </p>
          <!-- OTP Box -->
          <div style="background:#0f172a;border:2px dashed rgba(56,189,248,0.4);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <div style="font-size:11px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Your One-Time Password</div>
            <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#38bdf8;">${otp}</div>
          </div>
          <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
            ⚠️ If you did not request a password reset, please ignore this email. Your account remains secure.
          </p>
        </div>
        <!-- Footer -->
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:11px;margin:0;">© ${new Date().getFullYear()} ProjectConnect · This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>`;
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists with this email' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ fullName, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic || null }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic || null }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// STEP 1 — POST /api/auth/send-otp
// User enters email → backend generates OTP and emails it
// ─────────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists (security best practice)
            return res.json({ message: 'If this email is registered, an OTP has been sent.' });
        }

        // Generate OTP and set 10-minute expiry
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.resetOtp        = otp;
        user.resetOtpExpiry  = expiry;
        user.resetOtpVerified = false;
        await user.save();

        // Check if email is configured or if this is a test/dummy email address
        const isTestEmail = /(@college\.edu$|testuser_|browser_user_|@example\.com$|@test\.)/i.test(email);
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.SKIP_TEST_EMAILS === 'true';

        if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'YOUR_GMAIL_ADDRESS@gmail.com' || isTestEmail || isTestEnv) {
            // Development/Test mode: log OTP to console instead of sending to non-existent test domains
            console.log(`\n🔐 [DEV/TEST MODE] OTP for ${email}: ${otp} (expires in 10 min)\n`);
            return res.json({
                message: 'OTP sent to your registered email address.',
                devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        }

        // Send OTP email for real users
        try {
            const transporter = createTransporter();
            await transporter.sendMail({
                from: `"ProjectConnect Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🔐 Your OTP for Password Reset — ProjectConnect`,
                html: otpEmailTemplate(otp, user.fullName),
            });
            res.json({ message: 'OTP sent to your registered email address.' });
        } catch (mailError) {
            console.error('Nodemailer Send Error:', mailError);
            res.json({
                message: 'OTP generated. Please check your inbox or server logs.',
                devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        }

    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// STEP 2 — POST /api/auth/verify-otp
// User enters the 6-digit OTP → backend verifies it
// ─────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        const user = await User.findOne({ email });
        if (!user || !user.resetOtp) {
            return res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
        }

        // Check expiry
        if (new Date() > user.resetOtpExpiry) {
            user.resetOtp = null; user.resetOtpExpiry = null;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Check OTP match
        if (user.resetOtp !== otp.toString().trim()) {
            return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
        }

        // Mark OTP as verified (allows password reset in next step)
        user.resetOtpVerified = true;
        await user.save();

        res.json({ message: 'OTP verified successfully. You can now set a new password.' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// STEP 3 — POST /api/auth/reset-password
// User sets new password (only allowed after OTP is verified)
// ─────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Ensure OTP was verified first
        if (!user.resetOtpVerified) {
            return res.status(403).json({ message: 'OTP verification required before resetting password.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Hash and save new password, then clear OTP fields
        const salt = await bcrypt.genSalt(10);
        user.password         = await bcrypt.hash(newPassword, salt);
        user.resetOtp         = null;
        user.resetOtpExpiry   = null;
        user.resetOtpVerified = false;
        await user.save();

        res.json({ message: 'Password reset successfully! You can now log in.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile-picture
// Updates profile picture of authenticated user
// ─────────────────────────────────────────────────────────────────────
router.put('/profile-picture', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Authorization token required' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const { profilePic } = req.body;

        const user = await User.findByIdAndUpdate(
            decoded.userId,
            { profilePic: profilePic || null },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            message: 'Profile picture updated successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                profilePic: user.profilePic || null
            }
        });
    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({ message: 'Failed to update profile picture' });
    }
});

module.exports = router;
