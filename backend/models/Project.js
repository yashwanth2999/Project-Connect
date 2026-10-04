const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String },
    role: { type: String, default: '🚀 Teammate' },
    github: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    domain: { type: String, required: true },
    skills: { type: [String], default: [] },
    teamSize: { type: Number, required: true, min: 1, max: 6 },
    acceptedMembers: { type: Number, default: 0 },
    members: { type: [MemberSchema], default: [] },
    description: { type: String, required: true },
    collegeOnly: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
