const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// allow render + browser
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// DATABASE
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI).then(() =>
  console.log("✅ MongoDB Connected")
);

// MODELS
const Project = mongoose.model("Project", { name: String });

const Bug = mongoose.model("Bug", {
  project: String,
  title: String,
  assignedTo: String,
  status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 }, // Added to store progress bar %
  createdDate: { type: Date, default: Date.now },
  fixedDate: { type: Date, default: null },
});

// API - PROJECTS
app.get("/projects", async (req, res) => {
  res.json(await Project.find());
});

app.post("/project", async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});

// API - BUGS
app.get("/bugs", async (req, res) => {
  res.json(await Bug.find().sort({ _id: -1 }));
});

app.post("/bugs", async (req, res) => {
  await Bug.insertMany(req.body);
  res.json({ success: true });
});

// --- NEW ROUTES TO FIX 404 ERRORS ---

// Update status or progress
app.put("/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

// Delete a bug
app.delete("/bug/:id", async (req, res) => {
  await Bug.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ROUTING
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/index.html", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Engine Live on ${PORT}`)
);