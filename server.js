const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected"));

// --- SCHEMAS ---
const Project = mongoose.model("Project", { name: String, createdAt: { type: Date, default: Date.now } });
const Task = mongoose.model("Task", { project: String, name: String });
const Team = mongoose.model("Team", { name: String, password: { type: String, required: true }, role: { type: String, default: "Developer" } });

const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String, createdBy: String, status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now }
});

const History = mongoose.model("History", {
  bugId: String, user: String, action: String, timestamp: { type: Date, default: Date.now }
});

const Note = mongoose.model("Note", { to: String, msg: String, read: { type: Boolean, default: false } });

// --- APIS ---
app.post("/api/login", async (req, res) => {
  const { name, password, role } = req.body;
  if (name === "Admin" && password === "Admin789" && role === "Admin") return res.json({ ok: 1, user: "Admin", role: "Admin" });
  if (name === "Webenoid" && password === "Webenoid123" && role === "Tester") return res.json({ ok: 1, user: "Webenoid", role: "Tester" });
  const person = await Team.findOne({ name, password, role });
  if (person) res.json({ ok: 1, user: person.name, role: person.role });
  else res.status(401).json({ err: "Invalid" });
});

app.get("/api/projects", async (req, res) => res.json(await Project.find().sort({ createdAt: -1 })));
app.post("/api/project", async (req, res) => { await Project.create(req.body); res.json({ ok: 1 }); });
app.get("/api/bugs", async (req, res) => res.json(await Bug.find().sort({ createdAt: -1 })));

app.post("/api/bugs", async (req, res) => {
  const bugs = await Bug.insertMany(req.body);
  for (let b of req.body) await Note.create({ to: b.assignedTo, msg: `New Bug: ${b.title}` });
  res.json({ ok: 1 });
});

app.put("/api/bug/:id", async (req, res) => {
  const { id } = req.params;
  const update = req.body;
  const user = req.headers['user-name'] || "System";
  if (update.completion == 100) {
    update.status = "Review";
    await Note.create({ to: "Webenoid", msg: `Task ready for Review: ${id}` });
  }
  await Bug.findByIdAndUpdate(id, update);
  const action = update.completion !== undefined ? `Progress: ${update.completion}%` : `Updated ${Object.keys(update)[0]}`;
  await History.create({ bugId: id, user, action });
  res.json({ ok: 1 });
});

app.get("/api/history/:id", async (req, res) => res.json(await History.find({ bugId: req.params.id }).sort({ timestamp: -1 })));
app.get("/api/notes/:user", async (req, res) => res.json(await Note.find({ to: req.params.user, read: false })));
app.post("/api/notes/read", async (req, res) => { await Note.updateMany({ to: req.body.user }, { read: true }); res.json({ ok: 1 }); });
app.get("/api/team", async (req, res) => res.json(await Team.find()));
app.post("/api/team", async (req, res) => { await Team.create(req.body); res.json({ ok: 1 }); });
app.get("/api/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/api/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.listen(3000, () => console.log("🚀 Webenoid Engine Live"));