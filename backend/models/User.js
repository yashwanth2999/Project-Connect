const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // OTP password-reset fields
    resetOtp:        { type: String,   default: null },
    resetOtpExpiry:  { type: Date,     default: null },
    resetOtpVerified:{ type: Boolean,  default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
