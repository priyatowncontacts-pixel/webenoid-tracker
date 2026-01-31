const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/bugtracker")
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log("❌ Mongo Error:", err));

const Project = mongoose.model("Project",{ name:String });
const Task = mongoose.model("Task",{ project:String, name:String });

const Bug = mongoose.model("Bug",{
  project:String,
  task:String,
  title:String,
  assignedTo:String,
  status:{ type:String, default:"Open" },
  createdAt:{ type:Date, default:Date.now },
  fixedDate:{ type:Date, default:null }
});

app.use(express.static(path.join(__dirname,"../frontend")));

/* PROJECT */
app.post("/project", async(req,res)=>{
  await Project.create(req.body);
  res.json({success:true});
});
app.get("/projects", async(req,res)=>{
  res.json(await Project.find());
});

/* TASK */
app.post("/task", async(req,res)=>{
  await Task.create(req.body);
  res.json({success:true});
});
app.get("/tasks/:project", async(req,res)=>{
  res.json(await Task.find({project:req.params.project}));
});

/* BUG CREATE */
app.post("/bugs", async(req,res)=>{
  const data = req.body.map(b=>{
    if(b.status === "Fixed") b.fixedDate = new Date();
    return b;
  });
  await Bug.insertMany(data);
  res.json({success:true});
});

/* GET BUGS */
app.get("/bugs", async(req,res)=>{
  res.json(await Bug.find());
});

/* UPDATE STATUS */
app.put("/bug/:id", async(req,res)=>{
  const update = { status:req.body.status };

  if(req.body.status === "Fixed"){
    update.fixedDate = new Date();
  } else {
    update.fixedDate = null;
  }

  await Bug.findByIdAndUpdate(req.params.id, update);
  res.json({success:true});
});

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"../frontend/index.html"));
});

app.listen(3000,()=>console.log("🚀 Server running at http://localhost:3000"));
