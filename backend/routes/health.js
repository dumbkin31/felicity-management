const express = require("express");
const { getDB } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");


const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    res.json({ ok: true, service: "backend", mongo: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, service: "backend", mongo: "error", error: err.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.get("/admin-only", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ ok: true, msg: "You are an admin." });
});

module.exports = router;
