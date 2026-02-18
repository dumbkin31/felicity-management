const express = require("express");
const { ObjectId } = require("mongodb");
const { organizersCol, eventsCol } = require("../config/collections");

const router = express.Router();

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (err) {
    return null;
  }
}

// GET /api/organizers - List all organizers
router.get("/organizers", async (req, res) => {
  try {
    const organizers = await organizersCol()
      .find(
        {},
        {
          projection: {
            organizerName: 1,
            category: 1,
            description: 1,
            contactEmail: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ organizerName: 1 })
      .toArray();

    return res.json({ ok: true, organizers });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizers/:id - Get organizer details
router.get("/organizers/:id", async (req, res) => {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const organizer = await organizersCol().findOne(
      { _id },
      {
        projection: {
          organizerName: 1,
          category: 1,
          description: 1,
          contactEmail: 1,
          contactNumber: 1,
          createdAt: 1,
        },
      }
    );

    if (!organizer) return res.status(404).json({ ok: false, error: "Organizer not found" });

    return res.json({ ok: true, organizer });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizers/:id/events - Get organizer's events (upcoming and past)
router.get("/organizers/:id/events", async (req, res) => {
  try {
    const organizerId = req.params.id;
    const _id = toObjectId(organizerId);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const organizer = await organizersCol().findOne({ _id });
    if (!organizer) return res.status(404).json({ ok: false, error: "Organizer not found" });

    const now = new Date();
    const { filter } = req.query; // "upcoming" | "past" | undefined (all)

    let query = { organizerUserId: organizerId };

    if (filter === "upcoming") {
      query.startAt = { $gte: now };
    } else if (filter === "past") {
      query.endAt = { $lt: now };
    }

    const events = await eventsCol()
      .find(query, {
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
          organizerUserId: 1,
        },
      })
      .sort({ startAt: filter === "past" ? -1 : 1 })
      .toArray();

    const upcoming = events.filter((e) => new Date(e.startAt) >= now);
    const past = events.filter((e) => new Date(e.endAt) < now);

    return res.json({
      ok: true,
      events: filter ? events : { upcoming, past },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
