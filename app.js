const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const path = require("path");
const hbs = require("hbs");
const { ifCond, formatDatetime } = require("./helpers");
const indexRouter = require("./routes/index");

// Register helpers
hbs.registerHelper("ifCond", ifCond);
hbs.registerHelper("formatDatetime", formatDatetime);

// Set Handlebars as the view engine
const app = express();
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// MySQL connection configuration
let connection;
let reconnectInterval;
let selectedNode;

const nodes = [
  { id: 1, host: "ccscloud.dlsu.edu.ph", port: 20084 },
  { id: 2, host: "ccscloud.dlsu.edu.ph", port: 20085 },
  { id: 3, host: "ccscloud.dlsu.edu.ph", port: 20086 },
];

function getNodeById(nodeId) {
  return nodes.find((node) => node.id === nodeId);
}

function connectToNode(node) {
  return mysql.createConnection({
    host: node.host,
    port: node.port,
    user: "root",
    password: "Cr6Sq5RPcvZLubhjEAnF8tYX",
    database: "db",
  });
}

function createPool(port) {
  return mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: port,
    user: "root",
    password: "Cr6Sq5RPcvZLubhjEAnF8tYX",
    database: "db",
  });
}

const pools = [createPool(20084), createPool(20085), createPool(20086)];

app.use("/", indexRouter);

// Define route for connecting to MySQL node
app.post("/connect", (req, res) => {
  const nodeId = parseInt(req.body.nodeId); // Assuming nodeId is sent in the request body
  selectedNode = getNodeById(nodeId);

  if (!selectedNode) {
    return res.status(400).send("Invalid node ID");
  }

  // Connect to the selected MySQL node
  connection = connectToNode(selectedNode);

  // Add an 'error' event handler to the connection
  connection.on("error", function (err) {
    console.error("Database connection error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      // Handle losing the connection to the MySQL server
      console.error(
        "MySQL server connection was lost. Attempting to reconnect..."
      );

      // Start a timer to attempt to reconnect every 5 seconds
      if (!reconnectInterval) {
        reconnectInterval = setInterval(function () {
          connection = connectToNode(selectedNode);
          connection.connect((err) => {
            if (err) {
              console.error("Error reconnecting to MySQL:", err);
            } else {
              console.log("Reconnected to MySQL:", selectedNode);
              // Stop the timer once reconnected
              clearInterval(reconnectInterval);
              reconnectInterval = null;
            }
          });
        }, 5000);
      }
    } else {
      // Handle other types of database errors
      console.error("An unknown database error occurred:", err);
    }
  });

  // Test the connection
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to MySQL:", err);
      return res.status(500).send("Failed to connect to the selected node");
    }
    console.log("Connected to MySQL:", selectedNode);
    console.log(connection.config.port);
    // Redirect to the search page
    res.redirect("/search");
  });

  connection.end();
});

// Define route for handling search request
app.post("/search", (req, res) => {
  const apptId = req.body.apptId;
  const query = "SELECT * FROM appointments WHERE apptid = ?";

  let nodeIndex = selectedNode.id; // Start with the first node
  let count = 0;

  if (selectedNode.id == 1) {
    pools[0].query(query, [apptId], (err, results) => {
      if (err) {
        console.error("Node 1 down. Trying Node 2");
        pools[1].query(query, [apptId], (err, results) => {
          if (err || results.length == 0) {
            if (err) {
              console.error("Node 2 down. Trying Node 3");
            } else {
              console.log("Not found in Node 2. Trying Node 3");
            }
            pools[2].query(query, [apptId], (err, results) => {
              if (results == 0) {
                return res.render("search", {
                  error:
                    "No appointment found with the provided ID. Please try again.",
                });
              } else {
                return res.render("appointmentDetails", {
                  appointment: results[0],
                });
              }
            });
          } else {
            return res.render("appointmentDetails", {
              appointment: results[0],
            });
          }
        });
      } else if (results == 0) {
        return res.render("search", {
          error: "No appointment found with the provided ID. Please try again.",
        });
      } else {
        res.render("appointmentDetails", { appointment: results[0] });
      }
    });
  } else {
    pools[selectedNode.id - 1].query(query, [apptId], (err, results) => {
      console.log("yo");
      if (err) {
        console.log("yo");

        console.error("Node " + selectedNode.id + " down. Trying Node 1");
        pools[0].query(query, [apptId], (err, results) => {
          if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).send("Error executing MySQL query");
          } else if (results.length === 0) {
            return res.render("search", {
              error:
                "No appointment found with the provided ID. Please try again.",
            });
          } else {
            res.render("appointmentDetails", { appointment: results[0] });
          }
        });
      } else if (results.length == 0) {
        return res.render("search", {
          error: "No appointment found with the provided ID. Please try again.",
        });
      } else {
        res.render("appointmentDetails", { appointment: results[0] });
      }
    });
  }
});

//
//
//
app.get("/update/:apptId", (req, res) => {
  const apptId = req.params.apptId;
  const query = "SELECT * FROM appointments WHERE apptid = ?";

  // Query the database to retrieve the appointment details based on the appointment ID
  pools[selectedNode.id - 1].query(query, [apptId], (err, results) => {
    if (err) {
      if (selectedNode == 1) {
        pools[1].query(query, [apptId], (err, results) => {
          if (err) {
            pools[2].query(query, [apptId], (err, results) => {
              if (err) {
                return res.status(500).send("Error executing MySQL query");
              } else {
                console.log("Node 1 down. Updating From Node 2 instead");
                res.render("updateAppointmentDetails", {
                  appointment: results[0],
                });
              }
            });
          } else {
            console.log("Node 1 down. Updating From Node 2 instead");
            res.render("updateAppointmentDetails", { appointment: results[0] });
          }
        });
      } else {
        pools[0].query(query, [apptId], (err, results) => {
          if (err) {
            pools[2].query(query, [apptId], (err, results) => {
              if (err) {
                return res.status(500).send("Error executing MySQL query");
              } else {
                console.log("Current Node down. Updating From Node 1 instead");

                res.render("updateAppointmentDetails", {
                  appointment: results[0],
                });
              }
            });
          }
        });
      }
    } else {
      console.log(selectedNode);
      res.render("updateAppointmentDetails", { appointment: results[0] }); // Assuming there's only one appointment with the given ID
    }
  });
});

//
// UPDATE
// Define route for updating appointment details
app.post("/update", (req, res) => {
  const {
    apptId,
    pxid,
    doctorid,
    clinicid,
    status,
    timeQueued,
    queueDate,
    startTime,
    endTime,
    type,
    hospitalName,
    isHospital,
    city,
    province,
    regionName,
    doctorMainSpeciality,
    doctorAge,
    pxAge,
    pxGender,
    virtual,
  } = req.body;
  // Check if the fields are undefined before assigning them
  const updatedTimeQueued =
    typeof req.body.timeQueued !== "undefined" ? req.body.timeQueued : null;
  const updatedQueueDate =
    typeof req.body.queueDate !== "undefined" ? req.body.queueDate : null;
  const updatedStartTime =
    typeof req.body.startTime !== "undefined" ? req.body.startTime : null;
  const updatedEndTime =
    typeof req.body.endTime !== "undefined" ? req.body.endTime : null;
  const updatedIsHospital =
    typeof req.body.isHospital !== "undefined" ? req.body.isHospital : 0;

  // Replace empty string values with null
  const fields = [
    pxid,
    doctorid,
    clinicid,
    status,
    updatedTimeQueued,
    updatedQueueDate,
    updatedStartTime,
    updatedEndTime,
    type,
    hospitalName,
    updatedIsHospital,
    city,
    province,
    regionName,
    doctorMainSpeciality,
    doctorAge,
    pxAge,
    pxGender,
    virtual,
  ];
  const values = fields.map((value) => (value === "" ? null : value));

  // Construct the SQL query to update the appointment
  const query = `
UPDATE appointments 
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

  function executeTransaction(node, callback) {
    pools[node].getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        callback(err);
        return;
      }

      connection.beginTransaction({ isolationLevel: "SERIALIZABLE" }, (err) => {
        if (err) {
          console.error("Error starting transaction:", err);
          connection.release();
          callback(err);
          return;
        }

        connection.query(query, [...values, apptId], (err, result) => {
          if (err) {
            console.error("Error updating appointment:", err);
            connection.rollback(() => {
              console.error("Transaction rolled back");
              connection.release();
              callback(err);
            });
            return;
          }

          callback(null, connection);
        });
      });
    });
  }

  function commitTransaction(connection, callback) {
    connection.commit((err) => {
      if (err) {
        console.error("Error committing transaction:", err);
        connection.rollback(() => {
          console.error("Transaction rolled back");
          connection.release();
          callback(err);
        });
        return;
      }

      console.log("Appointment updated successfully");
      connection.release();
      callback(null);
    });
  }

  // Replication
  if (selectedNode.id != 1) {
    executeTransaction(selectedNode.id - 1, (err, connection1) => {
      if (err) {
        return res.status(500).send("Error updating appointment at Node 2");
      }

      // Start the replication
      executeTransaction(0, (err, connection2) => {
        if (err) {
          // If the replication fails, rollback the first transaction
          connection1.rollback(() => {
            console.error(
              "Transaction rolled back at Node 2 due to replication failure"
            );
            connection1.release();
            return res.status(500).send("Error updating appointment at Node 1");
          });
          return;
        }

        // If both transactions are prepared successfully, commit them
        commitTransaction(connection1, (err) => {
          if (err) {
            return res
              .status(500)
              .send("Error committing transaction at Node 2");
          }

          commitTransaction(connection2, (err) => {
            if (err) {
              return res
                .status(500)
                .send("Error committing transaction at Node 1");
            }

            // Redirect to the appointment details page
            res.redirect("/");
          });
        });
      });
    });
  } else {
    if (
      regionName.includes("National Capital Region") ||
      regionName.includes("CALABARZON")
    ) {
      executeTransaction(0, (err, connection1) => {
        if (err) {
          return res.status(500).send("Error updating appointment at Node 2");
        }

        // Start the replication
        executeTransaction(1, (err, connection2) => {
          if (err) {
            // If the replication fails, rollback the first transaction
            connection1.rollback(() => {
              console.error(
                "Transaction rolled back at Node 2 due to replication failure"
              );
              connection1.release();
              return res
                .status(500)
                .send("Error updating appointment at Node 1");
            });
            return;
          }

          // If both transactions are prepared successfully, commit them
          commitTransaction(connection1, (err) => {
            if (err) {
              return res
                .status(500)
                .send("Error committing transaction at Node 2");
            }

            commitTransaction(connection2, (err) => {
              if (err) {
                return res
                  .status(500)
                  .send("Error committing transaction at Node 1");
              }

              // Redirect to the appointment details page
              res.redirect("/");
            });
          });
        });
      });
    } else {
      executeTransaction(0, (err, connection1) => {
        if (err) {
          return res.status(500).send("Error updating appointment at Node 2");
        }

        // Start the replication
        executeTransaction(2, (err, connection2) => {
          if (err) {
            // If the replication fails, rollback the first transaction
            connection1.rollback(() => {
              console.error(
                "Transaction rolled back at Node 2 due to replication failure"
              );
              connection1.release();
              return res
                .status(500)
                .send("Error updating appointment at Node 1");
            });
            return;
          }

          // If both transactions are prepared successfully, commit them
          commitTransaction(connection1, (err) => {
            if (err) {
              return res
                .status(500)
                .send("Error committing transaction at Node 2");
            }

            commitTransaction(connection2, (err) => {
              if (err) {
                return res
                  .status(500)
                  .send("Error committing transaction at Node 1");
              }

              // Redirect to the appointment details page
              res.redirect("/");
            });
          });
        });
      });
    }
  }
  // Start a transaction
  // connection.beginTransaction({ isolationLevel: "SERIALIZABLE" }, (err) => {
  //   if (err) {
  //     console.error("Error starting transaction:", err);
  //     return res.status(500).send("Error starting transaction");
  //   }

  //   // Execute the query within the transaction
  //   connection.query(query, [...values, apptId], (err, result) => {
  //     if (err) {
  //       // Rollback the transaction if an error occurs
  //       console.error("Error updating appointment:", err);
  //       connection.rollback(() => {
  //         console.error("Transaction rolled back");
  //         return res.status(500).send("Error updating appointment");
  //       });
  //     }

  //     // Commit the transaction if the query is successful
  //     connection.commit((err) => {
  //       if (err) {
  //         // Rollback the transaction if an error occurs during commit
  //         console.error("Error committing transaction:", err);
  //         connection.rollback(() => {
  //           console.error("Transaction rolled back");
  //           return res.status(500).send("Error updating appointment");
  //         });
  //       } else {
  //         console.log(
  //           "Appointment updated successfully at Node:",
  //           selectedNode
  //         );
  //         // Redirect to the appointment details page
  //         res.redirect("/");
  //       }
  //     });
  //   });
  // });
});

// Define route for deleting appointments
app.post("/delete", (req, res) => {
  const apptid = req.body.apptid;

  const {
    apptId,
    pxid,
    doctorid,
    clinicid,
    status,
    timeQueued,
    queueDate,
    startTime,
    endTime,
    type,
    hospitalName,
    isHospital,
    city,
    province,
    regionName,
    doctorMainSpeciality,
    doctorAge,
    pxAge,
    pxGender,
    virtual,
  } = req.body;
  // Check if the fields are undefined before assigning them
  const updatedTimeQueued =
    typeof req.body.timeQueued !== "undefined" ? req.body.timeQueued : null;
  const updatedQueueDate =
    typeof req.body.queueDate !== "undefined" ? req.body.queueDate : null;
  const updatedStartTime =
    typeof req.body.startTime !== "undefined" ? req.body.startTime : null;
  const updatedEndTime =
    typeof req.body.endTime !== "undefined" ? req.body.endTime : null;
  const updatedIsHospital =
    typeof req.body.isHospital !== "undefined" ? req.body.isHospital : 0;

  // Replace empty string values with null
  const fields = [
    pxid,
    doctorid,
    clinicid,
    status,
    updatedTimeQueued,
    updatedQueueDate,
    updatedStartTime,
    updatedEndTime,
    type,
    hospitalName,
    updatedIsHospital,
    city,
    province,
    regionName,
    doctorMainSpeciality,
    doctorAge,
    pxAge,
    pxGender,
    virtual,
  ];
  const values = fields.map((value) => (value === "" ? null : value));

  // Construct the SQL query to update the appointment
  const recovryQuery = `
  INSERT INTO appointments 
  (
      pxid, 
      doctorid, 
      clinicid, 
      status, 
      timeQueued, 
      queueDate, 
      startTime, 
      endTime, 
      type, 
      hospitalName, 
      isHospital, 
      city, 
      province, 
      regionName, 
      doctorMainSpeciality, 
      doctorAge, 
      pxAge, 
      pxGender, 
      \`virtual\`
  ) 
  VALUES 
  (
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?, 
      ?
  )`;

  // Construct the SQL query to delete the appointment
  const query = "DELETE FROM appointments WHERE apptid = ?";

  function executeTransaction(node, callback) {
    pools[node].getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        callback(err);
        return;
      }

      connection.beginTransaction({ isolationLevel: "SERIALIZABLE" }, (err) => {
        if (err) {
          console.error("Error starting transaction:", err);
          connection.release();
          callback(err);
          return;
        }

        connection.query(query, [apptid], (err, result) => {
          if (err) {
            console.error("Error deleting appointment:", err);
            connection.rollback(() => {
              console.error("Transaction rolled back");
              connection.release();
              callback(err);
            });
            return;
          }

          callback(null, connection);
        });
      });
    });
  }

  function commitTransaction(connection, callback) {
    connection.commit((err) => {
      if (err) {
        console.error("Error committing transaction:", err);
        connection.rollback(() => {
          console.error("Transaction rolled back");
          connection.release();
          callback(err);
        });
        return;
      }

      console.log("Appointment deleted successfully");
      connection.release();
      callback(null);
    });
  }

  // Replication
  if (selectedNode.id != 1) {
    executeTransaction(selectedNode.id - 1, (err, connection1) => {
      if (err) {
        return res.status(500).send("Error deleting appointment at Node 2");
      }

      // Start the replication
      executeTransaction(0, (err, connection2) => {
        if (err) {
          // If the replication fails, rollback the first transaction
          connection1.rollback(() => {
            console.error(
              "Transaction rolled back at Node 2 due to replication failure"
            );
            connection1.release();
            return res.status(500).send("Error deleting appointment at Node 1");
          });
          return;
        }

        // If both transactions are prepared successfully, commit them
        commitTransaction(connection1, (err) => {
          if (err) {
            return res
              .status(500)
              .send("Error committing transaction at Node 2");
          }

          commitTransaction(connection2, (err) => {
            if (err) {
              connection1.query(recovryQuery, [...values], (err, result) => {});
              return res
                .status(500)
                .send("Error committing transaction at Node 1");
            }

            // Redirect to the appointment details page
            res.redirect("/");
          });
        });
      });
    });
  } else {
    if (
      regionName.includes("National Capital Region") ||
      regionName.includes("CALABARZON")
    ) {
      executeTransaction(0, (err, connection1) => {
        if (err) {
          return res.status(500).send("Error deleting appointment at Node 2");
        }

        // Start the replication
        executeTransaction(1, (err, connection2) => {
          if (err) {
            // If the replication fails, rollback the first transaction
            connection1.rollback(() => {
              console.error(
                "Transaction rolled back at Node 2 due to replication failure"
              );
              connection1.release();
              return res
                .status(500)
                .send("Error deleting appointment at Node 1");
            });
            return;
          }

          // If both transactions are prepared successfully, commit them
          commitTransaction(connection1, (err) => {
            if (err) {
              return res
                .status(500)
                .send("Error committing transaction at Node 2");
            }

            commitTransaction(connection2, (err) => {
              if (err) {
                connection1.query(
                  recovryQuery,
                  [...values],
                  (err, result) => {}
                );
                return res
                  .status(500)
                  .send("Error committing transaction at Node 1");
              }

              // Redirect to the appointment details page
              res.redirect("/");
            });
          });
        });
      });
    } else {
      executeTransaction(0, (err, connection1) => {
        if (err) {
          return res.status(500).send("Error deleting appointment at Node 2");
        }

        // Start the replication
        executeTransaction(2, (err, connection2) => {
          if (err) {
            // If the replication fails, rollback the first transaction
            connection1.rollback(() => {
              console.error(
                "Transaction rolled back at Node 2 due to replication failure"
              );
              connection1.release();
              return res
                .status(500)
                .send("Error deleting appointment at Node 1");
            });
            return;
          }

          // If both transactions are prepared successfully, commit them
          commitTransaction(connection1, (err) => {
            if (err) {
              return res
                .status(500)
                .send("Error committing transaction at Node 2");
            }

            commitTransaction(connection2, (err) => {
              if (err) {
                connection1.query(
                  recovryQuery,
                  [...values],
                  (err, result) => {}
                );
                return res
                  .status(500)
                  .send("Error committing transaction at Node 1");
              }

              // Redirect to the appointment details page
              res.redirect("/");
            });
          });
        });
      });
    }
  }

  // Start a transaction
  // connection.beginTransaction({ isolationLevel: "SERIALIZABLE" }, (err) => {
  //   if (err) {
  //     console.error("Error starting transaction:", err);
  //     return res.status(500).send("Error starting transaction");
  //   }

  //   // Execute the delete query within the transaction
  //   connection.query(query, [apptid], (err, result) => {
  //     if (err) {
  //       // Rollback the transaction if an error occurs
  //       console.error("Error deleting appointment:", err);
  //       connection.rollback(() => {
  //         console.error("Transaction rolled back");
  //         return res.status(500).send("Error deleting appointment");
  //       });
  //     }

  //     // Commit the transaction if the query is successful
  //     connection.commit((err) => {
  //       if (err) {
  //         // Rollback the transaction if an error occurs during commit
  //         console.error("Error committing transaction:", err);
  //         connection.rollback(() => {
  //           console.error("Transaction rolled back");
  //           return res.status(500).send("Error deleting appointment");
  //         });
  //       }
  //       console.log("Appointment deleted successfully at Node:", selectedNode);
  //       // Redirect to the index page or any other appropriate page
  //     });
  //   });
  // });

  // REPLICATION PART
  // "LOG" For recovery
  // Recovery mechanism from failure.
  // let timeQueued = req.body.timeQueued
  //   ? new Date(req.body.timeQueued).toISOString().slice(0, 19).replace("T", " ")
  //   : null;
  // let queueDate = req.body.queueDate
  //   ? new Date(req.body.queueDate).toISOString().slice(0, 19).replace("T", " ")
  //   : null;
  // let startTime = req.body.startTime
  //   ? new Date(req.body.startTime).toISOString().slice(0, 19).replace("T", " ")
  //   : null;
  // let endTime = req.body.endTime
  //   ? new Date(req.body.endTime).toISOString().slice(0, 19).replace("T", " ")
  //   : null;

  // let insertQuery =
  //   "INSERT INTO appointments (apptid, pxid, doctorid, clinicid, status, timeQueued, queueDate, startTime, endTime, type, hospitalName, isHospital, city, province, regionName, doctorMainSpeciality, doctorAge, pxAge, pxGender, `virtual`) VALUES ?";
  // let values = [
  //   [
  //     req.body.apptid,
  //     req.body.pxid,
  //     req.body.doctorid,
  //     req.body.clinicid,
  //     req.body.status,
  //     timeQueued,
  //     queueDate,
  //     startTime,
  //     endTime,
  //     req.body.type,
  //     req.body.hospitalName,
  //     req.body.isHospital,
  //     req.body.city,
  //     req.body.province,
  //     req.body.regionName,
  //     req.body.doctorMainSpeciality,
  //     req.body.doctorAge,
  //     req.body.pxAge,
  //     req.body.pxGender,
  //     req.body.virtual,
  //   ],
  // ];

  // Case current node is not central and we want to replicate to central
  // if (selectedNode.id == 2 || selectedNode.id == 3) {
  //   connection = connectToNode(getNodeById(1));

  //   connection.connect((err) => {
  //     if (err) {
  //       const conn2 = connectToNode(selectedNode);
  //       conn2.query(insertQuery, [values], (err, result) => {
  //         if (err) {
  //           console.error("Error inserting appointment:", err);
  //           return res.status(500).send("Error inserting appointment");
  //         }
  //         console.log("Recovry Successfull at Node:", selectedNode);
  //         return res.status(500).send("Error deleting appointment");
  //       });
  // } // else {
  //   connection.beginTransaction(
  //     { isolationLevel: "SERIALIZABLE" },
  //     (err) => {
  //       if (err) {
  //         console.error("Error starting transaction:", err);
  //         return res.status(500).send("Error starting transaction");
  //       }

  //       // Execute the delete query within the transaction
  //       connection.query(query, [apptid], (err, result) => {
  //         if (err) {
  //           // Rollback the transaction if an error occurs
  //           console.error("Error deleting appointment:", err);
  //           connection.rollback(() => {
  //             console.error("Transaction rolled back");
  //           });
  //           const conn2 = connectToNode(selectedNode);
  //           conn2.query(insertQuery, [values], (err, result) => {
  //             if (err) {
  //               console.error("Error inserting appointment:", err);
  //               return res.status(500).send("Error inserting appointment");
  //             }
  //             console.log("Recovry Successfull at Node:", selectedNode);
  //             return res.status(500).send("Error deleting appointment");
  //           });
  //         }

  //         // Commit the transaction if the query is successful
  //         connection.commit((err) => {
  //           if (err) {
  //             // Rollback the transaction if an error occurs during commit
  //             console.error("Error committing transaction:", err);
  //             connection.rollback(() => {
  //               console.error("Transaction rolled back");
  //               return res.status(500).send("Error deleting appointment");
  //             });
  //           }
  //           console.log(
  //             "Appointment deleted successfully at Node:",
  //             getNodeById(1)
  //           );
  //           // Redirect to the index page or any other appropriate page
  //           res.redirect("/");
  //         });
  //       });
  //     }
  //   );
  // }
  // });
  // }

  // connection = connectToNode(selectedNode);
  // res.redirect("/");
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
