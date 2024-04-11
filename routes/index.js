// routes/index.js
const express = require('express');
const router = express.Router();

// Define index route
router.get('/', (req, res) => {
    res.render('index'); // Render index.hbs
});

module.exports = router;
