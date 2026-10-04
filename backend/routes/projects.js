const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'projectconnect_secure_jwt_secret_2026';

// Middleware to verify JWT
const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        // Assuming token format "Bearer <token>"
        const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        req.user = decoded; // Contains { userId: ... }
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// GET /api/projects?domain=...
router.get('/', async (req, res) => {
    try {
        const { domain } = req.query;
        let query = {};
        if (domain && domain !== 'all') {
            query.domain = domain;
        }
        const projects = await Project.find(query).populate('author', 'fullName email').sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Fetch Projects Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/projects/my-teams
// Fetch all real-time projects the authenticated user owns or is a member of
router.get('/my-teams', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const projects = await Project.find({
            $or: [
                { author: userId },
                { 'members.user': userId }
            ]
        }).populate('author', 'fullName email').sort({ updatedAt: -1 });

        res.json(projects);
    } catch (error) {
        console.error('Fetch My Teams Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/projects
router.post('/', auth, async (req, res) => {
    try {
        const { title, domain, skills, teamSize, description, collegeOnly } = req.body;

        // Skills might come as a comma-separated string if sent from simple form
        let skillsArray = skills;
        if (typeof skills === 'string') {
            skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '');
        }

        const newProject = new Project({
            title,
            domain,
            skills: skillsArray,
            teamSize,
            description,
            collegeOnly,
            members: [],
            author: req.user.userId
        });

        const savedProject = await newProject.save();
        // Populate author before returning to immediately show it correctly on frontend
        await savedProject.populate('author', 'fullName email');

        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/projects/:id/accept
// Accept join request from an applicant, add them to team members, and decrement vacancies
router.post('/:id/accept', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const currentAccepted = project.acceptedMembers || 0;
        if (currentAccepted >= project.teamSize) {
            return res.status(400).json({
                message: 'Team is already full! No remaining vacancies.',
                project,
                remainingVacancies: 0
            });
        }

        const { applicantName, applicantEmail, applicantGithub, applicantId } = req.body;

        project.acceptedMembers = currentAccepted + 1;
        if (applicantName) {
            const alreadyMember = (project.members || []).some(m => m.name && m.name.toLowerCase() === applicantName.toLowerCase());
            if (!alreadyMember) {
                project.members.push({
                    user: applicantId || null,
                    name: applicantName,
                    email: applicantEmail || '',
                    github: applicantGithub || '',
                    role: '🚀 Teammate'
                });
            }
        }

        await project.save();
        await project.populate('author', 'fullName email');

        const remainingVacancies = Math.max(0, project.teamSize - project.acceptedMembers);

        res.json({
            message: 'Teammate request accepted successfully!',
            project,
            remainingVacancies
        });
    } catch (error) {
        console.error('Accept Teammate Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/projects/:id/join-request
router.post('/:id/join-request', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('author', 'fullName email');
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const remainingVacancies = Math.max(0, project.teamSize - (project.acceptedMembers || 0));
        if (remainingVacancies <= 0) {
            return res.status(400).json({ message: 'Cannot apply: team is full' });
        }

        const { githubLink, pitch, applicantName } = req.body;

        res.json({
            message: 'Join request registered',
            projectTitle: project.title,
            owner: project.author,
            githubLink: githubLink || null,
            pitch: pitch || null,
            applicantName: applicantName || null,
            remainingVacancies
        });
    } catch (error) {
        console.error('Join Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/projects/:id/reject
// Reject join request from an applicant
router.post('/:id/reject', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('author', 'fullName email');
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const { applicantName } = req.body;

        res.json({
            message: 'Join request rejected successfully',
            projectTitle: project.title,
            applicantName: applicantName || null
        });
    } catch (error) {
        console.error('Reject Teammate Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
