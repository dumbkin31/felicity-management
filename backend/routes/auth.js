const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { participantsCol, organizersCol, adminsCol } = require("../config/collections");


const router = express.Router();

// POST /api/auth/register
// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, isIIIT } = req.body;

    const finalFirst = (firstName || "").trim();
    const finalLast = (lastName || "").trim();

    if (!finalFirst || !email || !password) {
      return res.status(400).json({ ok: false, error: "firstName, email, password are required" });
    }

    const e = email.toLowerCase().trim();
    const allowed = ["iiit.ac.in", "students.iiit.ac.in", "research.iiit.ac.in"];
    const domain = e.split("@")[1] || "";

    if (isIIIT === true && !allowed.includes(domain)) {
      return res.status(400).json({
        ok: false,
        error: "IIIT participants must use an IIIT-issued email",
        allowedDomains: allowed,
      });
    }


    // Basic role rule for now: allow only participant self-register
    const finalRole = "participant";

    const participants = participantsCol();


    const existing = await participants.findOne({ email: e });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const doc = {
      firstName: finalFirst,
      lastName: finalLast,
      email: e,
      participantType: isIIIT === true ? "iiit" : "non-iiit",
      collegeOrOrgName: "",
      contactNumber: "",
      interests: [],
      followedOrganizerIds: [],
      passwordHash,
      createdAt: new Date(),
    };


    const result = await participants.insertOne(doc);

    return res.status(201).json({ ok: true, userId: result.insertedId, role: finalRole });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/auth/login
// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email and password are required" });
    }

    const e = email.toLowerCase().trim();

    let user = await participantsCol().findOne({ email: e });
    let role = "participant";

    if (!user) {
      user = await organizersCol().findOne({ contactEmail: e });
      role = "organizer";
    }

    if (!user) {
      user = await adminsCol().findOne({ email: e });
      role = "admin";
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), role, email: e },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: { id: user._id, name: user.firstName || user.organizerName || "Admin", email: e, role },
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});


module.exports = router;
