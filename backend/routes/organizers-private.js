const express = require("express");
const { ObjectId } = require("mongodb");
const { organizersCol, eventsCol, registrationsCol } = require("../config/collections");
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

// GET /api/organizer/dashboard - Organizer dashboard
router.get("/organizer/dashboard", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const organizerId = req.user.sub;

    // Get all events created by this organizer
    const events = await eventsCol()
      .find({ organizerUserId: organizerId })
      .sort({ createdAt: -1 })
      .toArray();

    // Get analytics for completed events
    const completedEvents = events.filter((e) => e.status === "completed");
    let totalRegistrations = 0;
    let totalRevenue = 0;
    let totalAttendance = 0;

    for (const event of completedEvents) {
      const registrations = await registrationsCol()
        .find({ eventId: event._id.toString(), status: "confirmed" })
        .toArray();

      const eventRegistrations = registrations.length;
      totalRegistrations += eventRegistrations;

      // Calculate revenue
      if (event.type === "normal" && event.registrationFee) {
        totalRevenue += eventRegistrations * event.registrationFee;
      } else if (event.type === "merch" && event.merchandise?.variants?.length) {
        // Sum up merchandise revenue
        registrations.forEach((reg) => {
          const variant = reg.variant;
          const qty = reg.quantity || 1;
          const price = variant?.price || 0;
          totalRevenue += price * qty;
        });
      }

      // Attendance (marked as attended)
      const attended = registrations.filter((r) => r.attended === true).length;
      totalAttendance += attended;
    }

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
    }));

    return res.json({
      ok: true,
      dashboard: {
        eventsCarousel,
        analytics: {
          totalEvents: events.length,
          completedEvents: completedEvents.length,
          totalRegistrations,
          totalRevenue,
          totalAttendance,
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
    const event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    if (event.organizerUserId !== organizerId) {
      return res.status(403).json({ ok: false, error: "Not authorized to view this event" });
    }

    // Get all registrations for this event
    const registrations = await registrationsCol()
      .find({ eventId: eventId.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate analytics
    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter((r) => r.status === "confirmed").length;
    const attendance = registrations.filter((r) => r.attended === true).length;

    let revenue = 0;
    if (event.type === "normal" && event.registrationFee) {
      revenue = confirmedRegistrations * event.registrationFee;
    } else if (event.type === "merch") {
      registrations.forEach((reg) => {
        if (reg.status === "confirmed") {
          const price = reg.variant?.price || 0;
          const qty = reg.quantity || 1;
          revenue += price * qty;
        }
      });
    }

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
      },
      analytics: {
        totalRegistrations,
        confirmedRegistrations,
        attendance,
        revenue,
      },
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
