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

  const connectionNode2 = mysql.createConnection({
    host: 'ccscloud.dlsu.edu.ph',
    port: 20085,
    user: 'root',
    password: 'Cr6Sq5RPcvZLubhjEAnF8tYX',
    database: 'appointments'
  });

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

// Route to update the data item
app.post('/update', (req, res) => {
  const newValue = req.body.value;
  dataItem = newValue;
  res.redirect('/');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
