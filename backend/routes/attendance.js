const express = require("express");
const { ObjectId } = require("mongodb");
const { eventsCol, registrationsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// POST /api/organizer/attendance/mark
// Mark attendance by scanning QR code
router.post("/organizer/attendance/mark", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { ticketData, eventId, markedManually } = req.body;

    if (!ticketData || !eventId) {
      return res.status(400).json({ ok: false, error: "Ticket data and event ID required" });
    }

    // Parse ticket data (could be JSON string or object)
    let parsedTicket;
    try {
      parsedTicket = typeof ticketData === "string" ? JSON.parse(ticketData) : ticketData;
    } catch (err) {
      return res.status(400).json({ ok: false, error: "Invalid ticket format" });
    }

    const { ticketId, participantId } = parsedTicket;

    if (!ticketId || !participantId) {
      return res.status(400).json({ ok: false, error: "Invalid ticket data" });
    }

    // Verify registration exists and update attendance
    const registrations = registrationsCol();
    const registration = await registrations.findOne({
      ticketId,
      eventId: eventId.toString(),
      participantId: participantId.toString(),
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found or not confirmed" });
    }

    // Check if already marked
    if (registration.attended) {
      return res.status(400).json({
        ok: false,
        error: "Attendance already marked",
        markedAt: registration.attendanceMarkedAt,
      });
    }

    // Mark attendance by updating the registration
    await registrations.updateOne(
      { _id: registration._id },
      {
        $set: {
          attended: true,
          attendanceMarkedAt: new Date(),
          attendanceMarkedBy: new ObjectId(req.user.sub),
          attendanceMarkedManually: markedManually || false,
        },
      }
    );

    return res.json({
      ok: true,
      message: "Attendance marked successfully",
      ticketId,
      markedAt: new Date(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/attendance/:eventId
// Get all attendance records for an event
router.get("/organizer/attendance/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const registrations = registrationsCol();

    // Get all confirmed registrations for the event
    const allRegistrations = await registrations
      .find({
        eventId: eventId.toString(),
        status: "confirmed",
      })
      .toArray();

    // Format attendance data
    const attendanceData = allRegistrations.map((reg) => ({
      ticketId: reg.ticketId,
      participantId: reg.participantId,
      participantName: reg.participantName,
      participantEmail: reg.participantEmail,
      attended: reg.attended || false,
      markedAt: reg.attendanceMarkedAt || null,
      markedManually: reg.attendanceMarkedManually || false,
    }));

    const attended = allRegistrations.filter((r) => r.attended).length;
    const stats = {
      total: allRegistrations.length,
      attended,
      pending: allRegistrations.length - attended,
    };

    return res.json({
      ok: true,
      attendance: attendanceData,
      stats,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/organizer/attendance/manual
// Manually mark attendance (with logging)
router.post("/organizer/attendance/manual", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { ticketId, eventId } = req.body;

    if (!ticketId || !eventId) {
      return res.status(400).json({ ok: false, error: "Ticket ID and Event ID required" });
    }

    // Verify registration
    const registrations = registrationsCol();
    const registration = await registrations.findOne({
      ticketId,
      eventId: eventId.toString(),
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Registration not found" });
    }

    // Check if already marked
    if (registration.attended) {
      return res.status(400).json({ ok: false, error: "Attendance already marked" });
    }

    // Mark attendance manually
    await registrations.updateOne(
      { _id: registration._id },
      {
        $set: {
          attended: true,
          attendanceMarkedAt: new Date(),
          attendanceMarkedBy: new ObjectId(req.user.sub),
          attendanceMarkedManually: true,
          attendanceManualReason: "Marked manually by organizer",
        },
      }
    );

    return res.json({
      ok: true,
      message: "Attendance marked manually",
      ticketId,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/organizer/attendance/export/:eventId
// Export attendance as CSV
router.get("/organizer/attendance/export/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const registrations = registrationsCol();

    // Get all registrations
    const allRegistrations = await registrations
      .find({
        eventId: eventId.toString(),
        status: "confirmed",
      })
      .toArray();

    // Generate CSV
    let csv = "\"Ticket ID\",\"Participant Name\",\"Email\",\"Attended\",\"Marked At\",\"Marked Manually\"\n";
    allRegistrations.forEach((reg) => {
      const attended = reg.attended ? "Yes" : "No";
      const markedAt = reg.attendanceMarkedAt
        ? new Date(reg.attendanceMarkedAt).toLocaleString()
        : "N/A";
      const markedManually = reg.attendanceMarkedManually ? "Yes" : "No";

      csv += `${reg.ticketId},"${reg.participantName}","${reg.participantEmail}",${attended},"${markedAt}","${markedManually}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance-${eventId}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
