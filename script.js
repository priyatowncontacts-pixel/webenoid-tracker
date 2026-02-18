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

    // 1. Activate CSS Role Theme
    document.body.className = role + "-view";

    const label = document.getElementById('userLabel');
    if (label) label.innerText = `${user} (${role})`;

    // 2. MANAGEMENT TOOLS VISIBILITY
    // Show Project/Task creation only for Tester and Admin
    const testerTools = document.getElementById('testerTools');
    if (testerTools) {
        testerTools.style.display = (role === "Tester" || role === "Admin") ? "block" : "none";
    }

    // Developer specific: Hide bulk tools, show project filter
    if (role === "Developer") {
        const bulk = document.getElementById('bulkCard');
        if (bulk) bulk.style.display = "none";
    }

    loadData(); // Loads Project Dropdowns
    loadBugs();
}

async function loadBugs() {
    try {
        const res = await fetch(API + "/bugs");
        let bugs = await res.json();

        // 3. DEVELOPER FILTERING LOGIC
        if (role === "Developer") {
            // Requirement: Only see his own defects
            bugs = bugs.filter(b => b.assignedTo === user);

            // Requirement: Filter by project dropdown
            const devProj = document.getElementById('devProjFilter');
            if (devProj && devProj.value) {
                bugs = bugs.filter(b => b.project === devProj.value);
            }
        }

        renderTable(bugs);
        updateActivityFeed(bugs); // Logs visible to everyone

        // 4. ADMIN ANALYTICS
        if (role === "Admin") {
            initPieChart(bugs);
        }
    } catch (err) {
        console.error("Failed to load bugs:", err);
    }
}

// ADMIN REQUIREMENT: Search Developer by Name
function filterByDev() {
    const val = document.getElementById("devSearch").value.toUpperCase();
    const rows = document.querySelector("#bugList").rows;
    for (let row of rows) {
        const name = row.cells[1].textContent.toUpperCase(); // Assignee Column
        row.style.display = name.includes(val) ? "" : "none";
    }
}

// ADMIN REQUIREMENT: Pie Chart (Most Defects)
function initPieChart(bugs) {
    const chartEl = document.getElementById('bugChart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (myChart) myChart.destroy();

    // Grouping by status for the pie chart
    const counts = { Queue: 0, Review: 0, Fixed: 0 };
    bugs.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#4318FF', '#FFB800', '#05CD99'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

async function renderTable(bugs) {
    const body = document.getElementById('bugList');
    if (!body) return;
    body.innerHTML = bugs.map(b => `
        <tr>
            <td>
                <div style="font-weight:800; font-size:14px; color:var(--text-navy);">${b.title}</div>
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
                    <input type="range" value="${b.completion || 0}" 
                           onchange="patch('${b._id}','completion',this.value)" style="flex:1">
                    <span style="font-size:11px; font-weight:700;">${b.completion || 0}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

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

function updateActivityFeed(bugs) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    const recent = bugs.slice(0, 10);
    feed.innerHTML = recent.map(b => `
        <div class="activity-item">
            <div class="dot" style="background: ${b.status === 'Fixed' ? '#05CD99' : '#4318FF'}"></div>
            <div class="activity-text">
                <strong>${b.title}</strong>
                <small>${b.assignedTo} moved to ${b.status}</small>
            </div>
        </div>
    `).join('');
}

async function loadData() {
    const res = await fetch(API + "/projects");
    const projs = await res.json();

    // Fill all project dropdowns
    const dropdownIds = ['bProj', 'devProjFilter', 'linkProjSelect'];
    dropdownIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">All Projects</option>' +
                projs.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
        }
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Auto-refresh every 10 seconds
setInterval(async () => {
    const res = await fetch(API + "/bugs");
    const bugs = await res.json();
    const currentFingerprint = JSON.stringify(bugs.map(b => b._id + b.status + b.completion));
    if (lastKnownFingerprint !== "" && lastKnownFingerprint !== currentFingerprint) {
        loadBugs();
    }
    lastKnownFingerprint = currentFingerprint;
}, 10000);

document.addEventListener('DOMContentLoaded', init);