const express = require("express");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { organizersCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (err) {
    return null;
  }
}

// GET /api/admin/dashboard - Admin dashboard
router.get("/admin/dashboard", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    // Get all organizers
    const organizers = await organizersCol()
      .find(
        {},
        {
          projection: {
            organizerName: 1,
            category: 1,
            description: 1,
            contactEmail: 1,
            contactNumber: 1,
            createdAt: 1,
            createdByAdminId: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      dashboard: {
        totalOrganizers: organizers.length,
        organizers,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

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

// DELETE /api/admin/organizers/:id - Remove organizer
router.delete("/admin/organizers/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const organizerId = toObjectId(req.params.id);
    if (!organizerId) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const result = await organizersCol().deleteOne({ _id: organizerId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, error: "Organizer not found" });
    }

    return res.json({ ok: true, message: "Organizer deleted successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
