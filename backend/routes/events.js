const express = require("express");
const { ObjectId } = require("mongodb");
const { eventsCol, organizersCol, registrationsCol, participantsCol } = require("../config/collections");
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

// GET /api/events/trending - Top 5 events by registrations in last 24h
router.get("/events/trending", async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await registrationsCol()
      .aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        { $group: { _id: "$eventId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        {
          $project: {
            _id: "$event._id",
            name: "$event.name",
            description: "$event.description",
            type: "$event.type",
            eligibility: "$event.eligibility",
            registrationDeadline: "$event.registrationDeadline",
            startAt: "$event.startAt",
            endAt: "$event.endAt",
            registrationLimit: "$event.registrationLimit",
            tags: "$event.tags",
            status: "$event.status",
            organizerUserId: "$event.organizerUserId",
            registrationCount: "$count",
          },
        },
      ])
      .toArray();

    return res.json({ ok: true, trending });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/events - Browse events with search and filters
router.get("/events", async (req, res) => {
  try {
    const {
      search,        // partial/fuzzy match on event name or organizer name
      type,          // "normal" | "merch"
      eligibility,   // "all" | "iiit" | "non-iiit"
      startDate,     // ISO date string
      endDate,       // ISO date string
      followedOnly,  // "true" - filter by followed organizers (requires auth)
    } = req.query;

    let query = {};

    // Search: partial match on event name or organizer name
    if (search) {
      const searchRegex = new RegExp(search.trim().split("").join(".*"), "i"); // fuzzy
      
      // Get organizer IDs matching search
      const matchingOrganizers = await organizersCol()
        .find(
          { organizerName: searchRegex },
          { projection: { _id: 1 } }
        )
        .toArray();
      
      const organizerIds = matchingOrganizers.map((o) => o._id.toString());

      query.$or = [
        { name: searchRegex },
        { organizerUserId: { $in: organizerIds } },
      ];
    }

    // Filter by event type
    if (type && ["normal", "merch"].includes(type)) {
      query.type = type;
    }

    // Filter by eligibility
    if (eligibility) {
      query.eligibility = eligibility;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) query.startAt.$gte = new Date(startDate);
      if (endDate) query.startAt.$lte = new Date(endDate);
    }

    // Filter by followed organizers (requires participant to be logged in)
    if (followedOnly === "true" && req.user?.role === "participant") {
      const participantId = toObjectId(req.user.sub);
      if (participantId) {
        const participant = await participantsCol().findOne(
          { _id: participantId },
          { projection: { followedOrganizerIds: 1 } }
        );

        if (participant?.followedOrganizerIds?.length) {
          const followedIds = participant.followedOrganizerIds.map((id) => id.toString());
          query.organizerUserId = { $in: followedIds };
        } else {
          // No followed organizers = no results
          return res.json({ ok: true, events: [] });
        }
      }
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
      .sort({ startAt: 1 })
      .limit(100)
      .toArray();

    return res.json({ ok: true, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/events/:id - Get event details
router.get("/events/:id", async (req, res) => {
  try {
    const eventId = toObjectId(req.params.id);
    if (!eventId) return res.status(400).json({ ok: false, error: "Invalid event id" });

    const event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Get current registration count
    const registrationCount = await registrationsCol().countDocuments({ eventId: eventId.toString() });

    // Check if registration is open
    const now = new Date();
    const deadlinePassed = now > new Date(event.registrationDeadline);
    const limitReached = registrationCount >= event.registrationLimit;
    const stockExhausted = event.type === "merch" && event.merchandise?.stockQty <= 0;

    return res.json({
      ok: true,
      event,
      registrationCount,
      canRegister: !deadlinePassed && !limitReached && !stockExhausted && event.status === "published",
      reasons: {
        deadlinePassed,
        limitReached,
        stockExhausted,
        notPublished: event.status !== "published",
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/events/:id/register - Register for normal event
router.post("/events/:id/register", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const eventId = toObjectId(req.params.id);
    if (!eventId) return res.status(400).json({ ok: false, error: "Invalid event id" });

    const participantId = toObjectId(req.user.sub);
    if (!participantId) return res.status(400).json({ ok: false, error: "Invalid participant id" });

    // Get event details
    const event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Validate event type
    if (event.type !== "normal") {
      return res.status(400).json({ ok: false, error: "This endpoint is for normal events only" });
    }

    // Check if event is published
    if (event.status !== "published") {
      return res.status(400).json({ ok: false, error: "Event is not published yet" });
    }

    // Check deadline
    const now = new Date();
    if (now > new Date(event.registrationDeadline)) {
      return res.status(400).json({ ok: false, error: "Registration deadline has passed" });
    }

    // Check if already registered
    const existing = await registrationsCol().findOne({
      eventId: eventId.toString(),
      participantId: participantId.toString(),
    });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Already registered for this event" });
    }

    // Check registration limit
    const registrationCount = await registrationsCol().countDocuments({ eventId: eventId.toString() });
    if (registrationCount >= event.registrationLimit) {
      return res.status(400).json({ ok: false, error: "Registration limit reached" });
    }

    // Check eligibility
    const participant = await participantsCol().findOne({ _id: participantId });
    if (!participant) return res.status(404).json({ ok: false, error: "Participant not found" });

    if (event.eligibility === "iiit" && participant.participantType !== "iiit") {
      return res.status(403).json({ ok: false, error: "This event is only for IIIT students" });
    }
    if (event.eligibility === "non-iiit" && participant.participantType !== "non-iiit") {
      return res.status(403).json({ ok: false, error: "This event is only for non-IIIT participants" });
    }

    // Create registration with form data
    const { formData } = req.body;
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const registration = {
      ticketId,
      eventId: eventId.toString(),
      participantId: participantId.toString(),
      eventName: event.name,
      eventType: event.type,
      participantName: `${participant.firstName} ${participant.lastName}`.trim(),
      participantEmail: participant.email,
      status: "confirmed",
      formData: formData || {},
      createdAt: new Date(),
    };

    await registrationsCol().insertOne(registration);

    return res.status(201).json({
      ok: true,
      registration: {
        ticketId,
        eventName: event.name,
        status: "confirmed",
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/events/:id/purchase - Purchase merchandise
router.post("/events/:id/purchase", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const eventId = toObjectId(req.params.id);
    if (!eventId) return res.status(400).json({ ok: false, error: "Invalid event id" });

    const participantId = toObjectId(req.user.sub);
    if (!participantId) return res.status(400).json({ ok: false, error: "Invalid participant id" });

    // Get event details
    const event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Validate event type
    if (event.type !== "merch") {
      return res.status(400).json({ ok: false, error: "This endpoint is for merchandise events only" });
    }

    // Check if event is published
    if (event.status !== "published") {
      return res.status(400).json({ ok: false, error: "Event is not published yet" });
    }

    // Check deadline
    const now = new Date();
    if (now > new Date(event.registrationDeadline)) {
      return res.status(400).json({ ok: false, error: "Purchase deadline has passed" });
    }

    // Check stock
    if (event.merchandise.stockQty <= 0) {
      return res.status(400).json({ ok: false, error: "Out of stock" });
    }

    // Check purchase limit per participant
    const existingPurchases = await registrationsCol().countDocuments({
      eventId: eventId.toString(),
      participantId: participantId.toString(),
    });

    if (existingPurchases >= event.merchandise.purchaseLimitPerParticipant) {
      return res.status(400).json({
        ok: false,
        error: `Purchase limit reached (${event.merchandise.purchaseLimitPerParticipant} per participant)`,
      });
    }

    // Get participant details
    const participant = await participantsCol().findOne({ _id: participantId });
    if (!participant) return res.status(404).json({ ok: false, error: "Participant not found" });

    // Check eligibility
    if (event.eligibility === "iiit" && participant.participantType !== "iiit") {
      return res.status(403).json({ ok: false, error: "This event is only for IIIT students" });
    }
    if (event.eligibility === "non-iiit" && participant.participantType !== "non-iiit") {
      return res.status(403).json({ ok: false, error: "This event is only for non-IIIT participants" });
    }

    // Get purchase details
    const { variant, quantity } = req.body;
    const qty = quantity || 1;

    if (qty < 1 || qty > event.merchandise.purchaseLimitPerParticipant - existingPurchases) {
      return res.status(400).json({ ok: false, error: "Invalid quantity" });
    }

    if (event.merchandise.stockQty < qty) {
      return res.status(400).json({ ok: false, error: "Insufficient stock" });
    }

    // Create purchase registration
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const registration = {
      ticketId,
      eventId: eventId.toString(),
      participantId: participantId.toString(),
      eventName: event.name,
      eventType: event.type,
      participantName: `${participant.firstName} ${participant.lastName}`.trim(),
      participantEmail: participant.email,
      status: "confirmed",
      variant: variant || {},
      quantity: qty,
      createdAt: new Date(),
    };

    await registrationsCol().insertOne(registration);

    // Decrement stock
    await eventsCol().updateOne(
      { _id: eventId },
      { $inc: { "merchandise.stockQty": -qty } }
    );

    return res.status(201).json({
      ok: true,
      registration: {
        ticketId,
        eventName: event.name,
        quantity: qty,
        status: "confirmed",
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
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
