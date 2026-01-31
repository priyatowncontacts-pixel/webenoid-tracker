const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected"));

// MODELS
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

// DISCORD NOTIFICATION LOGIC
async function notifyDiscord(title, status, project, dev) {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return;
    let color = 3447003; 
    let icon = "📥";
    if (status === "Review") { color = 16776960; icon = "🔍"; }
    if (status === "Fixed") { color = 3066993; icon = "✅"; }
    const payload = {
        embeds: [{
            title: `${icon} Webenoid Update: ${status}`,
            color: color,
            fields: [
                { name: "Project", value: project, inline: true },
                { name: "Assignee", value: dev, inline: true },
                { name: "Defect", value: title, inline: false }
            ],
            timestamp: new Date()
        }]
    };
    try { await axios.post(webhook, payload); } catch (err) { console.log("Discord error"); }
}

// API ROUTES
app.get("/projects", async (req, res) => res.json(await Project.find()));
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({success:true}); });
app.get("/tasks/:project", async (req, res) => res.json(await Task.find({ project: req.params.project })));
app.post("/task", async (req, res) => { await Task.create(req.body); res.json({success:true}); });
app.get("/bugs", async (req, res) => res.json(await Bug.find().sort({_id: -1})));
app.post("/bugs", async (req, res) => { 
    const bugs = await Bug.insertMany(req.body); 
    if (bugs.length > 0) notifyDiscord(bugs[0].title, "Queue", bugs[0].project, bugs[0].assignedTo);
    res.json({success:true}); 
});
app.put("/bug/:id", async (req, res) => { 
    const oldBug = await Bug.findById(req.params.id);
    const updated = await Bug.findByIdAndUpdate(req.params.id, req.body, { new: true }); 
    if (req.body.status && oldBug.status !== req.body.status) {
        notifyDiscord(updated.title, updated.status, updated.project, updated.assignedTo);
    }
    res.json({success:true}); 
});

// ROUTING - THE FIX FOR YOUR VIDEOS
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("*", (req, res) => res.redirect("/")); // Force any error back to login

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
