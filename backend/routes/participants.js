const express = require("express");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { participantsCol, organizersCol, eventsCol, registrationsCol } = require("../config/collections");
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

// GET /api/participants/dashboard - Participant dashboard
router.get("/participants/dashboard", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const participantId = req.user.sub;

    // Get all registrations for this participant
    const registrations = await registrationsCol()
      .find({ participantId })
      .sort({ createdAt: -1 })
      .toArray();

    // Get event IDs to fetch event details
    const eventIds = [...new Set(registrations.map((r) => toObjectId(r.eventId)).filter(Boolean))];
    const events = await eventsCol()
      .find({ _id: { $in: eventIds } })
      .toArray();

    // Get organizer details for events
    const organizerIds = [...new Set(events.map((e) => toObjectId(e.organizerUserId)).filter(Boolean))];
    const organizers = await organizersCol()
      .find({ _id: { $in: organizerIds } }, { projection: { _id: 1, organizerName: 1 } })
      .toArray();

    const organizerMap = {};
    organizers.forEach((o) => {
      organizerMap[o._id.toString()] = o.organizerName;
    });

    // Create event lookup map
    const eventMap = {};
    events.forEach((e) => {
      eventMap[e._id.toString()] = e;
    });

    // Auto-mark events as completed if their end time has passed
    await Promise.all(events.map((event) => autoMarkCompleted(event)));

    // Refresh event map after auto-marking
    const updatedEvents = await eventsCol()
      .find({ _id: { $in: eventIds } })
      .toArray();

    updatedEvents.forEach((e) => {
      eventMap[e._id.toString()] = e;
    });

    const now = new Date();

    // Categorize registrations
    const upcoming = [];
    const history = {
      normal: [],
      merchandise: [],
      completed: [],
      cancelled: [],
    };

    registrations.forEach((reg) => {
      const event = eventMap[reg.eventId];
      if (!event) return;

      const record = {
        ticketId: reg.ticketId,
        eventId: reg.eventId,
        eventName: reg.eventName,
        eventType: reg.eventType,
        organizerUserId: event.organizerUserId,
        organizerName: organizerMap[event.organizerUserId] || "Unknown Organizer",
        status: reg.status,
        participantName: reg.participantName,
        quantity: reg.quantity,
        startAt: event.startAt,
        endAt: event.endAt,
        createdAt: reg.createdAt,
        qrCode: reg.qrCode,
      };

      // Upcoming events (not yet ended, confirmed status)
      if (new Date(event.endAt) >= now && reg.status === "confirmed") {
        upcoming.push(record);
      }

      // History categorization
      if (new Date(event.endAt) < now && reg.status === "confirmed") {
        history.completed.push(record);
      } else if (reg.status === "cancelled" || reg.status === "rejected") {
        history.cancelled.push(record);
      } else if (reg.eventType === "normal") {
        history.normal.push(record);
      } else if (reg.eventType === "merch") {
        history.merchandise.push(record);
      }
    });

    return res.json({
      ok: true,
      dashboard: {
        upcoming,
        history,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/participants/me
router.get("/participants/me", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const participant = await participantsCol().findOne(
      { _id },
      {
        projection: {
          passwordHash: 0,
        },
      }
    );

    if (!participant) return res.status(404).json({ ok: false, error: "Participant not found" });

    return res.json({ ok: true, participant });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/participants/me
router.put("/participants/me", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const {
      firstName,
      lastName,
      contactNumber,
      collegeOrOrgName,
      interests,
      followedOrganizerIds,
    } = req.body;

    const updates = {};
    if (typeof firstName === "string") updates.firstName = firstName.trim();
    if (typeof lastName === "string") updates.lastName = lastName.trim();
    if (typeof contactNumber === "string") updates.contactNumber = contactNumber.trim();
    if (typeof collegeOrOrgName === "string") updates.collegeOrOrgName = collegeOrOrgName.trim();
    if (Array.isArray(interests)) updates.interests = interests.filter(Boolean).map(String);

    if (Array.isArray(followedOrganizerIds)) {
      const ids = followedOrganizerIds.map((id) => toObjectId(id)).filter(Boolean);
      updates.followedOrganizerIds = ids;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    await participantsCol().updateOne({ _id }, { $set: updates });

    const participant = await participantsCol().findOne(
      { _id },
      { projection: { passwordHash: 0 } }
    );

    return res.json({ ok: true, participant });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/participants/follow/:organizerId
router.post("/participants/follow/:organizerId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { organizerId } = req.params;
    const orgId = toObjectId(organizerId);
    if (!orgId) return res.status(400).json({ ok: false, error: "Invalid organizerId" });

    const organizer = await organizersCol().findOne({ _id: orgId });
    if (!organizer) return res.status(404).json({ ok: false, error: "Organizer not found" });

    await participantsCol().updateOne(
      { _id },
      { $addToSet: { followedOrganizerIds: orgId } }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/participants/unfollow/:organizerId
router.post("/participants/unfollow/:organizerId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { organizerId } = req.params;
    const orgId = toObjectId(organizerId);
    if (!orgId) return res.status(400).json({ ok: false, error: "Invalid organizerId" });

    await participantsCol().updateOne(
      { _id },
      { $pull: { followedOrganizerIds: orgId } }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/participants/change-password
router.put("/participants/change-password", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: "Current and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: "New password must be at least 6 characters" });
    }

    // Get participant with password hash
    const participant = await participantsCol().findOne({ _id });
    if (!participant) return res.status(404).json({ ok: false, error: "Participant not found" });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, participant.passwordHash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await participantsCol().updateOne(
      { _id },
      { $set: { passwordHash: newPasswordHash } }
    );

    return res.json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
