import React from "react";
import { FaTimes } from "react-icons/fa";
import "../styles/view-events-modal.css";

const ViewEventsModal = ({ isOpen, onClose, events, date }) => {
  if (!isOpen) return null;

  // Helper to format time from 'HH:mm' to 'h:mm A'
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const d = new Date(0, 0, 0, hours, minutes);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="view-events-modal-overlay" onClick={onClose}>
      <div
        className="view-events-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            Events for{" "}
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <div className="events-modal-list">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="event-modal-item">
                <div className="event-modal-title-container">
                  <h4 className="event-modal-title">{event.title}</h4>
                  {event.start_time && (
                    <span className="event-modal-time">
                      {formatTime(event.start_time)}
                      {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="event-modal-desc">{event.description}</p>
                )}
              </div>
            ))
          ) : (
            <p className="no-events-message">
              There are no events scheduled for this day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewEventsModal;
