const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// --- SCHEMAS ---
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });
const Team = mongoose.model("Team", { name: String, email: String });
const History = mongoose.model("History", { bugId: String, bugTitle: String, userEmail: String, change: String, time: { type: Date, default: Date.now } });
const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String,
  assignedTo: String, assignedEmail: String, // Email used for strict filtering
  status: { type: String, default: "Queue" }, completion: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now }
});

// --- API ROUTES ---
app.get("/projects", async (req, res) => res.json(await Project.find()));
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({ success: true }); });
app.delete("/project/:name", async (req, res) => {
  await Project.deleteOne({ name: req.params.name });
  await Bug.deleteMany({ project: req.params.name });
  res.json({ success: true });
});

app.get("/team", async (req, res) => res.json(await Team.find()));
app.post("/team", async (req, res) => { await Team.create(req.body); res.json({ success: true }); });
app.delete("/team/:email", async (req, res) => { await Team.deleteOne({ email: req.params.email }); res.json({ success: true }); });

app.get("/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });

app.get("/bugs", async (req, res) => res.json(await Bug.find().sort({ createdAt: -1 })));
app.post("/bugs", async (req, res) => { await Bug.insertMany(req.body); res.json({ success: true }); });

app.put("/bug/:id", async (req, res) => {
  const old = await Bug.findById(req.params.id);
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  const field = Object.keys(req.body)[0];
  const val = Object.values(req.body)[0];
  // Log history with email
  await History.create({ bugId: req.params.id, bugTitle: old.title, userEmail: req.headers.email || "System", change: `Changed ${field} to ${val}` });
  res.json({ success: true });
});

app.get("/history", async (req, res) => res.json(await History.find().sort({ time: -1 }).limit(30)));

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.listen(3000, () => console.log(`🚀 Engine Live on 3000`));