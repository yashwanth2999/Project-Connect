const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
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

// Simple health check
app.get('/', (req, res) => {
    res.send('ProjectConnect API is running...');
});
app.get('/api', (req, res) => {
    res.send('ProjectConnect API is reachable! Use specific endpoints like /api/auth/login.');
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
