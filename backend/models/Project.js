const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    domain: { type: String, required: true },
    skills: { type: [String], default: [] },
    teamSize: { type: Number, required: true, min: 1, max: 6 },
    acceptedMembers: { type: Number, default: 0 },
    description: { type: String, required: true },
    collegeOnly: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
