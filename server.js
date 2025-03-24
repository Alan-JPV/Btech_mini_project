require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const admin = require("firebase-admin");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

const serviceAccount = require("./firebase-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firebaseDB = mongoose.createConnection(process.env.MONGO_URI_firebase, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

firebaseDB.on("connected", () => console.log("✅ Firebase MongoDB Connected"));
firebaseDB.on("error", (err) => console.error("❌ Firebase MongoDB Connection Error:", err));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const userInfoDB = mongoose.createConnection(process.env.MONGO_URI_UserInfo, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

userInfoDB.on("connected", () => console.log("✅ UserInfo MongoDB Connected"));
userInfoDB.on("error", (err) => console.error("❌ UserInfo MongoDB Connection Error:", err));

const userInfoSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  profileImage: { type: String },
  contactInfo: { type: String },
  hospitalName: { type: String },
  specialization: { type: String },
});

const UserInfo = userInfoDB.model("UserInfo", userInfoSchema);

const patientTransferSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  service: { type: String, required: true },
  doctor: {
    name: String,
    contact: String,
    hospitalName: String,
    specialization: String,
  },
  patients: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    height: { type: Number, required: true },
  }],
  transferDate: { type: Date, required: true },
});

const PatientTransfer = userInfoDB.model("PatientTransfer", patientTransferSchema);

const resourceBookingSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  resourceType: { type: String, required: true },
  doctor: {
    name: String,
    contact: String,
    hospitalName: String,
    specialization: String,
  },
  bookings: [{
    resource: { type: String, required: true },
    quantity: { type: Number, required: true },
  }],
  bookingDate: { type: Date, required: true },
});

const ResourceBooking = userInfoDB.model("ResourceBooking", resourceBookingSchema);

module.exports = { firebaseDB, userInfoDB };

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized: No Token Provided" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    const firebaseUser = await firebaseDB.collection("users").findOne({ uid: decodedToken.uid });
    if (firebaseUser) {
      req.user.email = firebaseUser.email;
    }

    next();
  } catch (error) {
    res.status(403).json({ message: "Unauthorized: Invalid Token" });
  }
};

app.post("/api/userinfo", verifyFirebaseToken, async (req, res) => {
  try {
    const { email } = req.user;
    if (!email) return res.status(400).json({ message: "Email not found" });

    let user = await UserInfo.findOne({ email });
    if (!user) {
      user = new UserInfo({ email });
      await user.save();
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching/storing user info:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/api/upload-profile-image", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

  try {
    const { email } = req.user;
    if (!email) {
      return res.status(400).json({ message: "User email not found" });
    }

    const result = await UserInfo.updateOne(
      { email },
      { $set: { profileImage: imageUrl } },
      { upsert: true }
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      return res.status(404).json({ message: "User not found and not created" });
    }

    res.status(200).json({ imageUrl, message: "Profile image uploaded successfully" });
  } catch (error) {
    console.error("❌ Error updating profile image:", error.message || error);
    res.status(500).json({ message: "Failed to store image in database" });
  }
});

app.put("/api/userinfo", verifyFirebaseToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { name, contactInfo, hospitalName, profileImage, specialization } = req.body;

    if (!email) return res.status(400).json({ message: "Email not found" });

    const updatedUser = await UserInfo.findOneAndUpdate(
      { email },
      { name, contactInfo, hospitalName, profileImage, specialization },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

app.post("/api/patient-transfer", verifyFirebaseToken, async (req, res) => {
  try {
    const { hospitalName, service, doctor, patients, transferDate } = req.body;

    if (!hospitalName || !service || !doctor || !patients || !transferDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const trimmedHospitalName = hospitalName.trim();
    console.log("Received hospitalName for transfer:", trimmedHospitalName);

    // Query the 'resources' collection instead of 'central-data'
    const hospital = await centralDB.collection("resources").findOne({
      name: { $regex: `^${trimmedHospitalName}$`, $options: "i" }
    });

    if (!hospital) {
      const allHospitals = await centralDB.collection("resources").find().toArray();
      console.log("Available hospitals in resources:", allHospitals.map(h => h.name));
      return res.status(404).json({ message: `Hospital ${trimmedHospitalName} not found` });
    }

    console.log("Found hospital:", hospital.name);

    const serviceKey = service.toLowerCase().replace(" ", "_");
    const availableBeds = hospital.beds[serviceKey] || 0;
    const requestedBeds = patients.length;

    if (availableBeds < requestedBeds) {
      return res.status(400).json({
        message: `Not enough beds available in ${service}. Requested: ${requestedBeds}, Available: ${availableBeds}`,
      });
    }

    const updatedBeds = { ...hospital.beds, [serviceKey]: availableBeds - requestedBeds };
    await centralDB.collection("resources").updateOne(
      { name: hospital.name },
      { $set: { beds: updatedBeds, last_updated: new Date() } }
    );

    const transfer = new PatientTransfer({
      hospitalName: hospital.name,
      service,
      doctor,
      patients,
      transferDate,
    });

    await transfer.save();
    res.status(200).json({ message: "Patient transfer request submitted successfully" });
  } catch (error) {
    console.error("❌ Error submitting patient transfer:", error);
    res.status(500).json({ message: "Failed to submit transfer request" });
  }
});

app.post("/api/resource-booking", verifyFirebaseToken, async (req, res) => {
  try {
    const { hospitalName, resourceType, doctor, bookings, bookingDate } = req.body;

    if (!hospitalName || !resourceType || !doctor || !bookings || !bookingDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const trimmedHospitalName = hospitalName.trim();
    console.log("Received hospitalName for booking:", trimmedHospitalName);

    // Query the 'resources' collection instead of 'central-data'
    const hospital = await centralDB.collection("resources").findOne({
      name: { $regex: `^${trimmedHospitalName}$`, $options: "i" }
    });

    if (!hospital) {
      const allHospitals = await centralDB.collection("resources").find().toArray();
      console.log("Available hospitals in resources:", allHospitals.map(h => h.name));
      return res.status(404).json({ message: `Hospital ${trimmedHospitalName} not found` });
    }

    console.log("Found hospital:", hospital.name);

    const resourceField = resourceType === "Equipment Ready" ? "equipment" : "blood_bank";
    const resources = hospital[resourceField];

    for (const booking of bookings) {
      const resourceKey = booking.resource.toLowerCase().replace(" ", "_");
      const availableQuantity = resources[resourceKey] || 0;
      const requestedQuantity = parseInt(booking.quantity, 10);

      if (availableQuantity < requestedQuantity) {
        return res.status(400).json({
          message: `Not enough ${booking.resource} available. Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
        });
      }
    }

    const updatedResources = { ...resources };
    for (const booking of bookings) {
      const resourceKey = booking.resource.toLowerCase().replace(" ", "_");
      updatedResources[resourceKey] -= parseInt(booking.quantity, 10);
    }

    await centralDB.collection("resources").updateOne(
      { name: hospital.name },
      { $set: { [resourceField]: updatedResources, last_updated: new Date() } }
    );

    const booking = new ResourceBooking({
      hospitalName: hospital.name,
      resourceType,
      doctor,
      bookings,
      bookingDate,
    });

    await booking.save();
    res.status(200).json({ message: "Resource booking request submitted successfully" });
  } catch (error) {
    console.error("❌ Error submitting resource booking:", error);
    res.status(500).json({ message: "Failed to submit booking request" });
  }
});

app.get("/api/test-central-data", async (req, res) => {
  try {
    // Query the 'resources' collection instead of 'central-data'
    const hospitals = await centralDB.collection("resources").find().toArray();
    res.status(200).json(hospitals);
  } catch (error) {
    console.error("❌ Error fetching resources:", error);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

const centralDB = mongoose.createConnection(process.env.MONGO_URI_CENTRAL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

centralDB.on("connected", async () => {
  console.log("✅ MongoDB Central Connected");
  const dbName = centralDB.name;
  console.log("Connected to database:", dbName);
  const collections = await centralDB.db.listCollections().toArray();
  console.log("Collections in database:", collections.map(c => c.name));

  const adminDb = centralDB.db.admin();
  const dbList = await adminDb.listDatabases();
  console.log("All databases in cluster:", dbList.databases.map(db => db.name));
});

centralDB.on("error", (err) => console.error("❌ MongoDB Central Connection Error:", err));

const hospitalADB = mongoose.createConnection(process.env.MONGO_URI_A, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalADB.on("connected", () => console.log("✅ MongoDB Hospital-A Connected"));
hospitalADB.on("error", (err) => console.error("❌ MongoDB Hospital-A Connection Error:", err));

const hospitalBDB = mongoose.createConnection(process.env.MONGO_URI_B, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalBDB.on("connected", () => console.log("✅ MongoDB Hospital-B Connected"));
hospitalBDB.on("error", (err) => console.error("❌ MongoDB Hospital-B Connection Error:", err));

const hospitalCDB = mongoose.createConnection(process.env.MONGO_URI_C, { useNewUrlParser: true, useUnifiedTopology: true });
hospitalCDB.on("connected", () => console.log("✅ MongoDB Hospital-C Connected"));
hospitalCDB.on("error", (err) => console.error("❌ MongoDB Hospital-C Connection Error:", err));

const hospitalRoutes = require("./routes/hospitalRoutes");
const syncRoutes = require("./routes/syncRoutes")(centralDB, hospitalADB, hospitalBDB, hospitalCDB);
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/hospitals", verifyFirebaseToken, hospitalRoutes);
app.use("/api", verifyFirebaseToken, syncRoutes);

app.get("/", (req, res) => {
  res.send("Centralized Hospital Database API is Running! 🚀");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));