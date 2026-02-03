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


// =====================================================
// MODELS  (OLD + TASK MODEL)
// =====================================================

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

const Task = mongoose.model("Task", {
  project: String,
  name: String
});

const Notify = mongoose.model("Notify", {
  user: String,
  message: String,
  time: String,
  read: { type: Boolean, default: false }
});


// =====================================================
// PROJECT ROUTES  (OLD – UNTOUCHED)
// =====================================================

app.get("/projects", async (req, res) => {
  res.json(await Project.find());
});

app.post("/project", async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});


// =====================================================
// TASK ROUTES  (REQUIRED BY YOUR UI)
// =====================================================

app.post("/task", async (req, res) => {
  await Task.create(req.body);
  res.json({ ok: 1 });
});

app.get("/tasks/:project", async (req, res) => {
  const list = await Task.find({ project: req.params.project });
  res.json(list);
});


// =====================================================
// BUG ROUTES  (FIXED DATE FORMAT)
// =====================================================

app.get("/bugs", async (req, res) => {
  res.json(await Bug.find().sort({ _id: -1 }));
});


// 🔥 FIXED INSERT WITH DATE FORMAT
app.post("/bugs", async (req, res) => {

  const data = req.body.map(b => ({

    ...b,

    startedAt: b.startedAt && !b.startedAt.includes("T")
      ? b.startedAt + "T00:00"
      : b.startedAt,

    targetDate: b.targetDate && !b.targetDate.includes("T")
      ? b.targetDate + "T00:00"
      : b.targetDate

  }));

  await Bug.insertMany(data);
  res.json({ success: true });
});


// 🔥 FIXED UPDATE WITH DATE FORMAT
app.put("/bug/:id", async (req, res) => {

  let body = { ...req.body };

  if (body.startedAt && !body.startedAt.includes("T")) {
    body.startedAt = body.startedAt + "T00:00";
  }

  if (body.targetDate && !body.targetDate.includes("T")) {
    body.targetDate = body.targetDate + "T00:00";
  }

  await Bug.findByIdAndUpdate(req.params.id, body);
  res.json({ success: true });
});


app.delete("/bug/:id", async (req, res) => {
  await Bug.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});


// =====================================================
// NOTIFICATION ROUTES (KEPT SAME)
// =====================================================

app.post("/notify", async (req, res) => {
  await Notify.create(req.body);
  res.json({ ok: 1 });
});

app.get("/notify/:user", async (req, res) => {
  res.json(
    await Notify.find({ user: req.params.user })
      .sort({ _id: -1 })
      .limit(50)
  );
});

app.put("/notify/read/:id", async (req, res) => {
  await Notify.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: 1 });
});


// =====================================================
// PAGE ROUTING (OLD – UNTOUCHED)
// =====================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/tracker.html", (req, res) => {
  res.sendFile(path.join(__dirname, "tracker.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});


// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Engine Live on ${PORT}`)
);
