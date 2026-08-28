// ── BACKEND & DATABASE CONNECTION CONFIGURATION ───────────────────────────
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isGitHubPages = window.location.hostname.includes('github.io');

// Live cloud backend URL: points to your live secure Cloudflare tunnel connected to your real backend & database!
// You can also change this anytime from the browser console with: setBackendUrl("https://your-url.com")
const DEFAULT_CLOUD_BACKEND = "https://axis-postposted-dude-binding.trycloudflare.com";

let BACKEND_HOST = localStorage.getItem('custom_backend_url') || (
    isLocal && (window.location.port === '3000' || !window.location.port)
        ? `http://${window.location.hostname}:5001`
        : (isGitHubPages ? (localStorage.getItem('custom_backend_url') || DEFAULT_CLOUD_BACKEND) : window.location.origin)
);

const BASE_URL = `${BACKEND_HOST}/api`;
const SOCKET_URL = BACKEND_HOST;

// Helper to configure or update the cloud backend URL directly
window.setBackendUrl = function(url) {
    if (!url) {
        localStorage.removeItem('custom_backend_url');
        console.log('Reset backend URL to default:', DEFAULT_CLOUD_BACKEND);
    } else {
        const clean = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
        localStorage.setItem('custom_backend_url', clean);
        console.log('Custom backend URL saved:', clean);
    }
    location.reload();
};

let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let authToken = localStorage.getItem('token') || null;

// Demo project data per domain (Fallback)
const demoProjects = {
    ai: [
        {
            _id: "demo-ai-1",
            title: "AI‑based Project Idea Recommender",
            type: "Final‑year • Cross‑college",
            status: "Open",
            teamSize: 2,
            acceptedMembers: 0,
            needed: "Teammates Required: 2",
            skills: ["Python", "Scikit‑learn", "FastAPI"],
            owner: "3rd year • CSE",
            tags: ["AI", "Recommendation"],
        }
    ],
    web: [],
    data: [],
    se: []
};

const projectsGrid = document.getElementById("projectsGrid");
const tabButtons = document.querySelectorAll(".tab-btn");

// Global router first so we can use it
function navigateTo(pageId) {
    if (pageId === 'about') {
        navigateTo('home');
        setTimeout(() => {
            const aboutSec = document.getElementById('aboutSection');
            if (aboutSec) aboutSec.scrollIntoView({ behavior: 'smooth' });
        }, 120);
        return;
    }

    // Hide all pages
    document.querySelectorAll('.page-view').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    } else {
        console.error("Page not found:", pageId);
    }
}

async function renderProjects(domain) {
    if (!projectsGrid) return;
    projectsGrid.innerHTML = "Loading...";

    let projects = [];
    try {
        const response = await fetch(`${BASE_URL}/projects?domain=${domain}`);
        if (response.ok) {
            projects = await response.json();
        } else {
            console.error("Failed to fetch projects");
            projects = demoProjects[domain] || []; // Fallback
        }
    } catch (e) {
        console.error("Error fetching projects", e);
        projects = demoProjects[domain] || []; // Fallback
    }

    projectsGrid.innerHTML = "";
    if (projects.length === 0) {
        projectsGrid.innerHTML = "<p style='color: white;'>No projects found for this domain yet.</p>";
        return;
    }

    projects.forEach((p) => {
        const card = document.createElement("article");
        card.className = "project-card";

        const badgeRow = document.createElement("div");
        badgeRow.className = "project-badge-row";

        // Calculate total needed, accepted, and remaining vacancies
        const totalNeeded = typeof p.teamSize === 'number'
            ? p.teamSize
            : (parseInt(p.needed && p.needed.replace(/[^0-9]/g, '')) || 2);
        const accepted = typeof p.acceptedMembers === 'number' ? p.acceptedMembers : 0;
        const remaining = Math.max(0, totalNeeded - accepted);
        const isFull = remaining === 0;

        const projectType = p.type || (p.collegeOnly ? "College‑only Project" : "Final‑year • Team Project");

        const leftPill = document.createElement("div");
        leftPill.className = "pill-mini";
        const dot = document.createElement("span");
        dot.className = "dot " + (isFull ? "dot-closed" : "");
        leftPill.appendChild(dot);
        leftPill.appendChild(document.createTextNode(projectType));

        // Format as "Teammates Required: <remaining>" or "Teammates Required: 0 (Team full)"
        const rightPill = document.createElement("div");
        rightPill.className = "pill-mini" + (isFull ? " team-full-pill" : " teammates-pill");
        rightPill.textContent = isFull
            ? "Teammates Required: 0 (Team full)"
            : `Teammates Required: ${remaining}`;

        badgeRow.appendChild(leftPill);
        badgeRow.appendChild(rightPill);

        const title = document.createElement("h3");
        title.className = "project-title";
        title.textContent = p.title;

        const meta = document.createElement("div");
        meta.className = "project-meta";
        const skillsLabel = document.createElement("span");
        skillsLabel.textContent = "Required skills:";
        meta.appendChild(skillsLabel);
        (p.skills || []).forEach((s) => {
            const chip = document.createElement("span");
            chip.className = "skill-chip";
            chip.textContent = s;
            meta.appendChild(chip);
        });

        const footer = document.createElement("div");
        footer.className = "project-footer";

        const footerLeft = document.createElement("div");
        footerLeft.className = "project-footer-left";

        const owner = document.createElement("span");
        owner.className = "project-owner";
        owner.textContent = typeof p.author === 'object' && p.author ? p.author.fullName : (p.owner || "Anonymous");

        const tagsRow = document.createElement("div");
        tagsRow.className = "project-tags";
        const tags = p.tags || [];
        tags.forEach((t) => {
            const tagChip = document.createElement("span");
            tagChip.className = "skill-chip";
            tagChip.textContent = t;
            tagsRow.appendChild(tagChip);
        });

        footerLeft.appendChild(owner);
        footerLeft.appendChild(tagsRow);

        const joinBtn = document.createElement("button");
        joinBtn.className = "project-btn";
        joinBtn.type = "button";
        if (isFull) {
            joinBtn.disabled = true;
            joinBtn.style.opacity = "0.5";
            joinBtn.style.cursor = "not-allowed";
            joinBtn.innerHTML = `<span>Team full</span> <i data-lucide="lock" style="width:14px; height:14px;"></i>`;
        } else {
            joinBtn.innerHTML = `<span>Request to join</span> <i data-lucide="handshake" style="width:14px; height:14px;"></i>`;
            joinBtn.addEventListener("click", () => {
                const ownerName = typeof p.author === 'object' && p.author ? p.author.fullName : (p.owner || "Project Owner");
                openRequestModal(p._id || p.title, p.title, ownerName);
            });
        }

        footer.appendChild(footerLeft);
        footer.appendChild(joinBtn);

        card.appendChild(badgeRow);
        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(footer);

        projectsGrid.appendChild(card);
    });
}

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const domain = btn.getAttribute("data-domain");
        renderProjects(domain);
    });
});

renderProjects("ai");

// Toast system
const toastInner = document.getElementById("toastInner");
const toastMessage = document.getElementById("toastMessage");
const toastClose = document.getElementById("toastClose");
let toastTimeout;

function showToast(message) {
    if (!toastMessage || !toastInner) return;
    toastMessage.textContent = message;
    toastInner.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastInner.classList.remove("visible");
    }, 2600);
}

if (toastClose) {
    toastClose.addEventListener("click", () => {
        toastInner.classList.remove("visible");
    });
}

// Request Modal Logic
const requestModal = document.getElementById("requestModal");
const requestClose = document.getElementById("requestClose");
const requestForm = document.getElementById("requestForm");
const requestProjectTitle = document.getElementById("requestProjectTitle");
let currentRequestProjectId = null;
let currentRequestProjectOwner = null;

function openRequestModal(projectId, projectTitle, ownerName) {
    if (!requestModal) return;
    currentRequestProjectId = projectId;
    currentRequestProjectOwner = ownerName || "Project Owner";
    requestProjectTitle.textContent = projectTitle;
    requestModal.classList.remove("hidden");
    requestModal.classList.add("open");
}

function closeRequestModal() {
    if (!requestModal) return;
    requestModal.classList.remove("open");
    requestModal.classList.add("hidden");
}

function setupTeamGroup(projectTitle, ownerName, teammateName, teammateGithub) {
    const teamTitleEl = document.getElementById("teamRoomTitle");
    if (teamTitleEl) {
        teamTitleEl.textContent = projectTitle || "AI Project Workspace";
    }

    // Populate Team Members Sidebar
    const sidebar = document.getElementById("teamSidebarMembers");
    if (sidebar) {
        const ownerInitials = (ownerName || "Owner").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "TL";
        const teammateInitials = (teammateName || "Teammate").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "TM";

        sidebar.innerHTML = `
            <div class="section-label">Team Members (2)</div>
            <div class="member-item">
                <div class="member-avatar" style="background:#38bdf8">${ownerInitials}</div>
                <div class="member-info">
                    <div class="member-name">${ownerName || "Project Lead"}</div>
                    <div class="member-role" style="color:#38bdf8; font-weight:600;">👑 Project Owner</div>
                </div>
            </div>
            <div class="member-item">
                <div class="member-avatar" style="background:#22c55e">${teammateInitials}</div>
                <div class="member-info">
                    <div class="member-name">${teammateName || "Accepted Teammate"}</div>
                    <div class="member-role" style="color:#4ade80;">🚀 Teammate</div>
                    ${teammateGithub ? `
                        <a href="${teammateGithub}" target="_blank" rel="noopener noreferrer" class="member-github-link">
                            <i data-lucide="github" style="width:11px; height:11px;"></i> View GitHub
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Announce group creation in Team Chat
    if (teamChatMessages) {
        const divider = document.createElement("div");
        divider.className = "date-divider";
        divider.textContent = `Group Workspace Created • ${projectTitle}`;
        teamChatMessages.appendChild(divider);

        const announcement = document.createElement("div");
        announcement.className = "team-system-announcement";
        announcement.innerHTML = `
            <div class="system-announcement-card">
                <div class="system-announcement-header">
                    <i data-lucide="party-popper" style="width:16px;height:16px;color:#38bdf8;"></i>
                    <strong>Team Formed Successfully!</strong>
                </div>
                <p><strong>${ownerName || "Project Owner"}</strong> accepted <strong>${teammateName || "Applicant"}</strong> into the project <em>${projectTitle}</em>.</p>
                ${teammateGithub ? `
                    <div class="announcement-github">
                        <i data-lucide="github" style="width:13px;height:13px;"></i>
                        <span>Teammate GitHub:</span>
                        <a href="${teammateGithub}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:underline;">${teammateGithub}</a>
                    </div>
                ` : ''}
                <div class="announcement-hint">A dedicated group workspace is ready. You can brainstorm in real time, coordinate milestones, or click "Join Virtual Meeting" to start a call.</div>
            </div>
        `;
        teamChatMessages.appendChild(announcement);
        teamChatMessages.scrollTop = teamChatMessages.scrollHeight;
    }

    // Switch Socket room
    const newRoomId = 'project-' + (projectTitle || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    currentRoomId = newRoomId;
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('join-room', currentRoomId);
    }

    // Direct to Collaboration Window
    navigateTo("collaboration");

    if (window.lucide) {
        lucide.createIcons();
    }
}

async function acceptProjectTeammate(projectId, projectTitle, notifIndex) {
    let remainingVacancies = null;

    // 1. Call backend endpoint if valid DB id
    if (projectId && !projectId.toString().startsWith('demo-')) {
        try {
            const res = await fetch(`${BASE_URL}/projects/${projectId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                remainingVacancies = data.remainingVacancies;
            }
        } catch (e) {
            console.warn("Could not sync accept with backend:", e);
        }
    }

    // 2. Also update matching demo project in memory
    for (const domain in demoProjects) {
        const found = demoProjects[domain].find(p => p._id === projectId || p.title === projectTitle);
        if (found) {
            found.acceptedMembers = (found.acceptedMembers || 0) + 1;
            const total = found.teamSize || 2;
            remainingVacancies = Math.max(0, total - found.acceptedMembers);
            found.needed = remainingVacancies === 0 ? "Teammates Required: 0 (Team full)" : `Teammates Required: ${remainingVacancies}`;
        }
    }

    // 3. Update notification state
    if (typeof notifIndex === 'number' && mockNotifs[notifIndex]) {
        mockNotifs[notifIndex].status = "accepted";
        renderNotifications();
    } else {
        const notif = mockNotifs.find(n => (n.projectId === projectId || n.projectTitle === projectTitle) && (n.actionType === "accept_request" || n.type === "join_request"));
        if (notif) {
            notif.status = "accepted";
            renderNotifications();
        }
    }

    // 4. Re-render active domain projects so cards reflect only remaining vacancies immediately!
    const activeTab = document.querySelector(".tab-btn.active");
    const currentDomain = activeTab ? activeTab.getAttribute("data-domain") : "ai";
    await renderProjects(currentDomain);

    return remainingVacancies;
}

if (requestClose) requestClose.addEventListener("click", closeRequestModal);

if (requestForm) {
    requestForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const roomTitle = requestProjectTitle.textContent;
        const projectId = currentRequestProjectId;
        const ownerName = currentRequestProjectOwner || "Project Owner";

        const pitchInput = document.getElementById("requestPitchInput");
        const githubInput = document.getElementById("requestGithubInput");
        const pitch = pitchInput ? pitchInput.value.trim() : "";
        const github = githubInput ? githubInput.value.trim() : "";

        closeRequestModal();
        showToast("Request sent to project owner!");

        const applicantName = currentUser ? currentUser.fullName : "Student Applicant";
        const applicantEmail = currentUser ? currentUser.email : "applicant@college.edu";
        const applicantGithub = github || "https://github.com/student-applicant";

        // Send join-request to backend if valid DB id
        if (projectId && !projectId.toString().startsWith('demo-')) {
            fetch(`${BASE_URL}/projects/${projectId}/join-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pitch, githubLink: applicantGithub, applicantName })
            }).catch(err => console.warn('Could not register join request:', err));
        }

        // Add Notification for the Project Owner with [Accept] & [Reject] actions and submitted GitHub link
        const newNotif = {
            id: Date.now(),
            type: "join_request",
            projectId: projectId,
            projectTitle: roomTitle,
            ownerName: ownerName,
            applicantName: applicantName,
            applicantEmail: applicantEmail,
            githubLink: applicantGithub,
            pitch: pitch || "I have relevant experience and would like to join this project team!",
            text: `${applicantName} requested to join '${roomTitle}'`,
            unread: true,
            time: "Just now",
            status: "pending"
        };
        mockNotifs.unshift(newNotif);
        renderNotifications();

        // Simulate Project Owner Accepting Request after 3s if not already handled
        setTimeout(async () => {
            const notif = mockNotifs.find(n => n.id === newNotif.id);
            if (notif && notif.status === "pending") {
                await acceptProjectTeammate(projectId, roomTitle);
                notif.status = "accepted";
                renderNotifications();
                showToast(`Project owner accepted your request for '${roomTitle}'! Redirecting to group workspace...`);
                setTimeout(() => {
                    setupTeamGroup(roomTitle, ownerName, applicantName, applicantGithub);
                }, 1000);
            }
        }, 3000);

        requestForm.reset();
    });
}


// Form handling (post project)
const projectForm = document.getElementById("projectForm");
if (projectForm) {
    projectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const checkbox = document.getElementById("collegeOnlyCheckbox");
        if (!checkbox.checked) {
            showToast("Please confirm this is a college‑related project.");
            return;
        }

        if (!authToken) {
            showToast("You need to login to post a project.");
            openAuthModal();
            return;
        }

        const inputs = projectForm.querySelectorAll('.field-input, .field-select, .field-textarea');
        const payload = {
            title: inputs[0].value,
            domain: inputs[1].value,
            skills: inputs[2].value,
            teamSize: parseInt(inputs[3].value, 10),
            description: inputs[4].value,
            collegeOnly: checkbox.checked
        };

        try {
            const res = await fetch(`${BASE_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast("Project idea published successfully!");
                projectForm.reset();
                navigateTo("home");
                renderProjects(payload.domain);
            } else {
                const data = await res.json();
                showToast(data.message || "Error posting project");
            }
        } catch (err) {
            console.error(err);
            // Fallback for demo without backend
            const demoProj = {
                title: payload.title,
                type: "Demo • Cross-college",
                status: "Open",
                teamSize: parseInt(payload.teamSize) || 2,
                acceptedMembers: 0,
                needed: `Teammates Required: ${payload.teamSize}`,
                skills: payload.skills.split(',').map(s => s.trim()).filter(Boolean),
                owner: currentUser ? currentUser.fullName : "Demo User",
                tags: [payload.domain.toUpperCase(), "Demo"]
            };
            
            if (!demoProjects[payload.domain]) {
                demoProjects[payload.domain] = [];
            }
            demoProjects[payload.domain].unshift(demoProj);
            
            showToast("Project idea published successfully! (Demo mode)");
            projectForm.reset();
            navigateTo("home");
            renderProjects(payload.domain);
        }
    });
}

const openCollabTop = document.getElementById("openCollabTop");

// Notifications button to page
const openNotifications = document.getElementById("openNotifications");
if (openNotifications) {
    openNotifications.addEventListener("click", () => {
        navigateTo("notifications");
        renderNotifications(); // Ensure list is refreshed
    });
}

if (openCollabTop) {
    openCollabTop.addEventListener("click", () => {
        navigateTo("collaboration");
    });
}

document.getElementById("getStartedBtn").addEventListener("click", () => {
    showToast("Redirecting to signup...");
    openAuthModal();
});

document.getElementById("openPost").addEventListener("click", () => {
    navigateTo("post-project");
    showToast("Opened Post Project page.");
});



document.getElementById("openHome").addEventListener("click", () => {
    navigateTo("home");
});



// Notifications Logic
const notifBadge = document.getElementById("notifBadge");
const notifListPage = document.getElementById("notifListPage");
const clearNotifsPage = document.getElementById("clearNotifsPage");

// Output mock notifications

// Output mock notifications
const mockNotifs = [
    { text: "Arjun mentioned you in Team Chat", unread: true, time: "2 min ago", actionLabel: "Reply", actionType: "chat" },
    { text: "New project: 'Smart Campus' posted in AI", unread: true, time: "1h ago", actionLabel: "View Project", actionType: "view_project" },
    { text: "Your request for 'Web Saas' was viewed", unread: false, time: "3h ago", actionLabel: "Check Status", actionType: "view_request" }
];

function renderNotifications() {
    if (!notifListPage) return;
    notifListPage.innerHTML = "";

    if (mockNotifs.length === 0) {
        notifListPage.innerHTML = '<div class="notif-empty">No new notifications</div>';
        if (notifBadge) notifBadge.classList.remove("active");
        return;
    }

    let hasUnread = false;
    mockNotifs.forEach((n, index) => {
        const item = document.createElement("div");

        if (n.type === "join_request" || n.githubLink) {
            // Specialized Join Request Notification Card for Project Owner
            item.className = `notif-item notif-request-card ${n.unread ? 'unread' : ''}`;
            item.innerHTML = `
                <div class="notif-request-main">
                    <div class="notif-request-header">
                        <span class="icon" style="margin-top:2px;">
                            ${n.unread ? '<i data-lucide="bell-ring" style="width:15px; height:15px; color:#38bdf8;"></i>' : '<i data-lucide="bell" style="width:15px; height:15px;"></i>'}
                        </span>
                        <div style="flex:1;">
                            <div class="notif-title-row">
                                <strong style="color:#f8fafc; font-size:13px;">${n.applicantName || "Student"}</strong>
                                <span style="font-size:11px; color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 8px; border-radius:12px; border:1px solid rgba(56,189,248,0.25);">
                                    Join Request • Applied to: <strong>${n.projectTitle}</strong>
                                </span>
                            </div>
                            ${n.pitch ? `<div class="notif-pitch-text">"${n.pitch}"</div>` : ''}
                            ${n.githubLink ? `
                                <div>
                                    <a href="${n.githubLink}" target="_blank" rel="noopener noreferrer" class="notif-github-link" title="Open GitHub Profile">
                                        <i data-lucide="github" style="width:13px; height:13px;"></i>
                                        <span>${n.githubLink}</span>
                                        <i data-lucide="external-link" style="width:11px; height:11px; opacity:0.7;"></i>
                                    </a>
                                </div>
                            ` : ''}
                            <div style="font-size:10px; color:var(--muted); margin-top:6px;">${n.time}</div>
                        </div>
                    </div>

                    <div class="notif-actions-row">
                        ${n.status === 'pending' ? `
                            <button class="notif-action-btn notif-accept-btn" data-action="accept_request" data-index="${index}">
                                <i data-lucide="check" style="width:13px; height:13px;"></i> Accept
                            </button>
                            <button class="notif-action-btn notif-reject-btn" data-action="reject_request" data-index="${index}">
                                <i data-lucide="x" style="width:13px; height:13px;"></i> Reject
                            </button>
                        ` : n.status === 'accepted' ? `
                            <span class="notif-badge-accepted">
                                <i data-lucide="check-circle" style="width:13px; height:13px;"></i> Accepted (Teammate Added)
                            </span>
                            <button class="notif-action-btn notif-group-btn" data-action="view_group" data-index="${index}">
                                <i data-lucide="users" style="width:13px; height:13px;"></i> Open Group
                            </button>
                        ` : `
                            <span class="notif-badge-rejected">
                                <i data-lucide="x-circle" style="width:13px; height:13px;"></i> Rejected
                            </span>
                        `}
                    </div>
                </div>
            `;
        } else {
            // General notification item
            item.className = `notif-item ${n.unread ? 'unread' : ''}`;
            item.innerHTML = `
                <div style="display:flex; align-items:flex-start; gap:10px; width:100%;">
                    <span class="icon" style="font-size:12px; margin-top:4px;">${n.unread ? '<i data-lucide="circle-dot" style="width:12px; height:12px; color:#3b82f6;"></i>' : '<i data-lucide="circle" style="width:12px; height:12px;"></i>'}</span>
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                        <span style="font-size:13px; color:var(--text);">${n.text}</span>
                        <span style="font-size:10px; color:var(--muted);">${n.time}</span>
                    </div>
                    ${n.actionLabel ? `<button class="notif-action-btn ${n.status === 'accepted' ? 'accepted' : ''}" data-action="${n.actionType || ''}" data-index="${index}">${n.actionLabel}</button>` : ''}
                </div>
            `;
        }

        notifListPage.appendChild(item);
        if (n.unread) hasUnread = true;
    });

    if (notifBadge) {
        if (hasUnread) notifBadge.classList.add("active");
        else notifBadge.classList.remove("active");
    }

    if (window.lucide) lucide.createIcons();
}

// Handle Notification Actions
if (notifListPage) {
    notifListPage.addEventListener("click", async (e) => {
        const btn = e.target.closest(".notif-action-btn");
        if (!btn) return;

        const index = btn.getAttribute("data-index");
        const action = btn.getAttribute("data-action");
        const notif = mockNotifs[index];
        if (!notif) return;

        if (action === "accept_request" || notif.actionType === "accept_request") {
            if (notif.status === "accepted") {
                showToast("This request has already been accepted.");
                return;
            }

            // 1. Mark accepted
            notif.status = "accepted";
            notif.unread = false;

            // 2. Decrement remaining vacancies on project
            await acceptProjectTeammate(notif.projectId, notif.projectTitle);

            // 3. Re-render notification state
            renderNotifications();

            // 4. Directly direct to Collaboration window and create team group!
            setupTeamGroup(
                notif.projectTitle,
                notif.ownerName || (currentUser ? currentUser.fullName : "Project Owner"),
                notif.applicantName || "Accepted Teammate",
                notif.githubLink || ""
            );

            showToast(`Teammate accepted! Directed to collaboration workspace group.`);

        } else if (action === "reject_request") {
            notif.status = "rejected";
            notif.unread = false;
            renderNotifications();
            showToast(`Join request for '${notif.projectTitle}' from ${notif.applicantName || 'user'} was rejected.`);

        } else if (action === "view_group") {
            setupTeamGroup(
                notif.projectTitle,
                notif.ownerName || (currentUser ? currentUser.fullName : "Project Owner"),
                notif.applicantName || "Accepted Teammate",
                notif.githubLink || ""
            );
            showToast(`Opening team group for '${notif.projectTitle}'...`);

        } else if (notif.actionType === "chat") {
            navigateTo("collaboration");
            showToast(`Replying to ${notif.text.split(' ')[0]}...`);
        } else if (notif.actionType === "view_project") {
            navigateTo("collaboration");
            showToast("Opening Project Details...");
        } else if (notif.actionType === "view_request") {
            showToast("Status: Under Review by Faculty");
        } else if (notif.actionType === "view_request_details") {
            showToast("Opening Request details...");
        }
    });
}


if (clearNotifsPage) {
    clearNotifsPage.addEventListener("click", () => {
        mockNotifs.length = 0; // Clear array
        renderNotifications();
    });
}

// Initial render
renderNotifications();

// Login / signup modal
const authModal = document.getElementById("authModal");
const openLoginBtn = document.getElementById("openLogin");
const authClose = document.getElementById("authClose");
const authTabButtons = document.querySelectorAll(".modal-tab-btn");
const loginFormModal = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
function openAuthModal() {
    authModal.classList.remove("hidden");
    authModal.classList.add("open");
    document.getElementById("authClose").style.display = "block";
}

function closeAuthModal() {
    authModal.classList.remove("open");
    authModal.classList.add("hidden");
    resetForgotState();
}

if (openLoginBtn) openLoginBtn.addEventListener("click", openAuthModal);
if (authClose) authClose.addEventListener("click", closeAuthModal);
if (authModal) {
    authModal.addEventListener("click", (e) => {
        const appVisible = document.querySelector(".app-shell").classList.contains("visible");
        if (e.target === authModal && appVisible) closeAuthModal();
    });
}

authTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        authTabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.getAttribute("data-auth-tab");
        resetForgotState();
        if (tab === "login") {
            loginFormModal.classList.remove("hidden");
            signupForm.classList.add("hidden");
        } else {
            signupForm.classList.remove("hidden");
            loginFormModal.classList.add("hidden");
        }
    });
});

if (loginFormModal) {
    loginFormModal.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginFormModal.querySelectorAll('.modal-input')[0].value;
        const password = loginFormModal.querySelectorAll('.modal-input')[1].value;

        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                updateUserProfileUI();

                document.querySelector(".app-shell").classList.add("visible");
                closeAuthModal();
                showToast("Logged in successfully. Welcome!");
                document.getElementById("authClose").style.display = "block";
                navigateTo('home');
            } else {
                showToast(data.message || "Login failed");
            }
        } catch (err) {
            console.error(err);
            // Fallback for demo without backend
            authToken = 'demo-token';
            currentUser = { fullName: 'Demo User', email: email };
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserProfileUI();
            
            document.querySelector(".app-shell").classList.add("visible");
            closeAuthModal();
            showToast("Logged in (Demo mode). Welcome!");
            document.getElementById("authClose").style.display = "block";
            navigateTo('home');
        }
    });
}

// ── OTP PASSWORD RESET CONTROLLERS ──────────────────────────────────────
const forgotStep1Form       = document.getElementById("forgotStep1Form");
const forgotStep2Form       = document.getElementById("forgotStep2Form");
const forgotStep3Form       = document.getElementById("forgotStep3Form");
const showForgotPasswordLink = document.getElementById("showForgotPasswordLink");
const backToLoginFromStep1   = document.getElementById("backToLoginFromStep1");

const otpEmailInput          = document.getElementById("otpEmailInput");
const sendOtpBtn             = document.getElementById("sendOtpBtn");
const otpStep1Error          = document.getElementById("otpStep1Error");

const otpSentToLabel         = document.getElementById("otpSentToLabel");
const devOtpBanner           = document.getElementById("devOtpBanner");
const otpDigitInputs         = document.querySelectorAll(".otp-digit");
const otpTimerCount          = document.getElementById("otpTimerCount");
const resendOtpBtn           = document.getElementById("resendOtpBtn");
const verifyOtpBtn          = document.getElementById("verifyOtpBtn");
const otpStep2Error          = document.getElementById("otpStep2Error");

const newPasswordInput       = document.getElementById("newPasswordInput");
const confirmPasswordInput   = document.getElementById("confirmPasswordInput");
const resetPasswordBtn       = document.getElementById("resetPasswordBtn");
const otpStep3Error          = document.getElementById("otpStep3Error");

let resetEmail = "";
let otpCountdownTimer = null;
let otpSecondsRemaining = 600; // 10 minutes

function fillOtp(code) {
    const chars = String(code).split('');
    chars.forEach((c, idx) => {
        if (otpDigitInputs[idx]) {
            otpDigitInputs[idx].value = c;
            otpDigitInputs[idx].classList.add("filled");
        }
    });
    if (otpDigitInputs[otpDigitInputs.length - 1]) {
        otpDigitInputs[otpDigitInputs.length - 1].focus();
    }
}

function resetForgotState() {
    if (otpCountdownTimer) {
        clearInterval(otpCountdownTimer);
        otpCountdownTimer = null;
    }
    if (forgotStep1Form) { forgotStep1Form.reset(); forgotStep1Form.classList.add("hidden"); }
    if (forgotStep2Form) { forgotStep2Form.reset(); forgotStep2Form.classList.add("hidden"); }
    if (forgotStep3Form) { forgotStep3Form.reset(); forgotStep3Form.classList.add("hidden"); }
    if (devOtpBanner)    { devOtpBanner.style.display = "none"; devOtpBanner.innerHTML = ""; }
    if (otpStep1Error)   { otpStep1Error.style.display = "none"; otpStep1Error.textContent = ""; }
    if (otpStep2Error)   { otpStep2Error.style.display = "none"; otpStep2Error.textContent = ""; }
    if (otpStep3Error)   { otpStep3Error.style.display = "none"; otpStep3Error.textContent = ""; }
    otpDigitInputs.forEach(input => { input.value = ""; input.classList.remove("filled"); });
}

function startOtpTimer() {
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    otpSecondsRemaining = 600; // 10 mins
    if (resendOtpBtn) resendOtpBtn.disabled = true;

    function updateDisplay() {
        const mins = Math.floor(otpSecondsRemaining / 60);
        const secs = otpSecondsRemaining % 60;
        if (otpTimerCount) {
            otpTimerCount.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        // Enable resend after 30 seconds
        if (otpSecondsRemaining <= 570 && resendOtpBtn) {
            resendOtpBtn.disabled = false;
        }
        if (otpSecondsRemaining <= 0) {
            clearInterval(otpCountdownTimer);
            if (otpTimerCount) otpTimerCount.textContent = "Expired";
            if (resendOtpBtn) resendOtpBtn.disabled = false;
        } else {
            otpSecondsRemaining--;
        }
    }

    updateDisplay();
    otpCountdownTimer = setInterval(updateDisplay, 1000);
}

// Digits input auto-focus & handling
otpDigitInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val;
        if (val) {
            input.classList.add("filled");
            if (index < otpDigitInputs.length - 1) {
                otpDigitInputs[index + 1].focus();
            }
        } else {
            input.classList.remove("filled");
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
            otpDigitInputs[index - 1].focus();
        }
    });

    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
        if (!pastedData) return;
        const chars = pastedData.slice(0, otpDigitInputs.length).split('');
        chars.forEach((char, i) => {
            if (otpDigitInputs[i]) {
                otpDigitInputs[i].value = char;
                otpDigitInputs[i].classList.add("filled");
            }
        });
        const nextIdx = Math.min(chars.length, otpDigitInputs.length - 1);
        otpDigitInputs[nextIdx].focus();
    });
});

// Click "Forgot Password?"
if (showForgotPasswordLink) {
    showForgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        resetForgotState();
        loginFormModal.classList.add("hidden");
        signupForm.classList.add("hidden");
        document.querySelector(".modal-tabs").style.display = "none";
        forgotStep1Form.classList.remove("hidden");
        if (otpEmailInput) otpEmailInput.focus();
        if (window.lucide) lucide.createIcons();
    });
}

// "Back to Login"
function returnToLogin() {
    resetForgotState();
    document.querySelector(".modal-tabs").style.display = "flex";
    authTabButtons.forEach((b) => b.classList.remove("active"));
    const loginTab = document.querySelector('[data-auth-tab="login"]');
    if (loginTab) loginTab.classList.add("active");
    loginFormModal.classList.remove("hidden");
    signupForm.classList.add("hidden");
    if (window.lucide) lucide.createIcons();
}

if (backToLoginFromStep1) {
    backToLoginFromStep1.addEventListener("click", (e) => {
        e.preventDefault();
        returnToLogin();
    });
}

// STEP 1: Send OTP
if (forgotStep1Form) {
    forgotStep1Form.addEventListener("submit", async (e) => {
        e.preventDefault();
        otpStep1Error.style.display = "none";
        resetEmail = otpEmailInput.value.trim().toLowerCase();

        if (!resetEmail) return;

        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = 'Sending OTP...';

        try {
            const res = await fetch(`${BASE_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await res.json();

            if (res.ok) {
                showToast(data.message || "OTP sent to your email!");
                if (otpSentToLabel) otpSentToLabel.textContent = `OTP sent to ${resetEmail}`;
                forgotStep1Form.classList.add("hidden");
                forgotStep2Form.classList.remove("hidden");

                if (data.devOtp && devOtpBanner) {
                    devOtpBanner.innerHTML = `
                        <div style="font-weight:600; color:#38bdf8; font-size:12px;">🔑 Security OTP:</div>
                        <div class="dev-otp-code" id="devOtpClickCode" title="Click to auto-fill">${data.devOtp}</div>
                        <div style="font-size:10px; color:#94a3b8;">(Click the code above to auto-fill)</div>
                    `;
                    devOtpBanner.style.display = "block";
                    const clickCode = document.getElementById("devOtpClickCode");
                    if (clickCode) {
                        clickCode.addEventListener("click", () => fillOtp(data.devOtp));
                    }
                }

                startOtpTimer();
                if (otpDigitInputs[0]) otpDigitInputs[0].focus();
                if (window.lucide) lucide.createIcons();
            } else {
                otpStep1Error.textContent = data.message || "Failed to send OTP.";
                otpStep1Error.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            otpStep1Error.textContent = "Network error connecting to backend.";
            otpStep1Error.style.display = "block";
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i data-lucide="send" style="width:14px;height:14px;"></i> Send OTP';
            if (window.lucide) lucide.createIcons();
        }
    });
}

// Resend OTP in Step 2
if (resendOtpBtn) {
    resendOtpBtn.addEventListener("click", async () => {
        if (!resetEmail) return;
        resendOtpBtn.disabled = true;
        resendOtpBtn.textContent = "Resending...";

        try {
            const res = await fetch(`${BASE_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("New OTP sent!");
                if (data.devOtp && devOtpBanner) {
                    devOtpBanner.innerHTML = `
                        <div style="font-weight:600; color:#38bdf8; font-size:12px;">🔑 Security OTP:</div>
                        <div class="dev-otp-code" id="devOtpClickCode" title="Click to auto-fill">${data.devOtp}</div>
                        <div style="font-size:10px; color:#94a3b8;">(Click the code above to auto-fill)</div>
                    `;
                    devOtpBanner.style.display = "block";
                    const clickCode = document.getElementById("devOtpClickCode");
                    if (clickCode) {
                        clickCode.addEventListener("click", () => fillOtp(data.devOtp));
                    }
                }
                startOtpTimer();
                otpDigitInputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
                if (otpDigitInputs[0]) otpDigitInputs[0].focus();
            } else {
                otpStep2Error.textContent = data.message || "Could not resend OTP.";
                otpStep2Error.style.display = "block";
                resendOtpBtn.disabled = false;
            }
        } catch (err) {
            otpStep2Error.textContent = "Network error.";
            otpStep2Error.style.display = "block";
            resendOtpBtn.disabled = false;
        } finally {
            resendOtpBtn.textContent = "Resend OTP";
        }
    });
}

// STEP 2: Verify OTP
if (forgotStep2Form) {
    forgotStep2Form.addEventListener("submit", async (e) => {
        e.preventDefault();
        otpStep2Error.style.display = "none";

        let enteredOtp = "";
        otpDigitInputs.forEach(inp => { enteredOtp += inp.value.trim(); });

        if (enteredOtp.length < 6) {
            otpStep2Error.textContent = "Please enter the full 6-digit OTP.";
            otpStep2Error.style.display = "block";
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = 'Verifying...';

        try {
            const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, otp: enteredOtp })
            });
            const data = await res.json();

            if (res.ok) {
                if (otpCountdownTimer) clearInterval(otpCountdownTimer);
                showToast("OTP verified! Set your new password.");
                forgotStep2Form.classList.add("hidden");
                forgotStep3Form.classList.remove("hidden");
                if (newPasswordInput) newPasswordInput.focus();
                if (window.lucide) lucide.createIcons();
            } else {
                otpStep2Error.textContent = data.message || "Invalid or expired OTP.";
                otpStep2Error.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            otpStep2Error.textContent = "Network error verifying OTP.";
            otpStep2Error.style.display = "block";
        } finally {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerHTML = '<i data-lucide="check-circle" style="width:14px;height:14px;"></i> Verify OTP';
            if (window.lucide) lucide.createIcons();
        }
    });
}

// STEP 3: Reset Password
if (forgotStep3Form) {
    forgotStep3Form.addEventListener("submit", async (e) => {
        e.preventDefault();
        otpStep3Error.style.display = "none";

        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (newPass.length < 6) {
            otpStep3Error.textContent = "Password must be at least 6 characters long.";
            otpStep3Error.style.display = "block";
            return;
        }

        if (newPass !== confirmPass) {
            otpStep3Error.textContent = "Passwords do not match. Please re-enter.";
            otpStep3Error.style.display = "block";
            return;
        }

        resetPasswordBtn.disabled = true;
        resetPasswordBtn.innerHTML = 'Updating Password...';

        try {
            const res = await fetch(`${BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, newPassword: newPass })
            });
            const data = await res.json();

            if (res.ok) {
                showToast("Password updated successfully! Please login.");
                returnToLogin();
                // Pre-fill email in login
                const loginEmailInput = loginFormModal.querySelector('input[type="email"]');
                if (loginEmailInput) loginEmailInput.value = resetEmail;
            } else {
                otpStep3Error.textContent = data.message || "Failed to reset password.";
                otpStep3Error.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            otpStep3Error.textContent = "Network error resetting password.";
            otpStep3Error.style.display = "block";
        } finally {
            resetPasswordBtn.disabled = false;
            resetPasswordBtn.innerHTML = '<i data-lucide="lock" style="width:14px;height:14px;"></i> Reset Password';
            if (window.lucide) lucide.createIcons();
        }
    });
}

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = signupForm.querySelectorAll('.modal-input')[0].value;
        const email = signupForm.querySelectorAll('.modal-input')[1].value;
        const password = signupForm.querySelectorAll('.modal-input')[2].value;

        try {
            const res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password })
            });
            const data = await res.json();

            if (res.ok) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                updateUserProfileUI();

                document.querySelector(".app-shell").classList.add("visible");
                closeAuthModal();
                showToast("Account created! Welcome to ProjectConnect.");
                document.getElementById("authClose").style.display = "block";
                navigateTo('home');
            } else {
                showToast(data.message || "Signup failed");
            }
        } catch (err) {
            console.error(err);
            // Fallback for demo without backend
            authToken = 'demo-token';
            currentUser = { fullName: fullName, email: email };
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserProfileUI();
            
            document.querySelector(".app-shell").classList.add("visible");
            closeAuthModal();
            showToast("Account created (Demo mode). Welcome!");
            document.getElementById("authClose").style.display = "block";
            navigateTo('home');
        }
    });
}

// ── USER PROFILE SECTION & DROPDOWN ─────────────────────────────────────
const profileSection       = document.getElementById("profileSection");
const profileTriggerBtn    = document.getElementById("profileTriggerBtn");
const profileDropdown      = document.getElementById("profileDropdown");
const profileLogoutBtn     = document.getElementById("profileLogoutBtn");
const profileGoHome        = document.getElementById("profileGoHome");
const profileGoCollab      = document.getElementById("profileGoCollab");
const profileGoPost        = document.getElementById("profileGoPost");
const profileGoNotifs      = document.getElementById("profileGoNotifs");
const dropdownAvatarWrap   = document.getElementById("dropdownAvatarWrap");
const uploadPicBtn         = document.getElementById("uploadPicBtn");
const removePicBtn         = document.getElementById("removePicBtn");
const profilePicInput      = document.getElementById("profilePicInput");
const uploadPicLabel       = document.getElementById("uploadPicLabel");

function updateUserProfileUI() {
    const navAvatar   = document.getElementById("navProfileAvatar");
    const navName     = document.getElementById("navProfileName");
    const dropAvatar  = document.getElementById("dropdownProfileAvatar");
    const dropName    = document.getElementById("dropdownProfileName");
    const dropEmail   = document.getElementById("dropdownProfileEmail");
    const uploadLabel = document.getElementById("uploadPicLabel");
    const removeBtn   = document.getElementById("removePicBtn");

    if (currentUser) {
        const initials = (currentUser.fullName || "User")
            .split(" ")
            .filter(Boolean)
            .map(n => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U";

        const firstName = (currentUser.fullName || "Student").split(" ")[0];
        if (navName) navName.textContent = firstName;
        if (dropName) dropName.textContent = currentUser.fullName || "Student";
        if (dropEmail) dropEmail.textContent = currentUser.email || "";

        // Render Profile Picture or fallback to Initials
        if (currentUser.profilePic) {
            if (navAvatar) {
                navAvatar.innerHTML = `<img src="${currentUser.profilePic}" class="profile-avatar-img" alt="Profile" />`;
            }
            if (dropAvatar) {
                dropAvatar.innerHTML = `<img src="${currentUser.profilePic}" class="profile-avatar-img" alt="Profile" />`;
            }
            if (uploadLabel) uploadLabel.textContent = "Change Photo";
            if (removeBtn) removeBtn.style.display = "inline-flex";
        } else {
            if (navAvatar) navAvatar.textContent = initials;
            if (dropAvatar) dropAvatar.textContent = initials;
            if (uploadLabel) uploadLabel.textContent = "Add Photo";
            if (removeBtn) removeBtn.style.display = "none";
        }
    } else {
        if (navAvatar) navAvatar.textContent = "G";
        if (navName) navName.textContent = "Guest";
        if (dropAvatar) dropAvatar.textContent = "G";
        if (dropName) dropName.textContent = "Guest Student";
        if (dropEmail) dropEmail.textContent = "Not logged in";
        if (uploadLabel) uploadLabel.textContent = "Add Photo";
        if (removeBtn) removeBtn.style.display = "none";
    }
}

// Compress / resize image using offscreen canvas to optimize storage
function processProfileImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return reject(new Error('Please select a valid image file.'));
        }
        if (file.size > 8 * 1024 * 1024) {
            return reject(new Error('Image size should be under 8MB.'));
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 240;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Failed to decode image.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}

// Trigger file picker
if (uploadPicBtn) {
    uploadPicBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (profilePicInput) profilePicInput.click();
    });
}
if (dropdownAvatarWrap) {
    dropdownAvatarWrap.addEventListener("click", (e) => {
        e.stopPropagation();
        if (profilePicInput) profilePicInput.click();
    });
}

// Handle image selected
if (profilePicInput) {
    profilePicInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
            showToast("Processing profile photo...");
            const dataUrl = await processProfileImage(file);

            if (!currentUser) {
                currentUser = { fullName: "Student", email: "student@college.edu" };
            }
            currentUser.profilePic = dataUrl;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserProfileUI();
            if (window.lucide) lucide.createIcons();

            // Sync with backend if logged in
            if (authToken) {
                fetch(`${BASE_URL}/auth/profile-picture`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ profilePic: dataUrl })
                }).catch(err => console.warn('Could not sync profile pic to backend:', err));
            }

            showToast("Profile picture updated!");
        } catch (err) {
            console.error('Profile pic error:', err);
            showToast(err.message || "Failed to update profile picture");
        } finally {
            profilePicInput.value = "";
        }
    });
}

// Remove profile picture
if (removePicBtn) {
    removePicBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentUser) {
            currentUser.profilePic = null;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserProfileUI();
            if (window.lucide) lucide.createIcons();

            if (authToken) {
                fetch(`${BASE_URL}/auth/profile-picture`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ profilePic: null })
                }).catch(err => console.warn('Could not sync removal to backend:', err));
            }
            showToast("Profile picture removed.");
        }
    });
}

function closeProfileDropdown() {
    if (profileDropdown) profileDropdown.classList.remove("open");
    if (profileTriggerBtn) {
        profileTriggerBtn.classList.remove("active");
        profileTriggerBtn.setAttribute("aria-expanded", "false");
    }
}

if (profileTriggerBtn) {
    profileTriggerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = profileDropdown && profileDropdown.classList.contains("open");
        if (isOpen) {
            closeProfileDropdown();
        } else {
            if (profileDropdown) profileDropdown.classList.add("open");
            profileTriggerBtn.classList.add("active");
            profileTriggerBtn.setAttribute("aria-expanded", "true");
        }
    });
}

// Close dropdown on click outside
document.addEventListener("click", (e) => {
    if (profileSection && !profileSection.contains(e.target)) {
        closeProfileDropdown();
    }
});

// Profile Dropdown Quick Links
if (profileGoHome) {
    profileGoHome.addEventListener("click", () => {
        closeProfileDropdown();
        navigateTo("home");
    });
}
if (profileGoCollab) {
    profileGoCollab.addEventListener("click", () => {
        closeProfileDropdown();
        navigateTo("collaboration");
    });
}
if (profileGoPost) {
    profileGoPost.addEventListener("click", () => {
        closeProfileDropdown();
        navigateTo("post-project");
    });
}
if (profileGoNotifs) {
    profileGoNotifs.addEventListener("click", () => {
        closeProfileDropdown();
        navigateTo("notifications");
    });
}

// Log Out Handler
if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", () => {
        closeProfileDropdown();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        authToken = null;
        currentUser = null;
        updateUserProfileUI();

        showToast("Logged out successfully.");
        document.querySelector(".app-shell").classList.remove("visible");
        openAuthModal();
    });
}

// ── FLOATING AI ASSISTANT FAB & HALF-WINDOW CONTROLLERS ────────────────
const aiFabBtn           = document.getElementById("aiFabBtn");
const aiAssistantWindow  = document.getElementById("aiAssistantWindow");
const assistantBackdrop  = document.getElementById("assistantBackdrop");
const closeAssistantBtn  = document.getElementById("closeAssistantBtn");
const clearChatBtn       = document.getElementById("clearChatBtn");
const assistantChipsRow  = document.getElementById("assistantChipsRow");

function openAssistantWindow() {
    if (aiAssistantWindow) aiAssistantWindow.classList.add("open");
    if (assistantBackdrop) assistantBackdrop.classList.add("open");
    if (chatInput) {
        setTimeout(() => chatInput.focus(), 300);
    }
}

function closeAssistantWindow() {
    if (aiAssistantWindow) aiAssistantWindow.classList.remove("open");
    if (assistantBackdrop) assistantBackdrop.classList.remove("open");
}

if (aiFabBtn) {
    aiFabBtn.addEventListener("click", () => {
        const isOpen = aiAssistantWindow && aiAssistantWindow.classList.contains("open");
        if (isOpen) {
            closeAssistantWindow();
        } else {
            openAssistantWindow();
        }
    });
}

if (closeAssistantBtn) {
    closeAssistantBtn.addEventListener("click", closeAssistantWindow);
}

if (assistantBackdrop) {
    assistantBackdrop.addEventListener("click", closeAssistantWindow);
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (aiAssistantWindow && aiAssistantWindow.classList.contains("open")) {
            closeAssistantWindow();
        }
        closeProfileDropdown();
    }
});

// Clear Chat button
if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="chat-msg bot">
                    👋 Conversation cleared. What else can I help you brainstorm or build?
                </div>
            `;
        }
        showToast("Chat history cleared.");
    });
}

// Quick Suggestion Chips
if (assistantChipsRow) {
    assistantChipsRow.addEventListener("click", (e) => {
        const chip = e.target.closest(".assistant-chip");
        if (!chip) return;
        const promptText = chip.getAttribute("data-prompt");
        if (promptText && chatInput) {
            chatInput.value = promptText;
            handleChatSend();
        }
    });
}

// Global search
const globalSearch = document.getElementById("globalSearch");
// Map search terms to page IDs
const searchMap = {
    home: "home",
    "student flow": "collaboration",
    "post project": "post-project",
    "post a project": "post-project",
    collaboration: "collaboration",
    about: "about",
};

function handleSearchEnter(e) {
    if (e.key === "Enter") {
        const query = globalSearch.value.trim().toLowerCase();
        for (const key in searchMap) {
            if (query.includes(key)) {
                const pageId = searchMap[key];
                navigateTo(pageId);
                showToast(`Navigated to ${key} page.`);
                return;
            }
        }
        showToast("No matching page found.");
    }
}

if (globalSearch) {
    globalSearch.addEventListener("keydown", handleSearchEnter);
}

// ── REAL-TIME AI ASSISTANT (Powered by Google Gemini) ─────────────────
const chatMessages        = document.getElementById("chatMessages");
const chatInput           = document.getElementById("chatInput");
const chatSend            = document.getElementById("chatSend");
const chatTypingIndicator = document.getElementById("chatTypingIndicator");

// Unique session ID per browser tab (persists in sessionStorage)
const aiSessionId = sessionStorage.getItem('aiSessionId') || (() => {
    const id = 'sess-' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('aiSessionId', id);
    return id;
})();

function addChatMessage(html, type) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    div.className = "chat-msg " + type;
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    if (chatTypingIndicator) chatTypingIndicator.style.display = 'flex';
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    if (chatTypingIndicator) chatTypingIndicator.style.display = 'none';
}

// Format AI reply — convert markdown-like syntax to HTML
function formatReply(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')    // **bold**
        .replace(/\*(.+?)\*/g, '<em>$1</em>')                 // *italic*
        .replace(/`(.+?)`/g, '<code>$1</code>')               // `code`
        .replace(/\n\n/g, '<br><br>')                          // paragraphs
        .replace(/\n/g, '<br>');                               // line breaks
}

async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatMessage(text, "user");
    chatInput.value = "";
    chatInput.disabled = true;
    chatSend.disabled = true;
    showTyping();

    try {
        const res = await fetch(`${BASE_URL}/assistant/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId: aiSessionId })
        });

        const data = await res.json();
        hideTyping();

        if (data.reply) {
            addChatMessage(formatReply(data.reply), "bot");
        } else {
            addChatMessage("⚠️ No response received. Please try again.", "bot");
        }
    } catch (err) {
        hideTyping();
        console.error('AI chat error:', err);
        addChatMessage("⚠️ Could not reach the AI assistant. Make sure the backend is running.", "bot");
    } finally {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
    }
}

if (chatSend) chatSend.addEventListener("click", handleChatSend);
if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    });
}

// Initial State:
document.addEventListener('DOMContentLoaded', () => {
    const homePage = document.getElementById('page-home');
    if (homePage) homePage.classList.add('active');

    // Auto-restore session from localStorage
    if (authToken && currentUser) {
        const shell = document.querySelector(".app-shell");
        if (shell) shell.classList.add("visible");
        const authModalEl = document.getElementById("authModal");
        if (authModalEl) {
            authModalEl.classList.remove("open");
            authModalEl.classList.add("hidden");
        }
        const authCloseBtn = document.getElementById("authClose");
        if (authCloseBtn) authCloseBtn.style.display = "block";
    }

    // Sync profile UI (displays user name / initials or Guest)
    updateUserProfileUI();
});

// TEAM ROOM CHAT & SOCKET LOGIC
const teamChatMessages = document.getElementById("teamChatMessages");
const teamChatInput = document.getElementById("teamChatInput");
const teamChatSend = document.getElementById("teamChatSend");

// Connect socket
const socket = io(SOCKET_URL);
let currentRoomId = 'global-team-room';

socket.on('connect', () => {
    socket.emit('join-room', currentRoomId);
});

socket.on('receive-message', (data) => {
    addTeamMessage(data.message, false, data.author);
});

function addTeamMessage(text, isMe, authorName) {
    if (!teamChatMessages) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = "team-msg " + (isMe ? "me" : "member");

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = isMe ? "U" : authorName.charAt(0).toUpperCase();
    if (!isMe) avatar.style.background = "#22c55e"; // distinct color for new messages

    // Bubble
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (!isMe) {
        const authorDiv = document.createElement("div");
        authorDiv.className = "msg-author";
        authorDiv.textContent = authorName;
        bubble.appendChild(authorDiv);
    }

    bubble.appendChild(document.createTextNode(text));

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);

    teamChatMessages.appendChild(msgDiv);
    teamChatMessages.scrollTop = teamChatMessages.scrollHeight;
}

if (teamChatSend) {
    teamChatSend.addEventListener("click", () => {
        const txt = teamChatInput.value.trim();
        if (!txt) return;

        let authorInfo = currentUser ? currentUser.fullName : "Anonymous";

        // Add locally
        addTeamMessage(txt, true, authorInfo);
        teamChatInput.value = "";

        // Broadcast
        socket.emit('send-message', {
            roomId: currentRoomId,
            message: txt,
            author: authorInfo
        });
    });
}

// ── JITSI MEET — ZERO API KEY REQUIRED ─────────────────────────────────
const startMeetingBtn      = document.getElementById("startMeetingBtn");
const meetingOverlay       = document.getElementById("meetingOverlay");
const leaveMeetingBtn      = document.getElementById("leaveMeetingBtn");
const startMeetingJoinBtn  = document.getElementById("startMeetingJoinBtn");
const jitsiSetupScreen     = document.getElementById("jitsiSetupScreen");
const jitsiCallContainer   = document.getElementById("jitsiCallContainer");
const jitsiRoomNameDisplay = document.getElementById("jitsiRoomNameDisplay");
const meetingRoomLabel     = document.getElementById("meetingRoomLabel");

let jitsiApi = null;

// Auto-generate a stable room name based on the project room
function getJitsiRoomName() {
    return ('ProjectConnect-' + currentRoomId)
        .replace(/[^a-zA-Z0-9-]/g, '-')
        .slice(0, 60);
}

// Show setup screen with room name pre-populated
function openMeetingOverlay() {
    meetingOverlay.classList.add("visible");
    const roomName = getJitsiRoomName();
    if (jitsiRoomNameDisplay) jitsiRoomNameDisplay.textContent = 'meet.jit.si/' + roomName;
    if (meetingRoomLabel) meetingRoomLabel.textContent = roomName;

    // If already in a call, skip setup screen
    if (jitsiApi) {
        if (jitsiSetupScreen) jitsiSetupScreen.style.display = 'none';
        if (jitsiCallContainer) jitsiCallContainer.style.display = 'flex';
    }
}

if (startMeetingBtn) {
    startMeetingBtn.addEventListener("click", openMeetingOverlay);
}

// Launch Jitsi into the call container
if (startMeetingJoinBtn) {
    startMeetingJoinBtn.addEventListener("click", () => {
        if (typeof JitsiMeetExternalAPI === 'undefined') {
            alert('Jitsi Meet is loading, please wait a moment and try again.');
            return;
        }

        // Hide setup, show call container
        if (jitsiSetupScreen) jitsiSetupScreen.style.display = 'none';
        if (jitsiCallContainer) {
            jitsiCallContainer.style.display = 'flex';
            jitsiCallContainer.style.position = 'relative';
        }

        // Destroy any existing call
        if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }

        const roomName = getJitsiRoomName();

        jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
            roomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiCallContainer,
            userInfo: {
                displayName: currentUser ? currentUser.fullName : 'Guest',
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                enableWelcomePage: false,
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Teammate',
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'chat', 'raisehand',
                    'videoquality', 'tileview', 'settings', 'filmstrip',
                ],
            },
        });

        // Leave Jitsi when someone presses the in-call hang-up
        jitsiApi.addEventListeners({
            readyToClose: endJitsiCall,
            videoConferenceLeft: endJitsiCall,
        });
    });
}

function endJitsiCall() {
    if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
    meetingOverlay.classList.remove("visible");
    // Reset back to setup screen
    if (jitsiSetupScreen) jitsiSetupScreen.style.display = 'flex';
    if (jitsiCallContainer) jitsiCallContainer.style.display = 'none';
}

if (leaveMeetingBtn) {
    leaveMeetingBtn.addEventListener("click", endJitsiCall);
}

// Initialize Lucide icons
let isReplacingIcons = false;
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Run lucide icons replacement when DOM changes safely
    const observer = new MutationObserver(() => {
        if (typeof lucide !== 'undefined' && !isReplacingIcons) {
            isReplacingIcons = true;
            lucide.createIcons();
            setTimeout(() => { isReplacingIcons = false; }, 0);
        }
    });
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
});

// Scroll Animations
document.addEventListener("DOMContentLoaded", () => {
    // Add animation class to existing elements
    document.querySelectorAll('.card, .project-card, .dashboard-menu').forEach(el => {
        el.classList.add('animate-on-scroll');
    });

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Unobserve if we only want it to animate once
                // scrollObserver.unobserve(entry.target);
            } else {
                // If we want it to animate again when scrolled out and back in
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

    // Observe initially present elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });

    // We also need to observe dynamically added elements (like newly fetched project cards)
    // Overriding the native appendChild/insertBefore is complex, so let's use a MutationObserver 
    // to watch for new .project-card additions and apply the observer.
    const domObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.classList && (node.classList.contains('project-card') || node.classList.contains('card'))) {
                        node.classList.add('animate-on-scroll');
                        scrollObserver.observe(node);
                    }
                    // Also check children if a container was added
                    const children = node.querySelectorAll ? node.querySelectorAll('.project-card, .card') : [];
                    children.forEach(child => {
                        child.classList.add('animate-on-scroll');
                        scrollObserver.observe(child);
                    });
                }
            });
        });
    });
    
    domObserver.observe(document.body, { childList: true, subtree: true });
});

// Auto-fill copyright year in footer
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();
