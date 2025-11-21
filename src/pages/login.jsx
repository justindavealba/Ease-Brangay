import { useState, useEffect } from "react";
import "../styles/login.css";
import bgVideo from "../assets/bg-video.mp4";
import "@fontsource/poppins";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaBullhorn,
  FaFileContract,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { logAuditAction } from "../utils/auditLogger";

function Login() {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notification, setNotification] = useState("");
  // NEW STATE: To track the "Remember me" checkbox status
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

  const navigate = useNavigate();

  // useEffect runs once on component mount to check local storage
  useEffect(() => {
    // 1. Check if the "Remember me" box was checked previously
    const storedRememberMe = localStorage.getItem("rememberMe") === "true";
    setRememberMe(storedRememberMe);

    // 2. If it was checked, retrieve the stored username
    if (storedRememberMe) {
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;

    if (!username || !password) {
      setNotification("Please enter both username and password.");
      logAuditAction("Login Attempt Failed", {
        username,
        reason: "Missing credentials",
      });
      return;
    }

    setIsLoggingIn(true);
    setNotification("");
    setShowResendLink(false);

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotification(data.message || "Login failed. Please try again.");
        // Show the resend link if the error is about verification
        if (data.message && data.message.includes("verify your email")) {
          setShowResendLink(true);
        }
        logAuditAction("Login Attempt Failed", {
          username,
          reason: data.message,
        });
        setIsLoggingIn(false);
        return;
      }

      // --- REMEMBER ME LOGIC ---
      if (rememberMe) {
        localStorage.setItem("username", username);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("username");
        localStorage.removeItem("rememberMe");
      }

      // Save user profile and navigate
      localStorage.setItem("userProfile", JSON.stringify(data.userProfile));
      logAuditAction("User Logged In", { username }, data.userProfile.role);

      // Navigate based on role
      if (data.userProfile.role === "admin")
        navigate(`/admin/${data.userProfile.id}/${data.userProfile.username}`);
      else if (data.userProfile.role === "moderator")
        navigate(
          `/moderator/${data.userProfile.id}/${data.userProfile.username}`
        );
      else
        navigate(
          `/resident/${data.userProfile.id}/${data.userProfile.username}`
        );
    } catch (error) {
      console.error("Login error:", error);
      setNotification(
        "Could not connect to the server. Please try again later."
      );
      setIsLoggingIn(false);
    }
  };

  const handleResendVerification = async () => {
    if (!username) {
      setNotification(
        "Please enter your email or username in the field above to resend the verification link."
      );
      return;
    }
    setNotification("Sending...");
    try {
      const response = await fetch(
        "http://localhost:5000/api/resend-verification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: username }), // Assuming username can be an email
        }
      );
      const data = await response.json();
      setNotification(data.message || "A new verification link has been sent.");
      setShowResendLink(false); // Hide the link after sending
    } catch (error) {
      console.error("Resend verification error:", error);
      setNotification(
        "Could not send the verification email. Please try again later."
      );
    }
  };

  return (
    <div className="login-page">
      {/* Video background for the entire page */}
      <video autoPlay loop muted playsInline className="login-bg-video">
        <source src={bgVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="login-bg-overlay"></div>

      <div className="login-content-wrapper">
        <div className="login-promo">
          <div className="promo-content">
            <h1>Welcome to Ease Barangay</h1>
            <p>
              Your digital hub for community services and information. Log in to
              access a world of convenience.
            </p>
            <ul className="promo-features">
              <li>
                <FaBullhorn className="promo-icon" /> Stay updated with
                real-time announcements.
              </li>
              <li>
                <FaFileContract className="promo-icon" /> Request documents with
                just a few clicks.
              </li>
              <li>
                <FaExclamationTriangle className="promo-icon" /> Report
                community concerns effortlessly.
              </li>
            </ul>
          </div>
        </div>

        <form className="login-box" onSubmit={handleLogin}>
          <Link to="/" className="back-to-home-link">
            <FaArrowLeft /> Back to Home
          </Link>
          <h1>Login</h1>
          <h2>----</h2>
          <h3>Please enter your credentials.</h3>

          <label className="input-label">Username</label>
          <div className="input-container">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <label className="input-label">Password</label>
          <div className="input-container">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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

          <div className="options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe} // Bind checked state
                onChange={(e) => setRememberMe(e.target.checked)} // Update state on change
              />{" "}
              Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {notification && <p className="notification">{notification}</p>}

          {showResendLink && (
            <p className="resend-verification-text">
              Didn't get an email?{" "}
              <span className="resend-link" onClick={handleResendVerification}>
                Resend verification link
              </span>
            </p>
          )}

          <button className="login-btn" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? (
              <>
                <div className="spinner"></div> Logging In...
              </>
            ) : (
              "LOGIN"
            )}
          </button>
          <p className="signin-text">
            Don’t have an account? <Link to="/sign-in">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
