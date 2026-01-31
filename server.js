const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected"));

// 2. DATA MODELS
const Project = mongoose.model("Project", { name: String });
const Task = mongoose.model("Task", { project: String, name: String });
const Bug = mongoose.model("Bug", {
  project: String,
  task: String,
  title: String,
  assignedTo: String,
  status: { type: String, default: "Queue" },
  targetDate: String,
  startedAt: String,
  completion: { type: Number, default: 0 }
});

// 3. API ROUTES
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({success:true}); });
app.get("/projects", async (req, res) => { res.json(await Project.find()); });
app.post("/task", async (req, res) => { await Task.create(req.body); res.json({success:true}); });
app.get("/tasks/:project", async (req, res) => { res.json(await Task.find({ project: req.params.project })); });
app.post("/bugs", async (req, res) => { await Bug.insertMany(req.body); res.json({success:true}); });
app.get("/bugs", async (req, res) => { res.json(await Bug.find().sort({_id: -1})); });
app.put("/bug/:id", async (req, res) => { await Bug.findByIdAndUpdate(req.params.id, req.body); res.json({success:true}); });

// 4. CLEAN ROUTING
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webenoid Engine Live on Port ${PORT}`));
