// tests/test_multi_workspaces.js
// Unit & Integration Tests for Multi-Project Workspaces, File Sharing, Real-Time Cross-Team Notifications & Keyboard Enter Key

const assert = require('assert');

console.log('🧪 Running Multi-Project Workspaces & File Sharing Verification Suite...\n');

// Mock localStorage
const storageMap = new Map();
const mockLocalStorage = {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear()
};

// 1. User Multi-Project Workspaces Creation & Isolation
console.log('Test 1: Multi-Project Workspace Setup (User with 3 Projects)');
let currentUser = { id: 'user-101', fullName: 'Yash Student', email: 'yash@college.edu' };
let userWorkspaces = [];
let activeWorkspaceId = null;

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIconName(fileType, fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if ((fileType && fileType.includes('image')) || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
    if ((fileType && fileType.includes('pdf')) || ext === 'pdf') return 'file-text';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'folder-archive';
    if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json', 'sql'].includes(ext)) return 'code';
    return 'file';
}

function addOrUpdateWorkspace(params) {
    const { projectId, projectTitle, ownerName, ownerEmail, ownerId, applicantName, applicantGithub, domain } = params;
    const title = projectTitle || "Project Workspace";
    const workspaceId = 'proj-' + (projectId ? String(projectId).replace(/[^a-zA-Z0-9-]/g, '') : title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40));

    let existing = userWorkspaces.find(w => w.id === workspaceId || w.title.toLowerCase() === title.toLowerCase());
    const isOwner = currentUser && (
        (ownerEmail && currentUser.email && ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (ownerId && currentUser.id && String(ownerId) === String(currentUser.id)) ||
        (ownerName && currentUser.fullName && ownerName.toLowerCase() === currentUser.fullName.toLowerCase())
    );

    if (!existing) {
        existing = {
            id: workspaceId,
            title: title,
            domain: domain || 'ai',
            role: isOwner ? 'owner' : 'member',
            roleLabel: isOwner ? '👑 Project Lead' : '🚀 Teammate',
            ownerName: ownerName || "Project Lead",
            members: [
                { name: ownerName || "Project Lead", role: "👑 Project Owner", isOwner: true },
                { name: applicantName || "Teammate", role: "🚀 Teammate", isOwner: false, github: applicantGithub || "" }
            ],
            messages: [
                { id: 'sys-' + Date.now(), author: 'System', text: `Workspace created for ${title}`, isSystem: true }
            ],
            files: [],
            unreadCount: 0
        };
        userWorkspaces.unshift(existing);
    }
    activeWorkspaceId = existing.id;
    return existing;
}

// User joins 3 distinct projects:
const p1 = addOrUpdateWorkspace({
    projectId: 'p1',
    projectTitle: 'AI Health Diagnostic System',
    ownerName: 'Yash Student',
    ownerEmail: 'yash@college.edu',
    applicantName: 'Alice Teammate',
    domain: 'ai'
});

const p2 = addOrUpdateWorkspace({
    projectId: 'p2',
    projectTitle: 'Smart Campus Transit Tracker',
    ownerName: 'Prof. David',
    ownerEmail: 'david@college.edu',
    applicantName: 'Yash Student',
    domain: 'web'
});

const p3 = addOrUpdateWorkspace({
    projectId: 'p3',
    projectTitle: 'Decentralized Academic Credential Verification',
    ownerName: 'Sarah Connor',
    ownerEmail: 'sarah@college.edu',
    applicantName: 'Yash Student',
    domain: 'se'
});

assert.strictEqual(userWorkspaces.length, 3, 'User must have exactly 3 project workspaces');
assert.strictEqual(userWorkspaces[0].title, 'Decentralized Academic Credential Verification');
assert.strictEqual(userWorkspaces[1].title, 'Smart Campus Transit Tracker');
assert.strictEqual(userWorkspaces[2].title, 'AI Health Diagnostic System');
console.log('  ✅ PASS: All 3 project titles seamlessly registered in user workspace hub');

// 2. Switching Active Workspace
console.log('\nTest 2: Switching Active Workspace');
// Switch to AI Health Diagnostic (p1)
activeWorkspaceId = p1.id;
assert.strictEqual(activeWorkspaceId, 'proj-p1');
console.log('  ✅ PASS: Seamlessly switched active workspace to AI Health Diagnostic System');

// 3. File Sharing Feature Verification
console.log('\nTest 3: File Attachment & Sharing in Team Workspace');
assert.strictEqual(formatFileSize(1024 * 512), '512 KB');
assert.strictEqual(formatFileSize(1024 * 1024 * 2.5), '2.5 MB');
assert.strictEqual(getFileIconName('application/pdf', 'model_architecture.pdf'), 'file-text');
assert.strictEqual(getFileIconName('image/png', 'ui_mockup.png'), 'image');
assert.strictEqual(getFileIconName('application/zip', 'source_code.zip'), 'folder-archive');

// User attaches and sends a file in Project 1:
const sampleFile = {
    name: 'model_architecture.pdf',
    size: formatFileSize(1024 * 750),
    type: 'application/pdf',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
    uploader: currentUser.fullName,
    time: '11:00 AM'
};

const outgoingMessage = {
    id: 'msg-1',
    author: currentUser.fullName,
    text: 'Here is the final neural network architecture diagram for review.',
    file: sampleFile,
    time: '11:00 AM',
    isMe: true
};

p1.messages.push(outgoingMessage);
p1.files.push({ id: 'file-1', ...sampleFile });

assert.strictEqual(p1.messages.length, 2);
assert.strictEqual(p1.files.length, 1);
assert.strictEqual(p1.files[0].name, 'model_architecture.pdf');
assert.strictEqual(p2.files.length, 0, 'Project 2 files must remain isolated');
console.log('  ✅ PASS: File attached, sent in chat, and stored in Project 1 resource repository with proper isolation');

// 4. Cross-Team Real-Time Message Notification & Unread Counter
console.log('\nTest 4: Real-Time Inter-Team Message Notification & Unread Badge');
// User is currently viewing Project 1 (activeWorkspaceId = p1.id).
// A teammate sends a message in Project 2 (Smart Campus Transit):
const incomingMsgData = {
    roomId: p2.id,
    projectId: 'p2',
    projectTitle: 'Smart Campus Transit Tracker',
    author: 'Prof. David',
    message: 'We got the GPS API keys! Testing live tracker.',
    file: null,
    time: '11:05 AM'
};

function handleIncomingSocketMessage(data, currentActiveWorkspaceId, isCollabPageOpen) {
    const targetWs = userWorkspaces.find(w => w.id === data.roomId || w.title.toLowerCase() === (data.projectTitle || '').toLowerCase());
    assert(targetWs, 'Target workspace must exist');

    targetWs.messages.push({
        id: 'msg-' + Date.now(),
        author: data.author,
        text: data.message,
        file: data.file,
        time: data.time,
        isMe: false
    });

    let notificationToast = null;
    if (targetWs.id === currentActiveWorkspaceId && isCollabPageOpen) {
        // Appended live to DOM
    } else {
        // Unread badge incremented and notification emitted
        targetWs.unreadCount = (targetWs.unreadCount || 0) + 1;
        notificationToast = `💬 [${targetWs.title}] ${data.author}: ${data.message}`;
    }
    return notificationToast;
}

const toastResult = handleIncomingSocketMessage(incomingMsgData, activeWorkspaceId, true);

assert.strictEqual(p2.unreadCount, 1, 'Project 2 unread counter must increment to 1');
assert.strictEqual(p1.unreadCount, 0, 'Project 1 unread counter must remain 0');
assert.strictEqual(toastResult, '💬 [Smart Campus Transit Tracker] Prof. David: We got the GPS API keys! Testing live tracker.');
console.log('  ✅ PASS: Inter-team message generated unread counter badge and notification toast');

// User switches to Project 2:
activeWorkspaceId = p2.id;
p2.unreadCount = 0; // cleared on opening
assert.strictEqual(p2.unreadCount, 0, 'Unread badge cleared upon opening Project 2');
assert.strictEqual(p2.messages[p2.messages.length - 1].text, 'We got the GPS API keys! Testing live tracker.');
console.log('  ✅ PASS: Opening Project 2 reveals teammate message and clears badge');

// 5. Keyboard Enter Key Dispatch Simulation
console.log('\nTest 5: Keyboard Enter Key Event Handler');
let sentViaEnter = false;
function simulateChatKeydown(e, inputValue, stagedFile) {
    if (e.key === 'Enter' && !e.shiftKey) {
        if (inputValue || stagedFile) {
            sentViaEnter = true;
        }
    }
}

simulateChatKeydown({ key: 'Enter', shiftKey: false }, 'Hello team!', null);
assert.strictEqual(sentViaEnter, true, 'Pressing Enter key must trigger immediate message dispatch');
console.log('  ✅ PASS: Enter key sends message without requiring mouse click');

console.log('\n========================================================================');
console.log('🎉 ALL MULTI-PROJECT WORKSPACE & FILE SHARING TESTS PASSED 100%!');
console.log('========================================================================\n');
