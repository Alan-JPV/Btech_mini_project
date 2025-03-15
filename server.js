require('dotenv').config();             // dotenv → Loads environment variables from .env

const express = require('express');     // express → Creates a web server for handling API requests.

const mongoose = require('mongoose');   // mongoose → Connects Node.js to MongoDB and helps manage database operations.

const cors = require("cors"); // Middleware to enable Cross-Origin Resource Sharing

const app = express();
app.use(express.json());                //Allows the backend to accept JSON data in API requests.
app.use(cors());                        // Enables CORS to allow cross-origin requests

const PORT = process.env.PORT || 5000;

// MongoDB Connection = Connects to MongoDB Atlas using the connection string from .env

/*
useNewUrlParser: true → Ensures Mongoose uses the new MongoDB connection string parser, improving parsing accuracy and compatibility.
useUnifiedTopology: true → Enables the new Server Discovery and Monitoring engine, which improves connection handling and monitoring of MongoDB clusters.
*/

//  Connecting to MongoDB Databases
// Main Central Hospital Database
const centralDB = mongoose.createConnection(process.env.MONGO_URI_CENTRAL, { useNewUrlParser: true, useUnifiedTopology: true });
centralDB.on("connected", () => console.log("✅ MongoDB Central Connected"));
centralDB.on("error", (err) => console.error("❌ MongoDB Central Connection Error:", err));

// Individual Hospital Databases
const hospitalADB = mongoose.createConnection(process.env.MONGO_URI_A, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalADB.on("connected", () => console.log("✅ MongoDB Hospital-A Connected"));
hospitalADB.on("error", (err) => console.error("❌ MongoDB Hospital-A Connection Error:", err));

const hospitalBDB = mongoose.createConnection(process.env.MONGO_URI_B, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalBDB.on("connected", () => console.log("✅ MongoDB Hospital-B Connected"));
hospitalBDB.on("error", (err) => console.error("❌ MongoDB Hospital-B Connection Error:", err));

const hospitalCDB = mongoose.createConnection(process.env.MONGO_URI_C, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalCDB.on("connected", () => console.log("✅ MongoDB Hospital-C Connected"));
hospitalCDB.on("error", (err) => console.error("❌ MongoDB Hospital-C Connection Error:", err));


const hospitalRoutes = require("./routes/hospitalRoutes"); // Import hospital routes
// Import Syncing Routes & Pass DB Connections
const syncRoutes = require("./routes/syncRoutes")(centralDB, hospitalADB, hospitalBDB, hospitalCDB);


        // HERE WE CREATE API ( api used to call data from hospital_A_DB etc to Centeral_Hospital_DB ) :


app.use("/api/hospitals", hospitalRoutes); // Individual hospital data
app.use("/api", syncRoutes); // Syncing data across hospitals

app.get("/", (req, res) => {
  res.send("Centralized Hospital Database API is Running! 🚀");
});



//start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
