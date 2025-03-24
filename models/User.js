const mongoose = require("mongoose");
const { firebaseDB } = require("../server"); // ✅ Ensure firebaseDB is imported correctly

// ✅ Check if firebaseDB is defined before using it
if (!firebaseDB) {
  console.error("❌ FirebaseDB connection is not defined!");
  throw new Error("FirebaseDB connection is undefined. Check server.js.");
}

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["doctor", "admin"], default: "doctor" },
});

// ✅ Ensure User model uses the firebaseDB connection
const User = firebaseDB.model("User", UserSchema);

module.exports = User;