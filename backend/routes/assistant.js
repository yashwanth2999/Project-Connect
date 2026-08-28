const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// System prompt that gives the AI its ProjectConnect personality
const SYSTEM_PROMPT = `You are the ProjectConnect AI Assistant — a smart, friendly, and helpful assistant built specifically for college students using the ProjectConnect platform.

ProjectConnect is a student collaboration platform where:
- Students can discover unique, domain-based project ideas (AI/ML, Web Dev, Data Science, IoT, Cybersecurity, etc.)
- Students can post their own project ideas and recruit teammates with specific skills
- Teams can collaborate in real-time using the built-in team workspace with live group chat and video meetings (Jitsi Meet)
- Students can find teammates by skill, year, and department

Your role is to:
1. Help students brainstorm original, non-plagiarized project ideas for final-year or mini-projects
2. Suggest tech stacks and tools best suited for a given project
3. Help students understand how to form effective teams
4. Answer questions about how ProjectConnect features work
5. Give advice on project planning, deadlines, and academic project presentations
6. Motivate students and give constructive feedback

Keep your tone friendly, concise, and encouraging. Avoid jargon where possible. Format code or lists clearly. Always stay on topic — you are a college project assistant, not a general-purpose chatbot.`;

// In-memory chat history per session (keyed by sessionId)
const chatSessions = {};

/**
 * POST /api/assistant/chat
 * Body: { message: string, sessionId: string }
 * Returns: { reply: string }
 */
router.post('/chat', async (req, res) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(503).json({
            error: 'GEMINI_API_KEY not configured',
            reply: "⚠️ The AI assistant is not configured yet. Please add your free Gemini API key to the backend .env file."
        });
    }

    const { message, sessionId = 'default' } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash',
            systemInstruction: SYSTEM_PROMPT,
        });

        // Get or create chat session history
        if (!chatSessions[sessionId]) {
            chatSessions[sessionId] = [];
        }

        // Start chat with history
        const chat = model.startChat({
            history: chatSessions[sessionId],
        });

        let result;
        let retries = 3;
        while (retries > 0) {
            try {
                result = await chat.sendMessage(message.trim());
                break;
            } catch (retryErr) {
                retries--;
                const isRetryable = retryErr.message && (
                    retryErr.message.includes('503') ||
                    retryErr.message.includes('429') ||
                    retryErr.message.includes('overloaded') ||
                    retryErr.message.includes('resource exhausted')
                );
                if (retries === 0 || !isRetryable) {
                    throw retryErr;
                }
                console.log(`Gemini transient spike (${retryErr.message}). Retrying in 1s (${retries} attempts left)...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const reply = result.response.text();

        // Save to session history
        chatSessions[sessionId].push(
            { role: 'user', parts: [{ text: message.trim() }] },
            { role: 'model', parts: [{ text: reply }] }
        );

        // Cap history at last 20 exchanges to avoid token overflow
        if (chatSessions[sessionId].length > 40) {
            chatSessions[sessionId] = chatSessions[sessionId].slice(-40);
        }

        return res.json({ reply });

    } catch (err) {
        console.error('Gemini API error:', err.message || err);
        return res.json({
            reply: "I am experiencing high student demand right now! In the meantime, here is a quick tip: When pitching a project, clearly outline your Problem Statement, Tech Stack (e.g. MERN or Python/FastAPI), and Expected Outcome. Please feel free to ask me again!"
        });
    }
});

module.exports = router;
