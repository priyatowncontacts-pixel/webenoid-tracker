/* script.js */
const API = "https://webenoid-tracker.onrender.com/api";
const user = localStorage.getItem("user");
const role = localStorage.getItem("role");
let lastKnownFingerprint = "";

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
}

// 2. Core Functions
async function loadBugs() {
    try {
        const res = await fetch(API + "/bugs");
        let bugs = await res.json();

        if (role === "Developer") bugs = bugs.filter(b => b.assignedTo === user);

        // Update Project Filter
        const filterDrop = document.getElementById('devProjFilter');
        if (filterDrop) {
            const uniqueProjects = [...new Set(bugs.map(b => b.project))];
            const currentVal = filterDrop.value;
            filterDrop.innerHTML = '<option value="All">All Projects</option>';
            uniqueProjects.forEach(p => {
                filterDrop.innerHTML += `<option value="${p}" ${p === currentVal ? 'selected' : ''}>${p}</option>`;
            });
            if (filterDrop.value !== "All") bugs = bugs.filter(b => b.project === filterDrop.value);
        }

        bugs.sort((a, b) => a.project.localeCompare(b.project));
        renderTable(bugs);
    } catch (err) {
        console.error("Load failed:", err);
    }
}

async function renderTable(bugs) {
    const body = document.getElementById('bugList');
    body.innerHTML = "";

    for (let [i, b] of bugs.entries()) {
        const startTime = b.startedAt ? b.startedAt.slice(0, 16) : '';
        const hRes = await fetch(`${API}/history/${b._id}`);
        const logs = await hRes.json();

        const logHtml = logs.map(l => `
            <div style="border-bottom:1px solid #334155; padding:2px 0; font-size:10px;">
                <span style="color:var(--brand); font-weight:700;">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>: ${l.action}
            </div>
        `).join('') || 'No logs';

        body.innerHTML += `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${b.title}</strong><br><small style="color:var(--brand)">${b.project}</small></td>
            <td>${b.assignedTo}</td>
            <td>
                <select class="${b.status}" onchange="patch('${b._id}','status',this.value)">
                    <option ${b.status == 'Queue' ? 'selected' : ''} value="Queue">Queue</option>
                    <option ${b.status == 'Review' ? 'selected' : ''} value="Review">Review</option>
                    <option ${b.status == 'Fixed' ? 'selected' : ''} value="Fixed">Fixed</option>
                </select>
            </td>
            <td><input type="datetime-local" value="${startTime}" onchange="patch('${b._id}', 'startedAt', this.value)"></td>
            <td><input type="date" value="${b.targetDate || ''}" onchange="patch('${b._id}','targetDate',this.value)"></td>
            <td>
                <input type="range" min="0" max="100" value="${b.completion || 0}" onchange="patch('${b._id}','completion',this.value)">
                <div style="font-size:10px; text-align:center">${b.completion || 0}%</div>
            </td>
            <td><div style="max-height:60px; overflow-y:auto; font-size:10px;">${logHtml}</div></td>
        </tr>`;
    }
}

async function patch(id, field, value) {
    const data = { [field]: value };
    if (field === 'completion' && Number(value) === 100) data.status = "Review";

    await fetch(`${API}/bug/${id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'user-name': user },
        body: JSON.stringify(data)
    });
    loadBugs();
}

function notify(msg) {
    const n = document.getElementById('notify');
    n.innerText = msg;
    n.style.display = "block";
    const sound = document.getElementById('alertSound');
    if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
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
    const lines = document.getElementById('bPaste').value.trim().split("\n");
    const data = lines.map(l => {
        const parts = l.split("|");
        return {
            project: document.getElementById('bProj').value,
            task: document.getElementById('bTask').value,
            assignedTo: document.getElementById('bAssign').value,
            title: parts[0]?.trim(),
            targetDate: parts[1]?.trim(),
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
        document.getElementById('bPaste').value = "";
        loadBugs();
        notify("Batch Processed!");
    }
}

async function loadData() {
    const p = await (await fetch(API + "/projects")).json();
    const selProj = document.getElementById('selProj');
    const bProj = document.getElementById('bProj');
    [selProj, bProj].forEach(s => {
        if (s) {
            s.innerHTML = "";
            p.forEach(x => s.innerHTML += `<option value="${x.name}">${x.name}</option>`);
        }
    });
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
