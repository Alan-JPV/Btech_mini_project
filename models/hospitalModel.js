                            // This file defines the schema (structure) of hospital data in MongoDB.


/*
✅ What this does?

Defines fields like beds, equipment, etc.
Uses Mongoose schema to structure MongoDB data.
Exports Hospital model so it can be used in other files.
*/


const mongoose = require("mongoose");

// Define hospital schema
const hospitalSchema = new mongoose.Schema({
  hospital_id: String, // Unique ID for each hospital
  beds: Object, // Stores bed availability details
  equipment: Object, // Stores medical equipment details
  blood_bank: Object, // Stores blood availability
  medical_supplies: Object, // Stores emergency supplies
  diagnostics: Object, // Stores diagnostic resources
  last_updated: Date, // Tracks last update timestamp
});

// Export model
module.exports = mongoose.model("Hospital", hospitalSchema);
