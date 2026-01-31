const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ================= DATABASE =================
const mongoURI =
process.env.MONGO_URI ||
"mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI).then(() =>
  console.log("✅ MongoDB Connected")
);

// ================= MODELS =================
const Project = mongoose.model("Project", {
  name: String,
});

const Bug = mongoose.model("Bug", {
  project: String,
  title: String,
  assignedTo: String,

  status: {
    type: String,
    default: "Open",
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },

  fixedDate: {
    type: Date,
    default: null,
  },
});

// ================= PROJECT API =================
app.get("/projects", async (req, res) => {
  res.json(await Project.find());
});

app.post("/project", async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});

// ================= BUG API =================
app.get("/bugs", async (req, res) => {
  res.json(await Bug.find().sort({ _id: -1 }));
});

app.post("/bugs", async (req, res) => {
  await Bug.insertMany(req.body);
  res.json({ success: true });
});

// BULK
app.post("/bugs/bulk", async (req, res) => {
  const text = req.body.text || "";

  const lines = text.split("\n");

  let list = [];

  lines.forEach(line => {
    if (!line.trim()) return;

    list.push({
      title: line.replace(/^\d+\.\s*/, ""),
      status: "Open",
      createdDate: new Date(),
    });
  });

  await Bug.insertMany(list);

  res.json({ success: true });
});

// STATUS UPDATE
app.put("/bugs/:id", async (req, res) => {
  const { status } = req.body;

  const update = { status };

  if (status === "Fixed") {
    update.fixedDate = new Date();
  }

  await Bug.findByIdAndUpdate(req.params.id, update);

  res.json({ success: true });
});

// DELETE
app.delete("/bugs/:id", async (req, res) => {
  await Bug.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= ROUTING =================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("*", (req, res) => res.redirect("/"));

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Engine Live on ${PORT}`)
);
