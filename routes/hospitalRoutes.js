                        //This file will handle API requests related to hospitals.


/*
✅ What this does?

Creates a GET API (/hospitals) to fetch data from Central_Hospital_DB.
Uses Hospital.find() to retrieve all hospitals from MongoDB.
Returns the data in JSON format.
Exports the router so it can be used in server.js.
*/

// Import required modules
const express = require("express"); // Express framework for handling API requests
const router = express.Router(); // Create a router object for handling routes
const Hospital = require("../models/hospitalModel"); // Import the Mongoose model for hospitals

// Define a GET route to fetch all hospitals
router.get("/hospitals", async (req, res) => {
  try {
    // Fetch all hospital documents from MongoDB
    const hospitals = await Hospital.find(); 
    
    // Send the hospital data as a JSON response
    res.json(hospitals); 
  } catch (error) {
    // Handle errors and send a 500 status response
    res.status(500).json({ error: "Server Error" });
  }
});

// Export the router to be used in server.js
module.exports = router;

