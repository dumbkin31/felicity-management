const express = require("express");
const bcrypt = require("bcrypt");
const { organizersCol } = require("../config/collections");
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
    const organizers = organizersCol();

    const existing = await organizers.findOne({ email: e });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const doc = {
      organizerName: name,
      category: req.body.category || "",
      description: req.body.description || "",
      contactEmail: e,
      contactNumber: req.body.contactNumber || "",
      passwordHash,
      createdAt: new Date(),
      createdByAdminId: req.user.sub,
    };

    const result = await organizers.insertOne(doc);
    return res.status(201).json({ ok: true, organizerId: result.insertedId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
