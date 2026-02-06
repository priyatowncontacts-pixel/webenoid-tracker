/* script.js */
const API = "https://webenoid-tracker.onrender.com/api";
const user = localStorage.getItem("user");
const role = localStorage.getItem("role");
let lastKnownFingerprint = "";
let myChart = null;

function init() {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (role === "Developer") {
        const mgmt = document.getElementById('mgmtAside');
        const bulk = document.getElementById('bulkCard');
        if (mgmt) mgmt.style.display = "none";
        if (bulk) bulk.style.display = "none";
    }

    const label = document.getElementById('userLabel');
    if (label) label.innerText = `${user} (${role})`;

    loadData();
    loadBugs();
}

async function loadBugs() {
    try {
        const res = await fetch(API + "/bugs");
        let bugs = await res.json();

        // 1. UPDATED STATS LOGIC (Targeting all 5 cards)
        const projectsRes = await fetch(API + "/projects");
        const projects = await projectsRes.json();

        if (document.getElementById('totalProjects'))
            document.getElementById('totalProjects').innerText = projects.length;

        if (document.getElementById('totalCount'))
            document.getElementById('totalCount').innerText = bugs.filter(b => b.status !== 'Fixed').length;

        if (document.getElementById('fixedCount'))
            document.getElementById('fixedCount').innerText = bugs.filter(b => b.status === 'Fixed').length;

        // Logic for "Critical" and "SLA" (overdue) cards
        const stats = document.querySelectorAll('.stat-item h2');
        if (stats[2]) stats[2].innerText = bugs.filter(b => b.priority === 'Critical').length || 0;
        if (stats[3]) stats[3].innerText = bugs.filter(b => b.isOverdue).length || 0;

        // 2. TRIGGER UPDATES
        initChart(bugs);
        updateActivityFeed(bugs);

        // Permissions filter
        if (role === "Developer") bugs = bugs.filter(b => b.assignedTo === user);

        bugs.sort((a, b) => a.project.localeCompare(b.project));
        renderTable(bugs);
    } catch (err) {
        console.error("Load failed:", err);
    }
}

function initChart(bugs) {
    const ctx = document.getElementById('bugChart').getContext('2d');
    if (myChart) myChart.destroy();

    // Data for the multi-line trend
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Total Bugs',
                    data: [15, 25, 20, 35, 30, 45, 40],
                    borderColor: '#4318FF',
                    backgroundColor: 'rgba(67, 24, 255, 0.1)',
                    fill: true, tension: 0.4
                },
                {
                    label: 'Fixed',
                    data: [5, 12, 10, 25, 18, 30, 28],
                    borderColor: '#05CD99',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#A3AED0', font: { size: 10 } } }
            }
        }
    });
}

// 3. NEW: DYNAMIC ACTIVITY FEED
function updateActivityFeed(bugs) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    // Sort bugs by last updated (mocking activity)
    const recent = bugs.slice(0, 5);
    feed.innerHTML = recent.map(b => `
        <div class="activity-item">
            <div class="dot" style="background: ${b.status === 'Fixed' ? 'var(--success-green)' : 'var(--indigo-accent)'}"></div>
            <div class="activity-text">
                <strong style="color:var(--text-navy)">${b.title}</strong><br>
                <small style="color:var(--text-grey)">Status changed to ${b.status}</small>
            </div>
        </div>
    `).join('');
}

async function renderTable(bugs) {
    const body = document.getElementById('bugList');
    if (!body) return;
    body.innerHTML = bugs.map(b => `
        <tr>
            <td>
                <div style="font-weight:800; font-size:15px; color:var(--text-navy); text-transform:uppercase;">${b.title}</div>
                <div style="font-size:11px; color:var(--indigo-accent); font-weight:600;">${b.project}</div>
            </td>
            <td style="color:var(--text-grey); font-weight:600;">${b.assignedTo}</td>
            <td>
                <select class="${b.status}" onchange="patch('${b._id}','status',this.value)">
                    <option ${b.status == 'Queue' ? 'selected' : ''} value="Queue">Queue</option>
                    <option ${b.status == 'Review' ? 'selected' : ''} value="Review">Review</option>
                    <option ${b.status == 'Fixed' ? 'selected' : ''} value="Fixed">Fixed</option>
                </select>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="flex:1; height:6px; background:#f4f7fe; border-radius:10px; overflow:hidden;">
                        <div style="width:${b.completion || 0}%; height:100%; background:var(--indigo-accent);"></div>
                    </div>
                    <span style="font-size:11px; width:30px; font-weight:700;">${b.completion || 0}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

// ... Keep your patch, notify, addDev, loadData, loadBTasks, and logout functions the same ...

async function patch(id, field, value) {
    const data = { [field]: value };
    if (field === 'status' && value === 'Fixed') data.completion = 100;

    await fetch(`${API}/bug/${id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'user-name': user },
        body: JSON.stringify(data)
    });
    loadBugs();
}

function notify(msg) {
    const n = document.getElementById('notify');
    if (!n) return;
    n.innerText = msg;
    n.style.display = "block";
    const sound = document.getElementById('alertSound');
    if (sound) { sound.currentTime = 0; sound.play().catch(() => { }); }
    setTimeout(() => { n.style.display = "none"; }, 5000);
}

async function loadData() {
    const res = await fetch(API + "/projects");
    const p = await res.json();
    const bProj = document.getElementById('bProj');
    if (bProj) {
        bProj.innerHTML = p.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
    }
    loadBTasks();
}

async function loadBTasks() {
    const bProj = document.getElementById('bProj');
    const bTask = document.getElementById('bTask');
    if (!bProj || !bProj.value) return;
    const t = await (await fetch(API + "/tasks/" + bProj.value)).json();
    if (bTask) {
        bTask.innerHTML = t.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// 4. Events
setInterval(async () => {
    const res = await fetch(API + "/bugs");
    const bugs = await res.json();
    const currentFingerprint = JSON.stringify(bugs.map(b => b._id + b.status + b.completion));
    if (lastKnownFingerprint !== "" && lastKnownFingerprint !== currentFingerprint) {
        notify("List Updated 🔔");
        loadBugs();
    }
    lastKnownFingerprint = currentFingerprint;
}, 10000);

document.addEventListener('DOMContentLoaded', init);