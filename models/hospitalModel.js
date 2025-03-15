                            // This file defines the schema (structure) of hospital data in MongoDB.


/*
What this does?

Defines fields like beds, equipment, etc.
Uses Mongoose schema to structure MongoDB data.
Exports Hospital model so it can be used in other files.
*/


const mongoose = require("mongoose");

// Define the Hospital Schema
const hospitalSchema = new mongoose.Schema({
    hospital_id: { type: String, required: true },
    name: { type: String, required: true }, // Ensure every hospital has a name
    beds: { type: Object, default: {} },
    equipment: { type: Object, default: {} },
    blood_bank: { type: Object, default: {} },
    medical_supplies: { type: Object, default: {} },
    diagnostics: { type: Object, default: {} },
    last_updated: { type: Date, default: Date.now }
});

// Export the model
module.exports = mongoose.model("Hospital", hospitalSchema);
