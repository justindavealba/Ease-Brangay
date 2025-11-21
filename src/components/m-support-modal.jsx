import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaHeadset,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import "../styles/m-support-modal.css";

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{title}</span>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};

const SupportModal = ({
  isOpen,
  onClose,
  onReportUser,
  initialReportedUser,
}) => {
  if (!isOpen) return null;

  const reportSectionRef = useRef(null);

  // State for the new contact form
  const [isContactFormVisible, setIsContactFormVisible] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [reportedUserName, setReportedUserName] = useState("");

  const [reportSubmissionStatus, setReportSubmissionStatus] = useState(null); // 'submitting', 'success'
  const [contactSubmissionStatus, setContactSubmissionStatus] = useState(null); // This will be the single source of truth

  const ISSUE_TYPES = [
    "Report a Resident",
    "Technical Bug",
    "Feature Request",
    "Account Issue",
    "General Inquiry",
    "Other",
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset contact form state on open
      setIsContactFormVisible(false);
      setIssueType("");
      setIssueDescription("");
      setReportedUserName("");
      setContactSubmissionStatus(null);
    }
  }, [isOpen]);
  const faqs = [
    {
      q: "How do I manage announcements?",
      a: "You can create new announcements using the 'Create Announcement' button. To edit or delete an existing post, click the three-dot menu on the top-right of the post card in the feed.",
    },
    {
      q: "What is the process for certificate requests?",
      a: "When a resident requests a certificate, it appears in the 'Pending' tab of the 'Certificate Requests' modal. You can review the details, including any provided IDs, and then choose to 'Approve' or 'Decline' the request.",
    },
    {
      q: "What happens when I approve a certificate?",
      a: "Approving a request sends a notification to the resident and places a printable version of the certificate in their inbox.",
    },
    {
      q: "How do I handle resident reports?",
      a: "Open the 'Resident Reports' modal to view all submitted reports. You can update the status of a report (e.g., to 'Reviewed' or 'In Progress'), which will notify the resident of the change.",
    },
    {
      q: "How do events work?",
      a: "You can add events to the calendar, which will appear in the 'Upcoming Events' list for all users. Events that have passed are automatically removed, and users are notified when an event has ended.",
    },
  ];

  const handleContactAdminSubmit = async (e) => {
    e.preventDefault();
    if (
      !issueType ||
      !issueDescription.trim() ||
      (issueType === "Report a Resident" && !reportedUserName.trim())
    ) {
      return; // Validation fails
    }

    setContactSubmissionStatus("submitting");
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (!userProfile || !userProfile.id) {
      alert("You must be logged in to perform this action.");
      setContactSubmissionStatus(null);
      return;
    }

    try {
      let endpoint = "";
      let payload = {};

      if (issueType === "Report a Resident") {
        endpoint = "http://localhost:5000/api/dispute_reports";
        payload = {
          reporterId: userProfile.id,
          reportedUserName,
          reason: issueDescription,
        };
        logAuditAction(
          "Reported Resident to Admin",
          { reportedUser: reportedUserName, reason: issueDescription },
          "moderator"
        );
      } else {
        endpoint = "http://localhost:5000/api/admin_messages";
        payload = { senderId: userProfile.id, issueType, issueDescription };
        logAuditAction("Contacted Admin", { subject: issueType }, "moderator");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send message.");

      setContactSubmissionStatus("success");
      setTimeout(() => {
        setIsContactFormVisible(false);
        setIssueType("");
        setIssueDescription("");
        setReportedUserName("");
        setContactSubmissionStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to contact admin:", error);
      alert("Error: Could not send your message. Please try again.");
      setContactSubmissionStatus(null);
    }
  };

  const renderContactForm = () => {
    if (contactSubmissionStatus === "submitting") {
      return (
        <div className="submission-overlay-local">
          <div className="spinner"></div>
          <p>Sending your message...</p>
        </div>
      );
    }
    if (contactSubmissionStatus === "success") {
      return (
        <div className="contact-success-message">
          <FaCheckCircle /> Your message has been sent.
        </div>
      );
    }
    return (
      <form onSubmit={handleContactAdminSubmit} className="contact-admin-form">
        <div className="form-group">
          <label htmlFor="issue-type-moderator">Issue Type</label>
          <select
            id="issue-type-moderator"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            required
          >
            <option value="" disabled>
              Select an issue type...
            </option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {issueType === "Report a Resident" && (
          <div className="form-group">
            <label htmlFor="resident-name">Resident's Full Name</label>
            <input
              id="resident-name"
              type="text"
              value={reportedUserName}
              onChange={(e) => setReportedUserName(e.target.value)}
              placeholder="Enter the full name of the resident"
              required
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="issue-description-moderator">
            {issueType === "Report a Resident"
              ? "Reason for Reporting"
              : "Description"}
          </label>
          <textarea
            id="issue-description-moderator"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder={
              issueType === "Report a Resident"
                ? "Describe the issue or violation..."
                : "Please describe in detail..."
            }
            required
          ></textarea>
        </div>
        <div className="contact-form-actions">
          <button
            type="button"
            className="cancel-contact-btn"
            onClick={() => setIsContactFormVisible(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-contact-btn"
            disabled={
              !issueType ||
              !issueDescription.trim() ||
              (issueType === "Report a Resident" && !reportedUserName.trim()) ||
              contactSubmissionStatus === "submitting"
            }
          >
            {contactSubmissionStatus === "submitting"
              ? "Sending..."
              : "Send Message"}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="support-modal-overlay" onClick={onClose}>
      <div
        className="support-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Support & Help Center</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <div className="support-body">
          <div className="support-icon-container">
            <FaHeadset size={40} />
          </div>
          <h3>Frequently Asked Questions</h3>
          <div className="faq-container">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} title={faq.q}>
                <p>{faq.a}</p>
              </AccordionItem>
            ))}
          </div>

          <div className="contact-support-section" ref={reportSectionRef}>
            <h4>Contact System Administrator</h4>
            {!isContactFormVisible ? (
              <>
                <p>
                  If you need to report a resident, have a technical issue, or a
                  question not answered above, please contact the system
                  administrator.
                </p>
                <button
                  onClick={() => setIsContactFormVisible(true)}
                  className="contact-btn"
                >
                  Contact Administrator
                </button>
              </>
            ) : contactSubmissionStatus === "success" ? (
              <div className="contact-success-message">
                <FaCheckCircle /> Your message has been sent.
              </div>
            ) : (
              <form
                onSubmit={handleContactAdminSubmit}
                className="contact-admin-form"
              >
                <div className="form-group">
                  <label htmlFor="issue-type-moderator">Issue Type</label>
                  <select
                    id="issue-type-moderator"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select an issue type...
                    </option>
                    {ISSUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                {issueType === "Report a Resident" && (
                  <div className="form-group">
                    <label htmlFor="resident-name">Resident's Full Name</label>
                    <input
                      id="resident-name"
                      type="text"
                      value={reportedUserName}
                      onChange={(e) => setReportedUserName(e.target.value)}
                      placeholder="Enter the full name of the resident"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="issue-description-moderator">
                    {issueType === "Report a Resident"
                      ? "Reason for Reporting"
                      : "Description"}
                  </label>
                  <textarea
                    id="issue-description-moderator"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder={
                      issueType === "Report a Resident"
                        ? "Describe the issue or violation..."
                        : "Please describe in detail..."
                    }
                    required
                  ></textarea>
                </div>
                <div className="contact-form-actions">
                  <button
                    type="button"
                    className="cancel-contact-btn"
                    onClick={() => setIsContactFormVisible(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-contact-btn"
                    disabled={
                      !issueType ||
                      !issueDescription.trim() ||
                      (issueType === "Report a Resident" &&
                        !reportedUserName.trim()) ||
                      contactSubmissionStatus === "submitting"
                    }
                  >
                    {contactSubmissionStatus === "submitting"
                      ? "Sending..."
                      : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="system-info-footer">
            <span>App Version: 1.0.0</span>
            <span>Role: Moderator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
