const express = require('express');
const router = express.Router();

// Define index route
router.get('/', (req, res) => {
    const nodes = [
        { id: 1, host: 'ccscloud.dlsu.edu.ph', port: 20084 },
        { id: 2, host: 'ccscloud.dlsu.edu.ph', port: 20085 },
        { id: 3, host: 'ccscloud.dlsu.edu.ph', port: 20086 }
    ];
    res.render('index', { nodes });
});

module.exports = router;
