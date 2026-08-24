const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT
const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        // Assuming token format "Bearer <token>"
        const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
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
            author: req.user.userId
        });

        const savedProject = await newProject.save();
        // Populate author before returning to immediately show it correctly on frontend
        await savedProject.populate('author', 'fullName');

        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
