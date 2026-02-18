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


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", eventRoutes);
app.use("/api", participantRoutes);
app.use("/api", organizersPublicRoutes);
app.use("/api", organizersPrivateRoutes);


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
