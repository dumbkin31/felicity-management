const express = require("express");
const { ObjectId } = require("mongodb");
const { feedbackCol, registrationsCol, eventsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// POST /api/feedback/:eventId
// Submit anonymous feedback for an event
router.post("/feedback/:eventId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: "Rating must be between 1 and 5" });
    }

    // Verify participant attended the event
    const registrations = registrationsCol();
    const registration = await registrations.findOne({
      eventId: eventId.toString(),
      participantId: req.user.sub,
      status: "confirmed",
      attended: true,
    });

    if (!registration) {
      return res.status(403).json({
        ok: false,
        error: "You can only provide feedback for events you attended",
      });
    }

    // Check if already submitted feedback
    const feedback = feedbackCol();
    const existing = await feedback.findOne({
      eventId: eventId.toString(),
      participantId: req.user.sub,
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: "You have already submitted feedback for this event" });
    }

    // Submit feedback (anonymous - participantId stored for duplicate prevention only)
    const feedbackDoc = {
      eventId: eventId.toString(),
      participantId: req.user.sub, // Stored only for duplicate check
      rating: Number(rating),
      comment: comment || "",
      submittedAt: new Date(),
    };

    const result = await feedback.insertOne(feedbackDoc);

    return res.json({
      ok: true,
      message: "Feedback submitted successfully",
      feedbackId: result.insertedId,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/feedback/:eventId
// Get all feedback for an event (organizer)
router.get("/organizer/feedback/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify organizer owns the event
    const events = eventsCol();
    const event = await events.findOne({
      _id: new ObjectId(eventId),
      organizerUserId: req.user.sub,
    });

    if (!event) {
      return res.status(403).json({ ok: false, error: "You don't have access to this event's feedback" });
    }

    // Get all feedback (without participant IDs for anonymity)
    const feedback = feedbackCol();
    const allFeedback = await feedback
      .find({
        $or: [
          { eventId: eventId.toString() },
          { eventId: new ObjectId(eventId) },
        ],
      })
      .sort({ submittedAt: -1 })
      .toArray();

    // Remove participantId from response to maintain anonymity
    const anonymousFeedback = allFeedback.map((fb) => ({
      _id: fb._id,
      rating: fb.rating,
      comment: fb.comment,
      submittedAt: fb.submittedAt,
    }));

    // Calculate aggregated stats
    const totalFeedback = anonymousFeedback.length;
    const avgRating = totalFeedback > 0
      ? (anonymousFeedback.reduce((sum, fb) => sum + fb.rating, 0) / totalFeedback).toFixed(2)
      : 0;

    const ratingDistribution = {
      1: anonymousFeedback.filter((fb) => fb.rating === 1).length,
      2: anonymousFeedback.filter((fb) => fb.rating === 2).length,
      3: anonymousFeedback.filter((fb) => fb.rating === 3).length,
      4: anonymousFeedback.filter((fb) => fb.rating === 4).length,
      5: anonymousFeedback.filter((fb) => fb.rating === 5).length,
    };

    return res.json({
      ok: true,
      feedback: anonymousFeedback,
      stats: {
        total: totalFeedback,
        averageRating: avgRating,
        distribution: ratingDistribution,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/feedback/:eventId/export
// Export feedback as CSV
router.get("/organizer/feedback/:eventId/export", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify organizer owns the event
    const events = eventsCol();
    const event = await events.findOne({
      _id: new ObjectId(eventId),
      organizerUserId: req.user.sub,
    });

    if (!event) {
      return res.status(403).json({ ok: false, error: "You don't have access to this event's feedback" });
    }

    // Get all feedback
    const feedback = feedbackCol();
    const allFeedback = await feedback
      .find({
        $or: [
          { eventId: eventId.toString() },
          { eventId: new ObjectId(eventId) },
        ],
      })
      .sort({ submittedAt: -1 })
      .toArray();

    // Generate CSV
    let csv = "Rating,Comment,\"Submitted At\"\n";
    allFeedback.forEach((fb) => {
      const comment = fb.comment ? `"${fb.comment.replace(/"/g, '""')}"` : "";
      const submittedAt = new Date(fb.submittedAt).toLocaleString();
      csv += `${fb.rating},${comment},"${submittedAt}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=feedback-${eventId}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
