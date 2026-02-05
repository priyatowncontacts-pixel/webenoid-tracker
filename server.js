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
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });

const Team = mongoose.model("Team", {
  name: String,
  password: { type: String, required: true },
  role: { type: String, default: "Developer" }
});

const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String,
  createdBy: String, // Tracks the Tester/Admin who logged it
  status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// --- LOGIN API ---
app.post("/api/login", async (req, res) => {
  const { name, password, role } = req.body;

  // Master Admin & Tester Bypass
  if (name === "Admin" && password === "Admin789" && role === "Admin") return res.json({ ok: 1, user: "Admin", role: "Admin" });
  if (name === "Webenoid" && password === "Webenoid123" && role === "Tester") return res.json({ ok: 1, user: "Webenoid", role: "Tester" });

  const person = await Team.findOne({ name, password, role });
  if (person) {
    res.json({ ok: 1, user: person.name, role: person.role });
  } else {
    res.status(401).json({ err: "Invalid Credentials" });
  }
});

// --- CRUD APIS ---
app.get("/api/projects", async (req, res) => res.json(await Project.find()));
app.post("/api/project", async (req, res) => { await Project.create(req.body); res.json({ ok: 1 }); });
app.get("/api/team", async (req, res) => res.json(await Team.find()));
app.post("/api/team", async (req, res) => { await Team.create(req.body); res.json({ ok: 1 }); });
app.get("/api/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/api/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });
app.get("/api/bugs", async (req, res) => res.json(await Bug.find().sort({ createdAt: -1 })));
app.post("/api/bugs", async (req, res) => { await Bug.insertMany(req.body); res.json({ ok: 1 }); });
app.put("/api/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ ok: 1 });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "login.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));