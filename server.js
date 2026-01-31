const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. CLOUD DATABASE CONNECTION
// We use your Webenoid credentials and the Cluster0 address you provided.
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Webenoid Cloud MongoDB Connected"))
  .catch(err => console.log("❌ Mongo Connection Error:", err));

// 2. DATA MODELS (Schemas)
const Project = mongoose.model("Project", { 
  name: String 
});

const Task = mongoose.model("Task", { 
  project: String, 
  name: String 
});

const Bug = mongoose.model("Bug", {
  project: String,
  task: String,
  title: String,
  assignedTo: String,
  status: { type: String, default: "Queue" },
  createdAt: { type: Date, default: Date.now },
  targetDate: { type: String }, 
  completion: { type: Number, default: 0 },
  startedAt: { type: String },
  fixedDate: { type: Date, default: null }
});

// 3. SERVE STATIC FILES
// This allows the server to send your index.html and login.html to the browser
app.use(express.static(path.join(__dirname)));

/* --- API ROUTES --- */

/* PROJECT ROUTES */
app.post("/project", async (req, res) => {
  try {
    await Project.create(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/projects", async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
});

/* TASK ROUTES */
app.post("/task", async (req, res) => {
  try {
    await Task.create(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/tasks/:project", async (req, res) => {
  const tasks = await Task.find({ project: req.params.project });
  res.json(tasks);
});

/* BUG ROUTES */
// Supports both single and bulk bug logging
app.post("/bugs", async (req, res) => {
  try {
    const data = req.body.map(b => {
      if (b.status === "Fixed") b.fixedDate = new Date();
      return b;
    });
    await Bug.insertMany(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/bugs", async (req, res) => {
  const bugs = await Bug.find().sort({ createdAt: -1 });
  res.json(bugs);
});

/* UPDATE BUG STATUS & PROGRESS */
app.put("/bug/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Automatically manage the fixedDate based on status
    if (req.body.status === "Fixed") {
      updateData.fixedDate = new Date();
    } else if (req.body.status === "Queue") {
      updateData.fixedDate = null;
    }

    await Bug.findByIdAndUpdate(req.params.id, updateData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ROUTING TO HTML FILES
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 5. SERVER START
// Render provides the PORT variable; we use 3000 as a backup for local testing.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webenoid Backend Live at port ${PORT}`);
});
