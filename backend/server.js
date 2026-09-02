const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load environment variables reliably from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection with safe fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/projectconnect';
mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err.message || err);
});

// Socket.io setup for Team Workspace real-time engine
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific team room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Handle sending messages within a team room
    socket.on('send-message', (data) => {
        // data should contain { roomId, message, author, avatar, color }
        const { roomId } = data;
        // Broadcast message to everyone else in the room
        socket.to(roomId).emit('receive-message', data);
    });

    // Handle real-time join request notifications to project owners
    socket.on('send-join-request', (data) => {
        // Broadcast join request to other connected clients
        socket.broadcast.emit('receive-join-request', data);
    });

    // Handle real-time decision (accept/reject) back to applicant
    socket.on('decision-join-request', (data) => {
        // Broadcast decision to other connected clients
        socket.broadcast.emit('receive-join-decision', data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Routes Configuration (will be implemented next)
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const meetingRoutes = require('./routes/meeting');
const assistantRoutes = require('./routes/assistant');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/assistant', assistantRoutes);

// Health check endpoints
app.get('/api', (req, res) => {
    res.send('ProjectConnect API is reachable! Use specific endpoints like /api/auth/login.');
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static assets (CSS, JS, images)
const frontendDir = path.join(__dirname, '..');
app.use(express.static(frontendDir, { index: false }));

// Root route: serves index.html to browsers, and health check string to API clients
app.get('/', (req, res) => {
    const accept = req.headers['accept'] || '';
    if (accept.includes('text/html') && (req.headers['sec-fetch-dest'] === 'document' || req.headers['upgrade-insecure-requests'])) {
        return res.sendFile(path.join(frontendDir, 'index.html'));
    }
    res.send('ProjectConnect API is running...');
});

// Fallback to index.html for Single-Page Application navigation (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    const indexPath = path.join(frontendDir, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) next();
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
