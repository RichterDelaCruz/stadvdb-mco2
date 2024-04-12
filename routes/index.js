const express = require("express");
const router = express.Router();

const nodes = [
  { id: 1, host: "ccscloud.dlsu.edu.ph", port: 20084 },
  { id: 2, host: "ccscloud.dlsu.edu.ph", port: 20085 },
  { id: 3, host: "ccscloud.dlsu.edu.ph", port: 20086 },
];

// Define index route
router.get("/", (req, res) => {
  res.render("index", { nodes });
});

router.get("/search", (req, res) => {
  res.render("search");
});

module.exports = router;
