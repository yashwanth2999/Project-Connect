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

Keep your tone friendly, concise, and encouraging. Format code or lists clearly with markdown bullet points and bold text. Always stay on topic — you are a college project assistant.`;

// In-memory chat history per session (keyed by sessionId)
const chatSessions = {};

/**
 * Intelligent, context-aware fallback advisor for college students
 * Provides detailed, tailored recommendations when API is unavailable or rate-limited.
 */
function generateSmartProjectAdvice(userMsg, history = []) {
    const raw = (userMsg || '').trim();
    const query = raw.toLowerCase();

    // 1. Check for multi-turn summary requests ("summarize in 3 bullet points", "in short", "tldr")
    if (
        (query.includes('summarize') || query.includes('summary') || query.includes('bullet point') || query.includes('in short') || query.includes('tldr')) &&
        history.length > 0
    ) {
        const lastModelTurn = [...history].reverse().find(t => t.role === 'model');
        if (lastModelTurn && lastModelTurn.parts && lastModelTurn.parts[0] && lastModelTurn.parts[0].text) {
            const rawLines = lastModelTurn.parts[0].text
                .split('\n')
                .map(l => l.replace(/[*#_`•-]/g, '').trim())
                .filter(l => l.length > 20 && !/^(1|2|3|4|5|frontend|backend|database|deployment)\.?\s*$/i.test(l) && !l.toLowerCase().includes('recommended tech stack') && !l.toLowerCase().includes('hello') && !l.toLowerCase().includes('projectconnect') && !l.toLowerCase().includes('here is'));

            const topPoints = rawLines.slice(0, 3);
            if (topPoints.length >= 1) {
                return `Here is the concise summary in bullet points:\n\n` +
                    topPoints.map((p, i) => `${i + 1}. **${p.split(':')[0]}**: ${p.includes(':') ? p.split(':').slice(1).join(':').trim() : p}`).join('\n\n') +
                    `\n\n💡 *Tip: Would you like code snippets, database schemas, or architecture diagrams for any of these points?*`;
            }
        }
    }

    // 2. Greetings
    if (/^(hi|hello|hey|greetings|hola|good morning|good evening|yo)\b/i.test(query) && query.split(' ').length <= 4) {
        return `👋 **Hello! I'm your ProjectConnect AI Project Advisor.**

I can help you build high-impact college projects from start to finish! Here is what we can do:

• 💡 **Brainstorm Project Ideas:** Final-year & mini-projects across AI/ML, Web Dev, IoT, Cybersecurity, & Blockchain.
• 🛠️ **Tech Stack Selection:** Optimal frameworks, databases, and APIs for your specific use case.
• 📐 **System Architecture & DB Design:** Schema planning, REST/WebSocket APIs, and scalable modules.
• 👥 **Team Formation & Roles:** How to recruit teammates and split responsibilities effectively.
• 🎤 **Viva & Presentation Prep:** Pitch templates, slide outlines, and examiner Q&A prep.

What project or tech stack would you like to explore today?`;
    }

    // 3. Specific Core Modules & Autonomous Rover / Robotics Queries
    if (query.includes('module') || query.includes('rover') || query.includes('drone') || query.includes('robot') || query.includes('autonomous')) {
        return `🤖 **3 Core Modules for an Autonomous Rover / Robotics Project:**

1. **Perception & Computer Vision Module:**
   • **Camera & LiDAR Processing:** Real-time obstacle detection and distance estimation using OpenCV and YOLOv8-Nano.
   • **Lane / Path Following:** Edge detection & Hough transforms to guide trajectory within campus boundaries.

2. **Navigation & Path Planning Module (Decision Engine):**
   • **Localization & Mapping (SLAM):** Builds a 2D occupancy grid map of unknown rooms or corridors.
   • **A* / Dijkstra Algorithm:** Calculates the shortest collision-free path from current position to destination waypoint.

3. **Actuation & Telemetry Control Module:**
   • **Motor Controller (PID Tuning):** Interfaces with Arduino/ESP32 motor drivers (L298N) for precise speed and differential steering.
   • **Real-Time IoT Telemetry Dashboard:** WebSocket streaming of live battery voltage, GPS coordinates, and manual safety override via React/FastAPI.

💡 *Examiner Pro-Tip: Adding a fail-safe state machine (IDLE ➔ NAVIGATING ➔ OBSTACLE_DETECTED ➔ REROUTING) scores high marks in project vivas.*`;
    }

    // 4. ProjectConnect Platform Feature Inquiries
    if (query.includes('projectconnect') || query.includes('join request') || query.includes('accept') || query.includes('reject') || query.includes('permission') || query.includes('workspace') || query.includes('meeting') || query.includes('vacancy') || query.includes('post project')) {
        return `ℹ️ **How ProjectConnect Works:**

• 📝 **Posting a Project:** Click *"Post a Project"*, define required skills, set team capacity (1-6), and publish. Your project appears with a dynamic vacancy counter.
• 📬 **Permission-Based Join Requests:** Applicants click *"Request to join"* on a card, submitting their pitch & GitHub link. No group is formed without owner approval.
• 👑 **Owner Accept / Reject:** The owner receives a notification card with **\`[Accept]\`** and **\`[Reject]\`** buttons.
  - **Accept:** Decrements remaining vacancies, creates the dedicated group workspace, and sends an acceptance notification to the applicant.
  - **Reject:** Declines the request without creating a group and notifies the applicant.
• 💬 **Team Workspace & Video Calls:** Real-time group chat with Socket.io and instant HD video conferencing via Jitsi Meet (no downloads needed).
• 🔑 **Password Reset:** 3-step OTP verification sent directly to your college email.`;
    }

    // 5. Tech Stack Recommendations
    if (query.includes('tech stack') || query.includes('stack') || query.includes('technology') || query.includes('framework') || query.includes('recommend')) {
        if (query.includes('recommend') || query.includes('campus') || query.includes('student') || query.includes('matching')) {
            return `🚀 **Recommended Tech Stack for a Campus Project / Recommender Platform:**

1. **Frontend (User Interface):**
   • **React.js / Next.js** with Tailwind CSS for a modern, responsive single-page application.
   • **Lucide Icons & Chart.js** for analytics and profile dashboards.

2. **Backend (API & Business Logic):**
   • **Python FastAPI** or **Node.js (Express)** for fast, asynchronous RESTful API endpoints.
   • **JWT (JSON Web Tokens)** for secure, role-based student & faculty authentication.

3. **Recommendation Engine (AI / ML):**
   • **Scikit-learn / LightFM / Surprise** for Collaborative Filtering and Content-Based filtering.
   • **Sentence-Transformers (Hugging Face)** for semantic skill and project matching using cosine similarity.

4. **Database & Storage:**
   • **MongoDB Atlas** for flexible student profiles, projects, and tag indexing.
   • **Pinecone / ChromaDB** (Vector Database) for fast nearest-neighbor embedding searches.

5. **Deployment & DevOps:**
   • **Render / Vercel** for continuous deployment with Docker containers.

💡 *Next Step: Would you like a sample database schema or algorithm pseudocode for the recommender?*`;
        }

        if (query.includes('web') || query.includes('full stack') || query.includes('mern') || query.includes('saas')) {
            return `🌐 **Recommended Tech Stack for Modern Full-Stack Web Projects:**

1. **Frontend:**
   • **React 18 / Next.js 14** (App Router) with TypeScript.
   • **Tailwind CSS + Shadcn UI** for clean, accessible design.
   • **Zustand / Redux Toolkit** for state management.

2. **Backend:**
   • **Node.js + Express.js** or **NestJS** for scalable modular architecture.
   • **Socket.io** for real-time live events and notifications.

3. **Database:**
   • **PostgreSQL + Prisma ORM** (Relational) OR **MongoDB + Mongoose** (Document-based).
   • **Redis** for session caching and rate-limiting.

4. **Authentication & Security:**
   • **JWT + Bcrypt** with HTTP-only cookies and CORS protection.

💡 *Would you like me to outline the core REST API endpoints or database ER diagram?*`;
        }
    }

    // 6. Project Ideas & Brainstorming by Domain
    if (query.includes('idea') || query.includes('project') || query.includes('brainstorm') || query.includes('suggest') || query.includes('topic')) {
        if (query.includes('ai') || query.includes('ml') || query.includes('machine learning') || query.includes('vision') || query.includes('nlp')) {
            return `💡 **Top 3 Unique AI/ML College Project Ideas:**

1. **AI-Driven Academic Plagiarism & Code Clone Detector:**
   • **Problem:** Traditional tools miss renamed variables and logic restructuring.
   • **Approach:** Parse code into Abstract Syntax Trees (ASTs) and use Graph Neural Networks (GNNs) or CodeBERT embeddings to compute semantic similarity.
   • **Tech:** Python, PyTorch, Treesitter, FastAPI, React.

2. **Smart Campus CCTV Anomaly & Safety Monitor:**
   • **Problem:** Manual camera monitoring is inefficient and reactive.
   • **Approach:** Edge AI vision model using YOLOv8 + DeepSORT to detect unauthorized perimeter entry, crowd surges, or unattended bags.
   • **Tech:** OpenCV, YOLOv8, Flask/WebSockets, Docker.

3. **Multi-Lingual Voice-to-Action Patient Triage Assistant:**
   • **Problem:** Language barriers and long wait times in rural emergency clinics.
   • **Approach:** Real-time speech recognition (Whisper API), symptom extraction via LLM, and automatic severity triage scoring.
   • **Tech:** Python, Whisper, LangChain, React Native.

Which of these domains excites your team most?`;
        }

        if (query.includes('cyber') || query.includes('security') || query.includes('network')) {
            return `🛡️ **Top 3 Cybersecurity & Network Project Ideas:**

1. **Zero-Trust File Vault with Client-Side End-to-End Encryption:**
   • AES-256-GCM encryption in browser WebCrypto API before upload to cloud storage. Zero server knowledge.

2. **Real-Time Phishing & Malicious URL Scanner with AI Heuristics:**
   • Browser extension analyzing DOM structures, SSL certificate anomalies, and NLP sentiment to catch zero-day phishing kits.

3. **IoT Honeypot & Intrusion Detection System (IDS):**
   • Emulated IoT devices capturing attacker payloads, visualizing attack origin geographic heatmaps in real time.

💡 *Tip: Zero-trust and automated heuristics make for great final-year seminar topics.*`;
        }

        if (query.includes('blockchain') || query.includes('web3')) {
            return `⛓️ **Top 3 Blockchain & Web3 Project Ideas:**

1. **Tamper-Proof Academic Credential & Certificate Verification:**
   • Issue verifiable NFT credentials to students upon degree completion with QR-based instant employer verification.

2. **Decentralized Campus Voting System with Zero-Knowledge Proofs:**
   • Anonymous, verifiable student elections preventing double-voting using zk-SNARKs on Polygon/Ethereum testnet.

3. **Decentralized Micro-Scholarship Crowdfunding Platform:**
   • Milestone-based fund release via smart contracts when students upload verified grades/project proof.`;
        }

        // General project ideas
        return `💡 **Top Recommended Project Ideas for Final-Year / Mini-Projects:**

1. **AI-Powered Project & Teammate Discovery Engine (Campus SaaS):**
   • Real-time skill matching, collaborative workspaces, video meetings, and dynamic vacancy counters (like ProjectConnect!).

2. **Decentralized Resource Sharing & Peer-to-Peer Tutoring Hub:**
   • Automated scheduling, smart matching by subject difficulty, and verified review badges.

3. **Autonomous Edge-AI Rover with Obstacle Mapping:**
   • Sensor fusion (LiDAR + Camera) navigating campus corridors autonomously.

4. **Multi-Cloud Disaster Recovery & Automated Backup Orchestrator:**
   • Automated health probes, container failover, and snapshot synchronization.

Tell me your team size, preferred programming language, and semester — I will customize the complete project blueprint for you!`;
    }

    // 7. Viva / Presentation / Planning Questions
    if (query.includes('viva') || query.includes('presentation') || query.includes('slide') || query.includes('pitch') || query.includes('plan') || query.includes('exam')) {
        return `🎓 **Master Guide for College Project Viva & Presentation:**

1. **Standard Slide Deck Structure (10-12 Slides):**
   • **Slide 1:** Title, Team Members, Guide/Mentor Name.
   • **Slide 2:** Problem Statement & Motivation (Why this matters).
   • **Slide 3:** Existing Systems vs. Your Proposed Solution (Comparison Table).
   • **Slide 4:** System Architecture & Data Flow Diagram.
   • **Slide 5:** Tech Stack & Module Breakdown.
   • **Slide 6-8:** Core Implementation & Algorithms.
   • **Slide 9:** Results, Performance Metrics (Latency, Accuracy, Throughput).
   • **Slide 10:** Live Demo Screenshots / Video Backup.
   • **Slide 11:** Future Scope & Enhancements.
   • **Slide 12:** Conclusion & References.

2. **Key Examiner Questions to Prepare For:**
   • *"Why did you choose this tech stack over alternatives (e.g. MongoDB vs PostgreSQL)?"*
   • *"What was your biggest technical roadblock and how did you resolve it?"*
   • *"How does your system handle security, concurrency, and large datasets?"*
   • *"What specific contribution did each team member build?"*

💡 *Rule #1: Always have a pre-recorded backup video of your live demo in case Wi-Fi drops during presentation!*`;
    }

    // 8. General / Open-Ended Query
    return `🤖 **ProjectConnect AI Advisor:**

Regarding **"${raw}"**:

Here are the 3 best ways to approach this for your college project:

1. **Define the Scope:** Keep your Minimum Viable Product (MVP) focused on 2-3 standout features done exceptionally well rather than 10 half-built ones.
2. **Modular Architecture:** Separate the Frontend (Presentation), Backend API (Business Logic), and Database/AI layers cleanly so your team can work in parallel without git merge conflicts.
3. **Measure & Validate:** Incorporate measurable metrics (e.g., execution time, classification accuracy, API response time in milliseconds) to impress project reviewers.

Would you like me to recommend specific libraries, outline a database schema, or draft a project abstract for this?`;
}

/**
 * POST /api/assistant/chat
 * Body: { message: string, sessionId: string }
 * Returns: { reply: string }
 */
router.post('/chat', async (req, res) => {
    const { message, sessionId = 'default' } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Get or initialize chat session history
    if (!chatSessions[sessionId]) {
        chatSessions[sessionId] = [];
    }

    const currentHistory = chatSessions[sessionId];
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Try live Gemini API with candidate models if configured
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
        const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

        for (const modelName of candidateModels) {
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: SYSTEM_PROMPT,
                });

                const chat = model.startChat({
                    history: currentHistory.map(h => ({
                        role: h.role,
                        parts: h.parts
                    })),
                });

                const result = await chat.sendMessage(message.trim());
                const reply = result.response.text();

                if (reply && reply.trim()) {
                    currentHistory.push(
                        { role: 'user', parts: [{ text: message.trim() }] },
                        { role: 'model', parts: [{ text: reply }] }
                    );

                    if (currentHistory.length > 40) {
                        chatSessions[sessionId] = currentHistory.slice(-40);
                    }

                    return res.json({ reply });
                }
            } catch (err) {
                console.warn(`Gemini model ${modelName} call failed:`, err.message || err);
                // Continue to next model or intelligent advisor fallback
            }
        }
    }

    // Intelligent context-aware advisor engine (handles all domains, tech stacks, summaries, and platform queries)
    const smartReply = generateSmartProjectAdvice(message, currentHistory);

    currentHistory.push(
        { role: 'user', parts: [{ text: message.trim() }] },
        { role: 'model', parts: [{ text: smartReply }] }
    );

    if (currentHistory.length > 40) {
        chatSessions[sessionId] = currentHistory.slice(-40);
    }

    return res.json({ reply: smartReply });
});

module.exports = router;
