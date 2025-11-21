import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaTrash,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

const EventModal = ({
  isOpen,
  onClose,
  selectedDate,
  event,
  setEventTitle,
  setEventDescription,
  setEventTime,
  setEventEndTime,
  onSave,
  onDelete,
  onEnd,
  submissionStatus,
}) => {
  if (!isOpen) return null;

  const isEditing = event && event.id;
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (event.time && event.endTime && event.endTime <= event.time) {
      setTimeError("End time must be after start time.");
    } else {
      setTimeError("");
    }
  }, [event.time, event.endTime]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (timeError) return; // Prevent submission if there's a time error

    if (event.title.trim() && !timeError) {
      onSave();
    }
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        {submissionStatus && (
          <div className="submission-overlay">
            {submissionStatus === "saving" && (
              <>
                <div className="spinner"></div>
                <p>Saving Event...</p>
              </>
            )}
            {submissionStatus === "deleting" && (
              <>
                <div className="spinner"></div>
                <p>Deleting Event...</p>
              </>
            )}
            {submissionStatus === "success" && (
              <>
                <FaCheckCircle className="success-icon" size={60} />
                <p>Action Successful!</p>
              </>
            )}
          </div>
        )}

        <div className="modal-header">
          <h2>{isEditing ? "Edit Event" : "Add Event"}</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="event-form">
          <div className="event-date-display">
            {selectedDate.toDateString()}
          </div>

          <div className="form-group">
            <label htmlFor="event-title">Event Title</label>
            <input
              id="event-title"
              type="text"
              placeholder="e.g., Barangay Assembly"
              value={event.title}
              onChange={(e) => setEventTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-description">Description (Optional)</label>
            <textarea
              id="event-description"
              placeholder="Add more details about the event..."
              value={event.description}
              onChange={(e) => setEventDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="time-inputs-container">
            <div className="form-group">
              <label htmlFor="event-time">Start Time</label>
              <input
                id="event-time"
                type="time"
                value={event.time || ""}
                onChange={(e) => setEventTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-end-time">End Time</label>
              <input
                id="event-end-time"
                type="time"
                value={event.endTime || ""}
                onChange={(e) => setEventEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {timeError && (
            <div className="time-error-message">
              <FaExclamationCircle />
              <span>{timeError}</span>
            </div>
          )}

          <div className="modal-footer">
            {isEditing && (
              <button
                type="button"
                className="delete-event-btn"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to permanently delete this event?"
                    )
                  ) {
                    onDelete(event.id);
                  }
                }}
              >
                <FaTrash /> Delete Event
              </button>
            )}
            {isEditing && (
              <button
                type="button"
                className="delete-event-btn"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to end this event? This will remove it from the calendar and notify residents."
                    )
                  ) {
                    onEnd(event.id);
                  }
                }}
              >
                <FaCheckCircle /> End Event
              </button>
            )}
            <button
              type="submit"
              className="save-event-btn"
              disabled={!event.title.trim() || !!timeError}
            >
              {isEditing ? "Save Changes" : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
