/* script.js */
const API = "https://webenoid-tracker.onrender.com/api";
const user = localStorage.getItem("user");
const role = localStorage.getItem("role");
let lastKnownFingerprint = "";
let myChart = null; // Variable to hold the chart instance

// 1. Initial Setup & Permissions
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
    updateDrops(); // Initialize the assignee list
}

// 2. Core Functions
async function loadBugs() {
    try {
        const res = await fetch(API + "/bugs");
        let bugs = await res.json();

        // --- DASHBOARD STATS LOGIC ---
        if (document.getElementById('totalCount'))
            document.getElementById('totalCount').innerText = bugs.length;
        if (document.getElementById('reviewCount'))
            document.getElementById('reviewCount').innerText = bugs.filter(b => b.status === 'Review').length;
        if (document.getElementById('fixedCount'))
            document.getElementById('fixedCount').innerText = bugs.filter(b => b.status === 'Fixed').length;

        // Start the Chart
        initChart(bugs);

        // Permissions
        if (role === "Developer") bugs = bugs.filter(b => b.assignedTo === user);

        bugs.sort((a, b) => a.project.localeCompare(b.project));
        renderTable(bugs);
    } catch (err) {
        console.error("Load failed:", err);
    }
}

// THE CHART LOGIC (This makes it look like the Admin Dashboard)
function initChart(bugs) {
    const ctx = document.getElementById('bugChart').getContext('2d');

    if (myChart) myChart.destroy(); // Prevent memory leaks

    // Simple logic to show dummy data for the wave (Mon-Sun)
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Bug Resolution Wave',
                data: [12, 19, 15, 25, 22, 30, 28],
                borderColor: '#4318FF',
                backgroundColor: 'rgba(67, 24, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
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

async function renderTable(bugs) {
    const body = document.getElementById('bugList');
    body.innerHTML = "";

    for (let b of bugs) {
        body.innerHTML += `
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
        </tr>`;
    }
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

// 3. Admin & Directory Logic
let teamList = JSON.parse(localStorage.getItem("team_list")) || ["Assignee"];

function updateDrops() {
    const s = document.getElementById('bAssign');
    if (s) {
        s.innerHTML = "";
        teamList.forEach(t => s.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

function addDev() {
    const name = document.getElementById('newDev').value.trim();
    if (name) {
        teamList.push(name);
        localStorage.setItem("team_list", JSON.stringify(teamList));
        updateDrops();
        document.getElementById('newDev').value = "";
        notify("Developer Added");
    }
}

async function submitBulk() {
    const textarea = document.getElementById('bPaste');
    const lines = textarea.value.trim().split("\n");
    const data = lines.map(l => {
        const parts = l.split("|");
        return {
            project: document.getElementById('bProj').value,
            task: document.getElementById('bTask').value,
            assignedTo: document.getElementById('bAssign').value,
            title: parts[0]?.trim(),
            targetDate: parts[1]?.trim() || new Date().toISOString().split('T')[0],
            status: "Queue",
            completion: 0,
            startedAt: new Date().toISOString().slice(0, 16)
        };
    }).filter(x => x.title);

    if (data.length === 0) return notify("Enter defect titles!");

    const res = await fetch(API + "/bugs", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        textarea.value = "";
        loadBugs();
        notify("Batch Processed!");
    }
}

async function loadData() {
    const res = await fetch(API + "/projects");
    const p = await res.json();
    const bProj = document.getElementById('bProj');

    if (bProj) {
        bProj.innerHTML = "";
        p.forEach(x => {
            const opt = document.createElement('option');
            opt.value = x.name;
            opt.innerText = x.name;
            bProj.appendChild(opt);
        });
    }
    loadBTasks();
}

async function loadBTasks() {
    const bProj = document.getElementById('bProj');
    const bTask = document.getElementById('bTask');
    if (!bProj || !bProj.value) return;
    const t = await (await fetch(API + "/tasks/" + bProj.value)).json();
    if (bTask) {
        bTask.innerHTML = "";
        t.forEach(x => bTask.innerHTML += `<option value="${x.name}">${x.name}</option>`);
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

// Start
document.addEventListener('DOMContentLoaded', init);