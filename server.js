const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// MODELS
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });
const Team = mongoose.model("Team", { name: String });
const Notify = mongoose.model("Notify", { user: String, message: String, time: String, read: { type: Boolean, default: false } });
const Bug = mongoose.model("Bug", {
  project: String, title: String, task: String, startedAt: String, targetDate: String, assignedTo: String,
  status: { type: String, default: "Queue" }, completion: { type: Number, default: 0 }
});

// ROUTES
app.get("/projects", async (req, res) => res.json(await Project.find()));
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({ success: true }); });
app.get("/team", async (req, res) => res.json(await Team.find()));
app.post("/team", async (req, res) => { await Team.create(req.body); res.json({ ok: 1 }); });
app.post("/task", async (req, res) => { await Task.create(req.body); res.json({ ok: 1 }); });
app.get("/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));

app.get("/bugs", async (req, res) => {
  const filter = {};
  if (req.query.project) filter.project = req.query.project;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  res.json(await Bug.find(filter).sort({ _id: -1 }));
});

app.post("/bugs", async (req, res) => {
  const data = req.body.map(b => ({ ...b, startedAt: b.startedAt || new Date().toISOString() }));
  await Bug.insertMany(data);
  res.json({ success: true });
});

app.put("/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.post("/notify", async (req, res) => { await Notify.create(req.body); res.json({ ok: 1 }); });

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "login.html")));

app.listen(3000, () => console.log(`🚀 Engine Live on 3000`));