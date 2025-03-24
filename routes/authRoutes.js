const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const User = require("../models/User");

const verifyFirebaseToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            console.error("❌ No Token Provided!");
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        console.log("🛠️ Received Token:", token);

        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("✅ Token Verified:", decodedToken);

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("❌ Firebase Auth Error:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};

router.post("/login", verifyFirebaseToken, async (req, res) => {
    try {
        const { email, uid } = req.user;
        let user = await User.findOne({ email }).exec();

        if (!user) {
            user = new User({ uid, email });
            await user.save();
        }

        res.status(200).json({ message: "Login successful", user });
    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
