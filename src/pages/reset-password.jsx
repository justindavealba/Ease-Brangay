import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
  FaArrowLeft,
} from "react-icons/fa";
import "../styles/reset-password.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'submitting', 'success'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification("");

    if (password !== confirmPassword) {
      setNotification("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setNotification("Password must be at least 8 characters long.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch(
        `http://localhost:5000/api/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setStatus("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setNotification(err.message);
      setStatus("idle");
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-box">
        {status === "success" ? (
          <div className="confirmation-view">
            <FaCheckCircle className="confirmation-icon" />
            <h1>Password Reset!</h1>
            <p>
              Your password has been successfully updated. Redirecting you to
              the login page...
            </p>
          </div>
        ) : (
          <>
            <Link to="/login" className="back-to-login-link">
              <FaArrowLeft /> Back to Login
            </Link>
            <h1>Reset Your Password</h1>
            <p>Enter your new password below.</p>
            <form onSubmit={handleSubmit}>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {notification && <p className="notification">{notification}</p>}
              <button
                type="submit"
                className="submit-btn"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <FaSpinner className="spinner" />
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
