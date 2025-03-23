require('dotenv').config();             // dotenv → Loads environment variables from .env

const express = require('express');     // express → Creates a web server for handling API requests.
const mongoose = require('mongoose');   // mongoose → Connects Node.js to MongoDB and helps manage database operations.
const cors = require("cors"); // Middleware to enable Cross-Origin Resource Sharing
const admin = require("firebase-admin"); // Firebase Admin SDK

const app = express();
app.use(express.json());                // Allows the backend to accept JSON data in API requests.
app.use(cors());                        // Enables CORS to allow cross-origin requests

const PORT = process.env.PORT || 5000;

// 🔹 Firebase Admin SDK Setup (DO NOT REMOVE EXISTING CODE)
const serviceAccount = require("./firebase-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🔹 Connecting to MongoDB Firebase Database
const firebaseDB = mongoose.createConnection(process.env.MONGO_URI_firebase, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

firebaseDB.on("connected", () => console.log("✅ Firebase MongoDB Connected"));
firebaseDB.on("error", (err) => console.error("❌ Firebase MongoDB Connection Error:", err));

// 🔹 Export `firebaseDB` before other files use it
module.exports = { firebaseDB };

// 🔹 Middleware to Verify Firebase Token
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized: No Token Provided" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    res.status(403).json({ message: "Unauthorized: Invalid Token" });
  }
};

// 🔹 Connecting to MongoDB Databases (KEEPING ALL YOUR EXISTING DATABASES)
const centralDB = mongoose.createConnection(process.env.MONGO_URI_CENTRAL, { useNewUrlParser: true, useUnifiedTopology: true });
centralDB.on("connected", () => console.log("✅ MongoDB Central Connected"));
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

// 🔹 Importing Routes (KEEPING YOUR EXISTING ROUTES)
const hospitalRoutes = require("./routes/hospitalRoutes");
const syncRoutes = require("./routes/syncRoutes")(centralDB, hospitalADB, hospitalBDB, hospitalCDB);
const authRoutes = require("./routes/authRoutes");

// 🔹 Apply Routes (Fixed Firebase Token Verification)
app.use("/api/auth", authRoutes); // ✅ Firebase auth now handled inside authRoutes.js
app.use("/api/hospitals", verifyFirebaseToken, hospitalRoutes);
app.use("/api", verifyFirebaseToken, syncRoutes);

app.get("/", (req, res) => {
  res.send("Centralized Hospital Database API is Running! 🚀");
});

// 🔹 Start Server (NO CHANGES HERE)
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
