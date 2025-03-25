const mongoose = require('mongoose');

// Function to initialize and start the sync process
const startCentralDBSync = (centralDB, hospitalADB, hospitalBDB, hospitalCDB) => {
  // Define the resource schema
  const resourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    beds: { type: Object, default: {} },
    equipment: { type: Object, default: {} },
    blood_bank: { type: Object, default: {} },
    last_updated: { type: Date, default: Date.now },
  });

  // Models for each database
  const CentralResource = centralDB.model("Resource", resourceSchema, "resources");
  const HospitalAResource = hospitalADB.model("Resource", resourceSchema, "resources");
  const HospitalBResource = hospitalBDB.model("Resource", resourceSchema, "resources");
  const HospitalCResource = hospitalCDB.model("Resource", resourceSchema, "resources");

  // Function to sync data from source DBs to central DB (read-only from hospital DBs)
  const periodicSync = async () => {
    try {
      // Sync Hospital A
      const hospitalAResources = await HospitalAResource.find().lean();
      for (const resource of hospitalAResources) {
        await CentralResource.updateOne(
          { name: resource.name },
          {
            $set: {
              name: resource.name,
              beds: resource.beds || {},
              equipment: resource.equipment || {},
              blood_bank: resource.blood_bank || {},
              last_updated: resource.last_updated || new Date(),
            },
          },
          { upsert: true }
        );
      }

      // Sync Hospital B
      const hospitalBResources = await HospitalBResource.find().lean();
      for (const resource of hospitalBResources) {
        await CentralResource.updateOne(
          { name: resource.name },
          {
            $set: {
              name: resource.name,
              beds: resource.beds || {},
              equipment: resource.equipment || {},
              blood_bank: resource.blood_bank || {},
              last_updated: resource.last_updated || new Date(),
            },
          },
          { upsert: true }
        );
      }

      // Sync Hospital C
      const hospitalCResources = await HospitalCResource.find().lean();
      for (const resource of hospitalCResources) {
        await CentralResource.updateOne(
          { name: resource.name },
          {
            $set: {
              name: resource.name,
              beds: resource.beds || {},
              equipment: resource.equipment || {},
              blood_bank: resource.blood_bank || {},
              last_updated: resource.last_updated || new Date(),
            },
          },
          { upsert: true }
        );
      }

      console.log("✅ Data from hospital databases synced to centralDB (no changes to source DBs)");
    } catch (error) {
      console.error("❌ Error during periodic sync in syncCentralDB:", error);
    }
  };

  // Start periodic sync every 1 second
  setInterval(periodicSync, 1000);

  // Initial sync on startup
  periodicSync().then(() => {
    console.log("✅ Initial sync to centralDB completed");
  }).catch((err) => {
    console.error("❌ Initial sync failed:", err);
  });
};

module.exports = { startCentralDBSync };