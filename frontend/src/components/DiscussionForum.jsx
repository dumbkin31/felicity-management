import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import api from "../api/axios";
import "./DiscussionForum.css";

const DiscussionForum = ({ isOrganizer = false, eventId: eventIdProp }) => {
  const { eventId: eventIdParam, id: eventIdAlt } = useParams();
  const eventId = eventIdProp || eventIdParam || eventIdAlt;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [postAsAnnouncement, setPostAsAnnouncement] = useState(false);
  const lastCountRef = useRef(0);
  const { error: errorToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [eventId]);

  const countMessages = (items) => {
    return items.reduce((acc, msg) => {
      const replies = msg.replies ? countMessages(msg.replies) : 0;
      return acc + 1 + replies;
    }, 0);
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(
        `/forum/${eventId}/messages`
      );

      if (response.data.ok) {
        setMessages(response.data.messages);
        const total = countMessages(response.data.messages || []);
        if (lastCountRef.current && total > lastCountRef.current) {
          setNewMessagesCount(total - lastCountRef.current);
        }
        lastCountRef.current = total;
      }
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) {
      errorToast("Please enter a message");
      return;
    }

    try {
      const response = await api.post(
        `/forum/${eventId}/message`,
        {
          content: newMessage,
          parentId: replyTo?._id || null,
          messageType: postAsAnnouncement ? "announcement" : "message",
        }
      );

      if (response.data.ok) {
        setNewMessage("");
        setReplyTo(null);
        setPostAsAnnouncement(false);
        fetchMessages();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to post message");
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await api.put(
        `/forum/message/${messageId}/react`,
        { emoji }
      );
      fetchMessages();
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const handlePin = async (messageId) => {
    try {
      await api.put(
        `/organizer/forum/message/${messageId}/pin`,
        {}
      );
      fetchMessages();
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to pin message");
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await api.delete(
        `/organizer/forum/message/${messageId}`
      );
      fetchMessages();
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to delete message");
    }
  };

  const MessageCard = ({ message, isReply = false }) => (
    <div className={`message-card ${isReply ? "reply" : ""} ${message.isPinned ? "pinned" : ""}`}>
      {message.isPinned && <div className="pin-badge">📌 Pinned</div>}
      {message.messageType === "announcement" && <div className="pin-badge">📣 Announcement</div>}
      
      <div className="message-header">
        <div className="author-info">
          <span className="author-name">{message.authorName}</span>
          <span className={`role-badge ${message.authorRole}`}>
            {message.authorRole}
          </span>
        </div>
        <div className="message-time">
          {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="message-content">{message.content}</div>

      <div className="message-actions">
        <div className="reactions">
          {["👍", "❤️", "😊", "🎉"].map((emoji) => {
            const count = message.reactions?.[emoji]?.length || 0;
            return (
              <button
                key={emoji}
                className="reaction-btn"
                onClick={() => handleReact(message._id, emoji)}
              >
                {emoji} {count > 0 && count}
              </button>
            );
          })}
        </div>

        <div className="action-buttons">
          <button onClick={() => setReplyTo(message)} className="reply-btn">
            Reply
          </button>
          {isOrganizer && (
            <>
              <button
                onClick={() => handlePin(message._id)}
                className="pin-btn"
                disabled={message.isAnnouncement}
                title={message.isAnnouncement ? "Announcements are always pinned" : undefined}
              >
                {message.isPinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => handleDelete(message._id)} className="delete-btn">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {message.replies && message.replies.length > 0 && (
        <div className="replies-section">
          {message.replies.map((reply) => (
            <MessageCard key={reply._id} message={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="loading">Loading discussion...</div>;

  return (
    <div className="discussion-forum">
      <h2>Discussion Forum</h2>

      {newMessagesCount > 0 && (
        <div className="success-message">
          {newMessagesCount} new message{newMessagesCount > 1 ? "s" : ""} posted.
          <button
            onClick={() => setNewMessagesCount(0)}
            className="cancel-reply"
            style={{ marginLeft: "10px" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="post-section">
        {replyTo && (
          <div className="reply-indicator">
            Replying to {replyTo.authorName}
            <button onClick={() => setReplyTo(null)} className="cancel-reply">
              ✕
            </button>
          </div>
        )}
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={replyTo ? "Write your reply..." : "Start a discussion..."}
          rows="4"
          className="message-input"
        />
        {isOrganizer && !replyTo && (
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <input
              type="checkbox"
              checked={postAsAnnouncement}
              onChange={(e) => setPostAsAnnouncement(e.target.checked)}
            />
            Post as announcement
          </label>
        )}
        <button onClick={handlePostMessage} className="post-btn">
          {replyTo ? "Post Reply" : "Post Message"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the discussion!</div>
        ) : (
          messages.map((message) => (
            <MessageCard key={message._id} message={message} />
          ))
        )}
      </div>
    </div>
  );
};

export default DiscussionForum;
