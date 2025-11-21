import React, { useState } from "react";
import {
  FaTimes,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import "../styles/modal-change-password.css";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setStatus("idle");
  };

  const handleClose = () => {
    if (status !== "success") {
      resetForm();
    }
    onClose(); // Always call onClose to close the modal
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    // Use the same strong password validation as the sign-up form
    // Simplified and more readable password validation
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError("Password must include at least one lowercase letter.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must include at least one uppercase letter.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError("Password must include at least one number.");
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
      );

      return;
    }

    setStatus("loading");
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${userProfile.id}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      if (!response.ok) {
        // If the response is not OK, we expect an error message in JSON format.
        const errorData = await response.json();
        throw new Error(errorData.message || "An unknown error occurred.");
      }

      // Only if the response is OK, parse the success message.
      const data = await response.json();

      logAuditAction("Changed Password", {}, userProfile.role);
      setStatus("success");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="change-password-modal-overlay" onClick={handleClose}>
      <div
        className="change-password-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        {status === "success" ? (
          <div className="success-message">
            <FaCheckCircle size={50} />
            <p>Password changed successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowNew(!showNew)}>
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button
              type="submit"
              className="save-btn"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <FaSpinner className="spinner" />
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
