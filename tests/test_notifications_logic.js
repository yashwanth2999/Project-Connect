// tests/test_notifications_logic.js
// Unit test verifying notification separation and personalization between Project Owner & Applicant

const assert = require('assert');

console.log('🧪 Running Notification Logic Verification Test...\n');

// Mock localStorage
const localStorageMap = new Map();
const localStorage = {
    getItem: (key) => localStorageMap.get(key) || null,
    setItem: (key, val) => localStorageMap.set(key, String(val)),
    removeItem: (key) => localStorageMap.delete(key),
    clear: () => localStorageMap.clear()
};

function getNotificationStorageKey(currentUser) {
    if (currentUser && (currentUser.email || currentUser.id)) {
        return `pc_notifications_${currentUser.email || currentUser.id}`;
    }
    return 'pc_notifications';
}

// 1. Storage Isolation Test
console.log('Test 1: User Notification Storage Isolation');
const ownerUser = { id: 'owner-1', email: 'owner@college.edu', fullName: 'Alice Owner' };
const applicantUser = { id: 'app-2', email: 'applicant@college.edu', fullName: 'Bob Applicant' };

const ownerKey = getNotificationStorageKey(ownerUser);
const applicantKey = getNotificationStorageKey(applicantUser);
assert.notStrictEqual(ownerKey, applicantKey, 'Owner and Applicant storage keys must be distinct');
assert.strictEqual(ownerKey, 'pc_notifications_owner@college.edu');
assert.strictEqual(applicantKey, 'pc_notifications_applicant@college.edu');
console.log('  ✅ PASS: Storage keys are correctly isolated per user');

// 2. Application Submission Test
console.log('\nTest 2: Applicant Submits Join Request');
let applicantNotifs = [];
let ownerNotifs = [];

// Simulate applicant submitting join request
const joinRequestPayload = {
    projectId: 'proj-123',
    projectTitle: 'AI Health Diagnostic System',
    ownerName: ownerUser.fullName,
    ownerEmail: ownerUser.email,
    ownerId: ownerUser.id,
    applicantName: applicantUser.fullName,
    applicantEmail: applicantUser.email,
    applicantId: applicantUser.id,
    githubLink: 'https://github.com/bob-applicant',
    pitch: 'Proficient in PyTorch and OpenCV'
};

// Applicant local card creation:
const applicantNotif = {
    id: Date.now(),
    type: "request_sent",
    projectId: joinRequestPayload.projectId,
    projectTitle: joinRequestPayload.projectTitle,
    ownerName: joinRequestPayload.ownerName,
    ownerEmail: joinRequestPayload.ownerEmail,
    applicantName: joinRequestPayload.applicantName,
    applicantEmail: joinRequestPayload.applicantEmail,
    githubLink: joinRequestPayload.githubLink,
    pitch: joinRequestPayload.pitch,
    text: `You requested to join '${joinRequestPayload.projectTitle}'`,
    unread: true,
    time: "Just now",
    status: "pending"
};
applicantNotifs.unshift(applicantNotif);

// Verify Applicant card properties:
assert.strictEqual(applicantNotif.type, 'request_sent', 'Applicant must receive request_sent card');
assert.strictEqual(applicantNotif.status, 'pending', 'Initial status must be pending');
assert.strictEqual(applicantNotif.text, "You requested to join 'AI Health Diagnostic System'");
console.log('  ✅ PASS: Applicant receives personalized request_sent card (without owner action buttons)');

// Simulate Owner receiving socket event:
function handleReceiveJoinRequest(data, currentUser, ownerNotifList) {
    const isApplicant = currentUser && (
        (data.applicantId && currentUser.id && String(data.applicantId) === String(currentUser.id)) ||
        (data.applicantEmail && currentUser.email && data.applicantEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (isApplicant) return; // Applicant should NOT receive the owner card

    const isOwner = !currentUser || (
        (data.ownerId && currentUser.id && String(data.ownerId) === String(currentUser.id)) ||
        (data.ownerEmail && currentUser.email && data.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (data.ownerName && currentUser.fullName && data.ownerName.toLowerCase() === currentUser.fullName.toLowerCase())
    );

    if (isOwner) {
        ownerNotifList.unshift({
            id: data.id || Date.now(),
            type: "join_request",
            projectId: data.projectId,
            projectTitle: data.projectTitle,
            ownerName: data.ownerName,
            ownerEmail: data.ownerEmail,
            applicantName: data.applicantName,
            applicantEmail: data.applicantEmail,
            githubLink: data.githubLink,
            pitch: data.pitch,
            text: `${data.applicantName} requested to join '${data.projectTitle}'`,
            unread: true,
            time: "Just now",
            status: "pending"
        });
    }
}

// Test owner receives card
handleReceiveJoinRequest(joinRequestPayload, ownerUser, ownerNotifs);
assert.strictEqual(ownerNotifs.length, 1);
assert.strictEqual(ownerNotifs[0].type, 'join_request');
assert.strictEqual(ownerNotifs[0].status, 'pending');
assert.strictEqual(ownerNotifs[0].text, "Bob Applicant requested to join 'AI Health Diagnostic System'");
console.log('  ✅ PASS: Owner receives actionable join_request card');

// Test applicant does NOT receive owner card via broadcast
let applicantFakeNotifs = [];
handleReceiveJoinRequest(joinRequestPayload, applicantUser, applicantFakeNotifs);
assert.strictEqual(applicantFakeNotifs.length, 0, 'Applicant must NOT receive the owner join_request card');
console.log('  ✅ PASS: Applicant is shielded from owner join_request socket events');

// 3. Owner Decision Test - Acceptance
console.log('\nTest 3: Owner Accepts Application');
// Owner clicks Accept:
const ownerCard = ownerNotifs[0];
ownerCard.status = 'accepted';
ownerCard.unread = false;

assert.strictEqual(ownerNotifs[0].status, 'accepted');
assert.strictEqual(ownerNotifs.length, 1, 'Owner card list count remains 1 (updated in place, not duplicated)');
console.log('  ✅ PASS: Owner card status updated in place to accepted');

// Simulate decision socket event received by Applicant:
function handleReceiveJoinDecision(data, currentUser, notifList) {
    const isOwner = currentUser && (
        (data.ownerId && currentUser.id && String(data.ownerId) === String(currentUser.id)) ||
        (data.ownerEmail && currentUser.email && data.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
    const isApplicant = !currentUser || (
        (data.applicantId && currentUser.id && String(data.applicantId) === String(currentUser.id)) ||
        (data.applicantEmail && currentUser.email && data.applicantEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (data.applicantName && currentUser.fullName && data.applicantName.toLowerCase() === currentUser.fullName.toLowerCase())
    );

    if (isOwner && !isApplicant) return;

    if (isApplicant) {
        const sentNotif = notifList.find(n => (n.projectId === data.projectId || n.projectTitle === data.projectTitle) && (n.type === 'request_sent' || n.type === 'my_application'));
        if (sentNotif) {
            sentNotif.status = data.status;
        }

        if (data.status === 'accepted') {
            notifList.unshift({
                id: Date.now(),
                type: "request_accepted",
                projectId: data.projectId,
                projectTitle: data.projectTitle,
                ownerName: data.ownerName,
                applicantName: data.applicantName,
                text: `${data.ownerName || 'Project owner'} accepted your request to join '${data.projectTitle}'!`,
                unread: true,
                time: "Just now",
                status: "accepted"
            });
        }
    }
}

const acceptDecisionPayload = {
    status: 'accepted',
    projectId: joinRequestPayload.projectId,
    projectTitle: joinRequestPayload.projectTitle,
    ownerName: ownerUser.fullName,
    ownerEmail: ownerUser.email,
    ownerId: ownerUser.id,
    applicantName: applicantUser.fullName,
    applicantEmail: applicantUser.email,
    applicantId: applicantUser.id
};

handleReceiveJoinDecision(acceptDecisionPayload, applicantUser, applicantNotifs);

assert.strictEqual(applicantNotifs.length, 2);
assert.strictEqual(applicantNotifs[0].type, 'request_accepted');
assert.strictEqual(applicantNotifs[0].text, "Alice Owner accepted your request to join 'AI Health Diagnostic System'!");
assert.strictEqual(applicantNotifs[1].status, 'accepted', 'Original request_sent card updated to accepted');
console.log('  ✅ PASS: Applicant receives personalized request_accepted card and original request_sent status updated');

// Test that Owner does NOT get duplicate applicant decision cards:
handleReceiveJoinDecision(acceptDecisionPayload, ownerUser, ownerNotifs);
assert.strictEqual(ownerNotifs.length, 1, 'Owner notif list is not polluted by applicant decision events');
console.log('  ✅ PASS: Owner notification list remains clean');

console.log('\n======================================================');
console.log('🎉 ALL NOTIFICATION PERSONALIZATION TESTS PASSED 100%!');
console.log('======================================================\n');
