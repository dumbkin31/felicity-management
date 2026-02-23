import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./DiscussionForum.css";

const DiscussionForum = ({ isOrganizer = false }) => {
  const { eventId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/forum/${eventId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.ok) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) {
      alert("Please enter a message");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/forum/${eventId}/message`,
        {
          content: newMessage,
          parentId: replyTo?._id || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.ok) {
        setNewMessage("");
        setReplyTo(null);
        fetchMessages();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to post message");
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/forum/message/${messageId}/react`,
        { emoji },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchMessages();
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const handlePin = async (messageId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/organizer/forum/message/${messageId}/pin`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to pin message");
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/organizer/forum/message/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete message");
    }
  };

  const MessageCard = ({ message, isReply = false }) => (
    <div className={`message-card ${isReply ? "reply" : ""} ${message.isPinned ? "pinned" : ""}`}>
      {message.isPinned && <div className="pin-badge">📌 Pinned</div>}
      
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
              <button onClick={() => handlePin(message._id)} className="pin-btn">
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
