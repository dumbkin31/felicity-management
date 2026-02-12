const express = require("express");
const { eventsCol } = require("../config/collections");

const router = express.Router();

// GET /api/events  (public)
router.get("/events", async (req, res) => {
  try {
    const events = await eventsCol()
      .find({}, { projection: { title: 1, organizerId: 1, type: 1, startAt: 1, endAt: 1 } })
      .sort({ startAt: 1 })
      .limit(50)
      .toArray();

    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
