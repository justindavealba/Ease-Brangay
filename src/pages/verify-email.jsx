import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import "../styles/verify-email.css";

function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState("Verifying your email address...");
  const hasVerified = useRef(false); // Add a ref to prevent double execution

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided.");
        return;
      }

      // This ref ensures the verification API is only called once,
      // even if React's StrictMode runs the effect twice in development.
      if (hasVerified.current) {
        return;
      }
      hasVerified.current = true;

      try {
        const response = await fetch(
          `http://localhost:5000/api/verify-email/${token}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Verification failed.");
        }

        setStatus("success");
        setMessage(data.message);
      } catch (err) {
        setStatus("error");
        setMessage(
          err.message ||
            "Verification link is invalid or has expired. Please try signing up again."
        );
      }
    };

    verifyToken();
  }, [token]); // Add token to the dependency array

  const renderStatus = () => {
    switch (status) {
      case "verifying":
        return (
          <>
            <FaSpinner className="spinner status-icon" />
            <h1>Verifying...</h1>
          </>
        );
      case "success":
        return (
          <>
            <FaCheckCircle className="status-icon success" />
            <h1>Success!</h1>
          </>
        );
      case "error":
        return (
          <>
            <FaTimesCircle className="status-icon error" />
            <h1>Verification Failed</h1>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-box">
        {renderStatus()}
        <p>{message}</p>
        {(status === "success" || status === "error") && (
          <Link to="/login" className="back-to-login-btn">
            Proceed to Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
