import React, { useState } from "react";
import {
  FaTimes,
  FaBell,
  FaRegSadTear,
  FaClipboardCheck,
  FaBullhorn,
  FaFileAlt,
  FaTrash,
} from "react-icons/fa";
import "../styles/modal-notification.css";

const NotificationModal = ({
  isOpen,
  onClose,
  notifications,
  onClear,
  onDelete,
  submissionStatus,
}) => {
  const [deletingNotifId, setDeletingNotifId] = useState(null);

  if (!isOpen) return null;

  const handleDeleteClick = (id) => {
    setDeletingNotifId(id);
    // Wait for animation to finish before calling parent onDelete
    setTimeout(() => {
      onDelete(id);
      setDeletingNotifId(null); // Reset for next deletion
    }, 500); // Must match CSS animation duration
  };
  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_report": // Moderator
        return <FaFileAlt className="icon new-report" />; // Orange
      case "report_update":
        return <FaClipboardCheck className="icon report" />;
      case "new_announcement":
        return <FaBullhorn className="icon announcement" />;
      default:
        return <FaBell className="icon default" />;
    }
  };

  // Sort notifications from newest to oldest
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div
        className="notification-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {submissionStatus && (
          <div className="submission-overlay">
            {submissionStatus === "clearing" && (
              <>
                <div className="spinner"></div>
                <p>Clearing Notifications...</p>
              </>
            )}
            {/* You can add other statuses here if needed */}
          </div>
        )}
        <div className="modal-header">
          <h2>Notifications</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <div
          className={`notification-body ${
            sortedNotifications.length === 0 ? "no-scroll" : ""
          }`}
        >
          {sortedNotifications.length === 0 ? (
            <div className="no-notifications-placeholder">
              <FaRegSadTear size={50} />
              <h3>No New Notifications</h3>
              <p>
                Updates about your reports and new announcements will appear
                here.
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {sortedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${
                    notif.is_read ? "read" : "unread"
                  } ${deletingNotifId === notif.id ? "deleting" : ""}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-details">
                    <p className="message">{notif.message}</p>
                    <small className="date">
                      {/* Use created_at from DB */}
                      {new Date(notif.created_at).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>
                  <button
                    className="notification-delete-btn"
                    onClick={() => handleDeleteClick(notif.id)}
                    title="Delete notification"
                    disabled={deletingNotifId}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="modal-footer">
            <button className="clear-all-btn" onClick={onClear}>
              <FaTrash /> Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;
