import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEnvelope,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import "../styles/forgot-password.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [notification, setNotification] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'sending', 'sent'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setNotification("Please enter your email address.");
      return;
    }

    setStatus("sending");
    setNotification("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "An unknown error occurred.");
      }

      // Only show the success screen if the email was actually sent.
      setStatus("sent");
    } catch (error) {
      setNotification(error.message);
      setStatus("idle"); // Reset status to allow another attempt
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-box">
        {status === "sent" ? (
          <div className="confirmation-view">
            <FaCheckCircle className="confirmation-icon" />
            <h1>Check Your Email</h1>
            <p>
              If an account with that email exists, we've sent a link to reset
              your password.
            </p>
            <Link to="/login" className="back-to-login-link">
              <FaArrowLeft /> Back to Login
            </Link>
          </div>
        ) : (
          <>
            <Link to="/login" className="back-to-login-link">
              <FaArrowLeft /> Back to Login
            </Link>
            <h1>Forgot Your Password?</h1>
            <p>
              Enter your email address below, and we'll send you a link to reset
              it.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="input-container">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {notification && <p className="notification">{notification}</p>}
              <button
                type="submit"
                className="submit-btn"
                disabled={status === "sending"}
              >
                {status === "sending" ? (
                  <FaSpinner className="spinner" />
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
