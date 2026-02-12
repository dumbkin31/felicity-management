const express = require("express");
const bcrypt = require("bcrypt");
const { usersCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// POST /api/admin/organizers
// Body: { name, email, password }
router.post("/admin/organizers", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: "name, email, password are required" });
    }

    const e = email.toLowerCase().trim();
    const users = usersCol();

    const existing = await users.findOne({ email: e });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const doc = {
      name,
      email: e,
      passwordHash,
      role: "organizer",
      createdAt: new Date(),
      createdBy: req.user.sub,
    };

    const result = await users.insertOne(doc);
    return res.status(201).json({ ok: true, organizerId: result.insertedId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
