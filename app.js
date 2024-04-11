const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MySQL connection configuration
const connectionNode1 = mysql.createConnection({
    host: 'ccscloud.dlsu.edu.ph',
    port: 20084,
    user: 'root',
    password: 'Cr6Sq5RPcvZLubhjEAnF8tYX',
    database: 'appointments'
  });

<<<<<<< Updated upstream
  const connectionNode2 = mysql.createConnection({
    host: 'ccscloud.dlsu.edu.ph',
    port: 20085,
    user: 'root',
    password: 'Cr6Sq5RPcvZLubhjEAnF8tYX',
    database: 'appointments'
  });
=======
// Define a global variable to store the selected node
let selectedNode = null;

// Global variable to store the MySQL connection
let connection = null;

// Define index route
const indexRouter = express.Router();
>>>>>>> Stashed changes

  const connectionNode3 = mysql.createConnection({
    host: 'ccscloud.dlsu.edu.ph',
    port: 20086,
    user: 'root',
    password: 'Cr6Sq5RPcvZLubhjEAnF8tYX',
    database: 'appointments'
  });
  

// Connect to the MySQL database
    connectionNode1.connect((err) => {
    if (err) {
      console.error('Error connecting to Node 1:', err);
      return;
    }
    console.log('Connected to Node 1');
  });
  

// In-memory storage for simplicity (replace with actual database logic)
let dataItem = 'initial';

// Route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route to read the data item
app.get('/read', (req, res) => {
  res.send(dataItem);
});

<<<<<<< Updated upstream
// Route to update the data item
app.post('/update', (req, res) => {
  const newValue = req.body.value;
  dataItem = newValue;
  res.redirect('/');
=======
// Define route for connecting to MySQL node
app.post('/connect', (req, res) => {
  const nodeId = parseInt(req.body.nodeId); // Assuming nodeId is sent in the request body
  selectedNode = getNodeById(nodeId);

  if (!selectedNode) {
    return res.status(400).send('Invalid node ID');
  }

  // Connect to the selected MySQL node
  connection = connectToNode(selectedNode);

  // Test the connection
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return res.status(500).send('Failed to connect to the selected node');
    }
    console.log('Connected to MySQL:', selectedNode);
    // Redirect to the search page
    res.redirect('/search');
  });
});

// Define route for search page
app.get('/search', (req, res) => {
  res.render('search');
});

// Define route for handling search request
app.post('/search', (req, res) => {
  const apptId = req.body.apptId;

  // Query MySQL database to retrieve appointment details based on the appointment ID
  connection.query('SELECT * FROM appointments_ndb WHERE apptid = ?', [apptId], (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      return res.status(500).send('Error executing MySQL query');
    }

    // Log the entire row corresponding to the appointment ID
    console.log('Appointment details:', results);

    // Render a response with the appointment details
    res.render('appointmentDetails', { appointment: results[0] }); // Assuming there's only one appointment with the given ID
  });
>>>>>>> Stashed changes
});

// Define route for updating an appointment
app.post('/update', (req, res) => {
  const { apptId, updateField, updateValue } = req.body;

  // Update the appointment in the database
  connection.query(`UPDATE appointments_ndb SET ${updateField} = ? WHERE apptid = ?`, [updateValue, apptId], (err, results) => {
    if (err) {
      console.error('Error updating appointment:', err);
      return res.status(500).send('Error updating appointment');
    }
    console.log('Updated appointment:', results);

    res.redirect('/'); // Redirect to the home page or a confirmation page
  });
});

// Define route for deleting an appointment
app.post('/delete', (req, res) => {
  const { apptId, deleteField } = req.body;

  // Delete the specified field from the appointment in the database
  connection.query(`UPDATE appointments_ndb SET ${deleteField} = NULL WHERE apptid = ?`, [apptId], (err, results) => {
    if (err) {
      console.error('Error deleting appointment:', err);
      return res.status(500).send('Error deleting appointment');
    }

    res.redirect('/'); // Redirect to the home page or a confirmation page
  });
});


// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
