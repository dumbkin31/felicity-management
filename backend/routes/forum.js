const express = require("express");
const { ObjectId } = require("mongodb");
const { forumMessagesCol, registrationsCol, eventsCol } = require("../config/collections");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/forum/:eventId/message
// Post a message to the event forum
router.post("/forum/:eventId/message", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Message content is required" });
    }

    // Verify user is registered for the event (for participants) or is organizer
    const registrations = registrationsCol();
    const events = eventsCol();

    let canPost = false;

    if (req.user.role === "organizer") {
      // Check if organizer owns the event
      const event = await events.findOne({
        _id: new ObjectId(eventId),
        organizerId: new ObjectId(req.user.sub),
      });
      canPost = !!event;
    } else if (req.user.role === "participant") {
      // Check if participant is registered
      const registration = await registrations.findOne({
        eventId: new ObjectId(eventId),
        participantId: new ObjectId(req.user.sub),
        status: "confirmed",
      });
      canPost = !!registration;
    }

    if (!canPost) {
      return res.status(403).json({ ok: false, error: "You must be registered for this event to post" });
    }

    const messages = forumMessagesCol();
    const message = {
      eventId: new ObjectId(eventId),
      authorId: new ObjectId(req.user.sub),
      authorRole: req.user.role,
      authorName: req.user.name || "Anonymous",
      content: content.trim(),
      parentId: parentId ? new ObjectId(parentId) : null,
      reactions: {},
      isPinned: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await messages.insertOne(message);

    return res.json({
      ok: true,
      message: "Message posted successfully",
      messageId: result.insertedId,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/forum/:eventId/messages
// Get all messages for an event
router.get("/forum/:eventId/messages", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const messages = forumMessagesCol();

    const allMessages = await messages
      .find({
        eventId: new ObjectId(eventId),
        isDeleted: false,
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .toArray();

    // Organize into threads
    const messageMap = {};
    const threads = [];

    allMessages.forEach((msg) => {
      messageMap[msg._id.toString()] = { ...msg, replies: [] };
    });

    allMessages.forEach((msg) => {
      if (msg.parentId) {
        const parentId = msg.parentId.toString();
        if (messageMap[parentId]) {
          messageMap[parentId].replies.push(messageMap[msg._id.toString()]);
        }
      } else {
        threads.push(messageMap[msg._id.toString()]);
      }
    });

    return res.json({ ok: true, messages: threads });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/forum/message/:messageId/react
// React to a message
router.put("/forum/message/:messageId/react", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ ok: false, error: "Emoji is required" });
    }

    const messages = forumMessagesCol();
    const userId = req.user.sub;

    // Get current message
    const message = await messages.findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      return res.status(404).json({ ok: false, error: "Message not found" });
    }

    // Toggle reaction
    const reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const userIndex = reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userId);
    }

    await messages.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { reactions, updatedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Reaction updated" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/organizer/forum/message/:messageId
// Delete a message (organizer only)
router.delete("/organizer/forum/message/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messages = forumMessagesCol();

    const message = await messages.findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      return res.status(404).json({ ok: false, error: "Message not found" });
    }

    // Verify organizer owns the event
    if (req.user.role === "organizer") {
      const events = eventsCol();
      const event = await events.findOne({
        _id: message.eventId,
        organizerId: new ObjectId(req.user.sub),
      });

      if (!event) {
        return res.status(403).json({ ok: false, error: "You don't have permission to delete this message" });
      }
    }

    await messages.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { isDeleted: true, updatedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Message deleted" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/organizer/forum/message/:messageId/pin
// Pin/unpin a message (organizer only)
router.put("/organizer/forum/message/:messageId/pin", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messages = forumMessagesCol();

    const message = await messages.findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      return res.status(404).json({ ok: false, error: "Message not found" });
    }

    // Verify organizer owns the event
    if (req.user.role === "organizer") {
      const events = eventsCol();
      const event = await events.findOne({
        _id: message.eventId,
        organizerId: new ObjectId(req.user.sub),
      });

      if (!event) {
        return res.status(403).json({ ok: false, error: "You don't have permission to pin this message" });
      }
    }

    await messages.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { isPinned: !message.isPinned, updatedAt: new Date() } }
    );

    return res.json({ ok: true, message: message.isPinned ? "Message unpinned" : "Message pinned" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
