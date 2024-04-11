// Custom Handlebars helper function for conditional statements
const ifCond = function (v1, operator, v2, options) {
  switch (operator) {
    case '===':
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!==':
      return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<':
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=':
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>':
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=':
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&':
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||':
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
};

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');

// Register the ifCond helper with Handlebars
const hbs = require('hbs');
hbs.registerHelper('ifCond', ifCond);

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
    // Redirect to the search page
    res.redirect('/search');
  });

  // Define route for search page
  app.get('/search', (req, res) => {
    res.render('search');
  });

  // Define route to render the update page with the appointment details
  app.get('/update/:apptId', (req, res) => {
    const apptId = req.params.apptId;

    // Query the database to retrieve the appointment details based on the appointment ID
    connection.query('SELECT * FROM appointments_ndb WHERE apptid = ?', [apptId], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        return res.status(500).send('Error executing MySQL query');
      }

      // Render the update page with the appointment details
      res.render('updateAppointmentDetails', { appointment: results[0] }); // Assuming there's only one appointment with the given ID
    });
  });

  // Define route for updating appointment details
  app.post('/update', (req, res) => {
    const { apptId, pxid, doctorid, clinicid, status, timeQueued, queueDate, startTime, endTime, type, hospitalName, isHospital, city, province, regionName, doctorMainSpeciality, doctorAge, pxAge, pxGender, virtual } = req.body;
    const updatedTimeQueued = req.body.timeQueued !== '' ? req.body.timeQueued : null;
    const updatedQueueDate = req.body.queueDate !== '' ? req.body.queueDate : null;
    const updatedStartTime = req.body.startTime !== '' ? req.body.startTime : null;
    const updatedEndTime = req.body.endTime !== '' ? req.body.endTime : null;

    // Replace empty string values with null
    const fields = [pxid, doctorid, clinicid, status, updatedTimeQueued, updatedQueueDate, updatedStartTime, updatedEndTime, type, hospitalName, isHospital, city, province, regionName, doctorMainSpeciality, doctorAge, pxAge, pxGender, virtual];
    const values = fields.map(value => (value === '' ? null : value));

    // Construct the SQL query to update the appointment
    const query = `
    UPDATE appointments_ndb 
    SET 
        pxid = ?, 
        doctorid = ?, 
        clinicid = ?, 
        status = ?, 
        timeQueued = ?, 
        queueDate = ?, 
        startTime = ?, 
        endTime = ?, 
        type = ?, 
        hospitalName = ?, 
        isHospital = ?, 
        city = ?, 
        province = ?, 
        regionName = ?, 
        doctorMainSpeciality = ?, 
        doctorAge = ?, 
        pxAge = ?, 
        pxGender = ?, 
        \`virtual\` = ? 
    WHERE 
        apptid = ?`;

    // Add apptId to values array
    values.push(apptId);

    // Execute the query
    connection.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating appointment:', err);
        return res.status(500).send('Error updating appointment');
      }
      console.log('Appointment updated successfully');
      // Redirect to the appointment details page
      res.redirect('/');
    });
  });

  // Define route for deleting appointments
  app.post('/delete', (req, res) => {
    const apptId = req.body.apptId;

    // Construct the SQL query to delete the appointment
    const query = 'DELETE FROM appointments_ndb WHERE apptid = ?';

    // Execute the query
    connection.query(query, [apptId], (err, result) => {
      if (err) {
        console.error('Error deleting appointment:', err);
        return res.status(500).send('Error deleting appointment');
      }
      console.log('Appointment deleted successfully');
      // Redirect to the index page or any other appropriate page
      res.redirect('/');
    });
  });

  // Define route for handling search request
  app.post('/search', (req, res) => {
    const apptId = req.body.apptId;

    // Query MySQL database to retrieve appointment details based on the appointment ID
    connection.query('SELECT * FROM appointments_ndb WHERE apptid = ?', [apptId], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        // Render the search page with an error message
        return res.render('search', { error: 'An error occurred while executing the query. Please try again.' });
      }

      // Check if the query returned no results
      if (results.length === 0) {
        // Render the search page with an error message indicating the appointment ID was not found
        return res.render('search', { error: 'No appointment found with the provided ID. Please try again.' });
      }

      // Log the entire row corresponding to the appointment ID
      console.log('Appointment details:', results);

      // Render a response with the appointment details
      res.render('appointmentDetails', { appointment: results[0] }); // Assuming there's only one appointment with the given ID
    });
  });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});