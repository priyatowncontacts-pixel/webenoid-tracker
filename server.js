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
mongoose.connect(mongoURI);

// --- SCHEMAS ---
const Project = mongoose.model("Project", { name: String, createdAt: { type: Date, default: Date.now } });
const Task = mongoose.model("Task", { project: String, name: String });
const Team = mongoose.model("Team", { name: String, password: { type: String, required: true }, role: { type: String, default: "Developer" } });

// Notifications Schema
const Note = mongoose.model("Note", { to: String, msg: String, read: { type: Boolean, default: false } });

const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String, createdBy: String, status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now }
});

// --- APIS ---
app.post("/api/login", async (req, res) => {
  const { name, password, role } = req.body;
  if (name === "Admin" && password === "Admin789" && role === "Admin") return res.json({ ok: 1, user: "Admin", role: "Admin" });
  if (name === "Webenoid" && password === "Webenoid123" && role === "Tester") return res.json({ ok: 1, user: "Webenoid", role: "Tester" });
  const person = await Team.findOne({ name, password, role });
  if (person) res.json({ ok: 1, user: person.name, role: person.role });
  else res.status(401).json({ err: "Invalid" });
});

// Sorted Projects (Newest first)
app.get("/api/projects", async (req, res) => res.json(await Project.find().sort({ createdAt: -1 })));
app.post("/api/project", async (req, res) => { await Project.create(req.body); res.json({ ok: 1 }); });

// Notifications API
app.get("/api/notes/:user", async (req, res) => res.json(await Note.find({ to: req.params.user, read: false })));
app.post("/api/notes/read", async (req, res) => { await Note.updateMany({ to: req.body.user }, { read: true }); res.json({ ok: 1 }); });

app.get("/api/bugs", async (req, res) => res.json(await Bug.find().sort({ createdAt: -1 })));
app.post("/api/bugs", async (req, res) => {
  await Bug.insertMany(req.body);
  // Create notifications for assigned developers
  for (let b of req.body) {
    await Note.create({ to: b.assignedTo, msg: `New Bug Assigned: ${b.title} (${b.project})` });
  }
  res.json({ ok: 1 });
});

app.put("/api/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ ok: 1 });
});

app.get("/api/team", async (req, res) => res.json(await Team.find()));
app.post("/api/team", async (req, res) => { await Team.create(req.body); res.json({ ok: 1 }); });
app.get("/api/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/api/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(3000, () => console.log("🚀 Server running on 3000"));