import React, { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaHeadset,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
} from "react-icons/fa";
import "../styles/r-support-modal.css";
import { logAuditAction } from "../utils/auditLogger";

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
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitting', 'success'
  const [isContactFormVisible, setIsContactFormVisible] = useState(false);

  if (!isOpen) return null;

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in both the subject and message fields.");
      return;
    }

    setSubmissionStatus("submitting");
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (!userProfile || !userProfile.id) {
      alert("You must be logged in to send a message.");
      setSubmissionStatus(null);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/contact-moderator",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userProfile.id,
            subject,
            message,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message.");

      logAuditAction("Sent Message to Moderator", { subject }, "resident");
      setSubmissionStatus("success");
      setTimeout(() => {
        setIsContactFormVisible(false);
        setSubject("");
        setMessage("");
        setSubmissionStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Error: Could not send your message. Please try again.");
      setSubmissionStatus(null);
    }
  };

  const faqs = [
    {
      q: "How do I file a report?",
      a: "Click the 'File a Report' button on the sidebar. Fill out the form with the necessary details, attach any evidence (photos or videos), and submit. You can track its status in the 'View and Track Reports' section.",
    },
    {
      q: "How can I track my submitted reports?",
      a: "Click the 'View and Track Reports' button. You will see a list of all your reports and their current status (e.g., Pending, Reviewed, In Progress, Resolved).",
    },
    {
      q: "How do I request a certificate?",
      a: "Use the 'Request Certification' button on the sidebar. Select the type of certificate you need, state your purpose, and provide any required information or ID photos.",
    },
    {
      q: "Where can I find my approved certificates?",
      a: "Once a certificate request is approved by a moderator, it will appear in your 'Inbox'. You can open your inbox from the sidebar to view and print your certificates.",
    },
    {
      q: "How do I find out about upcoming events?",
      a: "Upcoming events are listed on the right-hand panel of your home page. You can also click on dates in the calendar that have a dot to see events scheduled for that day.",
    },
  ];

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

          <div className="contact-support-section">
            <h4>Contact Your Barangay Moderator</h4>
            {!isContactFormVisible ? (
              <>
                <p>
                  If you have questions not answered above, you can send a
                  message directly to your barangay moderators.
                </p>
                <button
                  onClick={() => setIsContactFormVisible(true)}
                  className="contact-btn"
                >
                  Send a Message
                </button>
              </>
            ) : submissionStatus === "success" ? (
              <div className="contact-success-message">
                <FaCheckCircle /> Your message has been sent.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="contact-form">
                <input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Write your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
                <div className="contact-form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsContactFormVisible(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submissionStatus === "submitting"}
                  >
                    {submissionStatus === "submitting"
                      ? "Sending..."
                      : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="system-info-footer">
            <span>App Version: 1.0.0</span>
            <span>Role: Resident</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
