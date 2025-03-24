require('dotenv').config();             // dotenv → Loads environment variables from .env

const express = require('express');     // express → Creates a web server for handling API requests.
const mongoose = require('mongoose');   // mongoose → Connects Node.js to MongoDB and helps manage database operations.
const cors = require("cors"); // Middleware to enable Cross-Origin Resource Sharing
const admin = require("firebase-admin"); // Firebase Admin SDK

const multer = require("multer"); // For handling file uploads
const path = require("path");

const app = express();
app.use(express.json());                // Allows the backend to accept JSON data in API requests.
app.use(cors());                        // Enables CORS to allow cross-origin requests

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}))

// 🔹 Serve the uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// 🔹 Setup Multer Storage for Profile Images
const storage = multer.diskStorage({
  destination: "uploads/", // Save images in an uploads folder
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});
const upload = multer({ storage });

// 🔹 Connecting to UserInfo MongoDB Database
const userInfoDB = mongoose.createConnection(process.env.MONGO_URI_UserInfo, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

userInfoDB.on("connected", () => console.log("✅ UserInfo MongoDB Connected"));
userInfoDB.on("error", (err) => console.error("❌ UserInfo MongoDB Connection Error:", err));

// 🔹 UserInfo Schema
const userInfoSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  profileImage: { type: String },
  contactInfo: { type: String },
  hospitalName: { type: String },
});

const UserInfo = userInfoDB.model("UserInfo", userInfoSchema);

// 🔹 Export `firebaseDB` before other files use it
module.exports = { firebaseDB, userInfoDB };

// 🔹 Middleware to Verify Firebase Token
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized: No Token Provided" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request

    // Fetch email from Firebase DB
    const firebaseUser = await firebaseDB.collection("users").findOne({ uid: decodedToken.uid });
    if (firebaseUser) {
      req.user.email = firebaseUser.email;
    }

    next();
  } catch (error) {
    res.status(403).json({ message: "Unauthorized: Invalid Token" });
  }
};

// 🔹 Fetch and Store Email in UserInfo Database
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

// 🔹 Consolidated Upload and Store Profile Image Route
app.post("/api/upload-profile-image", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`; // Image URL

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

// 🔹 Update User Profile in UserInfo Database
app.put("/api/userinfo", verifyFirebaseToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { name, contactInfo, hospitalName, profileImage } = req.body;

    if (!email) return res.status(400).json({ message: "Email not found" });

    const updatedUser = await UserInfo.findOneAndUpdate(
      { email },
      { name, contactInfo, hospitalName, profileImage },
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
app.use("/api/auth", authRoutes);
app.use("/api/hospitals", verifyFirebaseToken, hospitalRoutes);
app.use("/api", verifyFirebaseToken, syncRoutes);

app.get("/", (req, res) => {
  res.send("Centralized Hospital Database API is Running! 🚀");
});

// 🔹 Start Server (NO CHANGES HERE)
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));