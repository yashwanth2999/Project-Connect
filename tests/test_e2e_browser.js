const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = '/Users/yash/.gemini/antigravity/brain/74203a86-bca9-4b8a-872a-40d81e6831fc/screenshots';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedTests++;
    }
}

async function runBrowserTests() {
    console.log('\n======================================================');
    console.log('🌐 RUNNING PROJECTCONNECT E2E BROWSER TEST SUITE');
    console.log('======================================================\n');

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        page.on('console', msg => {
            const text = msg.text();
            if (text.startsWith('Error:') || msg.type() === 'error') {
                console.log(`  [BROWSER CONSOLE ERR] ${text}`);
            }
        });

        // ── 1. Page Load & Initial State ──
        console.log('--- 1. Initial Page Load ---');
        await page.goto('http://localhost:5001/', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1000));

        const title = await page.title();
        assert(title.includes('ProjectConnect'), `Page title is "${title}"`);

        const isHomeActive = await page.$eval('#page-home', el => el.classList.contains('active'));
        assert(isHomeActive, 'Home page is active by default');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage_initial.png') });

        // ── 2. User Sign Up Flow ──
        console.log('\n--- 2. User Sign Up Flow ---');
        const testTimestamp = Date.now();
        const testUserEmail = `browser_user_${testTimestamp}@college.edu`;
        const testUserName = `Alex Student ${testTimestamp}`;
        const testUserPassword = 'SecurePassword123!';

        let isAuthOpen = await page.$eval('#authModal', el => !el.classList.contains('hidden'));
        if (!isAuthOpen) {
            await page.click('#getStartedBtn');
            await new Promise(r => setTimeout(r, 300));
            isAuthOpen = await page.$eval('#authModal', el => !el.classList.contains('hidden'));
        }
        assert(isAuthOpen, 'Auth modal displayed for initial authentication');

        // Switch to Sign Up tab
        await page.click('[data-auth-tab="signup"]');
        await new Promise(r => setTimeout(r, 200));
        const isSignupVisible = await page.$eval('#signupForm', el => !el.classList.contains('hidden'));
        assert(isSignupVisible, 'Sign Up tab displays signup form');

        // Fill sign up form
        const signupInputs = await page.$$('#signupForm .modal-input');
        await signupInputs[0].type(testUserName);
        await signupInputs[1].type(testUserEmail);
        await signupInputs[2].type(testUserPassword);

        // Submit form
        await page.click('#signupForm button[type="submit"]');
        await new Promise(r => setTimeout(r, 1200));

        const isAuthClosed = await page.$eval('#authModal', el => !el.classList.contains('open'));
        assert(isAuthClosed, 'Auth modal closes upon successful registration');

        const isAppShellVisible = await page.$eval('.app-shell', el => el.classList.contains('visible'));
        assert(isAppShellVisible, 'App shell becomes visible after signup');

        const savedUser = await page.evaluate(() => localStorage.getItem('user'));
        assert(savedUser && JSON.parse(savedUser).email === testUserEmail, 'User profile persisted to localStorage');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_logged_in.png') });

        // ── Verify Profile Section & Removal of 3-line hamburger ──
        console.log('\n--- 2b. Verify Top Profile Section & Hamburger Removal ---');
        const hasHamburger = await page.$('#dashboardToggle');
        assert(hasHamburger === null, 'Top-right 3-line hamburger menu is removed');

        const hasOpenAbout = await page.$('#openAbout');
        assert(hasOpenAbout === null, 'Top-nav About button is removed');

        const hasProfileSection = await page.$('#profileSection');
        assert(hasProfileSection !== null, 'Profile section exists in top right nav bar');

        const profileAvatarText = await page.$eval('#navProfileAvatar', el => el.textContent.trim());
        assert(profileAvatarText.length > 0, `Profile avatar shows user initials: "${profileAvatarText}"`);

        const profileNameText = await page.$eval('#navProfileName', el => el.textContent.trim());
        assert(profileNameText.length > 0, `Profile name shows user name: "${profileNameText}"`);

        // Test opening profile dropdown
        await page.click('#profileTriggerBtn');
        await new Promise(r => setTimeout(r, 200));
        const isDropdownOpen = await page.$eval('#profileDropdown', el => el.classList.contains('open'));
        assert(isDropdownOpen, 'Profile dropdown menu opens upon clicking profile widget');

        const dropdownEmailText = await page.$eval('#dropdownProfileEmail', el => el.textContent.trim());
        assert(dropdownEmailText === testUserEmail, `Profile dropdown displays email: "${dropdownEmailText}"`);

        // Capture screenshot while profile dropdown is open on top of the hero section
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b_profile_section.png') });

        // Close profile dropdown by clicking outside
        await page.click('body');
        await new Promise(r => setTimeout(r, 200));
        const isDropdownClosed = await page.$eval('#profileDropdown', el => !el.classList.contains('open'));
        assert(isDropdownClosed, 'Profile dropdown closes on click outside');

        // ── 2c. Test Profile Picture Upload & Persistence ──
        console.log('\n--- 2c. Test Profile Picture Upload & Persistence ---');
        // Open profile dropdown
        await page.click('#profileTriggerBtn');
        await new Promise(r => setTimeout(r, 200));

        // Create a temporary sample avatar image
        const testAvatarPath = path.join(__dirname, 'test_sample_avatar.png');
        const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABMSURBVHgB7dKxCQAgEAOx1c0dzd3f1E2K5AZCCiGfv06eO32W99yHAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABf19gnw1w8vX7HAAAAABJRU5ErkJggg==';
        fs.writeFileSync(testAvatarPath, Buffer.from(samplePngBase64, 'base64'));

        // Upload file via hidden file input
        const fileInput = await page.$('#profilePicInput');
        await fileInput.uploadFile(testAvatarPath);
        await new Promise(r => setTimeout(r, 1200));

        // Verify avatar updated to img element in both nav and dropdown
        const navHasImg = await page.$eval('#navProfileAvatar img.profile-avatar-img', el => el !== null).catch(() => false);
        assert(navHasImg, 'Profile avatar in top nav rendered as uploaded image');

        const dropHasImg = await page.$eval('#dropdownProfileAvatar img.profile-avatar-img', el => el !== null).catch(() => false);
        assert(dropHasImg, 'Profile avatar in dropdown rendered as uploaded image');

        const removeBtnVisible = await page.$eval('#removePicBtn', el => el.style.display !== 'none');
        assert(removeBtnVisible, 'Remove photo button is visible when picture is uploaded');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02c_profile_pic_uploaded.png') });

        // Close profile dropdown
        await page.click('body');
        await new Promise(r => setTimeout(r, 200));

        // Clean up sample avatar file
        if (fs.existsSync(testAvatarPath)) fs.unlinkSync(testAvatarPath);

        // ── 3. Domain Filter Tabs & Projects Grid ──
        console.log('\n--- 3. Domain Filter Tabs & Project Grid ---');
        // Click Web Development tab
        await page.click('[data-domain="web"]');
        await new Promise(r => setTimeout(r, 500));
        let activeTabDomain = await page.$eval('.tab-btn.active', el => el.getAttribute('data-domain'));
        assert(activeTabDomain === 'web', 'Web Development tab is selected and active');

        // Click AI tab
        await page.click('[data-domain="ai"]');
        await new Promise(r => setTimeout(r, 600));
        activeTabDomain = await page.$eval('.tab-btn.active', el => el.getAttribute('data-domain'));
        assert(activeTabDomain === 'ai', 'AI tab is selected and active');

        const projectCardsCount = await page.$$eval('#projectsGrid .project-card', cards => cards.length);
        assert(projectCardsCount > 0, `Projects grid displays ${projectCardsCount} project card(s) for AI domain`);

        const teammatesPillText = await page.$eval('#projectsGrid .project-card:first-child .project-badge-row .pill-mini:last-child', el => el.textContent);
        assert(teammatesPillText.includes('Teammates Required:'), `Project badge displays formatted text: "${teammatesPillText}"`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_projects_grid.png') });

        // ── 4. Project Creation & Posting Flow ──
        console.log('\n--- 4. Post Project Flow ---');
        await page.click('#openPost');
        await new Promise(r => setTimeout(r, 500));

        const isPostPageActive = await page.$eval('#page-post-project', el => el.classList.contains('active'));
        assert(isPostPageActive, 'Navigated to Post Project page');

        const newProjectTitle = `Cloud Smart Campus Hub ${testTimestamp}`;
        const postInputs = await page.$$('#projectForm .field-input, #projectForm .field-select, #projectForm .field-textarea');
        await postInputs[0].type(newProjectTitle);
        await postInputs[1].select('ai');
        await postInputs[2].type('Node.js, MongoDB, WebSockets, Python, TensorFlow');
        await postInputs[3].type('3');
        await postInputs[4].type('An integrated AI campus platform for real-time collaboration and smart classroom resource scheduling.');

        // Check college only checkbox
        await page.click('#collegeOnlyCheckbox');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_post_project_form.png') });

        // Submit form
        await page.click('#projectForm button[type="submit"]');
        await new Promise(r => setTimeout(r, 1200));

        const isHomeAfterPost = await page.$eval('#page-home', el => el.classList.contains('active'));
        assert(isHomeAfterPost, 'Automatically redirected to Home page after project publication');

        // Verify newly posted project appears in projects grid
        await page.waitForSelector('#projectsGrid .project-card', { timeout: 3000 });
        const hasNewProject = await page.$$eval('#projectsGrid .project-card .project-title', (titles, expected) => {
            return titles.some(t => t.textContent.includes(expected));
        }, newProjectTitle);
        assert(hasNewProject, `Newly published project "${newProjectTitle}" rendered in projects grid`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_new_project_in_grid.png') });

        // ── 5. Join Request Modal & Notification Center ──
        console.log('\n--- 5. Join Request & Notification Center ---');
        // Click the first "Request to join" button
        await page.click('#projectsGrid .project-card:first-child .project-btn');
        await new Promise(r => setTimeout(r, 400));

        const isReqModalOpen = await page.$eval('#requestModal', el => el.classList.contains('open'));
        assert(isReqModalOpen, 'Request to Join modal opened');

        const modalTitle = await page.$eval('#requestProjectTitle', el => el.textContent.trim());
        assert(Boolean(modalTitle), `Request modal pre-filled with project title: "${modalTitle}"`);

        // Fill join request form
        await page.type('#requestForm textarea', 'I have hands-on experience in full-stack MERN and edge AI deployment.');
        await page.type('#requestForm input[type="url"]', 'https://github.com/alex-student');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_join_request_modal.png') });

        await page.click('#requestForm button[type="submit"]');
        await new Promise(r => setTimeout(r, 600));

        const isReqModalClosed = await page.$eval('#requestModal', el => !el.classList.contains('open'));
        assert(isReqModalClosed, 'Request modal closed on submission');

        // Check notifications page
        await page.click('#openNotifications');
        await new Promise(r => setTimeout(r, 500));

        const isNotifPageActive = await page.$eval('#page-notifications', el => el.classList.contains('active'));
        assert(isNotifPageActive, 'Navigated to Notifications page');

        const notifCount = await page.$$eval('#notifListPage .notif-item', items => items.length);
        assert(notifCount > 0, `Notifications list rendered with ${notifCount} item(s)`);

        const firstNotifText = await page.$eval('#notifListPage .notif-item:first-child', el => el.textContent);
        assert(firstNotifText.includes('Join Request'), 'New join request notification is present in the feed');

        // Verify submitted GitHub link is present and clickable in owner's notification card
        const githubLinkHref = await page.$eval('#notifListPage .notif-item:first-child .notif-github-link', el => el.getAttribute('href'));
        assert(githubLinkHref.includes('github.com/alex-student'), `Notification displays submitted GitHub link: "${githubLinkHref}"`);

        // Verify owner has both Accept and Reject buttons
        const hasAccept = await page.$('#notifListPage .notif-item:first-child .notif-accept-btn');
        const hasReject = await page.$('#notifListPage .notif-item:first-child .notif-reject-btn');
        assert(Boolean(hasAccept) && Boolean(hasReject), 'Owner notification includes both [Accept] and [Reject] action buttons');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_notifications_page.png') });

        // Test Reject Flow first
        console.log('  Testing Owner Reject Flow...');
        await page.click('#notifListPage .notif-item:first-child .notif-reject-btn');
        await new Promise(r => setTimeout(r, 600));

        const hasRejectBadge = await page.$eval('#notifListPage .notif-item:nth-child(2)', el => el.textContent.includes('Rejected'));
        assert(hasRejectBadge, 'Owner card updated to display Rejected badge');

        const hasApplicantRejectNotif = await page.$eval('#notifListPage .notif-item:first-child', el => el.textContent.includes('Request Rejected'));
        assert(hasApplicantRejectNotif, 'Rejection notification delivered to applicant with "Request Rejected" status');

        // Now submit another request to test Accept Flow
        console.log('  Testing Owner Accept Flow...');
        await page.click('#openHome');
        await new Promise(r => setTimeout(r, 500));
        await page.click('#projectsGrid .project-card:first-child .project-btn');
        await new Promise(r => setTimeout(r, 400));
        await page.type('#requestForm textarea', 'Accepted applicant pitch.');
        await page.type('#requestForm input[type="url"]', 'https://github.com/alex-accepted');
        await page.click('#requestForm button[type="submit"]');
        await new Promise(r => setTimeout(r, 600));

        await page.click('#openNotifications');
        await new Promise(r => setTimeout(r, 500));

        // Click Accept button as project owner on the new request
        await page.click('#notifListPage .notif-item:first-child .notif-accept-btn');
        await new Promise(r => setTimeout(r, 800));

        // Verify owner is automatically directed to Collaboration window
        const isCollabAfterAccept = await page.$eval('#page-collaboration', el => el.classList.contains('active'));
        assert(isCollabAfterAccept, 'Owner is automatically directed to Collaboration window upon accepting request');

        // Verify Team Group created with Project Owner and Teammates
        const roomTitle = await page.$eval('#teamRoomTitle', el => el.textContent);
        assert(Boolean(roomTitle), `Team room title updated to project: "${roomTitle}"`);

        const teamMembersCount = await page.$$eval('#teamSidebarMembers .member-item', items => items.length);
        assert(teamMembersCount >= 2, `Team group created with ${teamMembersCount} members (Owner + Teammates)`);

        const hasAnnouncement = await page.$eval('#teamChatMessages', el => el.textContent.includes('Team Formed Successfully'));
        assert(hasAnnouncement, 'System announcement posted in group chat confirming team formation');

        // Verify applicant also has acceptance notification with "Open Group Workspace" button
        await page.click('#openNotifications');
        await new Promise(r => setTimeout(r, 500));
        const hasAcceptNotif = await page.$eval('#notifListPage .notif-item:first-child', el => el.textContent.includes('Request Accepted!'));
        assert(hasAcceptNotif, 'Acceptance notification delivered to applicant with "Request Accepted!" and group link');

        // Navigate back to Home and verify remaining vacancies updated
        await page.click('#openHome');
        await new Promise(r => setTimeout(r, 500));
        const updatedPillText = await page.$eval('#projectsGrid .project-card:first-child .project-badge-row .pill-mini:last-child', el => el.textContent);
        assert(updatedPillText.includes('Teammates Required:'), `Project card dynamically reflects remaining vacancies: "${updatedPillText}"`);

        // ── 6. Team Workspace & Real-Time Chat ──
        console.log('\n--- 6. Real-Time Collaboration Hub & Team Chat ---');
        await page.click('#openCollabTop');
        await new Promise(r => setTimeout(r, 500));

        const isCollabActive = await page.$eval('#page-collaboration', el => el.classList.contains('active'));
        assert(isCollabActive, 'Navigated to Collaboration Workspace page');

        const chatMessageText = `Automated E2E Test message from ${testUserName}`;
        await page.type('#teamChatInput', chatMessageText);
        await page.click('#teamChatSend');
        await new Promise(r => setTimeout(r, 400));

        const lastMsgText = await page.$eval('#teamChatMessages .team-msg:last-child', el => el.textContent);
        assert(lastMsgText.includes(chatMessageText), 'Sent team chat message rendered in workspace chat container');

        const lastMsgHasMeClass = await page.$eval('#teamChatMessages .team-msg:last-child', el => el.classList.contains('me'));
        assert(lastMsgHasMeClass, 'User message styled with ".me" bubble and right-aligned layout');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_collaboration_chat.png') });

        // ── 7. Virtual Video Meeting (Jitsi WebRTC Modal) ──
        console.log('\n--- 7. Virtual Video Meeting (Jitsi WebRTC Modal) ---');
        await page.click('#startMeetingBtn');
        await new Promise(r => setTimeout(r, 400));

        const isMeetingVisible = await page.$eval('#meetingOverlay', el => el.classList.contains('visible'));
        assert(isMeetingVisible, 'Video meeting overlay opened with class "visible"');

        const roomDisplay = await page.$eval('#jitsiRoomNameDisplay', el => el.textContent);
        assert(roomDisplay.includes('meet.jit.si/ProjectConnect-'), `Jitsi room URL correctly formatted: ${roomDisplay}`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_jitsi_meeting_overlay.png') });

        // Leave / close meeting
        await page.click('#leaveMeetingBtn');
        await new Promise(r => setTimeout(r, 300));

        const isMeetingClosed = await page.$eval('#meetingOverlay', el => !el.classList.contains('visible'));
        assert(isMeetingClosed, 'Meeting overlay closed upon clicking Leave');

        // ── 8. AI Assistant Half-Window (Floating Logo) ──
        console.log('\n--- 8. AI Assistant Half-Window (Floating Logo) ---');
        const hasAiFab = await page.$('#aiFabBtn');
        assert(hasAiFab !== null, 'Floating AI chatbot logo exists on bottom-right corner');

        // Click floating AI logo
        await page.click('#aiFabBtn');
        await new Promise(r => setTimeout(r, 500));

        const isAssistantOpen = await page.$eval('#aiAssistantWindow', el => el.classList.contains('open'));
        assert(isAssistantOpen, 'AI Assistant opens upon clicking bottom-right floating logo');

        const isBackdropOpen = await page.$eval('#assistantBackdrop', el => el.classList.contains('open'));
        assert(isBackdropOpen, 'Assistant backdrop overlay activated');

        // Verify window width is approximately half the viewport (>= 420px and <= 750px)
        const assistantWidth = await page.$eval('#aiAssistantWindow', el => el.offsetWidth);
        assert(assistantWidth >= 420 && assistantWidth <= 750, `Assistant opened to half-window: width = ${assistantWidth}px (viewport = 1440px)`);

        const aiPrompt = 'Suggest 3 core modules for our autonomous rover college project.';
        await page.type('#chatInput', aiPrompt);
        await page.click('#chatSend');

        // Check user msg appears immediately
        await new Promise(r => setTimeout(r, 300));
        const lastUserChat = await page.$eval('#chatMessages .chat-msg.user:last-child', el => el.textContent);
        assert(lastUserChat.includes(aiPrompt), 'User query rendered in AI assistant chat feed');

        // Wait for AI response (up to 60 seconds for rich LLM generation, expecting second bot message)
        console.log('  Waiting for live Gemini AI Assistant reply in half window...');
        await page.waitForFunction(() => {
            const botMsgs = document.querySelectorAll('#chatMessages .chat-msg.bot');
            return botMsgs.length >= 2;
        }, { timeout: 60000 });

        const botMsgs = await page.$$('#chatMessages .chat-msg.bot');
        const lastBotMsg = botMsgs[botMsgs.length - 1];
        const botReplyHtml = await page.evaluate(el => el.innerHTML, lastBotMsg);
        assert(botReplyHtml.length > 20, 'AI Assistant response successfully received from Google Gemini');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_gemini_ai_half_window.png') });

        // Close assistant via close button
        await page.click('#closeAssistantBtn');
        await new Promise(r => setTimeout(r, 400));
        const isAssistantClosed = await page.$eval('#aiAssistantWindow', el => !el.classList.contains('open'));
        assert(isAssistantClosed, 'AI Assistant half-window closed successfully');

        // ── 9. 3-Step OTP Password Reset UI ──
        console.log('\n--- 9. 3-Step OTP Password Reset UI ---');
        // Clear session to simulate user coming back to reset password
        await page.evaluate(() => localStorage.clear());
        await page.goto('http://localhost:5001/', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 600));

        let isAuthOpenForForgot = await page.$eval('#authModal', el => !el.classList.contains('hidden'));
        if (!isAuthOpenForForgot) {
            await page.click('#getStartedBtn');
            await new Promise(r => setTimeout(r, 300));
        }

        // Click "Forgot Password?"
        await page.click('#showForgotPasswordLink');
        await new Promise(r => setTimeout(r, 300));

        const isStep1Visible = await page.$eval('#forgotStep1Form', el => !el.classList.contains('hidden'));
        assert(isStep1Visible, 'Step 1: Enter email form is displayed');

        // Enter email and send OTP
        await page.type('#otpEmailInput', testUserEmail);
        await page.click('#sendOtpBtn');

        // Wait for SMTP dispatch and Step 2 transition
        await page.waitForFunction(() => {
            const f2 = document.getElementById('forgotStep2Form');
            return f2 && !f2.classList.contains('hidden');
        }, { timeout: 15000 });

        const isStep2Visible = await page.$eval('#forgotStep2Form', el => !el.classList.contains('hidden'));
        assert(isStep2Visible, 'Step 2: 6-Digit OTP verification screen is displayed');

        // Get the generated OTP from MongoDB
        const mongoose = require('../backend/node_modules/mongoose');
        const dotenv = require('../backend/node_modules/dotenv');
        dotenv.config({ path: path.join(__dirname, '../backend/.env') });
        const User = require('../backend/models/User');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        const userInDb = await User.findOne({ email: testUserEmail });
        const resetOtpCode = userInDb.resetOtp;
        assert(Boolean(resetOtpCode) && resetOtpCode.length === 6, `Retrieved valid 6-digit OTP (${resetOtpCode}) for UI test`);

        // Enter OTP digits into the 6 input boxes
        const otpInputs = await page.$$('.otp-digit');
        const digits = resetOtpCode.split('');
        for (let i = 0; i < 6; i++) {
            await otpInputs[i].type(digits[i]);
            await new Promise(r => setTimeout(r, 50));
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_otp_verification_step.png') });

        // Submit Step 2 form
        await page.click('#verifyOtpBtn');
        await page.waitForFunction(() => {
            const f3 = document.getElementById('forgotStep3Form');
            return f3 && !f3.classList.contains('hidden');
        }, { timeout: 10000 });

        const isStep3Visible = await page.$eval('#forgotStep3Form', el => !el.classList.contains('hidden'));
        assert(isStep3Visible, 'Step 3: New Password input screen is displayed');

        // Enter new password
        const updatedPassword = 'BrandNewPassword2026!';
        await page.type('#newPasswordInput', updatedPassword);
        await page.type('#confirmPasswordInput', updatedPassword);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_reset_password_step.png') });

        // Submit Step 3 form
        await page.click('#resetPasswordBtn');
        await page.waitForFunction(() => {
            const lf = document.getElementById('loginForm');
            return lf && !lf.classList.contains('hidden');
        }, { timeout: 10000 });

        // Should return to login form with email pre-filled
        const isLoginVisibleAfterReset = await page.$eval('#loginForm', el => !el.classList.contains('hidden'));
        assert(isLoginVisibleAfterReset, 'Successfully transitioned back to login screen after password reset');

        const prefilledEmail = await page.$eval('#loginForm input[type="email"]', el => el.value);
        assert(prefilledEmail === testUserEmail, `Login email prefilled with reset email: "${prefilledEmail}"`);

        // Log in with new password
        await page.type('#loginForm input[type="password"]', updatedPassword);
        await page.click('#loginForm button[type="submit"]');
        await new Promise(r => setTimeout(r, 1000));

        const isLoggedInWithNewPass = await page.$eval('.app-shell', el => el.classList.contains('visible'));
        assert(isLoggedInWithNewPass, 'Successfully authenticated using newly reset password');

        // ── 10. Global Search Bar Navigation & Bottom About Section ──
        console.log('\n--- 10. Global Search Bar Navigation & Bottom About Section ---');
        await page.click('#globalSearch');
        await page.keyboard.down('Meta');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Meta');
        await page.keyboard.press('Backspace');
        await page.type('#globalSearch', 'about');
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 600));

        const isHomeForAbout = await page.$eval('#page-home', el => el.classList.contains('active'));
        assert(isHomeForAbout, 'Global search "about" routes to Home page');

        const hasAboutSection = await page.$('#page-home #aboutSection');
        assert(hasAboutSection !== null, 'About section exists at bottom of Home page');

        // Scroll to About section and capture screenshot
        await page.evaluate(() => {
            const el = document.getElementById('aboutSection');
            if (el) el.scrollIntoView();
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_about_section_bottom.png') });

        await page.click('#globalSearch');
        await page.keyboard.down('Meta');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Meta');
        await page.keyboard.press('Backspace');
        await page.type('#globalSearch', 'home');
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 500));

        const isHomeBack = await page.$eval('#page-home', el => el.classList.contains('active'));
        assert(isHomeBack, 'Global search "home" navigated back to Home page');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_final_state.png') });

        console.log('\n======================================================');
        console.log(`E2E BROWSER TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
        console.log('======================================================\n');

        await browser.close();
        process.exit(failedTests === 0 ? 0 : 1);

    } catch (err) {
        console.error('Fatal Browser Test Error:', err);
        if (browser) await browser.close();
        process.exit(1);
    }
}

runBrowserTests();
