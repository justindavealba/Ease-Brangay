import { useState } from "react";
import {
  FaTimes,
  FaRegSadTear,
  FaEye,
  FaBan,
  FaCheckCircle,
  FaTools,
  FaClipboardCheck,
  FaTrash,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "../styles/modal-view-reports.css";
import React, { useEffect } from "react";
import { useTheme } from "./ThemeContext";

const ViewReportsModal = ({
  isOpen,
  onClose,
  reports,
  onCancelReport,
  onDeleteReport,
  onOpenImage,
}) => {
  const { theme } = useTheme();
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionStatus, setActionStatus] = useState(null); // 'cancelling', 'deleting', 'success'

  // This effect ensures that if the underlying reports prop changes (e.g., after a status update),
  // the detailed view is updated with the latest information.
  useEffect(() => {
    if (selectedReport) {
      const updatedReport = reports.find((r) => r.id === selectedReport.id);
      if (updatedReport) {
        setSelectedReport(updatedReport);
      }
    }
  }, [reports, selectedReport]);

  if (!isOpen) return null;

  const handleCancelClick = async () => {
    if (
      selectedReport &&
      window.confirm("Are you sure you want to cancel this report?")
    ) {
      setActionStatus("cancelling");
      await onCancelReport(selectedReport.id);
      setActionStatus(null); // The useEffect above will handle the UI update.
    }
  };

  const handleDeleteClick = async () => {
    await onDeleteReport(selectedReport.id);
    setSelectedReport(null); // Close the details view after deletion
  };

  // 🔹 STATUS BADGE COMPONENT
  const StatusBadge = ({ status }) => {
    const statusInfo = {
      submitted: { label: "🟡 Pending Review", className: "status-submitted" },
      reviewed: { label: "🟠 Under Review", className: "status-reviewed" },
      approved: {
        label: "🟢 Approved – For Action",
        className: "status-approved",
      },
      declined: {
        label: "🔴 Declined – Invalid Report",
        className: "status-declined",
      },
      "in-progress": {
        label: "🔵 In Progress",
        className: "status-in-progress",
      },
      done: { label: "✅ Resolved / Done", className: "status-done" },
      canceled: { label: "⚪ Canceled", className: "status-canceled" },
    };

    const { label, className } = statusInfo[status] || {
      label: status,
      className: "status-default",
    };

    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  // 🔹 STEP PATHS
  const baseSteps = [
    { key: "submitted", label: "Report Submitted", icon: <FaClipboardCheck /> },
    { key: "reviewed", label: "Reviewed", icon: <FaEye /> },
  ];

  const successPath = [
    ...baseSteps,
    {
      key: "approved",
      label: "Approved – For Action",
      icon: <FaCheckCircle />,
    },
    { key: "in-progress", label: "In Progress", icon: <FaTools /> },
    { key: "done", label: "Resolved / Done", icon: <FaCheckCircle /> },
  ];

  const declinedPath = [
    ...baseSteps,
    { key: "declined", label: "Declined – Invalid Report", icon: <FaBan /> },
  ];

  // 🔹 Step status helper
  const getStepStatus = (currentStatus, stepKey, path) => {
    const order = path.map((s) => s.key);
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepKey);
    return currentIndex >= stepIndex;
  };

  // Sort reports from newest to oldest before rendering
  const sortedReports = reports
    .filter((r) => !["archived", "canceled-archived"].includes(r.status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="view-reports-modal-overlay" onClick={onClose}>
      <div
        className="view-reports-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Keep header exactly as you have it */}
        <div className="modal-header">
          <h2>My Submitted Reports</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <div className="reports-body">
          {sortedReports.length === 0 ? (
            <div className="no-reports-placeholder">
              <FaRegSadTear size={50} />
              <h3>No Reports Filed Yet</h3>
              <p>When you file a report, it will appear here for tracking.</p>
            </div>
          ) : (
            sortedReports.map((report) => (
              <div
                key={report.id}
                className="report-card clickable"
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-card-header">
                  <h3>{report.type}</h3>
                  <FaEye className="view-icon" />
                </div>
                <p className="report-card-description">
                  {report.description.slice(0, 100)}...
                </p>
                <div className="report-card-footer">
                  <StatusBadge status={report.status} />
                  <small className="report-date">
                    {new Date(report.created_at).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🔹 REPORT DETAILS SUBMODAL */}
      {selectedReport && (
        <div
          className="report-details-overlay"
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from reaching the main modal overlay
            setSelectedReport(null);
          }}
        >
          <div
            className="report-details-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="details-header">
              <h3>{selectedReport.type}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedReport(null)}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Action Status Overlay */}
            {actionStatus && (
              <div className="submission-overlay">
                {actionStatus === "cancelling" && (
                  <>
                    <div className="spinner"></div>
                    <p>Processing Cancellation...</p>
                  </>
                )}
                {actionStatus === "deleting" && (
                  <>
                    <div className="spinner"></div>
                    <p>Deleting Report...</p>
                  </>
                )}
                {actionStatus === "success" && (
                  <>
                    <FaCheckCircle className="success-icon" size={60} />
                    <p>Action Successful!</p>
                  </>
                )}
              </div>
            )}

            <div className="details-body">
              <p>
                <strong>Description:</strong> {selectedReport.description}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedReport.created_at).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>

              {/* 🔹 Render location if available */}
              {selectedReport.location && (
                <div className="report-location-view">
                  <strong>Location:</strong>{" "}
                  {selectedReport.location.address && (
                    <span className="location-address-text">
                      {selectedReport.location.address}
                    </span>
                  )}
                  <a
                    className="view-on-map-btn"
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.location.lat},${selectedReport.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaMapMarkerAlt /> View on Map
                  </a>
                </div>
              )}

              {/* 🔹 Render attached media */}
              {selectedReport.media && (
                <div className="report-media-gallery">
                  {(() => {
                    try {
                      const images =
                        typeof selectedReport.media === "string"
                          ? JSON.parse(selectedReport.media)
                          : null;
                      if (images && images.length > 0) {
                        return (
                          <>
                            <strong>Evidence:</strong>
                            <div className="media-items">
                              {images.map((mediaUrl, index) => (
                                <img
                                  src={`http://localhost:5000${mediaUrl}`}
                                  key={index}
                                  alt={`Evidence ${index + 1}`}
                                  onClick={() => onOpenImage(images, index)}
                                />
                              ))}
                            </div>
                          </>
                        );
                      }
                    } catch (e) {
                      console.error("Failed to parse media", e);
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* 🔹 PROGRESS TRACKER */}
              {selectedReport.status && (
                <div className="progress-tracker">
                  {(selectedReport.status === "declined"
                    ? declinedPath
                    : successPath
                  ).map((step, i) => {
                    const path =
                      selectedReport.status === "declined"
                        ? declinedPath
                        : successPath;
                    const isActive = getStepStatus(
                      selectedReport.status,
                      step.key,
                      path
                    );
                    const isCurrent = selectedReport.status === step.key;

                    return (
                      <div
                        key={i}
                        className={`progress-step ${isActive ? "active" : ""} ${
                          isCurrent ? "current" : ""
                        } ${step.key === "declined" ? "declined" : ""}`}
                      >
                        <div
                          className={`icon-wrapper ${
                            isCurrent ? "current" : ""
                          }`}
                        >
                          <div className="icon">{step.icon}</div>
                          <p className={isCurrent ? "current-status-text" : ""}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="details-footer">
              {/* Show Cancel button for active reports */}
              {["submitted", "reviewed", "in-progress", "approved"].includes(
                selectedReport.status
              ) ? (
                <button
                  className="cancel-report-btn"
                  onClick={handleCancelClick}
                >
                  <FaBan /> Cancel Report
                </button>
              ) : selectedReport.status === "canceled" ? (
                // If report is canceled, show the permanent delete button
                <button
                  className="delete-report-btn resident-delete"
                  onClick={handleDeleteClick}
                >
                  <FaTrash /> Delete Permanently
                </button>
              ) : ["done", "declined"].includes(selectedReport.status) ? (
                // For other non-active reports, show a simple delete button
                <button
                  className="delete-report-btn"
                  onClick={handleDeleteClick}
                >
                  <FaTrash /> Delete Report
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewReportsModal;
