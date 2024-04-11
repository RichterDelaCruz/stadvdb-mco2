const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');

// Set Handlebars as the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MySQL connection configuration
const nodes = [
  { id: 1, host: 'ccscloud.dlsu.edu.ph', port: 20084 },
  { id: 2, host: 'ccscloud.dlsu.edu.ph', port: 20085 },
  { id: 3, host: 'ccscloud.dlsu.edu.ph', port: 20086 }
];

function getNodeById(nodeId) {
  return nodes.find(node => node.id === nodeId);
}

function connectToNode(node) {
  return mysql.createConnection({
    host: node.host,
    port: node.port,
    user: 'root',
    password: 'Cr6Sq5RPcvZLubhjEAnF8tYX',
    database: 'appointments'
  });
}

// Define index route
const indexRouter = express.Router();

indexRouter.get('/', (req, res) => {
  res.render('index', { nodes }); // Pass nodes as data to the view
});

app.use('/', indexRouter);

// Define route for connecting to MySQL node
app.post('/connect', (req, res) => {
  const nodeId = parseInt(req.body.nodeId); // Assuming nodeId is sent in the request body
  const selectedNode = getNodeById(nodeId);

  if (!selectedNode) {
    return res.status(400).send('Invalid node ID');
  }

  // Connect to the selected MySQL node
  const connection = connectToNode(selectedNode);

  // Test the connection
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return res.status(500).send('Failed to connect to the selected node');
    }
    console.log('Connected to MySQL:', selectedNode);
    res.send('Successfully connected to MySQL');
  });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
