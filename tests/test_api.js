const io = require('socket.io-client');
const { fork } = require('child_process');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const API_URL = `${BASE_URL}/api`;

let passedTests = 0;
let failedTests = 0;
let serverProcess = null;

async function ensureServerRunning() {
    try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) return;
    } catch (e) {
        // Server not running yet
    }

    console.log('📡 Starting background server on port 5001 for test execution...');
    serverProcess = fork(path.join(__dirname, '../backend/server.js'), [], {
        stdio: 'inherit',
        env: { ...process.env, PORT: 5001 }
    });

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
            const res = await fetch(`${API_URL}/health`);
            if (res.ok) {
                console.log('✅ Server ready!\n');
                return;
            }
        } catch (e) {}
    }
    throw new Error('Timed out waiting for server to start on port 5001');
}

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedTests++;
    }
}

async function runApiTests() {
    await ensureServerRunning();
    console.log('\n=============================================');
    console.log('🚀 RUNNING PROJECTCONNECT BACKEND API TEST SUITE');
    console.log('=============================================\n');

    // ── 1. Health Checks ──
    console.log('--- 1. Health Checks ---');
    try {
        const r1 = await fetch(`${BASE_URL}/`);
        const text1 = await r1.text();
        assert(r1.status === 200 && text1.includes('ProjectConnect API is running'), 'GET / returns health check');

        const r2 = await fetch(`${API_URL}`);
        const text2 = await r2.text();
        assert(r2.status === 200 && text2.includes('ProjectConnect API is reachable'), 'GET /api returns API root info');
    } catch (err) {
        assert(false, `Health check error: ${err.message}`);
    }

    // ── 2. Authentication ──
    console.log('\n--- 2. Authentication (Register & Login) ---');
    const testId = Date.now();
    const testEmail = `testuser_${testId}@college.edu`;
    const testPassword = 'Password123!';
    const testName = `Test Student ${testId}`;
    let authToken = null;
    let userId = null;

    try {
        // Register new user
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: testName, email: testEmail, password: testPassword })
        });
        const regData = await regRes.json();
        assert(regRes.status === 201, `POST /auth/register status 201 (got ${regRes.status})`);
        assert(Boolean(regData.token), 'Registration returns JWT token');
        assert(regData.user && regData.user.email === testEmail, 'Registration returns user object with matching email');
        authToken = regData.token;
        userId = regData.user.id;

        // Duplicate registration should fail
        const dupRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: testName, email: testEmail, password: testPassword })
        });
        const dupData = await dupRes.json();
        assert(dupRes.status === 400 && dupData.message.includes('already exists'), 'POST /auth/register rejects duplicate email');

        // Login with correct credentials
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        const loginData = await loginRes.json();
        assert(loginRes.status === 200, `POST /auth/login returns 200`);
        assert(Boolean(loginData.token), 'Login returns JWT token');

        // Login with incorrect password
        const badPassRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' })
        });
        assert(badPassRes.status === 400, 'POST /auth/login rejects wrong password (400)');

        // Login with non-existent user
        const badEmailRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'nonexistent@college.edu', password: testPassword })
        });
        assert(badEmailRes.status === 400, 'POST /auth/login rejects non-existent email (400)');

    } catch (err) {
        assert(false, `Auth testing error: ${err.message}`);
    }

    // ── 3. 3-Step OTP Password Reset ──
    console.log('\n--- 3. 3-Step OTP Password Reset ---');
    try {
        // Step 1: Send OTP
        const sendOtpRes = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail })
        });
        const sendOtpData = await sendOtpRes.json();
        assert(sendOtpRes.status === 200, 'POST /auth/send-otp returns 200');

        // Step 1 validation: missing email
        const emptyEmailRes = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert(emptyEmailRes.status === 400, 'POST /auth/send-otp returns 400 when email is missing');

        // Query MongoDB directly or extract devOtp to verify OTP
        let otpCode = sendOtpData.devOtp;
        if (!otpCode) {
            // Read from DB using mongoose from backend/node_modules
            const path = require('path');
            const mongoose = require('../backend/node_modules/mongoose');
            const dotenv = require('../backend/node_modules/dotenv');
            dotenv.config({ path: path.join(__dirname, '../backend/.env') });
            const User = require('../backend/models/User');
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(process.env.MONGO_URI);
            }
            const userInDb = await User.findOne({ email: testEmail });
            otpCode = userInDb ? userInDb.resetOtp : null;
        }
        assert(Boolean(otpCode) && otpCode.length === 6, `OTP successfully generated in DB: ${otpCode}`);

        // Step 2: Verify OTP with wrong code
        const wrongOtpRes = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, otp: '000000' })
        });
        assert(wrongOtpRes.status === 400, 'POST /auth/verify-otp rejects invalid OTP (400)');

        // Step 2: Verify OTP with correct code
        const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, otp: otpCode })
        });
        const verifyData = await verifyRes.json();
        assert(verifyRes.status === 200, 'POST /auth/verify-otp accepts valid OTP (200)');
        assert(verifyData.message.includes('verified successfully'), 'OTP verification returns success message');

        // Step 3: Reset password with too short password
        const shortPassRes = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, newPassword: '123' })
        });
        assert(shortPassRes.status === 400, 'POST /auth/reset-password rejects password < 6 chars');

        // Step 3: Reset password with valid password
        const newPassword = 'NewSecretPassword99!';
        const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, newPassword })
        });
        const resetData = await resetRes.json();
        assert(resetRes.status === 200, 'POST /auth/reset-password updates password (200)');

        // Verify login works with NEW password and fails with OLD password
        const oldLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        assert(oldLoginRes.status === 400, 'Login with old password now fails');

        const newLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: newPassword })
        });
        const newLoginData = await newLoginRes.json();
        assert(newLoginRes.status === 200 && Boolean(newLoginData.token), 'Login with new reset password succeeds');
        authToken = newLoginData.token; // Update working token

        // Step 3 again without OTP verification should fail (one-time use)
        const unverifiedResetRes = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, newPassword: 'AnotherPassword!' })
        });
        assert(unverifiedResetRes.status === 403, 'POST /auth/reset-password rejects reset without new OTP verification (403)');

    } catch (err) {
        assert(false, `OTP flow testing error: ${err.message}`);
    }

    // ── 4. Projects CRUD & Filters ──
    console.log('\n--- 4. Projects CRUD & Filters ---');
    try {
        // Fetch without query
        const getAllRes = await fetch(`${API_URL}/projects`);
        const allProjects = await getAllRes.json();
        assert(getAllRes.status === 200 && Array.isArray(allProjects), 'GET /projects returns array of projects');

        // Post project without auth should fail
        const unauthPostRes = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Unauth Project',
                domain: 'web',
                skills: 'React, Node',
                teamSize: 3,
                description: 'Test description',
                collegeOnly: true
            })
        });
        assert(unauthPostRes.status === 401, 'POST /projects rejects unauthenticated request (401)');

        // Post project with valid auth
        const newProjectPayload = {
            title: `Autonomous Rover Drone ${testId}`,
            domain: 'ai',
            skills: 'Python, OpenCV, ROS, TensorFlow',
            teamSize: 4,
            description: 'Building an autonomous rover using computer vision and edge AI.',
            collegeOnly: true
        };
        const createProjRes = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(newProjectPayload)
        });
        const createdProj = await createProjRes.json();
        assert(createProjRes.status === 201, `POST /projects creates project (201)`);
        assert(createdProj.title === newProjectPayload.title, 'Created project title matches payload');
        assert(Array.isArray(createdProj.skills) && createdProj.skills.length === 4, 'Skills string parsed into array correctly');
        assert(createdProj.author && createdProj.author.fullName === testName, 'Author populated correctly in response');

        // Filter by domain
        const aiFilterRes = await fetch(`${API_URL}/projects?domain=ai`);
        const aiProjects = await aiFilterRes.json();
        assert(aiFilterRes.status === 200 && Array.isArray(aiProjects), 'GET /projects?domain=ai succeeds');
        const found = aiProjects.some(p => p._id === createdProj._id);
        assert(found, 'Created project is present in domain=ai filter query');

        const webFilterRes = await fetch(`${API_URL}/projects?domain=web`);
        const webProjects = await webFilterRes.json();
        const foundInWeb = webProjects.some(p => p._id === createdProj._id);
        assert(!foundInWeb, 'AI project is NOT present in domain=web filter query');

        // Test join-request with githubLink and pitch
        const joinReqRes = await fetch(`${API_URL}/projects/${createdProj._id}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pitch: 'I have 2 years of deep learning and computer vision experience.',
                githubLink: 'https://github.com/alex-dev',
                applicantName: 'Alex Developer'
            })
        });
        const joinReqData = await joinReqRes.json();
        assert(joinReqRes.status === 200, 'POST /projects/:id/join-request returns 200');
        assert(joinReqData.githubLink === 'https://github.com/alex-dev', 'Join request preserves submitted githubLink');
        assert(joinReqData.owner && joinReqData.owner.fullName === testName, 'Join request returns project owner details');

        // Test accept teammate and vacancies decrement
        const acceptRes1 = await fetch(`${API_URL}/projects/${createdProj._id}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const acceptData1 = await acceptRes1.json();
        assert(acceptRes1.status === 200 && acceptData1.remainingVacancies === 3, 'POST /projects/:id/accept decrements remaining vacancies (4 -> 3)');

        const acceptRes2 = await fetch(`${API_URL}/projects/${createdProj._id}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const acceptData2 = await acceptRes2.json();
        assert(acceptRes2.status === 200 && acceptData2.remainingVacancies === 2, 'Second accept decrements remaining vacancies further (3 -> 2)');

        // Test reject teammate endpoint
        const rejectRes = await fetch(`${API_URL}/projects/${createdProj._id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicantName: 'Rejected Applicant' })
        });
        const rejectData = await rejectRes.json();
        assert(rejectRes.status === 200 && rejectData.message.includes('rejected successfully'), 'POST /projects/:id/reject returns 200 and success message');

    } catch (err) {
        assert(false, `Projects testing error: ${err.message}`);
    }

    // ── 5. Virtual Meetings Endpoint ──
    console.log('\n--- 5. Virtual Meeting API ---');
    try {
        const missingRoomRes = await fetch(`${API_URL}/meeting/get-or-create-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        // Might be 400 (if key configured) or 503 (if key placeholder)
        assert([400, 503].includes(missingRoomRes.status), `POST /meeting/get-or-create-room validates input/config (got ${missingRoomRes.status})`);
    } catch (err) {
        assert(false, `Meeting test error: ${err.message}`);
    }

    // ── 6. Gemini AI Assistant ──
    console.log('\n--- 6. Gemini AI Assistant ---');
    try {
        // Missing message check
        const emptyMsgRes = await fetch(`${API_URL}/assistant/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '', sessionId: 'test-session-1' })
        });
        assert(emptyMsgRes.status === 400, 'POST /assistant/chat rejects empty message (400)');

        // Real prompt to Gemini
        console.log('  Testing live AI query to Gemini API...');
        const chatRes = await fetch(`${API_URL}/assistant/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello! What tech stack do you recommend for a college campus project recommender system?',
                sessionId: `test-session-${testId}`
            })
        });
        const chatData = await chatRes.json();
        if (chatRes.status === 200 && chatData.reply) {
            assert(true, `POST /assistant/chat returns valid AI response: "${chatData.reply.slice(0, 70).replace(/\n/g, ' ')}..."`);
        } else {
            console.log(`  ℹ️ Gemini returned ${chatRes.status}: ${JSON.stringify(chatData)}`);
            assert(chatRes.status === 200 || chatRes.status === 503, 'AI endpoint handled gracefully');
        }

        // Multi-turn conversation context
        const followUpRes = await fetch(`${API_URL}/assistant/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Can you summarize that in 3 bullet points?',
                sessionId: `test-session-${testId}`
            })
        });
        const followUpData = await followUpRes.json();
        assert(followUpRes.status === 200 && Boolean(followUpData.reply), 'Multi-turn follow-up successfully processes conversation history');

    } catch (err) {
        assert(false, `AI assistant testing error: ${err.message}`);
    }

    // ── 7. Socket.io Real-Time Engine ──
    console.log('\n--- 7. Socket.io Real-Time Team Engine ---');
    await new Promise((resolve) => {
        const client1 = io('http://localhost:5001');
        const client2 = io('http://localhost:5001');
        const roomName = `team-room-${testId}`;
        const testMsg = `Hello team members! Test message ${testId}`;

        let client2Received = false;

        client1.on('connect', () => {
            client1.emit('join-room', roomName);
        });

        client2.on('connect', () => {
            client2.emit('join-room', roomName);

            // Wait a brief moment for both to be in room, then send from client1
            setTimeout(() => {
                client1.emit('send-message', {
                    roomId: roomName,
                    message: testMsg,
                    author: 'Client One'
                });
            }, 400);
        });

        client2.on('receive-message', (data) => {
            assert(data.message === testMsg, `Client 2 received broadcast message: "${data.message}"`);
            assert(data.author === 'Client One', `Message author correctly preserved: "${data.author}"`);
            client2Received = true;
            client1.disconnect();
            client2.disconnect();
            resolve();
        });

        // Timeout fallback
        setTimeout(() => {
            if (!client2Received) {
                assert(false, 'Socket.io broadcast timed out');
                client1.disconnect();
                client2.disconnect();
            }
            resolve();
        }, 3500);
    });

    console.log('\n=============================================');
    console.log(`API TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('=============================================\n');

    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }

    process.exit(failedTests === 0 ? 0 : 1);
}

runApiTests();
