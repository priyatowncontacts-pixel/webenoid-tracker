const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Security Header
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ===== DATABASE CONNECTION =====
const mongoURI =
  process.env.MONGO_URI ||
  "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// ===== MODELS (OLD – UNTOUCHED) =====
const Project = mongoose.model("Project", {
  name: String
});

const Bug = mongoose.model("Bug", {
  project: String,
  title: String,
  task: String,

  startedAt: String,
  targetDate: String,

  assignedTo: String,

  status: { type: String, default: "Queue" },
  completion: { type: Number, default: 0 }
});

// ===== NEW MODEL – NOTIFICATION (ADDED ONLY) =====
const Notify = mongoose.model("Notify", {
  user: String,
  message: String,
  time: String,
  read: { type: Boolean, default: false }
});

// ===== API ROUTES (OLD – KEPT SAME) =====

// Projects
app.get("/projects", async (req, res) => {
  res.json(await Project.find());
});

app.post("/project", async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});

// Bugs
app.get("/bugs", async (req, res) => {
  res.json(await Bug.find().sort({ _id: -1 }));
});

app.post("/bugs", async (req, res) => {
  await Bug.insertMany(req.body);
  res.json({ success: true });
});

// Update Bug
app.put("/bug/:id", async (req, res) => {
  await Bug.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

// Delete Bug
app.delete("/bug/:id", async (req, res) => {
  await Bug.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ===== NEW ROUTES – NOTIFICATION (ONLY ADDITION) =====

// Create notification
app.post("/notify", async (req, res) => {
  await Notify.create(req.body);
  res.json({ ok: 1 });
});

// Get notifications for user
app.get("/notify/:user", async (req, res) => {
  res.json(
    await Notify.find({ user: req.params.user })
      .sort({ _id: -1 })
      .limit(50)
  );
});

// Mark as read
app.put("/notify/read/:id", async (req, res) => {
  await Notify.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: 1 });
});

// ===== PAGE ROUTING =====

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/tracker.html", (req, res) => {
  res.sendFile(path.join(__dirname, "tracker.html"));
});

// Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Engine Live on ${PORT}`)
);
