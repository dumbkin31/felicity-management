const express = require("express");
const { ObjectId } = require("mongodb");
const { organizersCol, eventsCol, registrationsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { autoMarkCompleted } = require("./events");

const router = express.Router();

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (err) {
    return null;
  }
}

// GET /api/organizer/dashboard - Organizer dashboard
router.get("/organizer/dashboard", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const organizerId = req.user.sub;

    // Get all events created by this organizer
    let events = await eventsCol()
      .find({ organizerUserId: organizerId })
      .sort({ createdAt: -1 })
      .toArray();

    // Auto-mark events as completed if their end time has passed
    events = await Promise.all(events.map((event) => autoMarkCompleted(event)));

    // Calculate dashboard statistics from event documents
    let totalRegistrations = 0;
    let totalRevenue = 0;
    let totalAttendance = 0;
    let completedEventsCount = 0;

    events.forEach((event) => {
      if (event.status === "completed") {
        completedEventsCount++;
        totalRegistrations += event.totalRegistrations || 0;
        totalRevenue += event.totalRevenue || 0;
        totalAttendance += event.totalAttendance || 0;
      }
    });

    // Event carousel data
    const eventsCarousel = events.map((e) => ({
      _id: e._id,
      name: e.name,
      type: e.type,
      status: e.status,
      startAt: e.startAt,
      endAt: e.endAt,
      registrationDeadline: e.registrationDeadline,
      tags: e.tags,
      totalRegistrations: e.totalRegistrations || 0, // All registrations (including pending)
      confirmedRegistrations: e.confirmedRegistrations || 0, // Only confirmed
      totalRevenue: e.totalRevenue || 0,
      totalAttendance: e.totalAttendance || 0,
    }));

    return res.json({
      ok: true,
      dashboard: {
        eventsCarousel,
        analytics: {
          totalEvents: events.length,
          completedEvents: completedEventsCount,
          totalRegistrations,
          totalRevenue,
          totalAttendance,
          confirmedRegistrations
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/events/:id/details - Event details with analytics (organizer view)
router.get("/organizer/events/:id/details", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const eventId = toObjectId(req.params.id);
    if (!eventId) return res.status(400).json({ ok: false, error: "Invalid event id" });

    const organizerId = req.user.sub;

    // Get event and verify ownership
    let event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Auto-mark as completed if end time has passed
    event = await autoMarkCompleted(event);

    if (event.organizerUserId !== organizerId) {
      return res.status(403).json({ ok: false, error: "Not authorized to view this event" });
    }

    // Get all registrations for this event (for participant list)
    const registrations = await registrationsCol()
      .find({ eventId: eventId.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    // Use pre-calculated analytics from event document
    const analytics = {
      totalRegistrations: event.totalRegistrations || 0,
      confirmedRegistrations: event.confirmedRegistrations || 0,
      attendance: event.totalAttendance || 0,
      revenue: event.totalRevenue || 0,
    };

    // Participant list
    const participants = registrations.map((r) => ({
      ticketId: r.ticketId,
      participantName: r.participantName,
      participantEmail: r.participantEmail,
      registrationDate: r.createdAt,
      status: r.status,
      attended: r.attended || false,
      quantity: r.quantity,
      variant: r.variant,
    }));

    return res.json({
      ok: true,
      event: {
        _id: event._id,
        name: event.name,
        description: event.description,
        type: event.type,
        status: event.status,
        eligibility: event.eligibility,
        registrationDeadline: event.registrationDeadline,
        startAt: event.startAt,
        endAt: event.endAt,
        registrationLimit: event.registrationLimit,
        registrationFee: event.registrationFee,
        tags: event.tags,
        formSchema: event.formSchema,
        merchandise: event.merchandise,
      },
      analytics,
      participants,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/profile - Get organizer profile
router.get("/organizer/profile", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const organizerId = toObjectId(req.user.sub);
    if (!organizerId) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const organizer = await organizersCol().findOne(
      { _id: organizerId },
      { projection: { passwordHash: 0 } }
    );

    if (!organizer) return res.status(404).json({ ok: false, error: "Organizer not found" });

    return res.json({ ok: true, organizer });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/organizer/profile - Update organizer profile
router.put("/organizer/profile", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const organizerId = toObjectId(req.user.sub);
    if (!organizerId) return res.status(400).json({ ok: false, error: "Invalid organizer id" });

    const { organizerName, category, description, contactEmail, contactNumber, discordWebhook } = req.body;

    const updates = {};
    if (typeof organizerName === "string") updates.organizerName = organizerName.trim();
    if (typeof category === "string") updates.category = category.trim();
    if (typeof description === "string") updates.description = description.trim();
    if (typeof contactEmail === "string") updates.contactEmail = contactEmail.toLowerCase().trim();
    if (typeof contactNumber === "string") updates.contactNumber = contactNumber.trim();
    if (typeof discordWebhook === "string") updates.discordWebhook = discordWebhook.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    await organizersCol().updateOne({ _id: organizerId }, { $set: updates });

    const organizer = await organizersCol().findOne(
      { _id: organizerId },
      { projection: { passwordHash: 0 } }
    );

    return res.json({ ok: true, organizer });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
