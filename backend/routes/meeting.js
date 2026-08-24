const express = require('express');
const router = express.Router();

// In-memory cache: roomId → Daily.co room url (reuse existing rooms)
const roomCache = {};

/**
 * POST /api/meeting/get-or-create-room
 * Body: { roomId: "project-xyz" }
 * Returns: { url: "https://projectconnect.daily.co/project-xyz" }
 *
 * Automatically creates a Daily.co room if it doesn't exist yet,
 * or returns the existing one. Rooms expire after 24 hours of inactivity.
 */
router.post('/get-or-create-room', async (req, res) => {
    const DAILY_API_KEY = process.env.DAILY_API_KEY;

    if (!DAILY_API_KEY || DAILY_API_KEY === 'YOUR_DAILY_API_KEY_HERE') {
        return res.status(503).json({
            error: 'DAILY_API_KEY not configured',
            message: 'Add your Daily.co API key to backend/.env as DAILY_API_KEY=...'
        });
    }

    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    // Sanitize room name: lowercase alphanumeric + hyphens only
    const roomName = ('pc-' + roomId).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60);

    // Return cached URL if we already created this room
    if (roomCache[roomName]) {
        return res.json({ url: roomCache[roomName] });
    }

    try {
        // Check if room already exists on Daily.co
        const checkRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
        });

        if (checkRes.ok) {
            const existing = await checkRes.json();
            roomCache[roomName] = existing.url;
            return res.json({ url: existing.url });
        }

        // Room doesn't exist — create it
        const createRes = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: roomName,
                privacy: 'public',
                properties: {
                    enable_chat: true,
                    enable_knocking: false,
                    enable_screenshare: true,
                    enable_recording: 'local',
                    start_video_off: false,
                    start_audio_off: true,
                    lang: 'en',
                    // Room expires 24 hours from now (in seconds since epoch)
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
                }
            })
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            console.error('Daily.co create room error:', errBody);
            return res.status(500).json({ error: 'Failed to create Daily.co room', detail: errBody });
        }

        const room = await createRes.json();
        roomCache[roomName] = room.url;
        return res.json({ url: room.url });

    } catch (err) {
        console.error('Daily.co API error:', err);
        return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
});

module.exports = router;
