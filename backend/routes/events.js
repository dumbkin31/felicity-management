const express = require("express");
const { eventsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// GET /api/events  (public)
router.get("/events", async (req, res) => {
  try {
    const events = await eventsCol()
      .find({}, {
        projection: {
          name: 1,
          description: 1,
          type: 1,
          eligibility: 1,
          registrationDeadline: 1,
          startAt: 1,
          endAt: 1,
          registrationLimit: 1,
          tags: 1,
          status: 1,
          organizerUserId: 1
        }
      })
      .sort({ startAt: 1 })
      .limit(50)
      .toArray();

    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/events (organizer/admin)
router.post("/events", requireAuth, requireRole("organizer", "admin"), async (req, res) => {
  try {
    const {
      name,
      description,
      type, // "normal" | "merch"
      eligibility, // free-form string; recommend "all"/"iiit"/"non-iiit"
      registrationDeadline,
      startAt,
      endAt,
      registrationLimit,
      tags, // array of strings

      // normal-only
      registrationFee,
      formSchema,

      // merch-only
      merchandise, // { variants: [...], stockQty, purchaseLimitPerParticipant }
    } = req.body;

    // Required for all events
    if (!name || !description || !type || !registrationDeadline || !startAt || !endAt || registrationLimit == null) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: name, description, type, registrationDeadline, startAt, endAt, registrationLimit",
      });
    }

    if (!["normal", "merch"].includes(type)) {
      return res.status(400).json({ ok: false, error: 'type must be "normal" or "merch"' });
    }

    const doc = {
      name,
      description,
      type,
      eligibility: eligibility || "all",
      registrationDeadline: new Date(registrationDeadline),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      registrationLimit: Number(registrationLimit),
      tags: Array.isArray(tags) ? tags : [],

      // Organizer identity
      organizerUserId: req.user.sub,

      // Status + timestamps
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Type-specific fields
    if (type === "normal") {
      doc.registrationFee = registrationFee == null ? 0 : Number(registrationFee);
      doc.formSchema = formSchema || { fields: [] }; // dynamic form builder placeholder
    } else {
      doc.merchandise = merchandise || {
        variants: [],              // [{ size, color, sku, price, stockQty }]
        stockQty: 0,
        purchaseLimitPerParticipant: 1,
      };
    }

    const result = await eventsCol().insertOne(doc);
    return res.status(201).json({ ok: true, eventId: result.insertedId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});



module.exports = router;
