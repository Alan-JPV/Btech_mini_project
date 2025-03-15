module.exports = (centralDB, hospitalADB, hospitalBDB, hospitalCDB) => {
    const mongoose = require("mongoose");
    const express = require("express");
    const router = express.Router();

    // Define schema for "resources"
    const resourceSchema = new mongoose.Schema({
        hospital_id: { type: String, required: true, unique: true },
        name: { type: String, required: true },  // Added hospital name
        beds: { type: Object, default: {} },
        equipment: { type: Object, default: {} },
        blood_bank: { type: Object, default: {} },
        medical_supplies: { type: Object, default: {} },
        diagnostics: { type: Object, default: {} },
        last_updated: { type: Date, default: Date.now },
        status: { type: String, enum: ["active", "inactive"], default: "active" } // Prevents deletion issue
    });

    // Models for each hospital and central DB
    const HospitalA = hospitalADB.model("Resource", resourceSchema, "resources");
    const HospitalB = hospitalBDB.model("Resource", resourceSchema, "resources");
    const HospitalC = hospitalCDB.model("Resource", resourceSchema, "resources");
    const CentralHospital = centralDB.model("Resource", resourceSchema, "resources");

    // Sync data from all hospitals to centralDB
    router.get("/sync", async (req, res) => {
        try {
            const hospitalAData = await HospitalA.find().lean();
            const hospitalBData = await HospitalB.find().lean();
            const hospitalCData = await HospitalC.find().lean();

            // Merge and process data
            const mergedData = [...hospitalAData, ...hospitalBData, ...hospitalCData].map(data => ({
                hospital_id: data.hospital_id,
                name: data.name || "Unknown Hospital", // Ensure name is included
                beds: data.beds && Object.keys(data.beds).length ? data.beds : {},
                equipment: data.equipment && Object.keys(data.equipment).length ? data.equipment : {},
                blood_bank: data.blood_bank && Object.keys(data.blood_bank).length ? data.blood_bank : {},
                medical_supplies: data.medical_supplies && Object.keys(data.medical_supplies).length ? data.medical_supplies : {},
                diagnostics: data.diagnostics && Object.keys(data.diagnostics).length ? data.diagnostics : {},
                last_updated: data.last_updated || new Date(),
                status: "active"
            })).filter(entry => entry.hospital_id); // Remove invalid entries

            const hospitalIDs = mergedData.map(entry => entry.hospital_id);

            // Mark missing hospitals as "inactive" instead of deleting
            await CentralHospital.updateMany(
                { hospital_id: { $nin: hospitalIDs } },
                { $set: { status: "inactive" } }
            );

            // Upsert data into Central DB
            for (let entry of mergedData) {
                await CentralHospital.findOneAndUpdate(
                    { hospital_id: entry.hospital_id },
                    { $set: entry },
                    { upsert: true, new: true }
                );
            }

            res.json({
                message: "✅ Sync Complete",
                totalRecords: mergedData.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
        // Fetch Central Data API
        router.get("/central-data", async (req, res) => {
            try {
                const centralData = await CentralHospital.find({}, { __v: 0 }).lean();
                res.json(centralData);
            } catch (error) {
                console.error("❌ Fetch Error:", error.message);
                res.status(500).json({ error: error.message });
            }
        });

    return router;
};
