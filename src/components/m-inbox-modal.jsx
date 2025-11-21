import React, { useState } from "react";
import {
  FaTimes,
  FaRegSadTear,
  FaTrash,
  FaCheckCircle,
  FaReply,
} from "react-icons/fa";
import "../styles/m-inbox-modal.css"; // Using a separate CSS file for moderator-specific styles

const ModeratorInboxModal = ({
  isOpen,
  onClose,
  messages,
  onMarkAsRead,
  onDelete,
  onClearAll,
  submissionStatus,
  onReply, // New prop for handling reply logic
}) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [replyText, setReplyText] = useState("");
  if (!isOpen) return null;

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      // Corrected from isRead
      onMarkAsRead(message.id);
    }
    setReplyText(""); // Reset reply text when opening a message
  };

  const handleDeleteClick = (e, messageId) => {
    e.stopPropagation(); // Prevent message from being selected
    setDeletingMessageId(messageId);
    setTimeout(() => {
      onDelete(messageId);
      setDeletingMessageId(null);
    }, 500); // Match animation duration
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyText.trim() && selectedMessage) {
      onReply(selectedMessage, replyText);
      setReplyText("");
      // After replying, go back to the main inbox list to see the "Replied" tag.
      setSelectedMessage(null);
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div
      className="inbox-modal-overlay"
      onClick={() => {
        setSelectedMessage(null);
        onClose();
      }}
    >
      <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()}>
        {submissionStatus && (
          <div className="submission-overlay">
            {submissionStatus === "clearing" && (
              <>
                <div className="spinner"></div>
                <p>Clearing Inbox...</p>
              </>
            )}
            {submissionStatus === "success" && (
              <>
                <FaCheckCircle className="success-icon" size={60} />
                <p>Inbox Cleared!</p>
              </>
            )}
          </div>
        )}

        <div className="modal-header">
          <h2>{selectedMessage ? "Message Details" : "Inbox"}</h2>
          <button
            className="close-btn"
            onClick={() => {
              setSelectedMessage(null);
              onClose();
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="inbox-body">
          {selectedMessage ? (
            <div className="details-body">
              <button
                className="back-to-list-btn"
                onClick={() => setSelectedMessage(null)}
              >
                &larr; Back to Inbox
              </button>
              <div className="details-content">
                <h4>{selectedMessage.subject}</h4>
                {(selectedMessage.from_username || selectedMessage.from) && (
                  <p
                    className="message-from"
                    style={{ fontWeight: "600", color: "var(--text-primary)" }}
                  >
                    From:{" "}
                    {selectedMessage.type === "admin_reply"
                      ? "System Administrator"
                      : selectedMessage.from_username || selectedMessage.from}
                  </p>
                )}
                <p className="message-body-text">{selectedMessage.body}</p>
                <span className="details-date">
                  Received:{" "}
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </span>
              </div>
              {/* Reply form for resident messages */}
              {(selectedMessage.userId ||
                selectedMessage.from_user_id ||
                selectedMessage.from) &&
                selectedMessage.status !== "replied" &&
                !selectedMessage.subject?.startsWith("Re:") && (
                  <form
                    className="inbox-reply-form"
                    onSubmit={handleReplySubmit}
                  >
                    <h4>Replying to Resident</h4>
                    <textarea
                      placeholder={`Reply to ${
                        selectedMessage.title
                          ?.split(":")[0]
                          .replace("Inquiry from ", "") ||
                        selectedMessage.from_username ||
                        selectedMessage.from
                      }...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      required
                    />
                    <div className="reply-actions">
                      <button
                        type="button"
                        className="cancel-reply-btn"
                        onClick={() => setReplyText("")}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="send-reply-btn"
                        disabled={!replyText.trim()}
                      >
                        <FaReply /> Send Reply
                      </button>
                    </div>
                  </form>
                )}
              {selectedMessage.status === "replied" && (
                <p className="replied-indicator">
                  You have replied to this message.
                </p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="no-items-placeholder">
              <FaRegSadTear size={50} />
              <h3>Your Inbox is Empty</h3>
              <p>
                Messages from residents and system notifications will appear
                here.
              </p>
            </div>
          ) : (
            <div className="message-list">
              {sortedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-item ${msg.is_read ? "" : "unread"} ${
                    // Corrected from isRead
                    deletingMessageId === msg.id ? "deleting" : ""
                  }`}
                  onClick={() => handleMessageClick(msg)}
                >
                  <div className="message-icon"></div>
                  <div className="message-summary">
                    <span className="message-title">
                      {msg.title}
                      {msg.status === "replied" && (
                        <span className="replied-tag">Replied</span>
                      )}
                    </span>
                    <span className="message-subtitle">
                      {msg.type === "admin_reply"
                        ? "From: System Administrator"
                        : msg.type === "resident_inquiry"
                        ? `From: ${
                            msg.title
                              ?.split(":")[0]
                              .replace("Inquiry from ", "") || "a resident"
                          }`
                        : `Message: ${msg.body.substring(0, 60)}...`}
                    </span>
                  </div>
                  <span className="message-date">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="message-delete-btn"
                    onClick={(e) => handleDeleteClick(e, msg.id)}
                    title="Delete message"
                    disabled={deletingMessageId}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {!selectedMessage && messages.length > 0 && (
          <div className="modal-footer">
            <button className="clear-all-btn" onClick={onClearAll}>
              <FaTrash /> Clear All Messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorInboxModal;
