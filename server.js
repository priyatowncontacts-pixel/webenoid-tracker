const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ Mongo Error:", err));

// --- SCHEMAS ---
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });
const Team = mongoose.model("Team", { name: String, email: { type: String, unique: true } });
const History = mongoose.model("History", {
  bugId: String, bugTitle: String, userEmail: String, change: String, time: { type: Date, default: Date.now }
});
const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String, assignedEmail: String,
  status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// --- API ROUTES ---
app.get("/api/projects", async (req, res) => res.json(await Project.find()));
app.post("/api/project", async (req, res) => { await Project.create(req.body); res.json({ ok: 1 }); });
app.delete("/api/project/:name", async (req, res) => {
  await Project.deleteOne({ name: req.params.name });
  await Bug.deleteMany({ project: req.params.name });
  res.json({ ok: 1 });
});

app.get("/api/team", async (req, res) => res.json(await Team.find()));
app.post("/api/team", async (req, res) => {
  try { await Team.create(req.body); res.json({ ok: 1 }); }
  catch (e) { res.status(400).json({ err: "Email already registered" }); }
});

app.get("/api/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/api/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });

app.get("/api/bugs", async (req, res) => res.json(await Bug.find().sort({ createdAt: -1 })));
app.post("/api/bugs", async (req, res) => { await Bug.insertMany(req.body); res.json({ ok: 1 }); });

app.put("/api/bug/:id", async (req, res) => {
  const old = await Bug.findById(req.params.id);
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  const field = Object.keys(req.body)[0];
  const val = Object.values(req.body)[0];

  await History.create({
    bugId: req.params.id,
    bugTitle: old.title,
    userEmail: req.headers.email || "System",
    change: `Updated ${field} to ${val}`
  });
  res.json({ ok: 1 });
});

app.get("/api/history", async (req, res) => res.json(await History.find().sort({ time: -1 }).limit(30)));

// Serve Dashboard
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
// Serve Login Fallback
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "login.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Engine Live on Port ${PORT}`));