const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ Mongo Error:", err));

// 2. DATA MODELS
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });
const Bug = mongoose.model("Bug", {
  project: String,
  task: String,
  title: String,
  assignedTo: String,
  status: { type: String, default: "Queue" },
  createdAt: { type: Date, default: Date.now },
  targetDate: String,
  completion: { type: Number, default: 0 },
  startedAt: String
});

// 3. API ROUTES
app.post("/project", async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});

app.get("/projects", async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
});

app.post("/task", async (req, res) => {
  await Task.create(req.body);
  res.json({ success: true });
});

app.get("/tasks/:project", async (req, res) => {
  const tasks = await Task.find({ project: req.params.project });
  res.json(tasks);
});

app.post("/bugs", async (req, res) => {
  await Bug.insertMany(req.body);
  res.json({ success: true });
});

app.get("/bugs", async (req, res) => {
  const bugs = await Bug.find().sort({ createdAt: -1 });
  res.json(bugs);
});

app.put("/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

// 4. CLEAN ROUTING (This removes the .html from your URL)
// This serves login.html when you go to https://webenoid-tracker.onrender.com/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// This serves index.html when you go to https://webenoid-tracker.onrender.com/dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 5. START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
