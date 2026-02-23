const express = require("express");
const { ObjectId } = require("mongodb");
const { eventsCol, organizersCol, registrationsCol, participantsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { generateQRCode } = require("../utils/qrcode");
const { sendTicketEmail } = require("../utils/email");

const router = express.Router();

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (err) {
    return null;
  }
}

// Helper: Auto-mark events as completed if endAt has passed
async function autoMarkCompleted(event) {
  try {
    if (!event) return event;

    // If event is published and end time has passed, mark as completed
    if (event.status === "published" && new Date() > new Date(event.endAt)) {
      await eventsCol().updateOne(
        { _id: event._id },
        { $set: { status: "completed", updatedAt: new Date() } }
      );
      // Return updated event
      return await eventsCol().findOne({ _id: event._id });
    }

    return event;
  } catch (err) {
    console.error("Error auto-marking event as completed:", err);
    return event;
  }
}

// Helper: Calculate and store event analytics
async function updateEventAnalytics(eventId) {
  try {
    const eventObjId = eventId instanceof ObjectId ? eventId : toObjectId(eventId);
    if (!eventObjId) return;

    const event = await eventsCol().findOne({ _id: eventObjId });
    if (!event) return;

    // Get all registrations for this event
    const registrations = await registrationsCol()
      .find({ eventId: eventObjId.toString() })
      .toArray();

    const confirmedRegistrations = registrations.filter((r) => r.status === "confirmed");
    const attendedRegistrations = registrations.filter((r) => r.attended === true);

    let totalRevenue = 0;
    if (event.type === "normal" && event.registrationFee) {
      totalRevenue = confirmedRegistrations.length * event.registrationFee;
    } else if (event.type === "merch") {
      confirmedRegistrations.forEach((reg) => {
        const price = reg.variant?.price || 0;
        const qty = reg.quantity || 1;
        totalRevenue += price * qty;
      });
    }

    // Update event with calculated analytics
    const analytics = {
      totalRegistrations: registrations.length,
      confirmedRegistrations: confirmedRegistrations.length,
      totalAttendance: attendedRegistrations.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimals
      analyticsUpdatedAt: new Date(),
    };

    await eventsCol().updateOne(
      { _id: eventObjId },
      { $set: analytics }
    );

    return analytics;
  } catch (err) {
    console.error("Error updating event analytics:", err);
  }
}

// Helper: Post event to Discord webhook
async function postToDiscordWebhook(organizerId, event) {
  try {
    const organizer = await organizersCol().findOne({ _id: toObjectId(organizerId) });
    if (!organizer || !organizer.discordWebhook) return;

    const webhookUrl = organizer.discordWebhook;

    const embed = {
      title: `📅 New Event: ${event.name}`,
      description: event.description,
      color: 0x667eea,
      fields: [
        {
          name: "Event Type",
          value: event.type === "normal" ? "Registration" : "Merchandise",
          inline: true,
        },
        {
          name: "Eligibility",
          value: event.eligibility || "All",
          inline: true,
        },
        {
          name: "Start Date",
          value: new Date(event.startAt).toLocaleString(),
          inline: true,
        },
        {
          name: "End Date",
          value: new Date(event.endAt).toLocaleString(),
          inline: true,
        },
        {
          name: "Registration Deadline",
          value: new Date(event.registrationDeadline).toLocaleString(),
          inline: true,
        },
        {
          name: "Registration Limit",
          value: String(event.registrationLimit),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    if (event.type === "normal" && event.registrationFee) {
      embed.fields.push({
        name: "Registration Fee",
        value: `₹${event.registrationFee}`,
        inline: true,
      });
    }

    const payload = {
      username: organizer.organizerName,
      embeds: [embed],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Error posting to Discord webhook:", err);
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
          $addFields: {
            eventObjectId: { $toObjectId: "$_id" }
          }
        },
        {
          $lookup: {
            from: "events",
            localField: "eventObjectId",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        { $match: { "event.status": "published" } },
        {
          $addFields: {
            organizerObjectId: { $toObjectId: "$event.organizerUserId" }
          }
        },
        {
          $lookup: {
            from: "organizers",
            localField: "organizerObjectId",
            foreignField: "_id",
            as: "organizer",
          },
        },
        { $unwind: { path: "$organizer", preserveNullAndEmptyArrays: true } },
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
            organizerId: {
              _id: "$organizer._id",
              name: "$organizer.organizerName"
            },
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

    let query = { status: "published" };

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
      .aggregate([
        { $match: query },
        { $sort: { startAt: 1 } },
        { $limit: 100 },
        {
          $addFields: {
            organizerObjectId: { $toObjectId: "$organizerUserId" }
          }
        },
        {
          $lookup: {
            from: "organizers",
            localField: "organizerObjectId",
            foreignField: "_id",
            as: "organizer"
          }
        },
        { $unwind: { path: "$organizer", preserveNullAndEmptyArrays: true } },
        {
          $project: {
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
            organizerId: {
              _id: "$organizer._id",
              name: "$organizer.organizerName"
            }
          }
        }
      ])
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

    let event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Auto-mark as completed if end time has passed
    event = await autoMarkCompleted(event);

    // Get organizer details (convert string ID to ObjectId)
    const organizerObjectId = toObjectId(event.organizerUserId);
    const organizer = organizerObjectId ? await organizersCol().findOne(
      { _id: organizerObjectId },
      { projection: { _id: 1, organizerName: 1 } }
    ) : null;

    if (organizer) {
      event.organizerId = {
        _id: organizer._id,
        name: organizer.organizerName
      };
    }

    // Get current registration count
    const registrationCount = await registrationsCol().countDocuments({ eventId: eventId.toString() });

    // Check if registration is open
    const now = new Date();
    const deadlinePassed = now > new Date(event.registrationDeadline);
    const limitReached = registrationCount >= event.registrationLimit;
    const stockExhausted = event.type === "merch" && event.merchandise?.stockQty <= 0;
    const eventCompleted = event.status === "completed";

    return res.json({
      ok: true,
      event,
      registrationCount,
      canRegister: !deadlinePassed && !limitReached && !stockExhausted && event.status === "published" && !eventCompleted,
      reasons: {
        deadlinePassed,
        limitReached,
        stockExhausted,
        notPublished: event.status !== "published",
        eventCompleted,
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

    // Determine if payment is required
    const requiresPayment = event.registrationFee > 0;
    const registrationStatus = requiresPayment ? "pending_payment" : "confirmed";

    const registration = {
      ticketId,
      eventId: eventId.toString(),
      participantId: participantId.toString(),
      eventName: event.name,
      eventType: event.type,
      participantName: `${participant.firstName} ${participant.lastName}`.trim(),
      participantEmail: participant.email,
      status: registrationStatus,
      formData: formData || {},
      qrCode: null, // Will be generated after payment approval if required
      createdAt: new Date(),
    };

    if (requiresPayment) {
      registration.paymentStatus = "pending";
      registration.paymentProof = null;
    }

    await registrationsCol().insertOne(registration);

    // Update event analytics
    await updateEventAnalytics(eventId);

    // Send confirmation email only if payment is not required
    if (!requiresPayment) {
      // For free events, generate QR immediately
      const qrData = JSON.stringify({ ticketId, eventId: eventId.toString(), participantId: participantId.toString() });
      const qrCodeDataUrl = await generateQRCode(qrData);
      
      // Update registration with QR code
      await registrationsCol().updateOne(
        { ticketId },
        { $set: { qrCode: qrCodeDataUrl } }
      );

      await sendTicketEmail({
        to: participant.email,
        participantName: registration.participantName,
        eventName: event.name,
        ticketId,
        qrCodeDataUrl,
        eventType: event.type,
        eventDetails: {
          startAt: event.startAt,
          endAt: event.endAt,
        },
      });

      return res.status(201).json({
        ok: true,
        registration: {
          ticketId,
          eventName: event.name,
          status: registrationStatus,
          qrCode: qrCodeDataUrl,
        },
      });
    }

    // For events requiring payment, return without ticketId or QR
    return res.status(201).json({
      ok: true,
      registration: {
        eventName: event.name,
        status: registrationStatus,
        qrCode: null,
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
      status: "pending_payment",
      paymentStatus: "pending",
      paymentProof: null,
      variant: variant || {},
      quantity: qty,
      qrCode: null, // Will be generated after payment approval
      createdAt: new Date(),
    };

    await registrationsCol().insertOne(registration);

    // Update event analytics
    await updateEventAnalytics(eventId);

    // Decrement stock
    await eventsCol().updateOne(
      { _id: eventId },
      { $inc: { "merchandise.stockQty": -qty } }
    );

    // Note: Email will be sent after organizer approves payment

    return res.status(201).json({
      ok: true,
      registration: {
        eventName: event.name,
        quantity: qty,
        status: "pending_payment",
        qrCode: null,
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
      status, // "draft" | "published"

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
      status: status === "published" ? "published" : "draft",
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
    
    // If event is published, post to Discord webhook
    if (status === "published") {
      const eventWithId = { ...doc, _id: result.insertedId };
      await postToDiscordWebhook(req.user.sub, eventWithId);
    }
    
    return res.status(201).json({ ok: true, eventId: result.insertedId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/events/:id - Edit event (with status-based rules)
router.put("/events/:id", requireAuth, requireRole("organizer", "admin"), async (req, res) => {
  try {
    const eventId = toObjectId(req.params.id);
    if (!eventId) return res.status(400).json({ ok: false, error: "Invalid event id" });

    const event = await eventsCol().findOne({ _id: eventId });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    // Check ownership
    if (event.organizerUserId !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({ ok: false, error: "Not authorized to edit this event" });
    }

    // Define allowed edits based on event status
    const allowedUpdates = {};

    if (event.status === "draft") {
      // Draft: Can edit anything, and can change status to published
      const { name, description, type, eligibility, registrationDeadline, startAt, endAt, registrationLimit, tags, registrationFee, formSchema, merchandise, status } = req.body;
      if (name) allowedUpdates.name = name.trim();
      if (description) allowedUpdates.description = description.trim();
      if (eligibility) allowedUpdates.eligibility = eligibility.trim();
      if (registrationDeadline) allowedUpdates.registrationDeadline = new Date(registrationDeadline);
      if (startAt) allowedUpdates.startAt = new Date(startAt);
      if (endAt) allowedUpdates.endAt = new Date(endAt);
      if (registrationLimit) allowedUpdates.registrationLimit = Number(registrationLimit);
      if (tags) allowedUpdates.tags = Array.isArray(tags) ? tags : [];
      if (registrationFee !== undefined) allowedUpdates.registrationFee = Number(registrationFee);
      if (formSchema) allowedUpdates.formSchema = formSchema;
      if (merchandise) allowedUpdates.merchandise = merchandise;
      // Allow status change from draft to published only
      if (status === "published") {
        allowedUpdates.status = "published";
      } else if (status && status !== "draft") {
        return res.status(400).json({ ok: false, error: "Can only change status from draft to published" });
      }
    } else if (event.status === "published") {
      // Published: Can update description, extend deadline, increase limit, close registrations
      // Cannot change status back to draft
      const { description, registrationDeadline, registrationLimit, registrationClosed, status } = req.body;
      if (status && status !== "published") {
        return res.status(400).json({ ok: false, error: "Cannot change published event back to draft" });
      }
      if (description) allowedUpdates.description = description.trim();
      if (registrationDeadline) {
        const newDeadline = new Date(registrationDeadline);
        const currentDeadline = new Date(event.registrationDeadline);
        if (newDeadline >= currentDeadline) {
          allowedUpdates.registrationDeadline = newDeadline;
        } else {
          return res.status(400).json({ ok: false, error: "Cannot reduce registration deadline" });
        }
      }
      if (registrationLimit) {
        const newLimit = Number(registrationLimit);
        if (newLimit >= event.registrationLimit) {
          allowedUpdates.registrationLimit = newLimit;
        } else {
          return res.status(400).json({ ok: false, error: "Cannot reduce registration limit" });
        }
      }
      if (typeof registrationClosed === "boolean") {
        allowedUpdates.registrationClosed = registrationClosed;
      }
    } else if (["ongoing", "completed", "closed"].includes(event.status)) {
      // Ongoing/Completed/Closed: Only status changes allowed
      const { status } = req.body;
      if (status === "completed" || status === "closed") {
        allowedUpdates.status = status;
      } else {
        return res.status(400).json({ ok: false, error: `Can only change status for ${event.status} events` });
      }
    } else {
      return res.status(400).json({ ok: false, error: `Cannot edit event with status: ${event.status}` });
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    allowedUpdates.updatedAt = new Date();

    await eventsCol().updateOne(
      { _id: eventId },
      { $set: allowedUpdates }
    );

    const updatedEvent = await eventsCol().findOne({ _id: eventId });
    return res.json({ ok: true, event: updatedEvent });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});



module.exports = router;
module.exports.updateEventAnalytics = updateEventAnalytics;
module.exports.autoMarkCompleted = autoMarkCompleted;
module.exports.postToDiscordWebhook = postToDiscordWebhook;
