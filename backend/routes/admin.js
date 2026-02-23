const express = require("express");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { organizersCol, participantsCol, eventsCol, registrationsCol } = require("../config/collections");
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
            loginEmail: 1,
            category: 1,
            description: 1,
            contactEmail: 1,
            contactNumber: 1,
            createdAt: 1,
            createdByAdminId: 1,
            isArchived: 1,
            archivedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    // Get total participants
    const totalParticipants = await participantsCol().countDocuments();

    // Get total events
    const totalEvents = await eventsCol().countDocuments();

    // Get total registrations
    const totalRegistrations = await registrationsCol().countDocuments();

    return res.json({
      ok: true,
      dashboard: {
        totalOrganizers: organizers.length,
        totalParticipants,
        totalEvents,
        totalRegistrations,
        organizers,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/admin/organizers
// Body: { name, email, category, description, contactNumber }
// Password is always auto-generated
router.post("/admin/organizers", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "name and email are required" });
    }

    // Generate login email from organizer name: remove spaces, lowercase, add domain
    const loginEmail = `${name.toLowerCase().replace(/\s+/g, ".")}@felicity.iiit`;
    const contactEmail = email.toLowerCase().trim();
    const organizers = organizersCol();

    // Check if login email already exists
    const existingByLoginEmail = await organizers.findOne({ loginEmail });
    if (existingByLoginEmail) {
      return res.status(409).json({ ok: false, error: "Organizer with this name already exists" });
    }

    // Always auto-generate password
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let autoPassword = "";
    for (let i = 0; i < 12; i++) {
      autoPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const passwordHash = await bcrypt.hash(autoPassword, 12);

    const doc = {
      organizerName: name,
      loginEmail: loginEmail,
      contactEmail: contactEmail,
      category: req.body.category || "",
      description: req.body.description || "",
      contactNumber: req.body.contactNumber || "",
      passwordHash,
      createdAt: new Date(),
      createdByAdminId: req.user.sub,
    };

    const result = await organizers.insertOne(doc);
    
    // Return credentials to admin for manual sharing
    return res.status(201).json({ 
      ok: true, 
      organizerId: result.insertedId, 
      loginEmail,
      password: autoPassword 
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/admin/organizers/:id/archive - Archive organizer
router.put("/admin/organizers/:id/archive", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const organizerId = toObjectId(req.params.id);
    if (!organizerId) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const result = await organizersCol().updateOne(
      { _id: organizerId },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ ok: false, error: "Organizer not found" });
    }

    return res.json({ ok: true, message: "Organizer archived successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/admin/organizers/:id/restore - Restore organizer
router.put("/admin/organizers/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const organizerId = toObjectId(req.params.id);
    if (!organizerId) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const result = await organizersCol().updateOne(
      { _id: organizerId },
      { $set: { isArchived: false }, $unset: { archivedAt: "" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ ok: false, error: "Organizer not found" });
    }

    return res.json({ ok: true, message: "Organizer restored successfully" });
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
