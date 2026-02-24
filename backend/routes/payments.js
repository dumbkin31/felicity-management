const express = require("express");
const { ObjectId } = require("mongodb");
const { registrationsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const QRCode = require("qrcode");

const router = express.Router();

// POST /api/participants/registrations/:registrationId/payment-proof
// Participant uploads payment proof using registration ID (supports both normal and merchandise events)
router.post("/participants/registrations/:registrationId/payment-proof", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { paymentProof } = req.body; // Base64 string from FileReader

    if (!paymentProof) {
      return res.status(400).json({ ok: false, error: "Payment proof is required" });
    }

    const registrations = registrationsCol();
    const registration = await registrations.findOne({ 
      _id: new ObjectId(registrationId),
      participantId: req.user.sub  // participantId is stored as string, not ObjectId
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found" });
    }

    // Update registration with payment proof
    await registrations.updateOne(
      { _id: new ObjectId(registrationId) },
      {
        $set: {
          paymentProof,
          paymentStatus: "pending",
          paymentProofUploadedAt: new Date(),
        },
      }
    );

    return res.json({ ok: true, message: "Payment proof uploaded successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/payments/upload-proof/:registrationId
// Participant uploads payment proof for merchandise order
router.post("/payments/upload-proof/:registrationId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { paymentProof } = req.body; // Base64 image string

    if (!paymentProof) {
      return res.status(400).json({ ok: false, error: "Payment proof is required" });
    }

    const registrations = registrationsCol();
    const registration = await registrations.findOne({ 
      _id: new ObjectId(registrationId),
      participantId: req.user.sub  // participantId is stored as string, not ObjectId
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found" });
    }

    if (registration.eventType !== "merch") {
      return res.status(400).json({ ok: false, error: "This is not a merchandise order" });
    }

    // Update registration with payment proof and set to pending
    await registrations.updateOne(
      { _id: new ObjectId(registrationId) },
      {
        $set: {
          paymentProof,
          paymentStatus: "pending",
          paymentProofUploadedAt: new Date(),
        },
      }
    );

    return res.json({ ok: true, message: "Payment proof uploaded successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/payments/pending/:eventId
// Get all pending payment approvals for an event (both merchandise and paid normal events)
router.get("/organizer/payments/pending/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const registrations = registrationsCol();

    const pendingPayments = await registrations
      .find({
        eventId: eventId,  // eventId is stored as string, not ObjectId
        $or: [
          { status: "pending_payment" },  // Registrations waiting for payment
          { paymentStatus: { $in: ["pending", "approved", "rejected"] } }  // Registrations with explicit paymentStatus
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({ ok: true, payments: pendingPayments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/organizer/payments/approve/:registrationId
// Approve payment and generate QR
router.put("/organizer/payments/approve/:registrationId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registrations = registrationsCol();

    const registration = await registrations.findOne({ _id: new ObjectId(registrationId) });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found" });
    }

    if (registration.paymentStatus !== "pending") {
      return res.status(400).json({ ok: false, error: "Payment is not in pending state" });
    }

    // Generate QR code
    const ticketData = {
      ticketId: registration.ticketId,
      eventId: registration.eventId.toString(),
      participantId: registration.participantId.toString(),
      timestamp: new Date().toISOString(),
    };
    
    const qrCode = await QRCode.toDataURL(JSON.stringify(ticketData));

    // Update registration
    await registrations.updateOne(
      { _id: new ObjectId(registrationId) },
      {
        $set: {
          paymentStatus: "approved",
          status: "confirmed",
          qrCode,
          approvedAt: new Date(),
          approvedBy: new ObjectId(req.user.sub),
        },
      }
    );

    // Decrement stock for merchandise events
    if (registration.eventType === "merch" && registration.quantity) {
      const { eventsCol } = require("../config/collections");
      const events = eventsCol();
      await events.updateOne(
        { _id: new ObjectId(registration.eventId) },
        { $inc: { "merchandise.stockQty": -registration.quantity } }
      );
    }

    // TODO: Send confirmation email with QR code

    return res.json({ 
      ok: true, 
      message: "Payment approved and QR generated",
      ticketId: registration.ticketId
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/organizer/payments/reject/:registrationId
// Reject payment
router.put("/organizer/payments/reject/:registrationId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reason } = req.body;

    const registrations = registrationsCol();

    const registration = await registrations.findOne({ _id: new ObjectId(registrationId) });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found" });
    }

    if (registration.paymentStatus !== "pending") {
      return res.status(400).json({ ok: false, error: "Payment is not in pending state" });
    }

    // Update registration
    await registrations.updateOne(
      { _id: new ObjectId(registrationId) },
      {
        $set: {
          paymentStatus: "rejected",
          status: "payment_rejected",
          rejectionReason: reason || "Payment proof rejected",
          rejectedAt: new Date(),
          rejectedBy: new ObjectId(req.user.sub),
        },
      }
    );

    return res.json({ ok: true, message: "Payment rejected" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
