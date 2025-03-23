const admin = require("firebase-admin");

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No Token Provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next(); // Proceed to next middleware
  } catch (error) {
    res.status(403).json({ message: "Unauthorized: Invalid Token" });
  }
};

module.exports = verifyFirebaseToken;
