const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect("mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB");

// --- SCHEMAS ---
const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String, status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 }
});

const History = mongoose.model("History", {
  bugId: String, user: String, action: String, timestamp: { type: Date, default: Date.now }
});

const Team = mongoose.model("Team", { name: String, role: String });
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });

// --- APIS ---
app.get("/api/bugs", async (req, res) => res.json(await Bug.find().sort({ _id: -1 })));

app.post("/api/bugs", async (req, res) => {
  const bugs = await Bug.insertMany(req.body);
  res.json({ ok: 1 });
});

app.put("/api/bug/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const userName = req.headers['user-name'] || "Unknown";

  if (updateData.completion == 100) {
    updateData.status = "Review";
  }

  await Bug.findByIdAndUpdate(id, updateData);

  // Log History
  let logMsg = updateData.completion !== undefined ? `Progress: ${updateData.completion}%` : `Updated ${Object.keys(updateData)[0]}`;
  await History.create({ bugId: id, user: userName, action: logMsg });

  res.json({ ok: 1 });
});

app.get("/api/history/:id", async (req, res) => res.json(await History.find({ bugId: req.params.id }).sort({ timestamp: -1 })));
app.get("/api/projects", async (req, res) => res.json(await Project.find()));
app.post("/api/project", async (req, res) => { await Project.create(req.body); res.json({ ok: 1 }); });
app.get("/api/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/api/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });

app.listen(3000, () => console.log("🚀 Server running on 3000"));