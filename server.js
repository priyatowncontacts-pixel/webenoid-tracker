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

// DATABASE
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Webenoid:Webenoid123@cluster0.syu48mi.mongodb.net/webenoidDB?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected"));

const Project = mongoose.model("Project", { name: String });
const Bug = mongoose.model("Bug", { project: String, title: String, assignedTo: String, status: { type: String, default: "Queue" } });

// API
app.get("/projects", async (req, res) => res.json(await Project.find()));
app.post("/project", async (req, res) => { await Project.create(req.body); res.json({success:true}); });
app.get("/bugs", async (req, res) => res.json(await Bug.find().sort({_id: -1})));
app.post("/bugs", async (req, res) => { await Bug.insertMany(req.body); res.json({success:true}); });

// 🔥 ROUTING FIX: Force root to login.html
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Catch-all redirect
app.get("*", (req, res) => res.redirect("/"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Engine Live on ${PORT}`));
