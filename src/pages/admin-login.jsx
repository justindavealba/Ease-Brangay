import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaUserShield, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import "../styles/admin-login.css";

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notification, setNotification] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;

    if (!username || !password) {
      setNotification("Please enter both username and password.");
      logAuditAction(
        "Admin Login Failed",
        { username, reason: "Missing credentials" },
        "admin"
      );
      return;
    }

    setIsLoggingIn(true);
    setNotification("");

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotification(data.message || "Login failed.");
        logAuditAction(
          "Admin Login Failed",
          { username, reason: data.message },
          "admin"
        );
        setIsLoggingIn(false);
        return;
      }

      // IMPORTANT: Check if the user has the 'admin' role
      if (data.userProfile && data.userProfile.role === "admin") {
        localStorage.setItem("userProfile", JSON.stringify(data.userProfile));
        logAuditAction("Admin Logged In", { username }, "admin");
        navigate(`/admin/${data.userProfile.id}/${data.userProfile.username}`);
      } else {
        setNotification("You are not authorized to access the admin portal.");
        logAuditAction(
          "Admin Login Unauthorized",
          { username, role: data.userProfile?.role },
          "admin"
        );
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setNotification(
        "Could not connect to the server. Please try again later."
      );
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="admin-login-page">
      <form className="admin-login-box" onSubmit={handleLogin}>
        <h1>Admin Portal</h1>
        <h2>Welcome Back</h2>
        <h3>Enter your administrator credentials to continue.</h3>

        <div className="input-container">
          <FaUserShield className="input-icon" />
          <input
            type="text"
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-container">
          <FaLock className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div
            className="password-toggle-icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </div>
        </div>

        {notification && <p className="notification">{notification}</p>}

        <button
          className="admin-login-btn"
          type="submit"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <div className="spinner"></div> Logging In...
            </>
          ) : (
            "Secure Login"
          )}
        </button>
        <p className="signin-text" style={{ marginTop: "20px" }}>
          <Link to="/">Back to Home Page</Link>
        </p>
      </form>
    </div>
  );
}

export default AdminLogin;
