const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
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
const Bug = mongoose.model("Bug", { 
    project: String, 
    title: String, 
    assignedTo: String, 
    status: { type: String, default: "Queue" } 
});

// API ENDPOINTS
app.get("/projects", async (req, res) => res.json(await Project.find()));
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({success:true}); });
app.get("/bugs", async (req, res) => res.json(await Bug.find().sort({_id: -1})));

// Handles both single and bulk bug additions
app.post("/bugs", async (req, res) => { 
    const data = Array.isArray(req.body) ? req.body : [req.body];
    await Bug.insertMany(data); 
    res.json({success:true}); 
});

// Update Status Toggle
app.put("/bug/:id", async (req, res) => {
    await Bug.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});

// Delete Record
app.delete("/bug/:id", async (req, res) => {
    await Bug.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ROUTING: Aligning paths to prevent 304/Redirect loops
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Catch-all: Redirect unknown paths to login
app.get("*", (req, res) => res.redirect("/"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webenoid Engine Live on ${PORT}`));
