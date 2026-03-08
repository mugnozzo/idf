const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/types", (req, res) => {
  console.log("GET request received on /api/types");
  const stmt = db.prepare("SELECT * FROM types");
  const rows = stmt.all();
  res.json(rows);
});

app.get("/api/statuses", (req, res) => {
  console.log("GET request received on /api/statuses");
  const stmt = db.prepare("SELECT * FROM statuses");
  const rows = stmt.all();
  res.json(rows);
});

// Basic CRUD actions for element
// TODO: implement the missing CRUD
app.get("/api/elements", (req, res) => {
  console.log("GET request received on /api/elements");
  const stmt = db.prepare("SELECT * FROM elements");
  const rows = stmt.all();
  res.json(rows);
});
app.post("/api/element", (req, res) => {
  // here goes the code
});
app.get("/api/element/:id", (req, res) => {
  // here goes the code
});
app.put("/api/element/:id", (req, res) => {
  // here goes the code
});
app.delete("/api/element/:id", (req, res) => {
  // here goes the code
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
