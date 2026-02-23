const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/db");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const eventRoutes = require("./routes/events");
const participantRoutes = require("./routes/participants");
const organizersPublicRoutes = require("./routes/organizers-public");
const organizersPrivateRoutes = require("./routes/organizers-private");
const paymentsRoutes = require("./routes/payments");
const attendanceRoutes = require("./routes/attendance");
const forumRoutes = require("./routes/forum");
const passwordResetRoutes = require("./routes/passwordReset");
const feedbackRoutes = require("./routes/feedback");


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for payment proof images

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", eventRoutes);
app.use("/api", participantRoutes);
app.use("/api", organizersPublicRoutes);
app.use("/api", organizersPrivateRoutes);
app.use("/api", paymentsRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", forumRoutes);
app.use("/api", passwordResetRoutes);
app.use("/api", feedbackRoutes);


const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
