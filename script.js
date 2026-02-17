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

    // 1. Identify role for CSS (Keeps Old UI for Dev/Tester)
    document.body.className = role + "-view";

    const label = document.getElementById('userLabel');
    if (label) label.innerText = `${user} (${role})`;

    // 2. RESTORE OLD FEATURES
    // Show Project/Task creation only for Tester and Admin
    const testerTools = document.getElementById('testerTools');
    if (testerTools) {
        testerTools.style.display = (role === "Tester" || role === "Admin") ? "block" : "none";
    }

    // Developer specific hiding
    if (role === "Developer") {
        const bulk = document.getElementById('bulkCard');
        if (bulk) bulk.style.display = "none";
    }

    loadData();
    loadBugs();
}

async function loadBugs() {
    const res = await fetch(API + "/bugs");
    let bugs = await res.json();

    const role = localStorage.getItem("role");
    const user = localStorage.getItem("user");

    // DATA FILTER: Developer only sees bugs assigned to them
    if (role === "Developer") {
        bugs = bugs.filter(b => b.assignedTo === user);
    }

    const list = document.getElementById('bugList');
    list.innerHTML = "";

    bugs.forEach(b => {
        list.innerHTML += `
            <tr>
                <td><strong>${b.title}</strong></td>
                <td>${b.assignedTo}</td>
                <td><span class="${b.status}">${b.status}</span></td>
                <td>
                    <input type="range" value="${b.completion || 0}" 
                           onchange="patch('${b._id}','completion',this.value); logActivity('Progress updated for ${b.title}')">
                </td>
            </tr>`;
    });
}

// Logic for Admin to search developers
function filterByDev() {
    const val = document.getElementById("devSearch").value.toUpperCase();
    const rows = document.querySelector("#bugList").rows;
    for (let row of rows) {
        const name = row.cells[1].textContent.toUpperCase();
        row.style.display = name.includes(val) ? "" : "none";
    }
}

// ... Keep your initChart, updateActivityFeed, renderTable, patch, notify, loadData, and loadBTasks ...

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
function initChart(bugs) {
    const chartEl = document.getElementById('bugChart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (myChart) myChart.destroy();

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

function updateActivityFeed(bugs) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

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