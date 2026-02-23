const express = require("express");
const { ObjectId } = require("mongodb");
const { passwordResetRequestsCol, organizersCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const bcrypt = require("bcrypt");

const router = express.Router();

// POST /api/password-reset/request
// Organizer requests password reset
router.post("/password-reset/request", async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email || !reason) {
      return res.status(400).json({ ok: false, error: "Email and reason are required" });
    }

    // Verify user exists and is an organizer
    const organizers = organizersCol();
    const user = await organizers.findOne({ loginEmail: email });

    if (!user) {
      return res.status(404).json({ ok: false, error: "Organizer account not found" });
    }

    const requests = passwordResetRequestsCol();

    // Check if there's a pending request
    const existing = await requests.findOne({
      email,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({
        ok: false,
        error: "You already have a pending password reset request",
      });
    }

    // Create new request
    const request = {
      email,
      userId: user._id,
      reason,
      status: "pending",
      requestedAt: new Date(),
    };

    const result = await requests.insertOne(request);

    return res.json({
      ok: true,
      message: "Password reset request submitted. Please wait for admin approval.",
      requestId: result.insertedId,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/admin/password-reset/requests
// Admin gets all password reset requests
router.get("/admin/password-reset/requests", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const requests = passwordResetRequestsCol();
    const allRequests = await requests.find({}).sort({ requestedAt: -1 }).toArray();

    return res.json({ ok: true, requests: allRequests });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/admin/password-reset/approve/:requestId
// Admin approves password reset and generates new password
router.put("/admin/password-reset/approve/:requestId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { requestId } = req.params;
    const requests = passwordResetRequestsCol();

    const request = await requests.findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      return res.status(404).json({ ok: false, error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ ok: false, error: "Request is not pending" });
    }

    // Generate new random password
    const newPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update organizer password
    const organizers = organizersCol();
    await organizers.updateOne(
      { _id: request.userId },
      { $set: { password: hashedPassword, passwordResetAt: new Date() } }
    );

    // Update request status
    await requests.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: new ObjectId(req.user.sub),
          newPassword, // Store temporarily for admin to share
        },
      }
    );

    return res.json({
      ok: true,
      message: "Password reset approved",
      email: request.email,
      newPassword,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/admin/password-reset/reject/:requestId
// Admin rejects password reset request
router.put("/admin/password-reset/reject/:requestId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const requests = passwordResetRequestsCol();

    const request = await requests.findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      return res.status(404).json({ ok: false, error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ ok: false, error: "Request is not pending" });
    }

    // Update request status
    await requests.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: new ObjectId(req.user.sub),
          rejectionReason: reason || "No reason provided",
        },
      }
    );

    return res.json({ ok: true, message: "Password reset request rejected" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/password-reset/status
// Organizer checks their password reset request status
router.get("/organizer/password-reset/status", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const requests = passwordResetRequestsCol();
    const organizers = organizersCol();

    const user = await organizers.findOne({ _id: new ObjectId(req.user.sub) });
    const allRequests = await requests
      .find({ email: user.loginEmail })
      .sort({ requestedAt: -1 })
      .toArray();

    return res.json({ ok: true, requests: allRequests });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
