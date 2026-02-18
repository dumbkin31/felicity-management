const express = require("express");
const { ObjectId } = require("mongodb");
const { participantsCol, organizersCol } = require("../config/collections");
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

// POST /api/participants/follow
router.post("/participants/follow", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { organizerId } = req.body;
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

// POST /api/participants/unfollow
router.post("/participants/unfollow", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const _id = toObjectId(req.user.sub);
    if (!_id) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { organizerId } = req.body;
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

module.exports = router;
